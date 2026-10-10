import { Typography } from '@/components/ui/typography';

export const HeroSection = () => (
  <div id="hero" className="max-w-205">
    <div className="mb-10 flex items-center gap-3">
      <span className="h-px w-8 bg-cyan-300/70" />

      <Typography
        variant="eyebrow"
        className="font-mono font-medium uppercase tracking-widest  text-cyan-300"
      >
        Same application. Different access.
      </Typography>
    </div>

    <Typography
      id="main-heading"
      variant="display"
      className="max-w-195 font-semibold leading-[0.96] tracking-[-0.055em] text-white"
    >
      Explore the app.&nbsp;
      <Typography
        as="p"
        variant="display"
        className="block bg-linear-to-r from-zinc-400 via-zinc-300 to-zinc-600 bg-clip-text text-transparent"
      >
        Inspect the engineering.
      </Typography>
    </Typography>

    <Typography
      variant="body-large"
      className="mt-8 lg:mt-10 mb-4 max-w-160 font-light leading-8 text-zinc-400"
    >
      A consultation-management application where students manage their own
      records and an administrator has read-only access across accounts.
    </Typography>

    <Typography
      variant="body-large"
      className="hidden md:flex max-w-160 font-light leading-8 mb-8 text-zinc-400"
    >
      Explore the application, follow how it works through the interface, API,
      database, automated tests and Azure deployment.
    </Typography>
  </div>
);
