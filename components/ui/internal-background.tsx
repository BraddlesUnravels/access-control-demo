export const InternalBackground = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 overflow-hidden"
  >
    <div className="absolute -left-48 -top-48 size-144 rounded-full bg-cyan-400/6 blur-[120px]" />

    <div className="absolute -bottom-56 left-[46%] size-136 rounded-full bg-indigo-500/5.5 blur-[130px]" />

    <div
      className="absolute inset-0 opacity-[0.025]"
      style={{
        backgroundImage:
          'linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
      }}
    />

    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-cyan-300/40 to-transparent" />
  </div>
);
