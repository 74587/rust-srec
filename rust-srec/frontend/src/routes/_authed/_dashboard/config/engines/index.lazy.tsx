import { createLazyFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import { listEngines } from '@/server/functions';
import {
  EngineCard,
  CreateEngineCard,
} from '@/components/config/engines/engine-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { CardSkeleton } from '@/components/shared/card-skeleton';
import { AlertCircle } from 'lucide-react';
import { Trans } from '@lingui/react/macro';
import { containerVariants, itemVariants } from '@/lib/animation';

export const Route = createLazyFileRoute('/_authed/_dashboard/config/engines/')(
  {
    component: EnginesConfigPage,
  },
);

function EnginesConfigPage() {
  const {
    data: engines,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['engines'],
    queryFn: () => listEngines(),
  });

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            <Trans>Error</Trans>
          </AlertTitle>
          <AlertDescription>
            <Trans>Failed to load engines: {error.message}</Trans>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="loading"
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i}>
              <div className="flex justify-between items-start">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="h-6 w-16" />
              </div>
              <div className="space-y-2 pt-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <div className="pt-4 mt-auto">
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
            </CardSkeleton>
          ))}
        </motion.div>
      ) : (
        <motion.div
          key="list"
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {engines?.map((engine) => (
            <motion.div key={engine.id} variants={itemVariants}>
              <EngineCard engine={engine} />
            </motion.div>
          ))}
          <motion.div variants={itemVariants}>
            <CreateEngineCard />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
