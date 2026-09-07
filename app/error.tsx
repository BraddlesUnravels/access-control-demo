'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <section className="w-full max-w-lg space-y-6 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-300">
          Application error
        </p>
        <h1 className="text-3xl font-semibold text-white">
          Something went wrong.
        </h1>
        <p className="text-base leading-7 text-slate-300">
          The page could not be loaded. Try again, or return to the previous
          page and retry the request.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
