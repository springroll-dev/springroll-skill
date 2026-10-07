import { createHash } from "node:crypto";
import { copyFile, lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const skill = fileURLToPath(new URL("../", import.meta.url));
const variants = ["next-postgres", "node-postgres", "docker-postgres", "node-redis", "worker-d1"];

/** Scaffolding is local-only and refuses existing files or paths outside the destination. */
async function main() {
  const [variant, directory, slug = "springroll-tasks"] = process.argv.slice(2);
  if (variant === "--list") { console.log(variants.join("\n")); return; }
  if (!variants.includes(variant) || !directory || !/^[a-z][a-z0-9-]{1,61}[a-z0-9]$/.test(slug)) {
    throw new Error("Usage: node create-app.mjs <variant> <new-directory> <app-slug>; use --list for variants.");
  }
  const template = JSON.parse(await readFile(path.join(skill, "assets", "templates", `${variant}.json`), "utf8"));
  const sdk = path.join(skill, "assets", "sdk", template.sdk.filename);
  const digest = createHash("sha256").update(await readFile(sdk)).digest("hex");
  if (digest !== template.sdk.sha256) throw new Error("Bundled SDK integrity check failed.");
  const target = path.resolve(directory);
  const existing = await lstat(target).catch(error => { if (error.code === "ENOENT") return undefined; throw error; });
  if (existing && (!existing.isDirectory() || existing.isSymbolicLink() || (await readdir(target)).length)) {
    throw new Error("Destination must be a new or empty directory; existing projects are never replaced.");
  }
  const files = { ...template.files, "springroll.json": JSON.stringify({ ...template.manifest, metadata: { name: slug } }, null, 2) + "\n" };
  // Validate every path before writing any project content.
  for (const name of [...Object.keys(files), `vendor/${template.sdk.filename}`]) {
    const resolved = path.resolve(target, name);
    if (name.includes("\\") || path.isAbsolute(name) || !resolved.startsWith(`${target}${path.sep}`)) throw new Error("Invalid template path.");
  }
  await mkdir(target, { recursive: true });
  for (const [name, source] of Object.entries(files)) {
    const file = path.resolve(target, name);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, source, { flag: "wx" });
  }
  await mkdir(path.join(target, "vendor"), { recursive: true });
  await copyFile(sdk, path.join(target, "vendor", template.sdk.filename));
  console.log(`Created ${variant} in ${target}. Review its record authorization and springroll.json, then run npm install and npm run build.`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
