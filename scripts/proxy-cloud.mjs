import { execFile } from "node:child_process";
import { createServer, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, promisify } from "node:util";

const execute = promisify(execFile);

export function createCloudProxy({ origin, getToken }) {
  const target = new URL(origin);
  const request = target.protocol === "https:" ? httpsRequest : httpRequest;
  const server = createServer(async (incoming, outgoing) => {
    const port = server.address().port;
    const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
    const browserOrigin = incoming.headers.origin;
    // Check locally before attaching credentials. Reject DNS rebinding and
    // cross-site requests, including requests without an Origin header.
    if (
      !hosts.has(incoming.headers.host) ||
      incoming.headers["sec-fetch-site"] === "cross-site" ||
      (browserOrigin && browserOrigin !== `http://${incoming.headers.host}`) ||
      !incoming.url.startsWith("/") ||
      incoming.url.startsWith("//")
    ) {
      outgoing.writeHead(403).end("Local origin required.");
      return;
    }
    try {
      const headers = {
        ...incoming.headers,
        host: target.host,
        authorization: `Bearer ${await getToken()}`,
      };
      // The trusted local browser origin becomes the upstream service origin.
      // The deployed application's own origin checks stay enabled.
      if (browserOrigin) headers.origin = target.origin;
      delete headers["x-forwarded-host"];
      delete headers["x-forwarded-proto"];
      delete headers.connection;
      const upstream = request(target, {
        method: incoming.method,
        path: incoming.url,
        headers,
        timeout: 300000,
      }, (response) => {
        outgoing.writeHead(response.statusCode, response.headers);
        response.pipe(outgoing);
      });
      upstream.on("timeout", () => upstream.destroy());
      upstream.on("error", () => {
        if (!outgoing.headersSent) outgoing.writeHead(502);
        outgoing.end("Cloud service unavailable.");
      });
      incoming.on("aborted", () => upstream.destroy());
      incoming.pipe(upstream);
    } catch {
      outgoing.writeHead(502).end("Google Cloud sign-in required.");
    }
  });
  return server;
}

async function main() {
  const { values } = parseArgs({
    options: {
      project: { type: "string" },
      region: { type: "string", default: "us-central1" },
      port: { type: "string", default: "8080" },
    },
  });
  if (!values.project) throw new Error("Pass --project=YOUR_PROJECT_ID");
  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("Choose a port between 1024 and 65535.");
  const { stdout } = await execute("gcloud", [
    "run", "services", "describe", "clarity",
    `--project=${values.project}`, `--region=${values.region}`,
    "--format=value(status.url)",
  ]);
  const origin = stdout.trim();
  if (new URL(origin).protocol !== "https:")
    throw new Error("Expected an HTTPS Cloud Run service.");
  let token;
  let refreshAt = 0;
  let refreshing;
  const getToken = async () => {
    if (token && Date.now() < refreshAt) return token;
    refreshing ??= execute("gcloud", ["auth", "print-identity-token"])
      .then(({ stdout }) => {
        token = stdout.trim();
        if (!token) throw new Error("No identity token.");
        refreshAt = Date.now() + 5 * 60 * 1000;
        return token;
      })
      .finally(() => { refreshing = undefined; });
    return refreshing;
  };
  await getToken();
  const server = createCloudProxy({ origin, getToken });
  server.on("error", (error) => {
    console.error(error.code || "Proxy failed");
    process.exitCode = 1;
  });
  server.listen(port, "127.0.0.1", () => {
    console.log(`Open http://127.0.0.1:${port} — authenticated proxy to ${origin}`);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main().catch(() => {
    console.error("Cannot start proxy. Check the project, port and gcloud sign-in.");
    process.exitCode = 1;
  });
