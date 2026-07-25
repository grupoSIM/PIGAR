import { createHash, randomUUID } from "node:crypto";
import { once } from "node:events";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { finished } from "node:stream/promises";

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 30;
const MAX_CHUNK_BYTES = 256 * 1024;
const TEMPORARY_TTL_MS = 60 * 60 * 1000;

type MediaKind = "image" | "video";

export type MediaPocMetadataStore = {
  mediaPocObject: {
    create: (args: {
      data: {
        checksum: string;
        bytes: bigint;
        detectedMime: string;
        expiresAt: Date;
        physicalName: string;
        state: "AVAILABLE";
      };
    }) => Promise<{ id: string }>;
  };
};

export type MediaPocUpload = {
  actorId: string;
  existingCount: number;
  kind: MediaKind;
  ownerId: string;
  source: AsyncIterable<Uint8Array>;
};

export type MediaPocUploadResult = {
  bytes: number;
  checksum: string;
  detectedMime: "image/jpeg" | "image/png" | "video/mp4";
  expiresAt: string;
  id: string;
};

export class MediaPocError extends Error {
  constructor(
    readonly code:
      | "MEDIA_FORBIDDEN"
      | "MEDIA_INVALID"
      | "MEDIA_LIMIT_EXCEEDED"
      | "MEDIA_TOO_LARGE"
      | "MEDIA_VIDEO_TOO_LONG",
  ) {
    super(code);
  }
}

export class MediaPocService {
  constructor(
    private readonly metadata: MediaPocMetadataStore,
    private readonly mediaRoot: string = process.env.MEDIA_ROOT ??
      join(process.cwd(), ".pigar-media-poc"),
  ) {}

  async upload(input: MediaPocUpload): Promise<MediaPocUploadResult> {
    this.assertUploadAllowed(input);

    const temporaryDirectory = join(this.mediaRoot, ".tmp");
    const finalDirectory = join(this.mediaRoot, "objects");
    const physicalName = randomUUID();
    const temporaryPath = join(temporaryDirectory, `${physicalName}.part`);
    const finalPath = join(finalDirectory, physicalName);
    await Promise.all([
      mkdir(temporaryDirectory, { recursive: true }),
      mkdir(finalDirectory, { recursive: true }),
    ]);

    const hash = createHash("sha256");
    const inspection = new Uint8Array(512);
    let inspectedBytes = 0;
    let totalBytes = 0;
    let detectedMime: MediaPocUploadResult["detectedMime"] | undefined;
    const output = createWriteStream(temporaryPath, { flags: "wx" });

    try {
      for await (const chunk of input.source) {
        if (chunk.byteLength > MAX_CHUNK_BYTES) {
          throw new MediaPocError("MEDIA_INVALID");
        }

        totalBytes += chunk.byteLength;
        if (totalBytes > this.maxBytesFor(input.kind)) {
          throw new MediaPocError("MEDIA_TOO_LARGE");
        }

        const remainingInspectionBytes = inspection.byteLength - inspectedBytes;
        if (remainingInspectionBytes > 0) {
          const bytesToInspect = Math.min(remainingInspectionBytes, chunk.byteLength);
          inspection.set(chunk.subarray(0, bytesToInspect), inspectedBytes);
          inspectedBytes += bytesToInspect;
        }

        detectedMime ??= detectMime(inspection.subarray(0, inspectedBytes));
        hash.update(chunk);
        if (!output.write(chunk)) {
          await once(output, "drain");
        }
      }

      output.end();
      await finished(output);

      if (!detectedMime || !this.isKindCompatible(input.kind, detectedMime)) {
        throw new MediaPocError("MEDIA_INVALID");
      }

      if (
        input.kind === "video" &&
        this.videoDurationSeconds(inspection.subarray(0, inspectedBytes)) > MAX_VIDEO_SECONDS
      ) {
        throw new MediaPocError("MEDIA_VIDEO_TOO_LONG");
      }

      await rename(temporaryPath, finalPath);
      const expiresAt = new Date(Date.now() + TEMPORARY_TTL_MS);
      const checksum = hash.digest("hex");
      const record = await this.metadata.mediaPocObject.create({
        data: {
          bytes: BigInt(totalBytes),
          checksum,
          detectedMime,
          expiresAt,
          physicalName,
          state: "AVAILABLE",
        },
      });

      return {
        bytes: totalBytes,
        checksum,
        detectedMime,
        expiresAt: expiresAt.toISOString(),
        id: record.id,
      };
    } catch (error) {
      output.destroy();
      await rm(temporaryPath, { force: true });
      await rm(finalPath, { force: true });
      throw error;
    }
  }

  async cleanupExpiredTemporaries(now: Date = new Date()): Promise<number> {
    const temporaryDirectory = join(this.mediaRoot, ".tmp");
    let deleted = 0;

    try {
      for (const fileName of await readdir(temporaryDirectory)) {
        const path = join(temporaryDirectory, fileName);
        const details = await stat(path);
        if (now.getTime() - details.mtime.getTime() >= TEMPORARY_TTL_MS) {
          await rm(path, { force: true });
          deleted += 1;
        }
      }
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }

    return deleted;
  }

  authorizedInternalRedirect(actorId: string, ownerId: string, physicalName: string): string {
    if (actorId !== ownerId || !/^[0-9a-f-]{36}$/i.test(physicalName)) {
      throw new MediaPocError("MEDIA_FORBIDDEN");
    }

    return `/internal-media/${physicalName}`;
  }

  private assertUploadAllowed(input: MediaPocUpload): void {
    if (input.actorId !== input.ownerId) throw new MediaPocError("MEDIA_FORBIDDEN");
    const maximumCount = input.kind === "image" ? MAX_IMAGES : 1;
    if (
      !Number.isInteger(input.existingCount) ||
      input.existingCount < 0 ||
      input.existingCount >= maximumCount
    ) {
      throw new MediaPocError("MEDIA_LIMIT_EXCEEDED");
    }
  }

  private isKindCompatible(kind: MediaKind, mime: MediaPocUploadResult["detectedMime"]): boolean {
    return kind === "image" ? mime === "image/jpeg" || mime === "image/png" : mime === "video/mp4";
  }

  private maxBytesFor(kind: MediaKind): number {
    return kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  }

  private videoDurationSeconds(bytes: Uint8Array): number {
    const marker = Buffer.from("mvhd");
    const index = Buffer.from(bytes).indexOf(marker);
    if (index < 0 || bytes.byteLength < index + 24) throw new MediaPocError("MEDIA_INVALID");

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const timescale = view.getUint32(index + 16);
    const duration = view.getUint32(index + 20);
    if (timescale === 0) throw new MediaPocError("MEDIA_INVALID");
    return duration / timescale;
  }
}

function detectMime(bytes: Uint8Array): MediaPocUploadResult["detectedMime"] | undefined {
  if (
    bytes.byteLength >= 8 &&
    Buffer.from(bytes.subarray(0, 8)).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  ) {
    return "image/png";
  }
  if (bytes.byteLength >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if (bytes.byteLength >= 12 && Buffer.from(bytes.subarray(4, 8)).equals(Buffer.from("ftyp")))
    return "video/mp4";
  return undefined;
}
