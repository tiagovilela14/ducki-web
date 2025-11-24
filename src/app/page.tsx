'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const testSupabase = async () => {
      // simple test: try to select 1 profile (will just return empty array)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

      if (error) {
        setStatus('error');
        setMessage(error.message);
      } else {
        setStatus('ok');
        setMessage('Connected to Supabase successfully ✅');
      }
    };

    testSupabase();
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-semibold">Hello Ducki 🦆</h1>

      <div className="px-4 py-2 rounded border text-sm">
        {status === 'idle' && 'Testing connection to Supabase…'}
        {status === 'ok' && message}
        {status === 'error' && (
          <span className="text-red-400">
            Supabase error: {message}
          </span>
        )}
      </div>
    </main>
  );
}
