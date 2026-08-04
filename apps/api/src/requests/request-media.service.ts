import { createHash, randomUUID } from "node:crypto";
import { once } from "node:events";
import { createWriteStream } from "node:fs";
import { mkdir, open, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { finished } from "node:stream/promises";
import {
  ConflictException,
  Injectable,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from "@nestjs/common";
import { DatabaseService } from "../database.service.js";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_IMAGES = 5;

export class RequestMediaError extends Error {
  constructor(readonly code: "LIMIT" | "INVALID" | "TOO_LARGE" | "VIDEO_TOO_LONG") {
    super(code);
  }
}

@Injectable()
export class RequestMediaService {
  private readonly root =
    process.env.MEDIA_ROOT ??
    process.env.REQUEST_MEDIA_ROOT ??
    join(process.cwd(), ".pigar-request-media");

  constructor(private readonly database: DatabaseService) {}
  private readonly locks = new Map<string, Promise<void>>();

  async upload(requestId: string, source: AsyncIterable<Uint8Array>) {
    const previous = this.locks.get(requestId) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const current = new Promise<void>((resolve) => (release = resolve));
    const queue = previous.then(() => current);
    this.locks.set(requestId, queue);
    await previous;
    try {
      return await this.uploadSerialized(requestId, source);
    } finally {
      release();
      if (this.locks.get(requestId) === queue) this.locks.delete(requestId);
    }
  }

  private async uploadSerialized(requestId: string, source: AsyncIterable<Uint8Array>) {
    const request = await this.database.serviceRequest.findUnique({
      where: { id: requestId },
      include: { media: true },
    });
    if (!request) throw new ConflictException("REQUEST_NOT_FOUND");
    const temporaryDirectory = join(this.root, ".tmp");
    const finalDirectory = join(this.root, "objects");
    const physicalName = randomUUID();
    const temporaryPath = join(temporaryDirectory, `${physicalName}.part`);
    const finalPath = join(finalDirectory, physicalName);
    await Promise.all([
      mkdir(temporaryDirectory, { recursive: true }),
      mkdir(finalDirectory, { recursive: true }),
    ]);
    const hash = createHash("sha256");
    const inspected = new Uint8Array(512);
    let inspectedBytes = 0;
    let total = 0;
    let mime: "image/jpeg" | "image/png" | "video/mp4" | undefined;
    const output = createWriteStream(temporaryPath, { flags: "wx" });
    try {
      for await (const chunk of source) {
        total += chunk.byteLength;
        if (total > MAX_VIDEO_BYTES) throw new RequestMediaError("TOO_LARGE");
        const amount = Math.min(inspected.byteLength - inspectedBytes, chunk.byteLength);
        if (amount > 0) {
          inspected.set(chunk.subarray(0, amount), inspectedBytes);
          inspectedBytes += amount;
        }
        mime ??= detectMime(inspected.subarray(0, inspectedBytes));
        if (mime === "image/jpeg" || mime === "image/png") {
          if (total > MAX_IMAGE_BYTES) throw new RequestMediaError("TOO_LARGE");
        }
        hash.update(chunk);
        if (!output.write(chunk)) await once(output, "drain");
      }
      output.end();
      await finished(output);
      if (!mime) throw new RequestMediaError("INVALID");
      const kind = mime === "video/mp4" ? "VIDEO" : "IMAGE";

      let durationSeconds: number | undefined;
      if (kind === "VIDEO") {
        try {
          durationSeconds = await getMp4Duration(temporaryPath);
        } catch {
          durationSeconds = mp4Duration(inspected.subarray(0, inspectedBytes));
        }
        if (durationSeconds <= 0 || durationSeconds > 30) {
          throw new RequestMediaError("VIDEO_TOO_LONG");
        }
      }

      const executeInTransaction = async (tx: Record<string, unknown>) => {
        if (typeof tx.$queryRaw === "function") {
          await (tx.$queryRaw as (
            query: TemplateStringsArray,
            ...values: unknown[]
          ) => Promise<unknown>)`SELECT id FROM "ServiceRequest" WHERE id = ${requestId} FOR UPDATE`;
        }
        const mediaRepository = (tx.requestMedia ?? this.database.requestMedia) as {
          findMany: (options: { where: { requestId: string } }) => Promise<Array<{ kind: string }>>;
          create: (options: {
            data: Record<string, unknown>;
          }) => Promise<{ id: string; kind: string; detectedMime: string }>;
        };
        const existingMedia = await mediaRepository.findMany({ where: { requestId } });
        if (
          kind === "IMAGE" &&
          existingMedia.filter((item) => item.kind === "IMAGE").length >= MAX_IMAGES
        ) {
          throw new RequestMediaError("LIMIT");
        }
        if (kind === "VIDEO" && existingMedia.some((item) => item.kind === "VIDEO")) {
          throw new RequestMediaError("LIMIT");
        }

        await rename(temporaryPath, finalPath);

        const media = await mediaRepository.create({
          data: {
            requestId,
            kind,
            physicalName,
            detectedMime: mime,
            bytes: BigInt(total),
            checksum: hash.digest("hex"),
            ...(durationSeconds ? { durationSeconds: Math.ceil(durationSeconds) } : {}),
          },
        });

        const serviceRequestRepository = (tx.serviceRequest ?? this.database.serviceRequest) as {
          update: (options: {
            where: { id: string };
            data: Record<string, unknown>;
          }) => Promise<unknown>;
        };
        await serviceRequestRepository.update({
          where: { id: requestId },
          data: { completeness: "READY_FOR_OPERATION" },
        });

        return { id: media.id, kind: media.kind, mime: media.detectedMime };
      };

      const db = this.database as unknown as {
        $transaction?: (fn: (tx: Record<string, unknown>) => Promise<unknown>) => Promise<unknown>;
      };
      if (typeof db.$transaction === "function") {
        return (await db.$transaction(executeInTransaction)) as {
          id: string;
          kind: string;
          mime: string;
        };
      }
      return await executeInTransaction(this.database as unknown as Record<string, unknown>);
    } catch (error) {
      output.destroy();
      await finished(output).catch(() => undefined);
      await rm(temporaryPath, { force: true });
      await rm(finalPath, { force: true });
      throw error;
    }
  }

  internalPath(physicalName: string) {
    return `/internal-media/${physicalName}`;
  }
}

export function mediaException(error: unknown): Error {
  if (!(error instanceof RequestMediaError)) return error as Error;
  if (error.code === "TOO_LARGE") return new PayloadTooLargeException(error.code);
  if (error.code === "INVALID" || error.code === "VIDEO_TOO_LONG")
    return new UnsupportedMediaTypeException(error.code);
  return new ConflictException(error.code);
}

function detectMime(bytes: Uint8Array): "image/jpeg" | "image/png" | "video/mp4" | undefined {
  if (
    bytes.byteLength >= 8 &&
    Buffer.from(bytes.subarray(0, 8)).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  )
    return "image/png";
  if (bytes.byteLength >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if (bytes.byteLength >= 12 && Buffer.from(bytes.subarray(4, 8)).equals(Buffer.from("ftyp")))
    return "video/mp4";
  return undefined;
}

function mp4Duration(bytes: Uint8Array): number {
  const index = Buffer.from(bytes).indexOf(Buffer.from("mvhd"));
  if (index < 0 || bytes.byteLength < index + 24) throw new RequestMediaError("INVALID");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const timescale = view.getUint32(index + 16);
  const duration = view.getUint32(index + 20);
  if (!timescale) throw new RequestMediaError("INVALID");
  return duration / timescale;
}

async function getMp4Duration(filePath: string): Promise<number> {
  const handle = await open(filePath, "r");
  try {
    const stat = await handle.stat();
    const fileSize = stat.size;
    let offset = 0;
    while (offset < fileSize) {
      const headerBuf = Buffer.alloc(8);
      const { bytesRead } = await handle.read(headerBuf, 0, 8, offset);
      if (bytesRead < 8) break;
      let boxSize = headerBuf.readUInt32BE(0);
      const boxType = headerBuf.toString("ascii", 4, 8);
      let headerSize = 8;

      if (boxSize === 1) {
        const extHeader = Buffer.alloc(8);
        const { bytesRead: extRead } = await handle.read(extHeader, 0, 8, offset + 8);
        if (extRead < 8) break;
        boxSize = Number(extHeader.readBigUInt64BE(0));
        headerSize = 16;
      } else if (boxSize === 0) {
        boxSize = fileSize - offset;
      }

      if (boxSize < headerSize) break;

      if (boxType === "moov") {
        const moovDataSize = boxSize - headerSize;
        if (moovDataSize > 10 * 1024 * 1024) throw new RequestMediaError("INVALID");
        const moovBuf = Buffer.alloc(moovDataSize);
        await handle.read(moovBuf, 0, moovDataSize, offset + headerSize);

        let subOffset = 0;
        while (subOffset < moovBuf.length) {
          if (subOffset + 8 > moovBuf.length) break;
          let subSize = moovBuf.readUInt32BE(subOffset);
          const subType = moovBuf.toString("ascii", subOffset + 4, subOffset + 8);
          let subHeaderSize = 8;
          if (subSize === 1 && subOffset + 16 <= moovBuf.length) {
            subSize = Number(moovBuf.readBigUInt64BE(subOffset + 8));
            subHeaderSize = 16;
          } else if (subSize === 0) {
            subSize = moovBuf.length - subOffset;
          }
          if (subSize < subHeaderSize) break;

          if (subType === "mvhd") {
            const mvhdData = moovBuf.subarray(subOffset + subHeaderSize, subOffset + subSize);
            if (mvhdData.length < 24) throw new RequestMediaError("INVALID");
            const version = mvhdData[0];
            let timescale = 0;
            let duration = 0;
            if (version === 0) {
              timescale = mvhdData.readUInt32BE(12);
              duration = mvhdData.readUInt32BE(16);
            } else if (version === 1) {
              if (mvhdData.length < 32) throw new RequestMediaError("INVALID");
              timescale = mvhdData.readUInt32BE(20);
              duration = Number(mvhdData.readBigUInt64BE(24));
            } else {
              throw new RequestMediaError("INVALID");
            }
            if (!timescale || duration <= 0) throw new RequestMediaError("INVALID");
            return duration / timescale;
          }
          subOffset += subSize;
        }
        throw new RequestMediaError("INVALID");
      }

      offset += boxSize;
    }
    throw new RequestMediaError("INVALID");
  } finally {
    await handle.close();
  }
}
