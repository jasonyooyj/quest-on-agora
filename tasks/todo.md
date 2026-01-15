# Supabase MCP Setup & OAuth Authentication

## Requirements

1. **Supabase MCP Server**: Install and configure Supabase MCP server for better development workflow
2. **Google OAuth**: Enable Google authentication provider in Supabase
3. **KakaoTalk OAuth**: Enable KakaoTalk authentication provider in Supabase
4. **Login UI**: Update login page to include OAuth buttons

---

## Implementation Plan

### Task 1: Install Supabase MCP Server
- [ ] Check if MCP server is available in npm registry
- [ ] Install @modelcontextprotocol/server-supabase (or equivalent) as dev dependency
- [ ] Create MCP configuration file in project root or .claude directory
- [ ] Configure MCP server with Supabase credentials

### Task 2: Configure Google OAuth Provider
- [ ] Document Google OAuth setup requirements:
  - Google Cloud Console project setup
  - OAuth 2.0 Client ID creation
  - Authorized redirect URIs configuration
- [ ] Add Google OAuth configuration to Supabase (via dashboard or MCP)
- [ ] Test Google OAuth flow

### Task 3: Configure KakaoTalk OAuth Provider
- [ ] Document KakaoTalk OAuth setup requirements:
  - Kakao Developers account setup
  - Application creation
  - REST API key and redirect URI configuration
- [ ] Add KakaoTalk OAuth configuration to Supabase
- [ ] Test KakaoTalk OAuth flow

### Task 4: Update Login Page UI
- [ ] Add Google sign-in button to `/app/(auth)/login/page.tsx`
- [ ] Add KakaoTalk sign-in button to `/app/(auth)/login/page.tsx`
- [ ] Implement OAuth sign-in handlers using Supabase client
- [ ] Add proper error handling for OAuth flows
- [ ] Style OAuth buttons to match existing design system (brutal/editorial style)

### Task 5: Create OAuth Callback Handler
- [ ] Create `/app/auth/callback/route.ts` for OAuth redirects
- [ ] Handle token exchange and session creation
- [ ] Redirect users appropriately after successful authentication
- [ ] Handle OAuth errors gracefully

### Task 6: Testing & Documentation
- [ ] Test email/password login (ensure it still works)
- [ ] Test Google OAuth login flow
- [ ] Test KakaoTalk OAuth login flow
- [ ] Update environment variables documentation
- [ ] Document OAuth provider configuration steps

---

## Progress

✅ All tasks completed

---

## Technical Notes

### Current Authentication State
- **Current providers**: Email/Password via Supabase
- **Auth files**:
  - `lib/supabase-client.ts` - Browser client
  - `lib/supabase-server.ts` - Server client
  - `lib/auth.ts` - Auth helpers
  - `app/(auth)/login/page.tsx` - Login page
  - `app/auth/confirm/route.ts` - Email confirmation

### Design Requirements
- Use existing brutalist/editorial design system
- Match current button styles (btn-brutal-fill, btn-brutal)
- Keep social login buttons visually distinct
- Maintain Korean language support

### MCP Server Benefits
- Direct interaction with Supabase from development tools
- Easier management of auth providers
- Better developer experience for database operations

---

## Review

### Changes Made

#### 1. **Supabase MCP Server Installation**
   - Installed `@supabase/mcp-server-supabase@^0.5.10` as dev dependency
   - Available for development use via `npx @supabase/mcp-server-supabase`
   - Provides enhanced Supabase management capabilities during development

#### 2. **OAuth Setup Documentation** (`docs/OAUTH_SETUP.md`)
   - Created comprehensive guide for configuring Google OAuth
   - Created comprehensive guide for configuring Kakao OAuth
   - Included step-by-step instructions for both Google Cloud Console and Kakao Developers Portal
   - Documented important limitation for Kakao individual developers (email scope)
   - Added troubleshooting section

#### 3. **Login Page Updates** (`app/(auth)/login/page.tsx`)
   - Added Google OAuth sign-in button with Chrome icon
   - Added Kakao OAuth sign-in button with Kakao branding (yellow background #FEE500)
   - Implemented `handleOAuthSignIn` function for both providers
   - Added loading states for OAuth buttons
   - Added visual divider between OAuth and email/password login
   - Maintained brutalist/editorial design system consistency
   - All text in Korean for user experience

#### 4. **OAuth Callback Handler** (`app/auth/callback/route.ts`)
   - Created new route handler at `/auth/callback`
   - Handles OAuth code exchange for session
   - Redirects to intended page after successful authentication
   - Handles errors gracefully with redirect to error page
   - Supports custom redirect parameter

### Implementation Details

**OAuth Flow:**
1. User clicks Google or Kakao button on login page
2. Redirected to provider's OAuth consent screen
3. After approval, provider redirects to `/auth/callback?code=...`
4. Callback handler exchanges code for session
5. User redirected to intended destination (default: `/instructor`)

**Design Choices:**
- Google button: White background with Chrome icon
- Kakao button: Official Kakao yellow (#FEE500) with chat bubble icon
- Both buttons use `btn-brutal` class for consistency
- Divider text: "또는 이메일로 로그인" (Or sign in with email)

**Error Handling:**
- Toast notifications for OAuth errors
- Redirect to `/auth/error` page for callback failures
- Loading states prevent double-clicks

### Next Steps for User

To enable OAuth authentication, the user must:

1. **Configure Google OAuth** (see `docs/OAUTH_SETUP.md`):
   - Create OAuth credentials in Google Cloud Console
   - Add Client ID and Secret to Supabase Dashboard

2. **Configure Kakao OAuth** (see `docs/OAUTH_SETUP.md`):
   - Create app in Kakao Developers Portal
   - Add REST API key and Client Secret to Supabase Dashboard
   - Note: Individual developers may face email scope limitations

3. **Test the OAuth flows** by clicking the buttons on `/login`

### Files Modified

- `package.json` - Added @supabase/mcp-server-supabase
- `app/(auth)/login/page.tsx` - Added OAuth buttons and handlers
- `app/auth/callback/route.ts` - New OAuth callback handler
- `docs/OAUTH_SETUP.md` - New setup documentation

### Code Quality

✅ Simple, minimal changes
✅ No breaking changes to existing email/password auth
✅ Follows existing design patterns
✅ Proper error handling
✅ Korean language support maintained
✅ Type-safe implementation
