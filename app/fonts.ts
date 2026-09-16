import { Archivo, Archivo_Narrow, Tinos, DotGothic16 } from "next/font/google";

/**
 * Three voices, each with a job the others cannot do.
 * See DESIGN.md "The Three-Voice Rule."
 */

/** The panel's own regulatory voice: headings, labels, rules, body. */
export const panel = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-panel",
  display: "swap",
});

/** Condensed cut for dense ruled rows and panel labels. */
export const panelNarrow = Archivo_Narrow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-panel-narrow",
  display: "swap",
});

/** The source document's own voice. Verbatim quoted clauses only. */
export const source = Tinos({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-source",
  display: "swap",
});

/** The overprint: lot codes, document IDs, red-line match stamps. */
export const overprint = DotGothic16({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-overprint",
  display: "swap",
});
