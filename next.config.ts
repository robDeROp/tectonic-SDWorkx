import type { NextConfig } from "next";
import { contentSecurityPolicy } from "./lib/security-headers";

const config: NextConfig = {
  output: "standalone",
  devIndicators: false,
  poweredByHeader: false,
  headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // The page proxy adds a fresh nonce; APIs and assets keep this policy.
          { key: "Content-Security-Policy", value: contentSecurityPolicy() },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
  // The generated Tasks client loads these assets through a dynamic require.
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/@google-cloud/tasks/build/**/*.json",
      "./node_modules/google-gax/build/protos/**/*",
    ],
    "/api/tickets/*/*": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
  },
  serverExternalPackages: [
    "pg",
    "pdfjs-dist",
    "mammoth",
    "@google-cloud/tasks",
    "@google-cloud/storage",
  ],
  experimental: { proxyClientMaxBodySize: "11mb" },
};
export default config;
