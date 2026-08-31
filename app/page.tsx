import {
  HeroSection,
  Architecture,
  Header,
  BackgroundStyles,
  Footer,
  AccessGate,
} from '@/components/ui/access-gate';

export type AccessPageSearchParams = Promise<{
  code?: string;
  next?: string;
}>;

type AccessPageProps = {
  searchParams: AccessPageSearchParams;
};

export default function AccessPage({ searchParams }: AccessPageProps) {
  return (
    <main className="relative min-h-svh overflow-hidden bg-[#080b12] text-white">
      {/* Ambient background */}
      <BackgroundStyles />

      <div
        id="content"
        className="relative mx-auto grid w-full max-w-[1900px] lg:grid-cols-[minmax(0,1.25fr)_minmax(420px,0.75fr)]"
      >
        {/* Project story */}
        <section
          is="content-container"
          className="grid grid-rows-[auto_1fr_auto] px-8 pt-8 pb-4 lg:min-h-svh"
        >
          <Header />

          <div id="section-body" className="mt-2 pt-8">
            <HeroSection />
          </div>

          <div className="hidden lg:block">
            <Architecture />
          </div>

          <div className="hidden lg:block">
            <Footer />
          </div>
        </section>

        {/* Access panel */}
        <section className="relative flex items-center border-white/8 px-10 py-8 lg:border-t lg:min-h-svh lg:border-l lg:px-12">
          <div
            aria-hidden="true"
            className="absolute inset-0 hidden bg-linear-to-b from-white/[0.035] via-transparent to-transparent lg:block"
          />
          <AccessGate searchParams={searchParams} />
        </section>

        {/* Mobile architecture section */}
        <section className="grid grid-rows-[auto_1fr_auto] px-4 pt-8 pb-4 lg:hidden">
          <Architecture />
          <Footer />
        </section>
      </div>
    </main>
  );
}
