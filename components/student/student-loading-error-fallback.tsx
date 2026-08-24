import { Typography } from '@/components/ui/typography';
import { CalendarX2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type FallbackProps = {
  loading: boolean;
  error?: string;
};

export const StudentFallback = ({ loading, error }: FallbackProps) => {
  const getFallbackType = () => {
    let type: 'loading' | 'error' | 'empty' = 'empty';
    if (loading) type = 'loading';
    if (error) type = 'error';

    return fallBackMessage[type];
  };

  const fallBackMessage = {
    loading: {
      title: 'Loading consultations...',
      description: 'Please wait while we fetch the consultations',
    },
    error: {
      title: 'Error ocurred while fetching consultations',
      description: `Error: ${JSON.stringify(error)}`,
    },
    empty: {
      title: 'You have no consultations yet',
      description: 'Consultations will appear here once you create them',
    },
  };

  return (
    <div
      id="student-fallback"
      className="flex flex-col items-center rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-10 text-center"
    >
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03]">
        <CalendarX2
          className="size-4 text-muted-foreground"
          aria-hidden="true"
        />
      </div>

      <Typography variant="body" className="font-medium">
        {getFallbackType().title}
      </Typography>

      <Typography
        as="p"
        variant="body-small"
        className="mt-1 text-muted-foreground"
      >
        {getFallbackType().description}
      </Typography>
    </div>
  );
};
