import packageJson from '../../package.json';

export const AppVersion = () => (
  <div
    aria-label={`Application version ${packageJson.version}`}
    className="pointer-events-none fixed bottom-3 right-3 z-[100] flex items-center gap-2 rounded-full border border-white/[0.06] bg-[#0d1119]/80 px-2.5 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-md sm:bottom-4 sm:right-4"
  >
    <span className="size-1 rounded-full bg-cyan-300/60" />

    <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-zinc-600">
      Version {packageJson.version}
    </span>
  </div>
);
