'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setErrorMsg(error.message);
      return;
    }

    const user = data.user;
    if (!user) {
      setLoading(false);
      setErrorMsg('No user returned from Supabase.');
      return;
    }

    // Create profile row for this user
    const { error: profileError } = await supabase.from('profiles').insert({
      id: user.id,
      username: email.split('@')[0],
      is_public: false,
      avatar_url: null,
    });

    if (profileError) {
      setLoading(false);
      setErrorMsg(`Profile creation failed: ${profileError.message}`);
      return;
    }

    setLoading(false);
    router.push('/closet');
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSignup} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-semibold">Create account</h1>

        <input
          className="w-full border rounded px-3 py-2 bg-transparent"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="w-full border rounded px-3 py-2 bg-transparent"
          type="password"
          placeholder="Password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />

        {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}

        <button
          className="w-full border rounded px-3 py-2"
          disabled={loading}
          type="submit"
        >
          {loading ? 'Creating…' : 'Sign up'}
        </button>

        <p className="text-sm opacity-80">
          Already have an account?{' '}
          <a className="underline" href="/login">
            Log in
          </a>
        </p>
      </form>
    </main>
  );
}
