import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import md5 from "md5";
import {
  Document,
  RecursiveCharacterTextSplitter,
} from "@pinecone-database/doc-splitter";
import { getEmbeddings } from "./embeddings";
import { convertToAscii } from "./utils";
import { Pinecone } from "@pinecone-database/pinecone";

export const getPineconeClient = async () => {
  const { Pinecone } = await import("@pinecone-database/pinecone");
  return new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });
};

type PDFPage = {
  pageContent: string;
  metadata: {
    loc?: { pageNumber: number };
    pageNumber?: number;
  };
};

export async function loadS3IntoPinecone(fileKey: string) {
  try {
    const { Pinecone } = await import("@pinecone-database/pinecone");
    
    const client = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    
    const pineconeIndex = client.index("chatpdf");
    const namespace = convertToAscii(fileKey);
    
    console.log("Loading into Pinecone namespace:", namespace);
    
    // Download PDF from S3
    const pdfBuffer = await downloadFromS3(fileKey);
    console.log("PDF downloaded from S3, size:", pdfBuffer.length);

    // Load PDF content into Pinecone
    const loader = new PDFLoader(new Blob([pdfBuffer], { type: 'application/pdf' }));
    const pages = await loader.load();
    console.log("PDF loaded, pages:", pages.length);

    // Prepare documents for embedding
    const documents = await Promise.all(
      pages.map(async (page) => {
        const docs = await prepareDocument(page);
        return docs;
      })
    );

    const flattenedDocs = documents.flat();
    console.log("Documents prepared:", flattenedDocs.length);

    // Create embeddings
    const embeddings = await Promise.all(
      flattenedDocs.map(async (doc) => {
        return await embedDocument(doc);
      })
    );

    console.log("Embeddings created:", embeddings.length);

    // Upload to Pinecone
    await pineconeIndex.namespace(namespace).upsert(embeddings);
    console.log("Uploaded batch 1/1");
    console.log("Pinecone loading completed for namespace:", namespace);
  } catch (error) {
    console.error("Pinecone loading error:", error);
    throw error;
  }
}

export async function deleteFromPinecone(fileKey: string) {
  try {
    const { Pinecone } = await import("@pinecone-database/pinecone");
    
    const client = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
    
    const pineconeIndex = client.index("chatpdf");
    const namespace = convertToAscii(fileKey);
    
    console.log("Deleting Pinecone namespace:", namespace);
    
    // Delete all vectors in the namespace
    await pineconeIndex.namespace(namespace).deleteAll();
    
    console.log("Pinecone deletion completed for namespace:", namespace);
  } catch (error) {
    console.error("Pinecone deletion error:", error);
    throw error;
  }
}

async function embedDocument(doc: Document) {
  try {
    const embeddings = await getEmbeddings(doc.pageContent);
    const hash = md5(doc.pageContent);

    return {
      id: hash,
      values: embeddings,
      metadata: {
        text: doc.metadata.text,
        pageNumber: doc.metadata.pageNumber,
      },
    } as any; // Type will be inferred by Pinecone
  } catch (error) {
    console.log("error embedding document", error);
    throw error;
  }
}

export const truncateStringByBytes = (str: string, bytes: number) => {
  const enc = new TextEncoder();
  return new TextDecoder("utf-8").decode(enc.encode(str).slice(0, bytes));
};

async function prepareDocument(page: PDFPage) {
  let { pageContent, metadata } = page;
  pageContent = pageContent.replace(/\n/g, "");
  
  // Extract page number from metadata
  const pageNumber = metadata.loc?.pageNumber || metadata.pageNumber || 1;
  
  // split the docs
  const splitter = new RecursiveCharacterTextSplitter();
  const docs = await splitter.splitDocuments([
    new Document({
      pageContent,
      metadata: {
        pageNumber: pageNumber,
        text: truncateStringByBytes(pageContent, 36000),
      },
    }),
  ]);
  return docs;
}
