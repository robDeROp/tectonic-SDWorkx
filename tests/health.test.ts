import { beforeEach, expect, it, vi } from "vitest";
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/db", () => ({ pool: { query } }));
import { GET } from "../app/api/health/route";
beforeEach(() => {
  query.mockReset();
});
it("confirms the database schema without returning customer data", async () => {
  query.mockResolvedValue({ rows: [] });
  const response = await GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
  expect(response.headers.get("Cache-Control")).toBe("no-store");
});
it("fails closed without leaking database errors", async () => {
  query.mockImplementation(async () => {
    throw new Error("database unavailable");
  });
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ status: "unavailable" });
});
