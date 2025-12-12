'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // Require login
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/login');
      else setLoading(false);
    });
  }, [router]);

  const update = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    if (password.length < 6) {
      setErr('Password must be at least 6 characters.');
      return;
    }
    if (password !== password2) {
      setErr('Passwords do not match.');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErr(error.message);
      return;
    }

    setMsg('Password updated ✅');
    setPassword('');
    setPassword2('');
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Loading…
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={update} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Change password</h1>

        <input
          className="w-full border rounded px-3 py-2 bg-transparent"
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <input
          className="w-full border rounded px-3 py-2 bg-transparent"
          type="password"
          placeholder="Confirm new password"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          required
        />

        {msg && <p className="text-green-400 text-sm">{msg}</p>}
        {err && <p className="text-red-400 text-sm">{err}</p>}

        <button className="w-full border rounded px-3 py-2" type="submit">
          Update password
        </button>

        <p className="text-sm opacity-80">
          <a className="underline" href="/closet">Back to closet</a>
        </p>
      </form>
    </main>
  );
}
