export class AppError extends Error {
  public readonly status: number;
  public readonly safeMessage: string;
  public readonly meta?: Record<string, unknown>;

  constructor(
    message: string,
    opts?: {
      status?: number;
      safeMessage?: string;
      meta?: Record<string, unknown>;
    },
  ) {
    super(message);
    this.name = 'AppError';
    this.status = opts?.status ?? 500;
    this.safeMessage = opts?.safeMessage ?? message;
    this.meta = opts?.meta;
    Error.captureStackTrace?.(this, AppError);
  }
}

export const isAppError = (err: unknown): err is AppError => {
  return err instanceof AppError;
};
