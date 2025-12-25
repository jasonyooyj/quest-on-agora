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

Not started - awaiting approval

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

(Will be filled after implementation)
