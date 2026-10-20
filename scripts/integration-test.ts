import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db, pool } from "../lib/db";
import { tickets, jobs, deliveries, documents } from "../lib/db/schema";
import {
  addDocument,
  addMessage,
  receiveColleagueEmail,
  sendReviewedAnswer,
  createTicket,
  getDetail,
  overrideReview,
  requestAI,
  resetDemo,
  retryTicket,
  saveAnswer,
  startTicket,
  setHunchLifecycle,
  linkHunch,
} from "../lib/service";
import { runNextJob } from "../lib/worker";
import { AppError } from "../lib/errors";
import type { AIProvider } from "../lib/ai";
const owned: string[] = [];
let passed = 0;
const ok = (label: string) => {
  passed++;
  console.log(`✓ ${label}`);
};
const provider: AIProvider = async (kind, input) =>
  kind === "documents"
    ? {
        assessments: input.documents.map((d) => ({
          documentId: d.id,
          score: d.name.includes("2021") ? 25 : 90,
          summary: "Testbeoordeling",
          source: d.kind,
          age: d.date || "Onbekend",
          relevance: "Testcasus",
          contradictions: d.name.includes("2021")
            ? ["Oude instructie wijkt af."]
            : [],
        })),
      }
    : kind === "draft"
      ? {
          answer: "Beste Sophie, bezorg een vakantieattest.",
          citations: [
            {
              documentId: input.documents[0].id,
              quote: input.documents[0].content.slice(0, 60),
            },
          ],
        }
      : {
          verdict: "approved",
          summary: "Testantwoord onderbouwd.",
          findings: [
            {
              category: "evidence",
              severity: "info",
              passage: input.answer,
              explanation: "Testbewijs",
              citations: [
                {
                  documentId: input.documents[0].id,
                  quote: input.documents[0].content.slice(0, 60),
                },
              ],
            },
          ],
        };
async function latest(id: string) {
  return (await getDetail(id)).jobs[0];
}
async function main() {
  if (process.env.TASK_BACKEND === "cloud-tasks")
    throw new Error("Run integration tests on the local test database only.");
  try {
    const id = await createTicket({
      customer: "Integration Test",
      company: "Testbedrijf",
      email: "test@example.test",
      subject: "Test vakantiegeld",
      question: "Hoe verwerken we het vertrekvakantiegeld?",
    });
    owned.push(id);
    await Promise.all([startTicket(id), startTicket(id), startTicket(id)]);
    assert.equal((await getDetail(id)).jobs.length, 1);
    ok("Create + repeated start creates one durable task");
    const initial = await latest(id);
    await runNextJob(initial.id, provider, false);
    let detail = await getDetail(id);
    assert.equal(detail.documents.length, 3);
    assert.equal(detail.ticket.phase, "ready");
    assert(detail.documents.every((d) => d.assessment));
    ok("Three documents retrieved and scored in PostgreSQL");
    const draftId = await requestAI(id, "draft", 0);
    await runNextJob(draftId, provider, false);
    detail = await getDetail(id);
    assert.equal(detail.ticket.answerVersion, 1);
    assert(detail.ticket.answer.includes("vakantieattest"));
    ok("AI draft stores a new answer version");
    await saveAnswer(id, "Bezorg een vakantieattest.", 1);
    const [r1, r2] = await Promise.all([
      requestAI(id, "review", 2),
      requestAI(id, "review", 2),
    ]);
    assert.equal(r1, r2);
    await Promise.all([
      runNextJob(r1, provider, false),
      runNextJob(r1, provider, false),
    ]);
    detail = await getDetail(id);
    assert.equal(detail.deliveries.length, 0);
    assert.equal(detail.ticket.status, "reviewed");
    await Promise.all([sendReviewedAnswer(id, r1), sendReviewedAnswer(id, r1)]);
    detail = await getDetail(id);
    assert.equal(detail.deliveries.length, 1);
    assert.equal(detail.ticket.status, "sent");
    await requestAI(id, "review", 2);
    assert.equal((await getDetail(id)).deliveries.length, 1);
    ok(
      "Review never sends automatically; concurrent explicit sends create one delivery",
    );
    await saveAnswer(id, "Een twijfelachtig antwoord.", 2);
    const negative: AIProvider = async () => ({
      verdict: "changes_requested",
      summary: "Onvoldoende onderbouwd",
      findings: [
        {
          category: "missing",
          severity: "warning",
          passage: "",
          explanation: "Gegevens ontbreken",
          citations: [],
        },
      ],
    });
    const badId = await requestAI(id, "review", 3);
    await runNextJob(badId, negative, false);
    assert.equal((await getDetail(id)).deliveries.length, 1);
    await assert.rejects(() => sendReviewedAnswer(id, badId), /actueel/);
    await Promise.all([overrideReview(id, badId), overrideReview(id, badId)]);
    detail = await getDetail(id);
    assert.equal(detail.deliveries.length, 2);
    assert(detail.deliveries[0].overridden);
    ok(
      "Negative review blocks automatic send; deliberate override is idempotent",
    );
    await saveAnswer(id, "Een ander antwoord.", 3);
    await assert.rejects(() => overrideReview(id, badId), /actueel/);
    ok("Old answer reviews cannot be overridden");
    const staleReviewId = await requestAI(id, "review", 4);
    await runNextJob(
      staleReviewId,
      async (kind, input) => {
        await saveAnswer(id, "Wijziging terwijl de AI bezig is.", 4);
        return provider(kind, input);
      },
      false,
    );
    assert.equal((await getDetail(id)).deliveries.length, 2);
    assert.equal((await latest(id)).state, "obsolete");
    ok("Editing during an AI request prevents delivery of stale content");
    const uploadReviewId = await requestAI(id, "review", 5);
    await runNextJob(
      uploadReviewId,
      async (kind, input) => {
        await addDocument(id, {
          name: "Aanvulling.txt",
          content: "Aanvullende informatie voor de payrollcasus.",
          kind: "Onbekend",
          date: null,
          storageKey: "test-key",
        });
        return provider(kind, input);
      },
      false,
    );
    detail = await getDetail(id);
    assert.equal(detail.deliveries.length, 2);
    assert.equal(detail.ticket.answer, "Wijziging terwijl de AI bezig is.");
    assert.equal(detail.ticket.documentVersion, 2);
    assert.equal(detail.documents.length, 4);
    ok("Upload invalidates an in-flight review and preserves manual answer");
    await runNextJob((await latest(id)).id, provider, false);
    assert(
      (await getDetail(id)).documents.every((d) => d.assessedVersion === 2),
    );
    ok("Entire document set is reassessed after upload");
    const failedId = await requestAI(id, "review", 5);
    await runNextJob(
      failedId,
      async () => {
        throw new AppError("Test: Gemini unavailable", 503);
      },
      false,
    );
    assert.equal((await latest(id)).state, "failed");
    await assert.rejects(() => overrideReview(id, failedId));
    await retryTicket(id);
    await runNextJob((await latest(id)).id, provider, false);
    assert.equal((await getDetail(id)).deliveries.length, 2);
    await sendReviewedAnswer(id, (await latest(id)).id);
    assert.equal((await getDetail(id)).deliveries.length, 3);
    ok("Technical AI failure is not a review; retry can complete");
    await saveAnswer(id, "Lease recovery test", 5);
    const leaseId = await requestAI(id, "review", 6);
    await db
      .update(jobs)
      .set({
        state: "running",
        leaseToken: randomUUID(),
        leaseUntil: new Date(Date.now() - 1000),
      })
      .where(eq(jobs.id, leaseId));
    await runNextJob(leaseId, provider, false);
    assert.equal((await getDetail(id)).deliveries.length, 3);
    await sendReviewedAnswer(id, leaseId);
    assert.equal((await getDetail(id)).deliveries.length, 4);
    ok("Expired worker lease is recovered safely");
    await assert.rejects(() => resetDemo(id));
    await assert.rejects(() => saveAnswer(id, "stale tab", 0));
    ok("Non-demo reset and stale editor versions are rejected");
    // A colleague email is a single atomic receipt even on duplicate clicks.
    const answerBefore = (await getDetail(id)).ticket.answer;
    await Promise.all([receiveColleagueEmail(id), receiveColleagueEmail(id)]);
    detail = await getDetail(id);
    assert.equal(detail.messages.length, 1);
    assert.equal(detail.documents.length, 5);
    assert.equal(detail.ticket.documentVersion, 3);
    assert.equal(detail.ticket.contextVersion, 1);
    assert.equal(detail.ticket.answer, answerBefore);
    await assert.rejects(() => sendReviewedAnswer(id, leaseId), /actueel/);
    await runNextJob((await latest(id)).id, provider, false);
    assert(
      (await getDetail(id)).documents.every((d) => d.assessedVersion === 3),
    );
    ok(
      "Colleague email and attachment are idempotent, preserve draft and trigger full reassessment",
    );
    const noteReview = await requestAI(id, "review", 6);
    await runNextJob(noteReview, provider, false);
    const messageId = randomUUID();
    await Promise.all([
      addMessage(id, "Wacht op bevestiging van HR.", messageId),
      addMessage(id, "Wacht op bevestiging van HR.", messageId),
    ]);
    detail = await getDetail(id);
    assert.equal(detail.messages.length, 2);
    assert.equal(detail.ticket.contextVersion, 2);
    assert.equal(detail.ticket.answer, answerBefore);
    await assert.rejects(() => sendReviewedAnswer(id, noteReview), /actueel/);
    const contextReview = await requestAI(id, "review", 6);
    assert.notEqual(contextReview, noteReview);
    await runNextJob(
      contextReview,
      async (kind, input) => {
        assert(
          input.messages?.some(
            (m) => m.content === "Wacht op bevestiging van HR.",
          ),
        );
        await addMessage(id, "Nieuwe context tijdens de review.", randomUUID());
        return provider(kind, input);
      },
      false,
    );
    assert.equal(
      (await getDetail(id)).jobs.find((j) => j.id === contextReview)?.state,
      "obsolete",
    );
    await assert.rejects(
      () => sendReviewedAnswer(id, contextReview),
      /actueel/,
    );
    assert.equal((await getDetail(id)).deliveries.length, 4);
    ok(
      "Notes persist once, reach AI context, and invalidate completed and in-flight reviews",
    );
    await assert.rejects(() => setHunchLifecycle(id, "closed"), /controleer/);
    const finalReview = await requestAI(id, "review", 6);
    await assert.rejects(() => setHunchLifecycle(id, "closed"), /Wacht/);
    await runNextJob(finalReview, provider, false);
    await setHunchLifecycle(id, "closed");
    detail = await getDetail(id);
    assert.equal(detail.ticket.lifecycle, "closed");
    assert.equal(detail.ticket.completion?.documentCount, 5);
    assert.equal(detail.ticket.completion?.reviewScore, 100);
    const finalScore = detail.ticket.completion;
    await assert.rejects(() => saveAnswer(id, "Changed", 6), /Heropen/);
    await assert.rejects(() => receiveColleagueEmail(id), /Heropen/);
    await assert.rejects(
      () => addMessage(id, "Changed", randomUUID()),
      /Heropen/,
    );
    await assert.rejects(() => requestAI(id, "draft", 6), /Heropen/);
    await setHunchLifecycle(id, "archived");
    assert.deepEqual((await getDetail(id)).ticket.completion, finalScore);
    await setHunchLifecycle(id, "open");
    assert.equal((await getDetail(id)).ticket.completion, null);
    ok(
      "Closing requires current assessments, freezes edits and preserves the final score through archiving",
    );
    const relatedId = await createTicket({
      customer: "Related Test",
      company: "Testbedrijf",
      email: "related@example.test",
      subject: "Vertrekvakantiegeld en vakantieattest",
      question:
        "Hoe verwerken we het vertrekvakantiegeld en bezorgen we een vakantieattest?",
      intakeChannel: "teams",
    });
    owned.push(relatedId);
    assert.equal((await getDetail(relatedId)).ticket.intakeChannel, "teams");
    assert((await getDetail(id)).related.some((item) => item.id === relatedId));
    await linkHunch(id, relatedId);
    detail = await getDetail(id);
    const linkedDoc = detail.documents.find(
      (doc) => doc.sourceTicketId === relatedId,
    );
    assert.equal(linkedDoc?.origin, "work");
    assert(linkedDoc?.content.includes("Nog geen antwoord"));
    await assert.rejects(() => linkHunch(id, relatedId), /al gekoppeld/);
    await assert.rejects(() => linkHunch(id, id), /zichzelf/);
    await setHunchLifecycle(id, "archived");
    assert(
      !(await getDetail(id)).jobs.some((job) =>
        ["queued", "running"].includes(job.state),
      ),
    );
    await assert.rejects(() => linkHunch(id, relatedId), /Heropen/);
    await setHunchLifecycle(id, "open");
    assert(
      (await getDetail(id)).jobs.some(
        (job) => job.kind === "documents" && job.state === "queued",
      ),
    );
    ok(
      "Teams intake, related Hunch retrieval, linking, duplicate protection, archive cancellation and resumed assessment",
    );
    const unrelatedId = await createTicket({
      customer: "Unrelated Test",
      company: "Testbedrijf",
      email: "unrelated@example.test",
      subject: "Qubitkalibratie",
      question:
        "Quantumspinverstrengeling tijdens qubitkalibratie onderzoeken.",
    });
    owned.push(unrelatedId);
    await runNextJob((await latest(unrelatedId)).id, provider, false);
    assert.equal((await getDetail(unrelatedId)).documents.length, 0);
    assert.equal((await latest(unrelatedId)).state, "failed");
    await addDocument(unrelatedId, {
      name: "Kalibratie.txt",
      content:
        "Quantumspinverstrengeling tijdens qubitkalibratie wordt hier onderzocht.",
      kind: "Intern",
      date: null,
      storageKey: null,
    });
    await runNextJob((await latest(unrelatedId)).id, provider, false);
    assert.equal((await getDetail(unrelatedId)).documents.length, 1);
    assert.equal((await latest(unrelatedId)).state, "done");
    ok(
      "Unrelated questions receive no irrelevant demo sources and can proceed after a relevant upload",
    );
    console.log(
      `\n${passed} PostgreSQL integration scenarios passed. Mock AI was injected only by this test script.`,
    );
  } finally {
    if (owned.length)
      await db.delete(tickets).where(inArray(tickets.id, owned));
    await pool.end();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
