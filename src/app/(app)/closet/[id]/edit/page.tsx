'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { CATEGORY_OPTIONS, type CategoryOption } from "@/lib/categories";
import ImageLightbox from "@/components/ImageLightbox";

type Item = {
  id: string;
  user_id: string;
  name: string;
  category: string;
  brand: string | null;
  image_url: string | null;
};

export default function EditItemPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const itemId = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [item, setItem] = useState<Item | null>(null);

  // form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CategoryOption | "">("");
  const [brand, setBrand] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // image picker + preview
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ducki_items');

    const res = await fetch(
      'https://api.cloudinary.com/v1_1/dr3btabmo/image/upload',
      { method: 'POST', body: formData }
    );

    const data = await res.json();
    if (!data.secure_url) throw new Error('Image upload failed');
    return data.secure_url as string;
  };

  useEffect(() => {
    const load = async () => {
      setError(null);

      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user) {
        router.replace('/login');
        return;
      }

      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('id', itemId)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        setError('Item not found (or you do not have access).');
        setLoading(false);
        return;
      }

      const loaded = data as Item;
      setItem(loaded);

      setName(loaded.name);
      const normalizedCategory = CATEGORY_OPTIONS.includes(loaded.category as CategoryOption)
        ? (loaded.category as CategoryOption)
        : "";

      setCategory(normalizedCategory);
      setBrand(loaded.brand ?? '');
      setImageUrl(loaded.image_url);

      setLoading(false);
    };

    load();
  }, [itemId, router]);

  const saveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      let finalImageUrl = imageUrl;

      if (imageFile) {
        setUploading(true);
        finalImageUrl = await uploadImage(imageFile);
        setUploading(false);
      }

      const { error } = await supabase
        .from('items')
        .update({
          name,
          category,
          brand: brand || null,
          image_url: finalImageUrl,
        })
        .eq('id', itemId);

      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }

      router.push('/closet');
    } catch {
      setError('Failed to save changes.');
      setUploading(false);
      setSaving(false);
    }
  };

  const deleteThisItem = async () => {
    const ok = confirm('Delete this item? This cannot be undone.');
    if (!ok) return;

    setError(null);

    const { error } = await supabase.from('items').delete().eq('id', itemId);
    if (error) {
      setError(error.message);
      return;
    }

    router.push('/closet');
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Loading…
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-red-400 text-sm">{error}</p>
        <button className="border rounded px-3 py-2" onClick={() => router.push('/closet')}>
          Back to closet
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit item</h1>
        <button className="border rounded px-3 py-2" onClick={() => router.push('/closet')}>
          Back
        </button>
      </div>

      <div className="border rounded p-4 flex items-center gap-4">
        {imagePreviewUrl ? (
          <img
            src={imagePreviewUrl}
            alt="Preview"
            className="w-20 h-20 rounded object-cover border cursor-pointer hover:opacity-80"
            onClick={() => setLightboxImage(imagePreviewUrl)}
          />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="w-20 h-20 rounded object-cover border cursor-pointer hover:opacity-80"
            onClick={() => setLightboxImage(imageUrl)}
          />
        ) : (
          <div className="w-20 h-20 rounded border flex items-center justify-center text-xs opacity-60">
            No image
          </div>
        )}

        <div className="text-sm opacity-80">
          <div className="font-semibold">{name}</div>
          <div>
            {category}
            {brand && ` · ${brand}`}
          </div>
        </div>
      </div>

      <form onSubmit={saveChanges} className="space-y-3">
        <input
          className="w-full border rounded px-3 py-2 bg-transparent"
          placeholder="Item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <label className="block text-sm font-medium mb-1">Category</label>
        <select
          className="w-full border rounded px-3 py-2 bg-transparent"
          value={category}
          onChange={(e) => setCategory(e.target.value as CategoryOption)}
          required
        >
          <option value="">Select a category</option>
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>


        <input
          className="w-full border rounded px-3 py-2 bg-transparent"
          placeholder="Brand (optional)"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        />

        <div className="space-y-2">
          <div className="text-sm opacity-80">Replace image (optional)</div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setImageFile(file);

              if (file) {
                const preview = URL.createObjectURL(file);
                setImagePreviewUrl(preview);
              } else {
                setImagePreviewUrl(null);
              }
            }}
            className="w-full text-sm"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || uploading}
            className="border rounded px-4 py-2"
          >
            {saving || uploading ? 'Saving…' : 'Save changes'}
          </button>

          <button
            type="button"
            onClick={deleteThisItem}
            className="border rounded px-4 py-2 text-red-400"
          >
            Delete item
          </button>
        </div>
      </form>

      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}

    </main>
  );
}
