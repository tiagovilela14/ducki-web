'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ImageLightbox from "@/components/ImageLightbox";


type Item = {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  image_url: string | null;
  created_at: string;
};

type Outfit = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export default function OutfitDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const outfitId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [outfit, setOutfit] = useState<Outfit | null>(null);

  const [allItems, setAllItems] = useState<Item[]>([]);
  const [outfitItemIds, setOutfitItemIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const outfitItems = useMemo(
    () => allItems.filter((i) => outfitItemIds.has(i.id)),
    [allItems, outfitItemIds]
  );

  const availableItems = useMemo(
    () => allItems.filter((i) => !outfitItemIds.has(i.id)),
    [allItems, outfitItemIds]
  );

  useEffect(() => {
    const load = async () => {
      setError(null);

      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user) {
        router.replace('/login');
        return;
      }

      // 1) load outfit (must belong to user)
      const { data: outfitData, error: outfitError } = await supabase
        .from('outfits')
        .select('*')
        .eq('id', outfitId)
        .eq('user_id', user.id)
        .single();

      if (outfitError || !outfitData) {
        setError('Outfit not found (or you do not have access).');
        setLoading(false);
        return;
      }

      setOutfit(outfitData as Outfit);

      // 2) load all items (user items)
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (itemsError || !itemsData) {
        setError(itemsError?.message ?? 'Failed to load items.');
        setLoading(false);
        return;
      }

      setAllItems(itemsData as Item[]);

      // 3) load outfit_items join table
      const { data: joinData, error: joinError } = await supabase
        .from('outfit_items')
        .select('item_id')
        .eq('outfit_id', outfitId);

      if (joinError) {
        setError(joinError.message);
        setLoading(false);
        return;
      }

      const ids = new Set<string>((joinData ?? []).map((r: any) => r.item_id as string));
      setOutfitItemIds(ids);

      setLoading(false);
    };

    load();
  }, [outfitId, router]);

  const addToOutfit = async (itemId: string) => {
    setSaving(true);
    setError(null);

    const { error } = await supabase.from('outfit_items').insert({
      outfit_id: outfitId,
      item_id: itemId,
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setOutfitItemIds(new Set([...outfitItemIds, itemId]));
    setSaving(false);
  };

  const removeFromOutfit = async (itemId: string) => {
    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from('outfit_items')
      .delete()
      .eq('outfit_id', outfitId)
      .eq('item_id', itemId);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    const next = new Set(outfitItemIds);
    next.delete(itemId);
    setOutfitItemIds(next);
    setSaving(false);
  };

  const deleteOutfit = async () => {
    const ok = confirm('Delete this outfit? This cannot be undone.');
    if (!ok) return;

    setSaving(true);
    setError(null);

    // delete join rows first (safe even if you have cascade)
    await supabase.from('outfit_items').delete().eq('outfit_id', outfitId);

    const { error } = await supabase.from('outfits').delete().eq('id', outfitId);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    router.push('/outfits');
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Loading…
      </main>
    );
  }

  if (error || !outfit) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-red-400 text-sm">{error ?? 'Something went wrong.'}</p>
        <button className="border rounded px-3 py-2" onClick={() => router.push('/outfits')}>
          Back to outfits
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{outfit.name}</h1>
          <p className="text-sm opacity-70">
            {new Date(outfit.created_at).toLocaleString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="border rounded px-3 py-2" onClick={() => router.push('/outfits')}>
            Back
          </button>
          <button className="border rounded px-3 py-2 text-red-400" onClick={deleteOutfit} disabled={saving}>
            Delete outfit
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="grid md:grid-cols-2 gap-6">
        <section className="border rounded p-4 space-y-3">
          <h2 className="text-lg font-semibold">Items in this outfit ({outfitItems.length})</h2>

          {outfitItems.length === 0 && (
            <p className="text-sm opacity-70">No items yet. Add from the right panel 👉</p>
          )}

          <ul className="space-y-2">
            {outfitItems.map((item) => (
              <li key={item.id} className="border rounded px-3 py-2 flex justify-between items-center gap-3">
                <div className="flex items-center gap-3">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-12 h-12 rounded object-cover border cursor-pointer hover:opacity-80"
                      onClick={() => setLightboxImage(item.image_url)}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded border flex items-center justify-center text-xs opacity-60">
                      No image
                    </div>
                  )}
                  <div className="text-sm">
                    <div className="font-semibold">{item.name}</div>
                    <div className="opacity-70">
                      {item.category}
                      {item.brand && ` · ${item.brand}`}
                    </div>
                  </div>
                </div>

                <button
                  className="text-xs text-red-400 hover:underline whitespace-nowrap"
                  onClick={() => removeFromOutfit(item.id)}
                  disabled={saving}
                  type="button"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="border rounded p-4 space-y-3">
          <h2 className="text-lg font-semibold">Add items ({availableItems.length})</h2>

          {availableItems.length === 0 && (
            <p className="text-sm opacity-70">No more items to add.</p>
          )}

          <ul className="space-y-2">
            {availableItems.map((item) => (
              <li key={item.id} className="border rounded px-3 py-2 flex justify-between items-center gap-3">
                <div className="flex items-center gap-3">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-12 h-12 rounded object-cover border cursor-pointer hover:opacity-80"
                      onClick={() => setLightboxImage(item.image_url)}
                    />

                  ) : (
                    <div className="w-12 h-12 rounded border flex items-center justify-center text-xs opacity-60">
                      No image
                    </div>
                  )}
                  <div className="text-sm">
                    <div className="font-semibold">{item.name}</div>
                    <div className="opacity-70">
                      {item.category}
                      {item.brand && ` · ${item.brand}`}
                    </div>
                  </div>
                </div>

                <button
                  className="text-xs underline whitespace-nowrap"
                  onClick={() => addToOutfit(item.id)}
                  disabled={saving}
                  type="button"
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}

    </main>
  );
}
