'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      setIsAuthed(!!data.user);
      setLoading(false);
    };
    check();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Loading…
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-4">
      <h1 className="text-3xl font-semibold">Ducki 🦆</h1>
      <p className="text-sm opacity-70 max-w-sm">
        Your personal closet and outfits, organized in one place.
      </p>

      {isAuthed ? (
        <button
          className="border rounded px-4 py-2"
          onClick={() => router.push('/closet')}
        >
          Go to Closet
        </button>
      ) : (
        <div className="flex gap-2">
          <Link className="border rounded px-4 py-2" href="/login">
            Login
          </Link>
          <Link className="border rounded px-4 py-2" href="/signup">
            Sign up
          </Link>
        </div>
      )}
    </main>
  );
}
