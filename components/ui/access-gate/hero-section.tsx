import { Typography } from '@/components/ui/typography';

export const HeroSection = () => (
  <div id="hero" className="max-w-205">
    <div className="mb-10 flex items-center gap-3">
      <span className="h-px w-8 bg-cyan-300/70" />

      <Typography
        as="p"
        variant="body-small"
        className="font-mono font-medium uppercase tracking-[0.22em] text-cyan-300"
      >
        Application security architecture
      </Typography>
    </div>

    <Typography
      id="main-heading"
      as="h1"
      variant="display"
      className="max-w-195 font-semibold leading-[0.96] tracking-[-0.055em] text-white"
    >
      Security should hold at&nbsp;
      <Typography
        as="span"
        variant="display"
        className="block bg-linear-to-r from-zinc-400 via-zinc-300 to-zinc-600 bg-clip-text text-transparent"
      >
        every boundary.
      </Typography>
    </Typography>

    <Typography
      as="p"
      variant="section-title"
      className="mt-12 mb-6 max-w-160 font-light leading-8 text-zinc-400"
    >
      A deliberately small learning-management application built to demonstrate
      layered authentication, authorization, resource ownership, and
      database-level access control.
    </Typography>
  </div>
);
