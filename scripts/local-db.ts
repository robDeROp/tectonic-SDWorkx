import EmbeddedPostgres from "embedded-postgres";
const postgres = new EmbeddedPostgres({
  databaseDir: ".data/postgres",
  user: "demo",
  password: "demo",
  port: 54329,
  persistent: true,
});
async function main() {
  await postgres.initialise();
  await postgres.start();
  const client = postgres.getPgClient();
  await client.connect();
  const result = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = 'ticket_studio'",
  );
  if (!result.rowCount) await client.query("CREATE DATABASE ticket_studio");
  await client.end();
  console.log("PostgreSQL ready on 127.0.0.1:54329. Keep this terminal open.");
  const stop = async () => {
    await postgres.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
