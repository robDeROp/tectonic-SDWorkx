import { spawnSync } from "node:child_process";
import { parseEnv } from "node:util";
import { readFileSync } from "node:fs";

const project = process.argv[2];
if (!project || !/^[a-z][a-z0-9-]+$/.test(project))
  throw new Error(
    "Usage: node scripts/sync-jev-secret.mjs PROJECT_ID [APP_SERVICE_ACCOUNT]",
  );
const key = parseEnv(
  readFileSync(new URL("../.env", import.meta.url), "utf8"),
).JEV_KEY?.trim();
if (!key) throw new Error("JEV_KEY is missing from .env");
const secret = "clarity-jev-key";
function gcloud(args, input) {
  const result = spawnSync(
    "gcloud",
    [...args, `--project=${project}`, "--quiet"],
    {
      input,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  if (result.status !== 0) {
    // Do not echo CLI output; it can contain sensitive response data.
    throw new Error(
      `GCP operation failed: ${args.slice(0, 3).join(" ")} (exit ${result.status})`,
    );
  }
  return result.stdout;
}
const existing = JSON.parse(gcloud(["secrets", "list", "--format=json(name)"]));
if (!existing.some((item) => item.name.endsWith(`/${secret}`)))
  gcloud(["secrets", "create", secret, "--replication-policy=automatic"]);
const versions = JSON.parse(
  gcloud(["secrets", "versions", "list", secret, "--format=json(name,state)"]),
);
const latest = versions.sort(
  (a, b) => Number(b.name.split("/").at(-1)) - Number(a.name.split("/").at(-1)),
)[0];
const matches =
  latest?.state === "ENABLED" &&
  gcloud(["secrets", "versions", "access", "latest", `--secret=${secret}`]) ===
    key;
if (!matches)
  gcloud(["secrets", "versions", "add", secret, "--data-file=-"], key);
if (process.argv[3]) {
  const account = process.argv[3];
  if (!account.endsWith(`@${project}.iam.gserviceaccount.com`))
    throw new Error("Service account must belong to the target project");
  gcloud([
    "secrets",
    "add-iam-policy-binding",
    secret,
    `--member=serviceAccount:${account}`,
    "--role=roles/secretmanager.secretAccessor",
  ]);
}
if (
  gcloud(["secrets", "versions", "access", "latest", `--secret=${secret}`]) !==
  key
)
  throw new Error("Secret verification failed");
console.log(
  `${secret}: ${matches ? "already current" : "stored"} and verified in ${project}. Key not printed.`,
);
