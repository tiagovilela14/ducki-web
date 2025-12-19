'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        router.replace('/login');
        return;
      }

      setEmail(user.email ?? '');

      // Load profile record
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (!error && profile) {
        setDisplayName(profile.full_name ?? '');
      }

      setLoading(false);
    };

    load();
  }, [router]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      setMessage('Not authenticated.');
      setSaving(false);
      return;
    }

    const updates: any = {
  full_name: displayName || null,
};

const { error } = await supabase
  .from('profiles')
  .update(updates)
  .eq('id', user.id);


    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Saved ✅');
    }

    setSaving(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Loading…
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 space-y-6 max-w-xl">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm opacity-70">Logged in as: {email}</p>
      </div>

      <form onSubmit={saveProfile} className="space-y-3">
        <label className="text-sm font-medium block">Display name</label>
        <input
          className="w-full border rounded px-3 py-2 bg-transparent"
          placeholder="Your name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        <button
          type="submit"
          disabled={saving}
          className="border rounded px-4 py-2"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>

        {message && <p className="text-sm opacity-80">{message}</p>}
      </form>

      <div className="space-y-2">
        <a className="border rounded px-3 py-2 inline-block" href="/settings/password">
          Change password
        </a>

        <div>
          <button className="border rounded px-3 py-2" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    </main>
  );
}
