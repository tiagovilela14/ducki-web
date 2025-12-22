'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string>('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string>('');
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
                .select('full_name, avatar_url')
                .eq('id', user.id)
                .single();

            if (!error && profile) {
                setDisplayName(profile.full_name ?? '');
                setAvatarUrl(profile.avatar_url ?? '');
            }

            setLoading(false);
        };

        load();
    }, [router]);

    const uploadAvatar = async (): Promise<string | null> => {
        if (!avatarFile) return null;

        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_AVATAR_PRESET!;

        const formData = new FormData();
        formData.append('file', avatarFile);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', 'ducki/avatars');

        const res = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            { method: 'POST', body: formData }
        );

        if (!res.ok) throw new Error('Avatar upload failed');

        const data = await res.json();
        return data.secure_url as string;
    };


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

        let uploadedAvatarUrl: string | null = null;

        try {
            if (avatarFile) {
                uploadedAvatarUrl = await uploadAvatar();
            }
        } catch (err) {
            setMessage('Avatar upload failed.');
            setSaving(false);
            return;
        }

        const updates: any = {
            full_name: displayName || null,
            avatar_url: uploadedAvatarUrl ?? avatarUrl ?? null,
        };

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);


        if (error) {
            setMessage(error.message);
        } else {
            setMessage('Saved ✅');

            if (uploadedAvatarUrl) {
                setAvatarUrl(uploadedAvatarUrl);
                setAvatarFile(null);
                setAvatarPreview('');
            }
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
                <div className="space-y-2">
                    <label className="text-sm font-medium block">Avatar</label>

                    <div className="flex items-center gap-3">
                        <div className="h-14 w-14 rounded-full border overflow-hidden flex items-center justify-center">
                            {avatarPreview ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
                            ) : avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={avatarUrl} alt="Current avatar" className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-xs opacity-60">No photo</span>
                            )}
                        </div>

                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0] ?? null;
                                setAvatarFile(file);
                                setAvatarPreview(file ? URL.createObjectURL(file) : '');
                            }}
                        />
                    </div>
                </div>

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
