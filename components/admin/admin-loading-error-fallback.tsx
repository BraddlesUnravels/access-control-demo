import { Typography } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

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
    title: 'No student consultations yet',
    description: 'Consultations will appear here once students create them',
  },
};

export const AdminFallback = ({ loading, error }: FallbackProps) => {
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
      id="admin-fallback"
      role={error ? 'alert' : loading ? 'status' : undefined}
      aria-live={error ? 'assertive' : loading ? 'polite' : undefined}
      className="flex flex-col items-center rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-10 text-center"
    >
      <Typography variant="body" className="font-medium">
        {fallback.title}
      </Typography>

      <Typography
        as="p"
        variant="body-small"
        className={cn(
          'mt-1',
          error ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        {fallback.description}
      </Typography>
    </div>
  );
};
