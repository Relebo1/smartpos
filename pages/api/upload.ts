import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import formidable, { File } from "formidable";
import path from "path";
import fs from "fs";

export const config = { api: { bodyParser: false } };

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "POST") { res.setHeader("Allow", ["POST"]); return res.status(405).end(); }

  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const form = formidable({
    uploadDir: UPLOAD_DIR,
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    filter: ({ mimetype }) => !!mimetype?.startsWith("image/"),
  });

  form.parse(req, (err, _fields, files) => {
    if (err) return res.status(400).json({ error: "Upload failed" });
    const file = Array.isArray(files.image) ? files.image[0] : (files.image as File | undefined);
    if (!file) return res.status(400).json({ error: "No image provided" });
    const filename = path.basename(file.filepath);
    return res.status(201).json({ url: `/uploads/products/${filename}` });
  });
}
