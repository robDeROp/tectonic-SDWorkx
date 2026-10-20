import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque/opsz.css";
import "@fontsource-variable/figtree";
import "@fontsource-variable/jetbrains-mono";
import "./tokens.css";
import "./globals.css";
import "./hunch.css";
import { Shell } from "@/components/shell";
export const metadata: Metadata = {
  title: "Hunch · SD Worx",
  description:
    "Elke vraag, de juiste kennis en je volgende stappen op één plek.",
};
export const viewport: Viewport = {
  themeColor: "#fff8ef",
  colorScheme: "light",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
