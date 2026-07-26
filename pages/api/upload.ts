import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import formidable, { File } from "formidable";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import path from "path";

export const config = { api: { bodyParser: false } };

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "POST") { res.setHeader("Allow", ["POST"]); return res.status(405).end(); }

  const form = formidable({
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024,
    filter: ({ mimetype }) => !!mimetype?.startsWith("image/"),
  });

  form.parse(req, async (err, _fields, files) => {
    if (err) return res.status(400).json({ error: "Upload failed" });
    const file = Array.isArray(files.image) ? files.image[0] : (files.image as File | undefined);
    if (!file) return res.status(400).json({ error: "No image provided" });

    const ext = path.extname(file.originalFilename ?? file.filepath);
    const key = `products/${crypto.randomUUID()}${ext}`;

    try {
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: fs.createReadStream(file.filepath),
        ContentType: file.mimetype ?? "image/jpeg",
      }));
      fs.unlink(file.filepath, () => {});
      return res.status(201).json({ url: `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}` });
    } catch {
      return res.status(500).json({ error: "S3 upload failed" });
    }
  });
}
