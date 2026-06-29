import type { Metadata } from "next";
import { Inter, Playfair_Display, Dancing_Script } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], weight: ["700", "800", "900"], variable: "--font-playfair" });
const dancing = Dancing_Script({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-dancing" });

export const metadata: Metadata = {
  title: "Open Stage with Demir",
  description: "Kliv upp på scen! Sign up to perform at Open Stage.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv" className={`${inter.variable} ${playfair.variable} ${dancing.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#110C07] text-[#F5F0E8] font-[family-name:var(--font-inter)]">
        {children}
      </body>
    </html>
  );
}
