import { ShieldCheck, UserRound } from 'lucide-react';
import { Typography } from '../ui/typography';

export const StudentConsultHeader = () => (
  <div
    id="student-view-header"
    className="flex items-end flex-col md:justify-between mb-5 xl:mb-10"
  >
    <div className="flex w-full mb-3 gap-2 justify-between xl:mb-5">
      <div className="flex w-fit items-center gap-2">
        <UserRound className="size-3.5 text-cyan-300" aria-hidden="true" />

        <Typography
          as="p"
          variant="caption"
          className="pt-1 font-mono uppercase tracking-[0.16em] text-cyan-300"
        >
          Student workspace
        </Typography>
      </div>

      <div className="hidden lg:flex w-fit items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-1.5">
        <ShieldCheck className="size-3.5 text-emerald-300" aria-hidden="true" />

        <Typography
          variant="caption"
          className="font-mono uppercase tracking-[0.12em] text-emerald-300"
        >
          Ownership scoped
        </Typography>
      </div>
    </div>

    <div className="flex flex-col gap-1.5 w-full items-start">
      <Typography
        variant="page-title"
        className="font-semibold tracking-[-0.035em]"
      >
        Consultation dashboard
      </Typography>

      <Typography
        variant="body-large"
        className="mt-3 max-w-2xl leading-6 text-muted-foreground xl:mt-5"
      >
        View and manage only the consultation records associated with your
        authenticated account.
      </Typography>
    </div>
  </div>
);
