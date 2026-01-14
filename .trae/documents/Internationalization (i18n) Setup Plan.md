I will help you implement internationalization (i18n) to support English.

### 1. Technical Stack & Infrastructure

I recommend using **`next-intl`**, which is the standard and most robust solution for Next.js App Router.

**Steps:**

1. **Install**: `npm install next-intl`
2. **Configuration**:

   * Create `i18n/request.ts` for request-scoped configuration.

   * Edit (if necessary) `proxy.ts` to handle locale detection and routing (e.g., `/ko`, `/en`). (This functions the same as with to that of middleware.ts)

   * Update `next.config.ts` to use the `next-intl` plugin.
3. **Folder Structure**:

   * Move all `app/*` pages into `app/[locale]/*` to support dynamic routing.

   * Create `messages/ko.json` (original) and `messages/en.json` (new).

### 2. Migration Strategy (Incremental)

Migrating the entire app at once is risky. I will start with the **Landing Page** as a Proof of Concept (PoC).

**Phase 1: Landing Page**

1. Extract Korean strings from `lib/constants/landing-content.ts` and `HeroSection.tsx`.
2. Move them to `messages/ko.json`.
3. Translate them to `messages/en.json`.
4. Refactor `HeroSection` to use `useTranslations()`.

### 3. Questions for You

1. **Default Locale**: Should users visiting the root `/` be redirected to `/ko` or `/en` by default? (Assuming `/ko` for now).
2. **Routing**: Is the URL structure `domain.com/en/...` and `domain.com/ko/...` acceptable?

I will start by setting up the infrastructure and migrating the Hero section.
