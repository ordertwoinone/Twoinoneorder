import type { Metadata } from "next";
import { Inter, Dancing_Script } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const dancing = Dancing_Script({ subsets: ["latin"], variable: "--font-dancing", weight: ["700"] });

export const metadata: Metadata = {
  title: "Two In One UAE — Food Delivery Platform",
  description:
    "Order from UAE's top restaurants: Falafel Al Nile, Karak & Snack, Mini Box, and Two In One. Fast delivery across Dubai and UAE.",
  keywords: "food delivery UAE, karak Dubai, falafel Dubai, catering UAE",
  openGraph: {
    title: "Two In One UAE",
    description: "Four restaurants. One platform. Delivered to your door.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} ${dancing.variable} antialiased`}>{children}</body>
    </html>
  );
}
