'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ImageLightbox from "@/components/ImageLightbox";
import { uploadToCloudinary } from "@/lib/cloudinary";


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
  cover_image_url: string | null;
};

type OutfitMedia = {
  id: string;
  outfit_id: string;
  user_id: string;
  media_url: string;
  media_type: "image" | "video";
  position: number;
  created_at: string;
};

export default function OutfitDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const outfitId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [media, setMedia] = useState<OutfitMedia[]>([]);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement | null>(null);


  const [allItems, setAllItems] = useState<Item[]>([]);
  const [outfitItemIds, setOutfitItemIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);


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

      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData.user;

      if (authError || !user) {
        router.replace('/login');
        return;
      }


      // 1) load outfit (must belong to user)
      const { data: outfitData, error: outfitError } = await supabase
        .from('outfits')
        .select("id, user_id, name, created_at, cover_image_url")
        .eq('id', outfitId)
        .eq('user_id', user.id)
        .single();

      if (outfitError || !outfitData) {
        setError('Outfit not found (or you do not have access).');
        setLoading(false);
        return;
      }

      setOutfit(outfitData as Outfit);
      setCoverImageUrl((outfitData as any).cover_image_url ?? null);

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

      // 1.5) load outfit media
      const { data: mediaData, error: mediaError } = await supabase
        .from("outfit_media")
        .select("id, outfit_id, user_id, media_url, media_type, position, created_at")
        .eq("outfit_id", outfitId)
        .eq("user_id", user.id)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });

      if (mediaError) {
        setError(mediaError.message);
        setLoading(false);
        return;
      }

      setMedia((mediaData ?? []) as OutfitMedia[]);
      setActiveMediaIndex(0);

      // If you want: use first media as cover fallback (optional)
      if (!coverImageUrl && (mediaData?.[0]?.media_url ?? null)) {
        setCoverImageUrl(mediaData![0].media_url);
      }

      const ids = new Set<string>((joinData ?? []).map((r: any) => r.item_id as string));
      setOutfitItemIds(ids);

      setLoading(false);
    };

    load();
  }, [outfitId, router]);

  const uploadCoverPhoto = async (file: File) => {
    setError(null);
    setCoverUploading(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user) {
        setError("Not authenticated.");
        setCoverUploading(false);
        return;
      }

      const uploaded = await uploadToCloudinary(file, "ducki_items");

      const mediaType =
        uploaded.resourceType === "video" || file.type.startsWith("video/")
          ? "video"
          : "image";

      const url = uploaded.url;


      // position: append to the end
      const nextPos = media.length;

      const { data: inserted, error: insertError } = await supabase
        .from("outfit_media")
        .insert({
          outfit_id: outfitId,
          user_id: user.id,
          media_url: url,
          media_type: mediaType,
          position: nextPos,
        })
        .select("id, outfit_id, user_id, media_url, media_type, position, created_at")
        .single();

      if (insertError || !inserted) {
        setError(insertError?.message ?? "Failed to save media.");
        setCoverUploading(false);
        return;
      }

      setMedia((prev) => [...prev, inserted as any]);

      // keep your existing coverImageUrl in sync (first time)
      if (!coverImageUrl) setCoverImageUrl(url);

      setCoverUploading(false);
    } catch {
      setError("Cover photo upload failed.");
      setCoverUploading(false);
    }
  };



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
    <main className="min-h-screen space-y-6">
      <div className="flex items-center justify-between gap-3 px-6 pt-6">

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
            Delete
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm px-6">{error}</p>}

      {/* IG-style: full-width media + attached item strip */}
      <div className="-mx-4 md:mx-0">


        {/* Media area */}
        {/* Media area (carousel) */}
        <div className="relative w-full">
          {media.length > 0 ? (
            <div className="relative">
              <div
                ref={carouselRef}
                className="flex w-full overflow-x-auto snap-x snap-mandatory scroll-smooth"
                onScroll={() => {
                  const el = carouselRef.current;
                  if (!el) return;

                  const w = el.clientWidth || 1;
                  const idx = Math.round(el.scrollLeft / w);
                  setActiveMediaIndex(idx);
                }}
              >
                {media.map((m, idx) => (
                  <div
                    key={m.id}
                    className="w-full flex-shrink-0 snap-center"
                  >

                    {m.media_type === "video" ? (
                      <video
                        src={m.media_url.replace("/upload/", "/upload/f_mp4/")}
                        className="w-full h-[60vh] object-cover bg-black/40"
                        controls
                        playsInline
                      />
                    ) : (
                      <img
                        src={m.media_url}
                        alt={`Outfit media ${idx + 1}`}
                        className="w-full h-[60vh] object-cover bg-black/40 cursor-pointer"
                        onClick={() => setLightboxImage(m.media_url)}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Dots */}
              <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center">
                <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-black/50 backdrop-blur border border-white/10">
                  {media.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Go to media ${i + 1}`}
                      className={[
                        "h-2.5 w-2.5 rounded-full border border-white/70",
                        i === activeMediaIndex ? "bg-white shadow" : "bg-white/20",
                      ].join(" ")}
                      onClick={() => {
                        const el = carouselRef.current;
                        if (!el) return;
                        el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
                        setActiveMediaIndex(i);
                      }}
                    />
                  ))}
                </div>
              </div>


              {/* Upload button overlay */}
              <div className="absolute top-3 right-3">
                <label className="border rounded px-3 py-2 text-sm cursor-pointer bg-black/40 backdrop-blur">
                  {coverUploading ? "Uploading…" : "Add photo"}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadCoverPhoto(file);
                      e.currentTarget.value = "";
                    }}
                    disabled={coverUploading}
                  />
                </label>
              </div>
            </div>
          ) : (
            // Empty state (no "No photo" box)
            <div className="w-full bg-black/30 flex items-center justify-center py-10">
              <div className="text-center space-y-3">
                <div className="text-sm font-semibold">Add an outfit photo</div>
                <div className="text-xs opacity-70">Mirror pic or flat-lay works great ✨</div>

                <label className="inline-flex border rounded px-3 py-2 text-sm cursor-pointer">
                  {coverUploading ? "Uploading…" : "Upload photo"}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadCoverPhoto(file);
                      e.currentTarget.value = "";
                    }}
                    disabled={coverUploading}
                  />
                </label>
              </div>
            </div>
          )}
        </div>


        {/* Attached item strip */}
        {outfitItems.length > 0 && (
          <div className="border-t border-b md:border md:rounded-b-xl px-3 py-3 bg-black/20">
            <div className="text-xs uppercase tracking-wide opacity-60 mb-2">
              Items in this outfit
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1">
              {outfitItems.map((it) => (
                <div
                  key={it.id}
                  className="min-w-[140px] border rounded-lg p-2 flex items-center gap-2 cursor-pointer hover:bg-white/5"
                  onClick={() => router.push(`/outfits/${outfitId}/items/${it.id}`)}
                >
                  {it.image_url ? (
                    <img
                      src={it.image_url}
                      alt={it.name}
                      className="w-10 h-10 rounded object-cover border cursor-pointer hover:opacity-80"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (it.image_url) setLightboxImage(it.image_url);
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded border flex items-center justify-center text-[10px] opacity-60">
                      No img
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{it.name}</div>
                    <div className="text-xs opacity-70 truncate">
                      {it.brand ?? it.category}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>


      <div className="px-6 pb-6">
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
