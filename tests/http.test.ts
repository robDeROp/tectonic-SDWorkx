import { describe, expect, it } from "vitest";
import { sameOrigin } from "../lib/http";
describe("Same-origin writes", () => {
  it("accepts loopback requests when Next normalizes the URL", () =>
    expect(() =>
      sameOrigin(
        new Request("http://localhost:3000/api/tickets", {
          headers: { origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000" },
        }),
      ),
    ).not.toThrow());
  it("rejects cross-origin browser writes and opaque origins", () => {
    for (const origin of ["https://attacker.example", "null"])
      expect(() =>
        sameOrigin(
          new Request("http://localhost:3000/api/tickets", {
            headers: { origin, host: "localhost:3000" },
          }),
        ),
      ).toThrow();
  });
});
