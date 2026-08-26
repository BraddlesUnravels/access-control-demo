export const InternalBackground = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 overflow-hidden"
  >
    <div className="absolute -left-48 -top-48 size-[36rem] rounded-full bg-cyan-400/[0.06] blur-[120px]" />

    <div className="absolute -bottom-56 left-[46%] size-[34rem] rounded-full bg-indigo-500/[0.055] blur-[130px]" />

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
