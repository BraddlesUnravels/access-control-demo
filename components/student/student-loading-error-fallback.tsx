import { Typography } from '@/components/ui/typography';
import { CalendarX2 } from 'lucide-react';

type FallbackProps = {
  loading: boolean;
  error?: string;
};

const fallbackMessage = {
  loading: {
    title: 'Loading consultations...',
    description: 'Please wait while we fetch the consultations',
  },
  empty: {
    title: 'You have no consultations yet',
    description: 'Consultations will appear here once you create them',
  },
};

export const StudentFallback = ({ loading, error }: FallbackProps) => {
  const fallback = error
    ? {
        title: 'Error occurred while fetching consultations',
        description: error,
      }
    : loading
      ? fallbackMessage.loading
      : fallbackMessage.empty;

  return (
    <div
      id="student-fallback"
      role={error ? 'alert' : loading ? 'status' : undefined}
      aria-live={error ? 'assertive' : loading ? 'polite' : undefined}
      className="flex flex-col items-center rounded-xl border border-dashed border-white/8 bg-white/2 px-4 py-10 text-center"
    >
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/3">
        <CalendarX2
          className="size-4 text-muted-foreground"
          aria-hidden="true"
        />
      </div>

      <Typography variant="body" className="font-medium">
        {fallback.title}
      </Typography>

      <Typography
        as="p"
        variant="body-small"
        className="mt-1 text-muted-foreground"
      >
        {fallback.description}
      </Typography>
    </div>
  );
};
