import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['ko', 'en'],

  // Used when no locale matches
  defaultLocale: 'ko'
});

// Lightweight wrappers around Next.js' navigation APIs
// that will automatically handle the locale prefix
export const {Link, redirect, usePathname, useRouter} =
  createNavigation(routing);
