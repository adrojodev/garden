import admin from "firebase-admin";
import { createReadStream } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceAccount = JSON.parse(
  await readFile(path.join(__dirname, "../firebase-adminsdk.json"), "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "blog-d7288.firebasestorage.app",
});

const bucket = admin.storage().bucket();
const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: node upload-image.js <image-path>");
  process.exit(1);
}

const fileName = `images/${Date.now()}-${path.basename(filePath)}`;
await bucket.upload(filePath, {
  destination: fileName,
  metadata: { cacheControl: "public, max-age=31536000" },
});

const file = bucket.file(fileName);
await file.makePublic();
const url = `https://storage.googleapis.com/blog-d7288.firebasestorage.app/${fileName}`;
console.log(url);
