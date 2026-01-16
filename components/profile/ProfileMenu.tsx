"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronDown, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export type MenuItem = {
  label: string;
  icon?: LucideIcon;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
};

export type ProfileMenuProps = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  meta?: string | null;
  items: MenuItem[];
  showLocaleSwitcher?: boolean;
};

export function ProfileMenu({
  name,
  email,
  role,
  meta,
  items,
  showLocaleSwitcher = true,
}: ProfileMenuProps) {
  const t = useTranslations("Navbar");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const displayName = useMemo(() => {
    if (name?.trim()) return name;
    if (email) return email.split("@")[0];
    return t("account");
  }, [email, name, t]);

  const initials = useMemo(() => {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    const letters = parts.map((part) => part[0]).join("");
    return letters.slice(0, 2).toUpperCase();
  }, [displayName]);

  const roleLabel = useMemo(() => {
    if (!role) return null;
    if (role === "instructor") return t("roleInstructor");
    if (role === "student") return t("roleStudent");
    return t("roleMember");
  }, [role, t]);

  const mainItems = items.filter((item) => item.variant !== "danger");
  const dangerItems = items.filter((item) => item.variant === "danger");

  const localeOptions = [
    { code: "ko", label: "한국어", flag: "🇰🇷" },
    { code: "en", label: "English", flag: "🇺🇸" },
  ];

  const handleLocaleChange = (newLocale: string) => {
    if (newLocale === locale) return;
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild={true}>
        <button
          type="button"
          className="group relative flex items-center gap-3 rounded-full border-0 bg-white/70 p-1 sm:px-4 sm:py-2 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/85 hover:shadow-[0_16px_34px_rgba(15,23,42,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2"
        >
          <span
            className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/60 via-white/0 to-white/0 opacity-70"
            aria-hidden={true}
          />
          <div className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full sm:rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-bold flex items-center justify-center shadow-[0_6px_16px_rgba(99,102,241,0.35)] shrink-0">
            {initials || "A"}
            <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          <div className="hidden sm:flex flex-col min-w-0 max-w-[220px] text-left">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-semibold text-zinc-900 leading-tight truncate">
                {displayName}
              </span>
              {roleLabel && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100 shrink-0">
                  {roleLabel}
                </span>
              )}
            </div>
            {email && (
              <span className="text-xs text-zinc-500 truncate">{email}</span>
            )}
          </div>
          <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 transition-colors relative hidden sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[240px] glass-panel bg-white/95 border-zinc-200 p-2 shadow-2xl backdrop-blur-xl"
      >
        <div className="px-4 py-3 mb-2">
          <p className="text-sm font-bold text-zinc-900 mb-0.5">{displayName}</p>
          {email && <p className="text-xs text-zinc-500 truncate">{email}</p>}
          {meta && (
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-2">
              {meta}
            </p>
          )}
        </div>

        {/* Main Items */}
        <DropdownMenuSeparator className="bg-zinc-200" />
        {mainItems.map((item, index) => (
          <MenuItemRow key={`${item.label}-${index}`} item={item} />
        ))}

        {/* Locale Switcher */}
        {showLocaleSwitcher && (
          <>
            <DropdownMenuSeparator className="bg-zinc-200" />
            <DropdownMenuLabel className="text-xs uppercase tracking-[0.18em] text-zinc-400 px-3 py-2">
              {t("language")}
            </DropdownMenuLabel>
            {localeOptions.map((option) => (
              <DropdownMenuItem
                key={option.code}
                onSelect={() => handleLocaleChange(option.code)}
                className="rounded-xl focus:bg-zinc-100 focus:text-zinc-900 cursor-pointer py-2.5 flex items-center gap-3"
              >
                <span className="text-base ml-1">{option.flag}</span>
                <span className="flex-1">{option.label}</span>
                {locale === option.code && (
                  <Check className="w-4 h-4 text-indigo-500" />
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* Danger Items */}
        {dangerItems.length > 0 && (
          <>
            <DropdownMenuSeparator className="bg-zinc-200" />
            {dangerItems.map((item, index) => (
              <MenuItemRow key={`${item.label}-${index}`} item={item} />
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuItemRow({ item }: { item: MenuItem }) {
  const baseClass =
    "rounded-xl focus:bg-zinc-100 focus:text-zinc-900 cursor-pointer py-2.5 flex items-center gap-3";
  const dangerClass = "text-rose-500 focus:bg-red-500/10 focus:text-red-500";
  const iconClass =
    item.variant === "danger" ? "text-rose-500" : "text-zinc-500";

  if (item.href) {
    return (
      <DropdownMenuItem
        asChild={true}
        className={`${baseClass} ${item.variant === "danger" ? dangerClass : ""}`}
      >
        <Link href={item.href}>
          {item.icon && <item.icon className={`w-4 h-4 ${iconClass}`} />}
          {item.label}
        </Link>
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem
      onSelect={(event) => {
        if (item.onClick) {
          event.preventDefault();
          item.onClick();
        }
      }}
      className={`${baseClass} ${item.variant === "danger" ? dangerClass : ""}`}
      disabled={item.disabled}
    >
      {item.icon && <item.icon className={`w-4 h-4 mr-0.5 ${iconClass}`} />}
      {item.label}
    </DropdownMenuItem>
  );
}
