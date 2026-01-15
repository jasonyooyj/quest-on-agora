"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { getSupabaseClient } from "@/lib/supabase-client";
import { ProfileMenu, type MenuItem } from "@/components/profile/ProfileMenu";
import type { User } from "@supabase/supabase-js";

type ProfileState = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

type ProfileMenuAutoProps = {
  items?: MenuItem[];
  meta?: string | null;
  settingsHref?: string;
  showSettings?: boolean;
  showLogout?: boolean;
};

export function ProfileMenuAuto({
  items,
  meta,
  settingsHref = "/settings",
  showSettings = true,
  showLogout = true,
}: ProfileMenuAutoProps) {
  const t = useTranslations("Navbar");
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabaseClient();

    const loadProfile = async (nextUser?: User | null) => {
      const currentUser = nextUser ?? (await supabase.auth.getUser()).data.user;

      if (!currentUser) {
        if (isMounted) {
          setProfile(null);
          setIsReady(true);
        }
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("name, email, role")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (!isMounted) return;

      setProfile({
        name: data?.name ?? currentUser.user_metadata?.full_name ?? currentUser.user_metadata?.name ?? null,
        email: data?.email ?? currentUser.email ?? null,
        role: data?.role ?? null,
      });
      setIsReady(true);
    };

    loadProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      loadProfile(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = useCallback(async () => {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }, [router]);

  const menuItems = useMemo(() => {
    if (items) return items;
    const defaultItems: MenuItem[] = [];

    if (showSettings) {
      defaultItems.push({ label: t("settings"), icon: Settings, href: settingsHref });
    }

    if (showLogout) {
      defaultItems.push({ label: t("logout"), icon: LogOut, onClick: handleLogout, variant: "danger" });
    }

    return defaultItems;
  }, [handleLogout, items, settingsHref, showLogout, showSettings, t]);

  if (!isReady || !profile) {
    return null;
  }

  return (
    <ProfileMenu
      name={profile.name}
      email={profile.email}
      role={profile.role}
      meta={meta ?? undefined}
      items={menuItems}
    />
  );
}
