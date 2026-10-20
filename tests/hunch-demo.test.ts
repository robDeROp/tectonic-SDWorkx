import { describe, expect, it } from "vitest";
import { hunchDemoData } from "../lib/hunch-demo";
import { findEmployee } from "../lib/directory";
import { contextView } from "../lib/hunches";

describe("Hunch demo coverage", () => {
  it("covers every input channel and status", () => {
    const demo = hunchDemoData();
    for (const source of ["hunch", "teams", "outlook"]) {
      for (const status of ["open", "waiting", "helping", "resolved"]) {
        expect(
          demo.hunches.some(
            (row) =>
              (row.source ?? "hunch") === source && row.status === status,
          ),
        ).toBe(true);
      }
    }
    expect(new Set(demo.hunches.map((row) => row.id)).size).toBe(
      demo.hunches.length,
    );
  });

  it("keeps imported messages before the hunch opens and replies afterwards", () => {
    const demo = hunchDemoData();
    for (const row of demo.hunches) {
      const messages = demo.messages.filter(
        (message) => message.hunchId === row.id,
      );
      expect(messages.length).toBeGreaterThan(0);
      if ((row.source ?? "hunch") === "hunch") continue;
      expect(row.sourceLabel).toBeTruthy();
      expect(messages.some((message) => message.source === row.source)).toBe(
        true,
      );
      for (const message of messages) {
        const messageTime = message.createdAt!.getTime();
        if ((message.source ?? "hunch") === "hunch") {
          expect(messageTime).toBeGreaterThanOrEqual(row.createdAt!.getTime());
        } else {
          expect(messageTime).toBeLessThan(row.createdAt!.getTime());
        }
      }
    }
  });

  it("has valid people, attachments and consistent active help requests", () => {
    const demo = hunchDemoData();
    const ids = new Set(demo.hunches.map((row) => row.id));
    for (const row of demo.hunches) {
      expect(findEmployee(row.authorId)).toBeDefined();
      const active = demo.calls.filter(
        (call) =>
          call.hunchId === row.id &&
          ["notified", "accepted"].includes(call.state),
      );
      if (row.status === "waiting" || row.status === "helping") {
        expect(active).toHaveLength(1);
        expect(active[0].state).toBe(
          row.status === "waiting" ? "notified" : "accepted",
        );
        expect(active[0].recipientId).not.toBe(row.authorId);
      } else if (row.status === "open") {
        expect(active).toHaveLength(0);
      }
    }
    for (const call of demo.calls) {
      expect(ids.has(call.hunchId)).toBe(true);
      expect(findEmployee(call.recipientId)).toBeDefined();
    }
    for (const message of demo.messages) {
      expect(ids.has(message.hunchId)).toBe(true);
      if (message.authorId)
        expect(findEmployee(message.authorId)).toBeDefined();
      else expect(message.authorDetail).toBeTruthy();
      if (message.attachmentName)
        expect(message.attachmentText!.length).toBeGreaterThan(10);
    }
    for (const source of ["hunch", "outlook"]) {
      expect(
        demo.messages.some(
          (message) =>
            (message.source ?? "hunch") === source && message.attachmentName,
        ),
      ).toBe(true);
    }
    expect(new Set(demo.calls.map((call) => call.state))).toEqual(
      new Set(["skipped", "notified", "passed", "accepted", "cancelled"]),
    );
  });

  it("includes the handoff limit and empty knowledge results", () => {
    const demo = hunchDemoData();
    expect(
      demo.calls.filter(
        (call) =>
          call.hunchId === "hunch-doorgeven-limiet" && call.state === "passed",
      ),
    ).toHaveLength(2);
    const context = contextView(
      demo.context.filter((row) => row.hunchId === "hunch-geen-bronnen"),
    );
    expect(context.people.length).toBeGreaterThan(0);
    expect(context.documents).toEqual([]);
    expect(context.conversations).toEqual([]);
  });
});
