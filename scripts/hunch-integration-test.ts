import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db, pool } from "../lib/db";
import { hunches } from "../lib/db/schema";
import { AppError } from "../lib/errors";
import {
  createHunch,
  getHunch,
  updateHunchStatus,
  acceptCall,
  passCall,
} from "../lib/hunch-service";

let owned: string | undefined;
const rejects = (status: number) => (error: unknown) =>
  error instanceof AppError && error.status === status;
async function main() {
  try {
    if (process.env.TASK_BACKEND === "cloud-tasks")
      throw new Error("Run this integration test on the local database only.");
    owned = await createHunch("e-jamie", {
      title: "Integratietest status wijzigen",
      workingOn:
        "Tijdelijke testcase voor het afhandelen van vragen over de payroll-API.",
    });
    await assert.rejects(
      updateHunchStatus(owned, "e-noah", { status: "resolved" }),
      rejects(403),
    );
    await assert.rejects(
      updateHunchStatus(owned, "e-jamie", { status: "waiting" }),
      rejects(400),
    );
    await assert.rejects(
      updateHunchStatus(owned, "e-jamie", {
        status: "waiting",
        toId: "e-jamie",
      }),
      rejects(400),
    );
    await assert.rejects(
      updateHunchStatus(owned, "e-jamie", {
        status: "waiting",
        toId: "e-emma",
      }),
      rejects(409),
    );
    await updateHunchStatus(owned, "e-jamie", {
      status: "waiting",
      expectedStatus: "open",
      toId: "e-pieter",
    });
    let detail = await getHunch(owned, "e-jamie");
    assert.equal(detail.status, "waiting");
    assert.equal(detail.helper?.id, "e-pieter");
    assert.equal(detail.calls.at(-1)?.state, "notified");
    await assert.rejects(
      updateHunchStatus(owned, "e-jamie", {
        status: "helping",
        expectedStatus: "open",
      }),
      rejects(409),
    );
    await updateHunchStatus(owned, "e-jamie", {
      status: "helping",
      expectedStatus: "waiting",
    });
    detail = await getHunch(owned, "e-jamie");
    assert.equal(detail.status, "helping");
    assert.equal(detail.calls.at(-1)?.state, "accepted");
    await updateHunchStatus(owned, "e-jamie", {
      status: "helping",
      expectedStatus: "helping",
      toId: "e-lotte",
    });
    detail = await getHunch(owned, "e-jamie");
    assert.equal(detail.helper?.id, "e-lotte");
    assert.equal(
      detail.calls.filter((call) => call.state === "accepted").length,
      1,
    );
    await updateHunchStatus(owned, "e-jamie", {
      status: "resolved",
      expectedStatus: "helping",
    });
    detail = await getHunch(owned, "e-jamie");
    assert.equal(detail.helper, null);
    assert(detail.calls.every((call) => call.state === "cancelled"));
    await assert.rejects(acceptCall(owned, "e-pieter"), rejects(409));
    await assert.rejects(passCall(owned, "e-pieter", {}), rejects(409));
    await updateHunchStatus(owned, "e-jamie", {
      status: "open",
      expectedStatus: "resolved",
    });
    assert.equal((await getHunch(owned, "e-jamie")).status, "open");
    const competing = await Promise.allSettled([
      updateHunchStatus(owned, "e-jamie", {
        status: "waiting",
        expectedStatus: "open",
        toId: "e-pieter",
      }),
      updateHunchStatus(owned, "e-jamie", {
        status: "resolved",
        expectedStatus: "open",
      }),
    ]);
    assert.equal(
      competing.filter((result) => result.status === "fulfilled").length,
      1,
    );
    const rejected = competing.find((result) => result.status === "rejected");
    assert(rejected?.status === "rejected" && rejects(409)(rejected.reason));
    console.log(
      "Hunch status integration passed: permissions, unavailable helpers, all statuses, stale changes, resolved calls and concurrent updates.",
    );
  } finally {
    if (owned) await db.delete(hunches).where(eq(hunches.id, owned));
    await pool.end();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
