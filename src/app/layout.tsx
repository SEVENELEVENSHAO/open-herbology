import type { Metadata, Viewport } from "next";
import { Noto_Sans_SC } from "next/font/google";
import { RandomPlantIcon } from "@/components/random-plant-icon";
import "./globals.css";

const sans = Noto_Sans_SC({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Open Herbology | Formula & Herb Reference",
  description: "A private Chinese medicine formula and herb reference, combined from two source apps.",
  manifest: `${basePath}/manifest.webmanifest`,
  appleWebApp: { capable: true, title: "Open Herbology", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={sans.variable}>
      <body>
        <RandomPlantIcon />
        {children}
      </body>
    </html>
  );
}
