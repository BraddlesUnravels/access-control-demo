export const BackgroundStyles = () => (
  <div
    id="bg-styles"
    aria-hidden="true"
    className="pointer-events-none absolute inset-0"
  >
    <div className="absolute -left-40 -top-40 size-152 rounded-full bg-cyan-400/8 blur-[120px]" />
    <div className="absolute -bottom-48 left-[42%] size-144 rounded-full bg-indigo-500/8 blur-[130px]" />

    <div
      className="absolute inset-0 opacity-[0.035]"
      style={{
        backgroundImage:
          'linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
      }}
    />

    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-cyan-300/50 to-transparent" />
  </div>
);
