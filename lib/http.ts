import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, publicError } from "./errors";
export async function api<T>(fn: () => Promise<T>) {
  try {
    return NextResponse.json(await fn(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json(
        {
          error:
            error.issues[0]?.message || "Controleer de ingevoerde gegevens.",
        },
        { status: 400 },
      );
    if (!(error instanceof AppError))
      console.error(
        "API failed",
        error instanceof Error ? error.name : "unknown",
      );
    return NextResponse.json(
      { error: publicError(error) },
      { status: error instanceof AppError ? error.status : 500 },
    );
  }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  // Next may normalize request.url to localhost behind a proxy. The actual
  // browser origin must match the incoming Host or the configured public URL.
  try {
    const parsed = new URL(origin);
    if (
      origin === process.env.APP_URL ||
      (["http:", "https:"].includes(parsed.protocol) &&
        parsed.host === request.headers.get("host"))
    )
      return;
  } catch {
    /* Reject malformed or opaque origins. */
  }
  throw new AppError("Deze aanvraag is niet toegestaan.", 403);
}
