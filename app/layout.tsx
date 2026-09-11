import type { Metadata } from "next";
import { typewriter, document as documentFont } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Redline: see exactly what a contract does to you",
  description:
    "Upload a contract and get every risky clause flagged, ranked, and shown next to the exact sentence it came from.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${typewriter.variable} ${documentFont.variable} bg-paper text-ink antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
