import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
// import { ClerkProvider } from "@clerk/nextjs";
import Providers from "@/components/Providers";
import Toaster from "@/components/Toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DOCKY-AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // <ClerkProvider>
      <Providers>
        <html lang="en" className="h-full">
          <body className={`${inter.className} h-full m-0 p-0`}>
            {children}
            <Toaster />
          </body>
        </html>
      </Providers>
    // </ClerkProvider>
  );
}
