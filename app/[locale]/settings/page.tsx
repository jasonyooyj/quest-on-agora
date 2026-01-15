"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings2, Sliders, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { getSupabaseClient } from "@/lib/supabase-client";
import { ProfileMenuAuto } from "@/components/profile/ProfileMenuAuto";

export default function SettingsPage() {
  const t = useTranslations("Settings");
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) return;
      setRole(data?.role ?? null);
      setIsLoading(false);
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const dashboardHref = useMemo(() => {
    if (role === "instructor") return "/instructor";
    if (role === "student") return "/student";
    return "/";
  }, [role]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 selection:bg-primary/30 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/15 rounded-full filter blur-[120px] animate-blob pointer-events-none mix-blend-multiply" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-200/40 rounded-full filter blur-[120px] animate-blob animation-delay-2000 pointer-events-none mix-blend-multiply" />

      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <Link
                href={dashboardHref}
                className="w-10 h-10 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-zinc-100 text-zinc-600 transition-all active:scale-95"
                aria-label={t("back")}
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.35em] text-zinc-500">
                  {t("back")}
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-primary" />
                  {t("title")}
                </h1>
              </div>
            </div>

            <ProfileMenuAuto />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 lg:px-12 py-12 relative z-10">
        <div className="mb-8">
          <p className="text-zinc-600 text-lg">{t("subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="glass-panel bg-white/90 border-zinc-200 p-6 rounded-3xl shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-900">{t("sections.account")}</h2>
                <p className="text-xs text-zinc-500">{t("comingSoon")}</p>
              </div>
            </div>
            <div className="h-28 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 flex items-center justify-center text-sm text-zinc-500">
              {t("comingSoon")}
            </div>
          </section>

          <section className="glass-panel bg-white/90 border-zinc-200 p-6 rounded-3xl shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-zinc-100 text-zinc-600 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-zinc-900">{t("sections.preferences")}</h2>
                <p className="text-xs text-zinc-500">{t("comingSoon")}</p>
              </div>
            </div>
            <div className="h-28 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 flex items-center justify-center text-sm text-zinc-500">
              {t("comingSoon")}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
