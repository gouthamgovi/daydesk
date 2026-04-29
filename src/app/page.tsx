import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppProvider } from '@/components/AppProvider';
import AppShell from '@/components/AppShell';
import ToastHost from '@/components/Toast';

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <AppProvider initialUser={{ id: user.id, email: user.email || '' }}>
      <AppShell />
      <ToastHost />
    </AppProvider>
  );
}
