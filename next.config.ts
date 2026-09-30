import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  devIndicators: false,
  serverExternalPackages: [
    "pg",
    "pdfjs-dist",
    "mammoth",
    "@google-cloud/tasks",
    "@google-cloud/storage",
  ],
  outputFileTracingIncludes: {
    "/api/tickets/*/*": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
  },
  experimental: { proxyClientMaxBodySize: "11mb" },
};
export default config;
