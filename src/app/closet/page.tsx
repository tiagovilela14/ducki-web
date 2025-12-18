'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function ClosetPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        router.replace('/login');
        return;
      }

      setEmail(user.email ?? '');

      const { data: itemsData, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && itemsData) {
        setItems(itemsData);
      }

      setLoading(false);
    };

    load();
  }, [router]);


  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ducki_items');

    const res = await fetch(
      'https://api.cloudinary.com/v1_1/dr3btabmo/image/upload',
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await res.json();

    if (!data.secure_url) {
      throw new Error('Image upload failed');
    }

    return data.secure_url;
  };


  const createItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) {
      setError('Not authenticated');
      setSaving(false);
      return;
    }

    let imageUrl: string | null = null;

    if (imageFile) {
      setUploading(true);
      try {
        imageUrl = await uploadImage(imageFile);
      } catch (err) {
        setError('Image upload failed');
        setSaving(false);
        setUploading(false);
        return;
      }
      setUploading(false);
    }


    const { error } = await supabase.from('items').insert({
      user_id: user.id,
      name,
      category,
      brand: brand || null,
      image_url: imageUrl,
    });


    if (error) {
      setError(error.message);
    } else {
      // Re-fetch items after successful insert
      const { data: itemsData } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (itemsData) {
        setItems(itemsData);
      }

      // Reset form
      setName('');
      setCategory('');
      setBrand('');
      setImageFile(null);
      setImagePreviewUrl(null);
    }

    setSaving(false);
  };

  const deleteItem = async (itemId: string) => {
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);

    if (!error) {
      setItems(items.filter((item) => item.id !== itemId));
    }
  };

  const replaceItemImage = async (itemId: string, file: File) => {
    setError(null);

    try {
      setUploading(true);
      const newUrl = await uploadImage(file);
      setUploading(false);

      const { error } = await supabase
        .from('items')
        .update({ image_url: newUrl })
        .eq('id', itemId);

      if (error) {
        setError(error.message);
        return;
      }

      // Update UI locally (no refetch needed)
      setItems(
        items.map((it) => (it.id === itemId ? { ...it, image_url: newUrl } : it))
      );
    } catch (e) {
      setUploading(false);
      setError('Image replacement failed');
    }
  };


  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        Loading…
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 space-y-4">
      <h1 className="text-2xl font-semibold">My Closet</h1>
      <p className="opacity-80 text-sm">Logged in as: {email}</p>

      <div className="flex flex-wrap gap-2">

      <button className="border rounded px-3 py-2" onClick={logout}>
        Logout
      </button>

      <a className="border rounded px-3 py-2 inline-block" href="/settings/password">
        Change password
      </a>

      <a className="border rounded px-3 py-2 inline-block" href="/outfits">
  Outfits
</a>

</div>


      <div className="mt-6 space-y-8">

        <form onSubmit={createItem} className="space-y-3 max-w-sm">
          <h2 className="text-lg font-semibold">Add item</h2>

          <input
            className="w-full border rounded px-3 py-2 bg-transparent"
            placeholder="Item name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <input
            className="w-full border rounded px-3 py-2 bg-transparent"
            placeholder="Category (e.g. Jacket, Shoes)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          />

          <input
            className="w-full border rounded px-3 py-2 bg-transparent"
            placeholder="Brand (optional)"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

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

          {imagePreviewUrl && (
            <img
              src={imagePreviewUrl}
              alt="Preview"
              className="w-32 h-32 rounded object-cover border"
            />
          )}


          <button
            type="submit"
            disabled={saving || uploading}
            className="border rounded px-4 py-2"
          >
            {saving || uploading ? 'Saving…' : 'Add item'}
          </button>
        </form>

        <div className="mt-10 space-y-3">
          <h2 className="text-lg font-semibold">
            My items ({items.length})
          </h2>


          {items.length === 0 && (
            <p className="text-sm opacity-70">
              Your closet is empty. Add your first item above 👆
            </p>
          )}


          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="border rounded px-3 py-2 text-sm flex justify-between items-center gap-3"
              >
                <div className="flex items-center gap-3">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-14 h-14 rounded object-cover border"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded border flex items-center justify-center text-xs opacity-60">
                      No image
                    </div>
                  )}

                  <div>
                    <strong>{item.name}</strong>
                    <div className="opacity-70">
                      {item.category}
                      {item.brand && ` · ${item.brand}`}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">

                  <button
                    onClick={() => router.push(`/closet/${item.id}/edit`)}
                    className="text-xs underline opacity-80 whitespace-nowrap"
                    type="button"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-xs text-red-400 hover:underline"
                    type="button"
                  >
                    Delete
                  </button>
                </div>

              </li>


            ))}
          </ul>
        </div>
      </div>

    </main>
  );
}
