import admin from "firebase-admin";
import { readFile, writeFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { glob } from "glob";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const serviceAccount = JSON.parse(
  await readFile(path.join(__dirname, "../firebase-adminsdk.json"), "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "blog-d7288.firebasestorage.app",
});

const bucket = admin.storage().bucket();

async function uploadImage(filePath) {
  const fileName = `images/${Date.now()}-${path.basename(filePath)}`;
  await bucket.upload(filePath, {
    destination: fileName,
    metadata: { cacheControl: "public, max-age=31536000" },
  });
  const file = bucket.file(fileName);
  await file.makePublic();
  return `https://storage.googleapis.com/blog-d7288.firebasestorage.app/${fileName}`;
}

// Matches ![alt](local-path) — skips http/https URLs
const MD_IMAGE = /!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g;
// Matches ![[local-path]] (Obsidian wiki links)
const WIKI_IMAGE = /!\[\[(?!https?:\/\/)([^\]]+)\]\]/g;

const posts = await glob("src/pages/posts/**/*.md", { cwd: root });
let total = 0;

for (const postRelPath of posts) {
  const postPath = path.join(root, postRelPath);
  const postDir = path.dirname(postPath);
  let content = await readFile(postPath, "utf8");
  let changed = false;

  // Handle standard markdown images
  const mdMatches = [...content.matchAll(MD_IMAGE)];
  for (const match of mdMatches) {
    const [full, alt, imgRelPath] = match;
    const imgPath = path.resolve(postDir, imgRelPath.trim());
    if (!existsSync(imgPath)) {
      console.warn(`  ⚠ File not found, skipping: ${imgRelPath}`);
      continue;
    }
    console.log(`Uploading: ${imgPath}`);
    const url = await uploadImage(imgPath);
    content = content.replace(full, `![${alt}](${url})`);
    await unlink(imgPath);
    changed = true;
    total++;
  }

  // Handle Obsidian wiki-style images
  const wikiMatches = [...content.matchAll(WIKI_IMAGE)];
  for (const match of wikiMatches) {
    const [full, imgRelPath] = match;
    const imgPath = path.resolve(postDir, imgRelPath.trim());
    if (!existsSync(imgPath)) {
      console.warn(`  ⚠ File not found, skipping: ${imgRelPath}`);
      continue;
    }
    console.log(`Uploading: ${imgPath}`);
    const url = await uploadImage(imgPath);
    const alt = path.basename(imgRelPath, path.extname(imgRelPath));
    content = content.replace(full, `![${alt}](${url})`);
    await unlink(imgPath);
    changed = true;
    total++;
  }

  if (changed) {
    await writeFile(postPath, content, "utf8");
    console.log(`Updated: ${postRelPath}`);
  }
}

console.log(`\nDone. ${total} image(s) uploaded.`);
