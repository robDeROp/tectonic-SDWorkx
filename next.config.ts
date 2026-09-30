import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  devIndicators: false,
  serverExternalPackages: [
    "pg",
    "pdf-parse",
    "mammoth",
    "@google-cloud/tasks",
    "@google-cloud/storage",
  ],
  experimental: { proxyClientMaxBodySize: "11mb" },
};
export default config;
