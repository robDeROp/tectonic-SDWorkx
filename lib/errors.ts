export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function publicError(error: unknown): string {
  if (error instanceof AppError) return error.message;
  return "Processing failed. Check the connection and try again.";
}
