import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import UploadPageClient from "@/components/UploadPageClient";

export default async function UploadPage() {
  const { currentUser } = await auth();
  
  if (!currentUser) {
    redirect("/login");
  }

  return <UploadPageClient currentUser={currentUser} />;
} 