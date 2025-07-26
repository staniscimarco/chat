import { NextRequest, NextResponse } from "next/server";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand, S3 } from "@aws-sdk/client-s3";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
    }

    console.log("📄 PDF Proxy: Serving PDF with key:", key);

    const s3Client = new S3({
      region: "us-east-1",
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY!,
      },
    });

    const command = new GetObjectCommand({
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    console.log("📄 PDF Proxy: Generated signed URL for key:", key);

    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error("📄 PDF Proxy Error:", error);
    return NextResponse.json({ error: "Failed to generate PDF URL" }, { status: 500 });
  }
} 