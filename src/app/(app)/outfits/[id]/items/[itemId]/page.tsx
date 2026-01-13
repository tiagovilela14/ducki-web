'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ImageLightbox from '@/components/ImageLightbox';

type Item = {
    id: string;
    user_id: string;
    name: string;
    category: string;
    brand: string | null;
    image_url: string | null;
    created_at: string;
};

export default function OutfitItemViewPage() {
    const router = useRouter();
    const params = useParams<{ id: string; itemId: string }>();
    const outfitId = params.id;

    const itemId = params.itemId;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [item, setItem] = useState<Item | null>(null);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            setError(null);

            const { data: authData, error: authError } = await supabase.auth.getUser();
            const user = authData.user;

            if (authError || !user) {
                router.replace('/login');
                return;
            }

            // 1) Load item (must belong to user)
            const { data: itemData, error: itemError } = await supabase
                .from('items')
                .select('id, user_id, name, category, brand, image_url, created_at')
                .eq('id', itemId)
                .eq('user_id', user.id)
                .single();

            if (itemError || !itemData) {
                setError('Item not found (or you do not have access).');
                setLoading(false);
                return;
            }

            // 2) Validate this item is in this outfit (join table check)
            const { data: joinData, error: joinError } = await supabase
                .from('outfit_items')
                .select('outfit_id, item_id')
                .eq('outfit_id', outfitId)
                .eq('item_id', itemId)
                .maybeSingle();

            if (joinError || !joinData) {
                setError('This item is not in that outfit.');
                setLoading(false);
                return;
            }

            setItem(itemData as Item);
            setLoading(false);
        };

        load();
    }, [outfitId, itemId, router]);

    const removeFromOutfit = async () => {
        const ok = confirm('Remove this item from the outfit?');
        if (!ok) return;

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

        router.push(`/outfits/${outfitId}`);
    };

    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                Loading…
            </main>
        );
    }

    if (error || !item) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
                <p className="text-red-400 text-sm">{error ?? 'Something went wrong.'}</p>
                <button className="border rounded px-3 py-2" onClick={() => router.push(`/outfits/${outfitId}`)}>
                    Back to outfit
                </button>
            </main>
        );
    }

    return (
        <main className="min-h-screen p-6 space-y-6 max-w-lg mx-auto">
            <div className="flex items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold">Item</h1>
                <button className="border rounded px-3 py-2" onClick={() => router.push(`/outfits/${outfitId}`)}>
                    Back
                </button>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="border rounded p-4 space-y-4">
                <div className="flex items-center gap-4">
                    {item.image_url ? (
                        <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-20 h-20 rounded object-cover border cursor-pointer hover:opacity-80"
                            onClick={() => setLightboxImage(item.image_url)}
                        />
                    ) : (
                        <div className="w-20 h-20 rounded border flex items-center justify-center text-xs opacity-60">
                            No image
                        </div>
                    )}

                    <div className="min-w-0">
                        <div className="text-lg font-semibold">{item.name}</div>
                        <div className="opacity-70">{item.category}</div>
                        {item.brand && <div className="opacity-70">{item.brand}</div>}
                    </div>
                </div>

                <div className="text-xs opacity-60">
                    Added: {new Date(item.created_at).toLocaleString()}
                </div>

                <button
                    className="w-full border rounded px-4 py-2 text-red-400"
                    onClick={removeFromOutfit}
                    disabled={saving}
                >
                    {saving ? 'Removing…' : 'Remove from outfit'}
                </button>
            </div>

            {lightboxImage && (
                <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />
            )}
        </main>
    );
}
