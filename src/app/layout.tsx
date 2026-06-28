import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Open Stage with Demir",
  description: "Sign up to perform at Open Stage!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className={`${inter.className} h-full`}>
      <body className="min-h-full flex flex-col bg-[#1A1A1A] text-white">
        {children}
      </body>
    </html>
  );
}
