'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shirt, Layers, User } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const nav = [
        { href: '/closet', label: 'Closet', icon: Shirt },
        { href: '/outfits', label: 'Outfits', icon: Layers },
        { href: '/profile', label: 'Profile', icon: User },
    ];

    const isActive = (href: string) => {
        // Treat /outfits/[id] as active for /outfits
        if (href === '/outfits' && pathname.startsWith('/outfits')) return true;
        if (href === '/closet' && pathname.startsWith('/closet')) return true;
        if (href === '/profile' && pathname.startsWith('/profile')) return true;
        return pathname === href;
    };

    return (
        <div className="min-h-screen md:flex">
            {/* Desktop sidebar */}
            <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:min-h-screen md:p-4">
                <div className="text-xl font-semibold mb-6">Ducki 🦆</div>

                <nav className="space-y-2">
                    {nav.map((item) => {
                        const ActiveIcon = item.icon;
                        const active = isActive(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={[
                                    'flex items-center gap-3 rounded px-3 py-2',
                                    active ? 'border' : 'opacity-80 hover:opacity-100',
                                ].join(' ')}
                            >
                                <ActiveIcon className="w-5 h-5" />
                                <span className="text-sm font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-auto pt-6 text-xs opacity-60">
                    MVP build
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 p-4 pb-20 md:pb-4">
                {children}
            </main>

            {/* Mobile bottom nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-white/10 bg-black/80 text-white backdrop-blur">
                <div className="max-w-lg mx-auto flex justify-around px-2 py-2">
                    {nav.map((item) => {
                        const ActiveIcon = item.icon;
                        const active = isActive(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={[
                                    'flex flex-col items-center gap-1 px-3 py-1 rounded',
                                    active ? 'opacity-100' : 'opacity-60',
                                ].join(' ')}

                            >
                                <ActiveIcon className="w-5 h-5" />
                                <span className="text-[11px]">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
