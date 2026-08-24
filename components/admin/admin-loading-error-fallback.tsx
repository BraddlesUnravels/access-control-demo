import { Typography } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

type FallbackProps = {
  loading: boolean;
  error?: string;
};

export const AdminFallback = ({ loading, error }: FallbackProps) => {
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
      title: 'No student consultations yet',
      description: 'Consultations will appear here once students create them',
    },
  };

  return (
    <div
      id="admin-fallback"
      className="flex flex-col items-center rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-10 text-center"
    >
      <Typography variant="body" className="font-medium">
        {getFallbackType().title}
      </Typography>

      <Typography
        as="p"
        variant="body-small"
        className={cn(
          'mt-1',
          !error ? 'text-muted-foreground' : 'text-destructive',
        )}
      >
        {getFallbackType().description}
      </Typography>
    </div>
  );
};
