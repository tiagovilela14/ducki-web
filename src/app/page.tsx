'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string>('Testing connection to Supabase…');

  useEffect(() => {
    const testSupabase = async () => {
      try {
        // Lightweight connectivity check:
        // This should work even with strict RLS, because it just tests API reachability.
        const { error } = await supabase.from('profiles').select('id').limit(1);

        if (error) {
          setStatus('error');
          setMessage(error.message);
          return;
        }

        setStatus('ok');
        setMessage('Supabase connected ✅');
      } catch (e) {
        setStatus('error');
        setMessage('Failed to fetch (project paused/offline or network issue).');
      }
    };

    testSupabase();
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-3xl font-semibold">Hello Ducki 🦆</h1>

      {/* Health check box */}
      <div className="px-4 py-2 rounded border text-sm w-full max-w-sm text-center">
        {status === 'idle' && 'Testing connection to Supabase…'}
        {status === 'ok' && message}
        {status === 'error' && (
          <span className="text-red-400">Supabase error: {message}</span>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <a className="border rounded px-4 py-2" href="/signup">
          Sign up
        </a>
        <a className="border rounded px-4 py-2" href="/login">
          Log in
        </a>
        <a className="border rounded px-4 py-2" href="/closet">
          Closet
        </a>
      </div>
    </main>
  );
}
