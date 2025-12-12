'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    // When the user clicks the email link, Supabase stores a recovery session in the browser.
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setStatus('error');
        setMessage('No reset session found. Please request a new reset email.');
      }
    });
  }, []);

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('idle');
    setMessage('');

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }

    setStatus('ok');
    setMessage('Password updated ✅ Redirecting to login...');
    setTimeout(() => router.push('/login'), 1200);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={updatePassword} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Set a new password</h1>

        <input
          className="w-full border rounded px-3 py-2 bg-transparent"
          type="password"
          placeholder="New password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />

        {message && (
          <p className={`text-sm ${status === 'error' ? 'text-red-400' : 'text-green-400'}`}>
            {message}
          </p>
        )}

        <button className="w-full border rounded px-3 py-2" type="submit">
          Update password
        </button>
      </form>
    </main>
  );
}
