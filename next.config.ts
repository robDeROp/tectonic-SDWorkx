import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  devIndicators: false,
  // The generated Tasks client loads these assets through a dynamic require.
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/@google-cloud/tasks/build/**/*.json",
      "./node_modules/google-gax/build/protos/**/*",
    ],
  },
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
