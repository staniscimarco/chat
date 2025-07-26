import { S3 } from "@aws-sdk/client-s3";
import fs from "fs";

export async function downloadFromS3(file_key: string): Promise<Buffer> {
  try {
    const s3 = new S3({
      region: "us-east-1",
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY!,
      },
    });
    
    const params = {
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
      Key: file_key,
    };

    const obj = await s3.getObject(params);
    
    if (obj.Body) {
      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const stream = obj.Body as any;
      
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk: Uint8Array) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    }
    
    throw new Error("No body in S3 object");
  } catch (error) {
    console.error("Error downloading from S3:", error);
    throw error;
  }
}
