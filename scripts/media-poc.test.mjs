import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { MediaPocError, MediaPocService } from "../apps/api/dist/media-poc/media-poc.service.js";

function metadataStore() {
  const records = [];
  return {
    records,
    mediaPocObject: {
      async create({ data }) {
        const record = { ...data, id: `media-${records.length + 1}` };
        records.push(record);
        return record;
      },
    },
  };
}

async function* chunks(header, bytes, chunkSize = 64 * 1024) {
  yield header;
  let remaining = bytes;
  while (remaining > 0) {
    const length = Math.min(remaining, chunkSize);
    yield new Uint8Array(length);
    remaining -= length;
  }
}

function mp4Header(seconds) {
  const header = Buffer.alloc(32);
  header.writeUInt32BE(24, 0);
  header.write("ftyp", 4);
  header.write("isom", 8);
  header.write("mvhd", 12);
  header.writeUInt32BE(1000, 28);
  const result = Buffer.alloc(36);
  header.copy(result);
  result.writeUInt32BE(seconds * 1000, 32);
  return result;
}

test("[media-stream-valid] PoC transmite 50 MB con memoria acotada y finaliza de forma atómica", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "pigar-media-poc-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const store = metadataStore();
  const service = new MediaPocService(store, root);
  const initialHeap = process.memoryUsage().heapUsed;
  let maximumHeap = initialHeap;

  async function* measuredVideo() {
    for await (const chunk of chunks(mp4Header(30), 50 * 1024 * 1024 - 36)) {
      maximumHeap = Math.max(maximumHeap, process.memoryUsage().heapUsed);
      yield chunk;
    }
  }

  const result = await service.upload({
    actorId: "client-a",
    existingCount: 0,
    kind: "video",
    ownerId: "client-a",
    source: measuredVideo(),
  });

  assert.equal(result.bytes, 50 * 1024 * 1024);
  assert.equal(result.detectedMime, "video/mp4");
  assert.match(result.checksum, /^[a-f0-9]{64}$/);
  assert.equal(Object.hasOwn(result, "physicalName"), false);
  assert.equal(store.records.length, 1);
  assert.ok(
    maximumHeap - initialHeap < 32 * 1024 * 1024,
    "la PoC no debe retener el archivo completo en heap",
  );
  assert.equal((await readdir(join(root, ".tmp"))).length, 0);
  assert.equal((await readdir(join(root, "objects"))).length, 1);
});

test("[media-invalid][media-cross-access] PoC rechaza MIME, duración, exceso, actor cruzado e interrupción sin objeto final", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "pigar-media-poc-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const service = new MediaPocService(metadataStore(), root);
  const base = { actorId: "client-a", existingCount: 0, kind: "image", ownerId: "client-a" };

  await assert.rejects(
    service.upload({ ...base, source: chunks(Buffer.from("not-media"), 16) }),
    (error) => error instanceof MediaPocError && error.code === "MEDIA_INVALID",
  );
  await assert.rejects(
    service.upload({
      ...base,
      actorId: "client-b",
      source: chunks(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 16),
    }),
    (error) => error instanceof MediaPocError && error.code === "MEDIA_FORBIDDEN",
  );
  await assert.rejects(
    service.upload({
      ...base,
      existingCount: 5,
      source: chunks(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 16),
    }),
    (error) => error instanceof MediaPocError && error.code === "MEDIA_LIMIT_EXCEEDED",
  );
  await assert.rejects(
    service.upload({
      ...base,
      source: chunks(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        10 * 1024 * 1024,
      ),
    }),
    (error) => error instanceof MediaPocError && error.code === "MEDIA_TOO_LARGE",
  );
  await assert.rejects(
    service.upload({ ...base, kind: "video", source: chunks(mp4Header(31), 16) }),
    (error) => error instanceof MediaPocError && error.code === "MEDIA_VIDEO_TOO_LONG",
  );
  async function* interrupted() {
    yield Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    throw new Error("synthetic interruption");
  }
  await assert.rejects(
    service.upload({ ...base, source: interrupted() }),
    /synthetic interruption/,
  );

  assert.equal((await readdir(join(root, "objects"))).length, 0);
  assert.equal((await readdir(join(root, ".tmp"))).length, 0);
});

test("PoC limpia temporales vencidos y solo entrega redirect interno al propietario", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "pigar-media-poc-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const service = new MediaPocService(metadataStore(), root);
  const temporaryDirectory = join(root, ".tmp");
  await service.upload({
    actorId: "client-a",
    existingCount: 0,
    kind: "image",
    ownerId: "client-a",
    source: chunks(Buffer.from([0xff, 0xd8, 0xff]), 16),
  });
  await writeFile(join(temporaryDirectory, "expired.part"), "synthetic");
  const removed = await service.cleanupExpiredTemporaries(new Date(Date.now() + 61 * 60 * 1000));

  const physicalName = randomUUID();
  assert.equal(removed, 1);
  assert.equal(
    service.authorizedInternalRedirect("client-a", "client-a", physicalName),
    `/internal-media/${physicalName}`,
  );
  assert.throws(
    () => service.authorizedInternalRedirect("client-b", "client-a", physicalName),
    (error) => error instanceof MediaPocError && error.code === "MEDIA_FORBIDDEN",
  );
  assert.equal(createHash("sha256").update("PIGAR").digest("hex").length, 64);
});
