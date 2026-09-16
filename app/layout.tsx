import type { Metadata } from "next";
import { panel, panelNarrow, source, overprint } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Redline: every warning quotes the sentence it came from",
  description:
    "Redline reads a contract you cannot negotiate and hands back what it found, ranked by how easy it is to miss and how hard it is to undo, with the exact sentence beside each one.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${panel.variable} ${panelNarrow.variable} ${source.variable} ${overprint.variable} bg-carton text-carton-ink antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
