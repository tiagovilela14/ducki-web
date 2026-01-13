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
  // derived from outfit_media (first item)
  thumb_url?: string | null;
  thumb_type?: "image" | "video" | null;
};

const getThumbFromMedia = (url: string, type: "image" | "video") => {
  if (type === "image") return url;

  // Cloudinary: create a jpg thumbnail from the first frame
  // Example:
  // https://res.cloudinary.com/<cloud>/video/upload/<publicId>.mp4
  // -> https://res.cloudinary.com/<cloud>/video/upload/so_0/<publicId>.jpg
  if (url.includes("/video/upload/")) {
    return url
      .replace("/video/upload/", "/video/upload/so_0/")
      .replace(/\.(mp4|mov|webm|m4v)(\?.*)?$/i, ".jpg$2");
  }

  // fallback: no thumb
  return null;
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
        .from("outfits")
        .select("id, user_id, name, created_at, cover_image_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error || !outfitsData) {
        setLoading(false);
        return;
      }

      const baseOutfits = outfitsData as Outfit[];

      // Fetch all media for these outfits (we’ll pick the first by position)
      const outfitIds = baseOutfits.map((o) => o.id);

      const { data: mediaData, error: mediaError } = await supabase
        .from("outfit_media")
        .select("outfit_id, media_url, media_type, position")
        .in("outfit_id", outfitIds)
        .order("position", { ascending: true });

      if (mediaError) {
        // still show outfits even if media fails
        setOutfits(baseOutfits);
        setLoading(false);
        return;
      }

      // Build map: first media per outfit
      const firstMediaByOutfit = new Map<string, { url: string; type: "image" | "video" }>();

      for (const row of mediaData ?? []) {
        const outfit_id = (row as any).outfit_id as string;
        const media_url = (row as any).media_url as string;
        const media_type = (row as any).media_type as "image" | "video";

        if (!firstMediaByOutfit.has(outfit_id)) {
          firstMediaByOutfit.set(outfit_id, { url: media_url, type: media_type });
        }
      }

      // Merge into outfits
      const enriched = baseOutfits.map((o) => {
        const first = firstMediaByOutfit.get(o.id);

        // priority:
        // 1) cover_image_url (legacy)
        // 2) first outfit_media
        if (o.cover_image_url) {
          return { ...o, thumb_url: o.cover_image_url, thumb_type: "image" as const };
        }

        if (first) {
          const thumb = getThumbFromMedia(first.url, first.type);
          return { ...o, thumb_url: thumb, thumb_type: first.type };
        }

        return { ...o, thumb_url: null, thumb_type: null };
      });

      setOutfits(enriched);

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
            <li
              key={o.id}
              className="border rounded p-3 flex justify-between items-center gap-3 min-h-[84px]"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Thumbnail slot (always same size to keep alignment) */}
                <div className="w-14 h-14 flex-shrink-0">
                  {o.thumb_url ? (
                    <img
                      src={o.thumb_url}
                      alt={o.name}
                      className="w-14 h-14 rounded border object-cover"
                    />
                  ) : null}
                </div>

                {/* Text (always next to thumbnail area) */}
                <div className="min-w-0">
                  <div className="font-semibold truncate">{o.name}</div>
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
