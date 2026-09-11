import { Courier_Prime, Source_Serif_4 } from "next/font/google";

export const typewriter = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-typewriter",
  display: "swap",
});

export const document = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-document",
  display: "swap",
});
