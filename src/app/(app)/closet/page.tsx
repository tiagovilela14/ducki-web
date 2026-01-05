'use client';

import { CATEGORY_OPTIONS, type CategoryOption } from '@/lib/categories';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import ImageLightbox from "@/components/ImageLightbox";


export default function ClosetPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [categorySelect, setCategorySelect] = useState<CategoryOption>('Tops');
  const [categoryOther, setCategoryOther] = useState('');
  const [brand, setBrand] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [brandFilter, setBrandFilter] = useState<string>("All");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);


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
        .select("id, user_id, name, category, brand, image_url, created_at")
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && itemsData) {
        setItems(itemsData);
      }

      setLoading(false);
    };

    load();
  }, [router]);

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
      category: categorySelect === 'Other' ? categoryOther : categorySelect,
      brand: brand || null,
      image_url: imageUrl,
    });


    if (error) {
      setError(error.message);
    } else {
      // Re-fetch items after successful insert
      const { data: itemsData } = await supabase
        .from('items')
        .select("id, user_id, name, category, brand, image_url, created_at")
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (itemsData) {
        setItems(itemsData);
      }

      // Reset form
      setName('');
      setCategorySelect('Tops');
      setCategoryOther('');
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

  // ---------- Closet usability (search / filter / sort) ----------
  const categories = [
    "All",
    ...Array.from(new Set(items.map((i) => i.category).filter(Boolean))),
  ].sort();

  const brands = [
    "All",
    ...Array.from(
      new Set(items.map((i) => (i.brand ?? "").trim()).filter(Boolean))
    ),
  ].sort();

  const visibleItems = items
    .filter((i) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = q === "" || (i.name ?? "").toLowerCase().includes(q);

      const matchesCategory =
        categoryFilter === "All" || i.category === categoryFilter;

      const itemBrand = (i.brand ?? "").trim();
      const matchesBrand = brandFilter === "All" || itemBrand === brandFilter;

      return matchesSearch && matchesCategory && matchesBrand;
    })
    .slice()
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;

      if (!aTime || !bTime) return 0;
      return sort === "newest" ? bTime - aTime : aTime - bTime;
    });



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

          <div className="space-y-2">
            <label className="text-sm opacity-80">Category</label>

            <select
              className="w-full border rounded px-3 py-2 bg-transparent"
              value={categorySelect}
              onChange={(e) => setCategorySelect(e.target.value as CategoryOption)}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>

            {categorySelect === 'Other' && (
              <input
                className="w-full border rounded px-3 py-2 bg-transparent"
                placeholder="Type your category (e.g. Suit, Jewelry...)"
                value={categoryOther}
                onChange={(e) => setCategoryOther(e.target.value)}
                required
              />
            )}
          </div>


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
              className="w-32 h-32 rounded object-cover border cursor-pointer hover:opacity-80"
              onClick={() => setLightboxImage(imagePreviewUrl)}
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
            My items ({visibleItems.length} / {items.length})
          </h2>

          <div className="flex flex-col gap-3 border rounded p-4">
            <div className="text-sm opacity-80">Find and organize</div>

            <input
              className="w-full border rounded px-3 py-2 bg-transparent"
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  className="w-full border rounded px-3 py-2 bg-transparent"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Brand</label>
                <select
                  className="w-full border rounded px-3 py-2 bg-transparent"
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                >
                  {brands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sort</label>
                <select
                  className="w-full border rounded px-3 py-2 bg-transparent"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm opacity-80">
              <div>
                Showing <span className="font-semibold">{visibleItems.length}</span>{" "}
                item(s)
              </div>
              <button
                type="button"
                className="border rounded px-3 py-1"
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("All");
                  setBrandFilter("All");
                  setSort("newest");
                }}
              >
                Reset
              </button>
            </div>
          </div>



          {items.length === 0 && (
            <p className="text-sm opacity-70">
              Your closet is empty. Add your first item above 👆
            </p>
          )}


          <ul className="space-y-2">
            {visibleItems.map((item) => (
              <li
                key={item.id}
                className="border rounded px-3 py-2 text-sm flex justify-between items-center gap-3"
              >
                <div className="flex items-center gap-3">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-14 h-14 rounded object-cover border cursor-pointer hover:opacity-80"
                      onClick={() => setLightboxImage(item.image_url)}
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

      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}

    </main>
  );
}
