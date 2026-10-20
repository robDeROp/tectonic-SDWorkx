import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import "@fontsource-variable/bricolage-grotesque/opsz.css";
import "@fontsource-variable/figtree";
import "@fontsource-variable/jetbrains-mono";
import "./tokens.css";
import "./globals.css";
import "./knowledge.css";
import { Shell } from "@/components/shell";
export const metadata: Metadata = {
  title: "Hunch · SD Worx",
  description: "The context behind every customer question.",
};
export const viewport: Viewport = {
  themeColor: "#fff8ef",
  colorScheme: "light",
};
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // A cached HTML shell would reuse a nonce or omit it from Next.js scripts.
  await connection();
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
