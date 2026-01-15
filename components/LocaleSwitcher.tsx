"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { useTransition } from "react";
import { Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const locales = [
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  // 추후 추가 가능: { code: "zh", label: "中文", flag: "🇨🇳" },
] as const;

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const currentLocale = locales.find((l) => l.code === locale) || locales[0];

  const switchLocale = (newLocale: string) => {
    if (newLocale === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        aria-label={currentLocale.label}
        title={currentLocale.label}
        className="relative overflow-hidden h-10 w-10 flex items-center justify-center text-base bg-white/70 rounded-full shadow-[0_10px_26px_rgba(15,23,42,0.10)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/85 hover:shadow-[0_14px_30px_rgba(15,23,42,0.14)] disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2"
      >
        <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/60 via-white/0 to-white/0 opacity-70" aria-hidden={true} />
        <span className="relative">{currentLocale.flag}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc.code}
            onClick={() => switchLocale(loc.code)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span className="text-base">{loc.flag}</span>
            <span className="flex-1">{loc.label}</span>
            {locale === loc.code && (
              <Check className="w-4 h-4 text-indigo-500" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
