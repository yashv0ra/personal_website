import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Public CC0 source metadata: https://api.polyhaven.com/files/cracked_concrete_wall
// SHA-256 values were measured from the original local reference assets.
// This is a reproducible cloud bootstrap; it never handles API keys or .env files.
const assets = [
  {
    file: "concrete-color.jpg",
    url: "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/cracked_concrete_wall/cracked_concrete_wall_diff_1k.jpg",
    bytes: 1073985,
    sha256: "f910cbaff5a0fbd778a8c41947ac826f2313e70e9b4077bc39221a417fa8d5b4",
  },
  {
    file: "concrete-normal.jpg",
    url: "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/cracked_concrete_wall/cracked_concrete_wall_nor_gl_1k.jpg",
    bytes: 950747,
    sha256: "d247bdc21f3d37eb514d058aaa3c2193a6955d12191d1190cedf5285985f8604",
  },
  {
    file: "concrete-roughness.jpg",
    url: "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/cracked_concrete_wall/cracked_concrete_wall_rough_1k.jpg",
    bytes: 591307,
    sha256: "0f18937de6a05b34797d2ddaac5a3996e922696431161d312b7304ac1b110312",
  },
];

const directory = new URL("../public/room/", import.meta.url);
const digest = (buffer) => createHash("sha256").update(buffer).digest("hex");

async function download(asset) {
  const destination = new URL(asset.file, directory);
  try {
    const existing = await readFile(destination);
    if (existing.length === asset.bytes && digest(existing) === asset.sha256) {
      console.log(`Verified existing ${asset.file}`);
      return;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const response = await fetch(asset.url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${asset.file}: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length !== asset.bytes || digest(buffer) !== asset.sha256) {
    throw new Error(`${asset.file}: the downloaded bytes do not match the approved reference asset.`);
  }
  const temporary = `${fileURLToPath(destination)}.${process.pid}.tmp`;
  try {
    await writeFile(temporary, buffer, { flag: "wx" });
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
  console.log(`Downloaded and verified ${asset.file} (${buffer.length} bytes)`);
}

try {
  await mkdir(directory, { recursive: true });
  await Promise.all(assets.map(download));
  console.log("Room assets ready. License and attribution: public/room/CREDITS.md");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
