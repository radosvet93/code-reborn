/** An error whose status and message are safe to send to a client. */
export class HttpError extends Error {
  readonly status: number;
  /** Optional machine-readable extras, e.g. which fields failed validation. */
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}
