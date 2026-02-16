import { createFileRoute, redirect } from '@tanstack/react-router';
import { createServerFn } from '@/server/createServerFn';
import { ensureValidToken } from '@/server/tokenRefresh';

const checkAuth = createServerFn({ method: 'GET' }).handler(async () => {
  return await ensureValidToken();
});

export const Route = createFileRoute('/_public/login')({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    return {
      redirect:
        typeof search.redirect === 'string' ? search.redirect : undefined,
    };
  },
  beforeLoad: async () => {
    const user = await checkAuth();
    if (user && !user.mustChangePassword) {
      throw redirect({ to: '/dashboard' });
    }
  },
});
