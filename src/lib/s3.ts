import { PutObjectCommandOutput, S3, DeleteObjectCommand } from "@aws-sdk/client-s3";

export async function uploadToS3(
  file: File | { arrayBuffer: () => Promise<Buffer>; name: string; type: string; size: number }
): Promise<{ file_key: string; file_name: string }> {
  try {
    console.log("S3 Configuration:", {
      region: "us-east-1",
      bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME,
      accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID ? "Set" : "Missing",
      secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY ? "Set" : "Missing",
    });
    
    const s3 = new S3({
      region: "us-east-1",
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY!,
      },
    });

    const file_key =
      "uploads/" + Date.now().toString() + file.name.replace(" ", "-");

    // Supporta sia File browser che oggetti file-like Node.js
    const fileBuffer = await file.arrayBuffer();
    
    const params = {
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
      Key: file_key,
      Body: Buffer.isBuffer(fileBuffer) ? fileBuffer : new Uint8Array(fileBuffer),
      ContentType: file.type,
    };
    
    console.log("Starting S3 upload with params:", { 
      Bucket: params.Bucket, 
      Key: params.Key, 
      BodySize: file.size 
    });
    
    const data = await s3.putObject(params);
    console.log("S3 Upload Success:", data);
    
    return {
      file_key,
      file_name: file.name,
    };
  } catch (error) {
    console.error("S3 Upload Error:", error);
    throw error;
  }
}

export function getS3Url(file_key: string) {
  const url = `https://${process.env.NEXT_PUBLIC_S3_BUCKET_NAME}.s3.amazonaws.com/${file_key}`;
  return url;
}

export async function deleteFromS3(fileKey: string) {
  try {
    const s3 = new S3({
      region: "us-east-1",
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.NEXT_PUBLIC_S3_SECRET_ACCESS_KEY!,
      },
    });

    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.NEXT_PUBLIC_S3_BUCKET_NAME!,
      Key: fileKey,
    });

    await s3.send(deleteCommand);
    console.log("S3 deletion successful for:", fileKey);
  } catch (error) {
    console.error("S3 deletion error:", error);
    throw error;
  }
}
