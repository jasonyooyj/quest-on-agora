"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useScroll, useMotionValueEvent, motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Menu, X, MessageCircle, ArrowUpRight, ChevronDown, LogOut, LayoutDashboard, Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { getSupabaseClient } from "@/lib/supabase-client";
import type { User } from "@supabase/supabase-js";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRouter as useNextRouter } from "next/navigation";
import { usePathname, useRouter as useI18nRouter } from "@/i18n/routing";

export function Navbar() {
    const t = useTranslations('Navbar');
    const locale = useLocale();
    const nextRouter = useNextRouter();
    const i18nRouter = useI18nRouter();
    const pathname = usePathname();
    const { scrollY } = useScroll();
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<{ name?: string | null; role?: string | null } | null>(null);

    useMotionValueEvent(scrollY, "change", (latest) => {
        setIsScrolled(latest > 20);
    });

    const closeMobileMenu = useCallback(() => {
        setMobileMenuOpen(false);
        setMobileProfileOpen(false);
    }, []);

    const navItems = [
        { name: t('features'), href: "#features" },
        { name: t('useCases'), href: "#use-cases" },
        { name: t('pricing'), href: "#pricing" },
        { name: t('about'), href: "#about" },
    ];

    useEffect(() => {
        let isMounted = true;
        const supabase = getSupabaseClient();

        const loadUser = async (nextUser?: User | null) => {
            const currentUser = nextUser ?? (await supabase.auth.getUser()).data.user;
            if (!isMounted) return;
            setUser(currentUser ?? null);

            if (!currentUser) {
                setProfile(null);
                return;
            }

            const { data } = await supabase
                .from('profiles')
                .select('name, role')
                .eq('id', currentUser.id)
                .maybeSingle();

            if (!isMounted) return;
            setProfile(data ?? null);
        };

        loadUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            loadUser(session?.user ?? null);
        });

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const localePrefix = `/${locale}`;
    const displayName =
        profile?.name ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        (user?.email ? user.email.split('@')[0] : t('account'));

    const roleLabel = useMemo(() => {
        if (profile?.role === 'instructor') return t('roleInstructor');
        if (profile?.role === 'student') return t('roleStudent');
        return t('roleMember');
    }, [profile?.role, t]);

    const dashboardHref = useMemo(() => {
        if (profile?.role === 'student') return `${localePrefix}/student`;
        if (profile?.role === 'instructor') return `${localePrefix}/instructor`;
        if (user) return `${localePrefix}/onboarding`;
        return `${localePrefix}/login`;
    }, [localePrefix, profile?.role, user]);

    const initials = useMemo(() => {
        const parts = displayName.trim().split(/\s+/).filter(Boolean);
        const letters = parts.map((part: string) => part[0]).join('');
        return letters.slice(0, 2).toUpperCase();
    }, [displayName]);

    const secondaryText = useMemo(() => user?.email ?? t('account'), [t, user?.email]);

    const localeOptions = useMemo(() => ([
        { code: "ko", label: "한국어", flag: "🇰🇷" },
        { code: "en", label: "English", flag: "🇺🇸" },
    ]), []);

    const handleLocaleChange = useCallback((newLocale: string) => {
        if (newLocale === locale) return;
        i18nRouter.replace(pathname, { locale: newLocale });
    }, [i18nRouter, locale, pathname]);

    const handleSignOut = useCallback(async () => {
        const supabase = getSupabaseClient();
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        nextRouter.push(localePrefix);
        nextRouter.refresh();
    }, [localePrefix, nextRouter]);

    const scrolledFrameClass = user ? "max-w-6xl" : "max-w-4xl";

    return (
        <motion.header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-spring ${isScrolled
                ? `top-4 mx-auto ${scrolledFrameClass} glass-panel rounded-full py-2 px-6 shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-zinc-200 bg-white/80 backdrop-blur-2xl`
                : "bg-transparent py-6"
                }`}
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
            <div className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-6 ${isScrolled ? "w-full" : "container mx-auto px-4 md:px-6"}`}>
                {/* Logo */}
                <div className="flex items-center justify-self-start">
                    <Link href={localePrefix} className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-[0_4px_12px_rgba(99,102,241,0.3)] group-hover:shadow-[0_4px_20px_rgba(168,85,247,0.4)] transition-all duration-300">
                            <MessageCircle className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-lg font-semibold tracking-tight text-zinc-900 group-hover:text-zinc-700 transition-colors">
                            Agora
                        </span>
                    </Link>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center justify-center gap-8 min-w-0 justify-self-center">
                    {navItems.map((item) => (
                        <Link
                            key={item.name}
                            href={`${localePrefix}${item.href}`}
                            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors relative group"
                        >
                            {item.name}
                            <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-indigo-500 transition-all duration-300 group-hover:w-full" />
                        </Link>
                    ))}
                </nav>

                {/* Action Buttons */}
                <div className="hidden md:flex items-center justify-end gap-3 justify-self-end">
                    {user ? (
                        <>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild={true}>
                                    <button
                                        type="button"
                                        className="group relative flex items-center gap-3 rounded-full border-0 bg-white/70 px-4 py-2 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/85 hover:shadow-[0_16px_34px_rgba(15,23,42,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2"
                                    >
                                        <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/60 via-white/0 to-white/0 opacity-70" aria-hidden={true} />
                                        <div className="relative h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-bold flex items-center justify-center shadow-[0_6px_16px_rgba(99,102,241,0.35)]">
                                            {initials || "A"}
                                            <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                                        </div>
                                        <div className="flex flex-col min-w-0 max-w-[240px] text-left">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="text-sm font-semibold text-zinc-900 leading-tight truncate">
                                                    {displayName}
                                                </span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100 shrink-0">
                                                    {roleLabel}
                                                </span>
                                            </div>
                                            <span className="text-xs text-zinc-500 truncate">
                                                {secondaryText}
                                            </span>
                                        </div>
                                        <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 transition-colors relative" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-[220px]">
                                    <DropdownMenuItem asChild={true}>
                                        <Link href={dashboardHref} className="flex items-center gap-2 cursor-pointer">
                                            <LayoutDashboard className="w-4 h-4" />
                                            {t('dashboard')}
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                                        {t('language')}
                                    </DropdownMenuLabel>
                                    {localeOptions.map((option) => (
                                        <DropdownMenuItem
                                            key={option.code}
                                            onSelect={() => handleLocaleChange(option.code)}
                                            className="flex items-center gap-2 cursor-pointer"
                                        >
                                            <span className="text-base">{option.flag}</span>
                                            <span className="flex-1">{option.label}</span>
                                            {locale === option.code && (
                                                <Check className="w-4 h-4 text-indigo-500" />
                                            )}
                                        </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={handleSignOut} className="text-rose-600 focus:text-rose-600">
                                        <LogOut className="w-4 h-4" />
                                        {t('logout')}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <div className="w-px h-6 bg-zinc-200 mx-1" />
                        </>
                    ) : (
                        <>
                            <Link
                                href={`${localePrefix}/login`}
                                className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
                            >
                                {t('login')}
                            </Link>
                            <Link href={`${localePrefix}/register`}>
                                <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 border-none rounded-full px-6 font-medium shadow-[0_4px_14px_rgba(99,102,241,0.3)] hover:shadow-[0_4px_20px_rgba(99,102,241,0.4)] transition-all duration-300 transform hover:-translate-y-0.5">
                                    {t('getStarted')}
                                </Button>
                            </Link>
                            <div className="w-px h-5 bg-zinc-200 mx-1" />
                            <LocaleSwitcher />
                        </>
                    )}
                </div>

                {/* Mobile Menu Toggle */}
                <div className="flex justify-end md:hidden justify-self-end">
                    <button
                        className="text-zinc-600 hover:text-zinc-900"
                        onClick={() => {
                            setMobileMenuOpen((prev) => {
                                const next = !prev;
                                if (!next) {
                                    setMobileProfileOpen(false);
                                }
                                return next;
                            });
                        }}
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden glass-panel border-b border-zinc-200 overflow-hidden"
                    >
                        <div className="flex flex-col p-6 gap-4">
                            {navItems.map((item) => (
                                <Link
                                    key={item.name}
                                    href={`${localePrefix}${item.href}`}
                                    className="text-lg font-medium text-zinc-600 hover:text-zinc-900"
                                    onClick={closeMobileMenu}
                                >
                                    {item.name}
                                </Link>
                            ))}
                            <hr className="border-zinc-200 my-2" />
                            {!user && (
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-zinc-500">{t('language')}</span>
                                    <LocaleSwitcher />
                                </div>
                            )}
                            {user ? (
                                <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-5 space-y-4 shadow-[0_10px_24px_rgba(16,185,129,0.15)]">
                                    <button
                                        type="button"
                                        onClick={() => setMobileProfileOpen((prev) => !prev)}
                                        className="w-full flex items-center gap-4 text-left"
                                    >
                                        <div className="relative w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold flex items-center justify-center">
                                            {initials || "A"}
                                            <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <p className="text-sm font-semibold text-zinc-900 truncate">{displayName}</p>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-emerald-700 font-semibold border border-emerald-100 shrink-0">
                                                    {roleLabel}
                                                </span>
                                            </div>
                                            <p className="text-xs text-zinc-500 truncate">{secondaryText}</p>
                                        </div>
                                        <ChevronDown className={`w-4 h-4 text-emerald-700 transition-transform ${mobileProfileOpen ? "rotate-180" : ""}`} />
                                    </button>
                                    {mobileProfileOpen && (
                                        <div className="space-y-2">
                                            <div className="rounded-2xl bg-white/80 p-3">
                                                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-400 mb-2">
                                                    {t('language')}
                                                </p>
                                                <div className="flex gap-2">
                                                    {localeOptions.map((option) => (
                                                        <button
                                                            key={option.code}
                                                            type="button"
                                                            onClick={() => {
                                                                handleLocaleChange(option.code);
                                                                closeMobileMenu();
                                                            }}
                                                            className={`h-9 w-9 rounded-full flex items-center justify-center text-base transition-all ${locale === option.code
                                                                ? "bg-indigo-500 text-white shadow-[0_8px_18px_rgba(79,70,229,0.35)]"
                                                                : "bg-white text-zinc-700 border border-zinc-200"
                                                                }`}
                                                            aria-label={option.label}
                                                            title={option.label}
                                                        >
                                                            {option.flag}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <Link href={dashboardHref} onClick={closeMobileMenu}>
                                                <Button className="w-full bg-zinc-900 text-white hover:bg-zinc-800 rounded-full">
                                                    <span className="flex items-center justify-center gap-2">
                                                        {t('dashboard')}
                                                        <ArrowUpRight className="w-4 h-4" />
                                                    </span>
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="outline"
                                                className="w-full rounded-full border-rose-200 text-rose-600 hover:bg-rose-50"
                                                onClick={() => {
                                                    closeMobileMenu();
                                                    handleSignOut();
                                                }}
                                            >
                                                <span className="flex items-center justify-center gap-2">
                                                    <LogOut className="w-4 h-4" />
                                                    {t('logout')}
                                                </span>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <Link
                                        href={`${localePrefix}/login`}
                                        className="text-lg font-medium text-zinc-600 hover:text-zinc-900"
                                        onClick={closeMobileMenu}
                                    >
                                        {t('login')}
                                    </Link>
                                    <Link href={`${localePrefix}/register`} onClick={closeMobileMenu}>
                                        <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 rounded-full mt-2">
                                            {t('getStarted')}
                                        </Button>
                                    </Link>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.header>
    );
}
