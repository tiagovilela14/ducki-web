'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Outfit = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  cover_image_url: string | null;
};

export default function OutfitsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string>('');
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        router.replace('/login');
        return;
      }

      setEmail(user.email ?? '');

      const { data: outfitsData, error } = await supabase
        .from('outfits')
        .select("id, user_id, name, created_at, cover_image_url")
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && outfitsData) setOutfits(outfitsData as Outfit[]);
      setLoading(false);
    };

    load();
  }, [router]);

  const createOutfit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      setError('Not authenticated');
      setSaving(false);
      return;
    }

    const { data: created, error } = await supabase
      .from('outfits')
      .insert({ user_id: user.id, name })
      .select('*')
      .single();

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setName('');
    setOutfits([created as Outfit, ...outfits]);
    setSaving(false);

    // go directly to the outfit detail
    router.push(`/outfits/${(created as Outfit).id}`);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Loading…
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 space-y-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Outfits</h1>
        <button className="border rounded px-3 py-2" onClick={() => router.push('/closet')}>
          Back to closet
        </button>
      </div>

      <p className="opacity-80 text-sm">Logged in as: {email}</p>

      <form onSubmit={createOutfit} className="border rounded p-4 space-y-3">
        <h2 className="text-lg font-semibold">Create outfit</h2>

        <input
          className="w-full border rounded px-3 py-2 bg-transparent"
          placeholder="Outfit name (e.g. Winter date night)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button className="border rounded px-4 py-2" disabled={saving}>
          {saving ? 'Creating…' : 'Create & open'}
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">My outfits ({outfits.length})</h2>

        {outfits.length === 0 && (
          <p className="text-sm opacity-70">No outfits yet. Create your first one above 👆</p>
        )}

        <ul className="space-y-2">
          {outfits.map((o) => (
            <li key={o.id} className="border rounded p-3 flex justify-between items-center gap-3">
              <div className="flex items-center gap-3">
                {o.cover_image_url ? (
                  <img
                    src={o.cover_image_url}
                    alt={o.name}
                    className="w-14 h-14 rounded border object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded border flex items-center justify-center text-[10px] opacity-60">
                    No photo
                  </div>
                )}

                <div>
                  <div className="font-semibold">{o.name}</div>
                  <div className="text-xs opacity-60">
                    {new Date(o.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              <button
                className="text-sm underline"
                onClick={() => router.push(`/outfits/${o.id}`)}
                type="button"
              >
                Open
              </button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
