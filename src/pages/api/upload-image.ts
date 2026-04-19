import type { APIRoute } from "astro";
import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: import.meta.env.FIREBASE_PROJECT_ID,
      clientEmail: import.meta.env.FIREBASE_CLIENT_EMAIL,
      privateKey: import.meta.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    storageBucket: "blog-d7288.firebasestorage.app",
  });
}

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const file = formData.get("image") as File;

  if (!file) {
    return new Response(JSON.stringify({ error: "No image provided" }), {
      status: 400,
    });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `images/${Date.now()}-${file.name}`;
  const bucket = admin.storage().bucket();
  const fileRef = bucket.file(fileName);

  await fileRef.save(buffer, {
    metadata: {
      contentType: file.type,
      cacheControl: "public, max-age=31536000",
    },
  });

  await fileRef.makePublic();
  const url = `https://storage.googleapis.com/blog-d7288.firebasestorage.app/${fileName}`;

  return new Response(JSON.stringify({ url }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
