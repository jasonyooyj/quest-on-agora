# OAuth Authentication Setup Guide

This guide explains how to enable Google and KakaoTalk OAuth authentication for your Supabase project.

## Prerequisites

- Supabase project created
- Access to Supabase Dashboard
- Google Cloud Console account (for Google OAuth)
- Kakao Developers account (for Kakao OAuth)

---

## Google OAuth Setup

### 1. Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client ID**
5. Choose **Web application** for application type
6. Configure OAuth credentials:
   - **Authorized JavaScript origins**:
     - `https://[your-project-ref].supabase.co`
   - **Authorized redirect URIs**:
     - `https://[your-project-ref].supabase.co/auth/v1/callback`
7. Copy your **Client ID** and **Client Secret**

### 2. Configure Supabase Dashboard

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **Google** in the list
5. Toggle **Enable**
6. Enter your **Client ID** and **Client Secret** from Google Cloud Console
7. Click **Save**

**Reference:** [Supabase Google OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-google)

---

## KakaoTalk OAuth Setup

### 1. Configure Kakao Developers Portal

1. Go to [Kakao Developers](https://developers.kakao.com/)
2. Create a new application or select an existing one
3. Navigate to **Product Settings** > **Kakao Login**
4. Toggle **Kakao Login Activation** to ON
5. Under **Redirect URI**, add:
   - `https://[your-project-ref].supabase.co/auth/v1/callback`
6. Navigate to **App Settings** > **App Keys**
7. Copy your **REST API Key** (this is your Client ID)
8. Click **Generate** at the bottom to generate the **Client Secret**
9. Under **Product Settings** > **Kakao Login** > **Consent Items**, enable:
   - `profile_nickname` (required)
   - `profile_image` (optional)
   - `account_email` (optional, see note below)

### 2. Configure Supabase Dashboard

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** > **Providers**
4. Find **Kakao** in the list
5. Toggle **Enable**
6. Enter your **REST API Key** as Client ID
7. Enter your **Client Secret**
8. Click **Save**

### ⚠️ Important Note for Individual Developers

Kakao's `account_email` scope is **only available for business-verified applications**. If you're using an individual developer account:
- Users may not be able to sign in if email scope is required
- Consider using only `profile_nickname` and `profile_image` scopes
- Or apply for business verification in Kakao Developers Portal

**Reference:** [Supabase Kakao OAuth Docs](https://supabase.com/docs/guides/auth/social-login/auth-kakao)

---

## Testing OAuth Configuration

After configuring both providers:

1. The login page now includes Google and KakaoTalk sign-in buttons
2. Click on either button to test the OAuth flow
3. You should be redirected to the provider's login page
4. After successful authentication, you'll be redirected back to the app
5. Check the Supabase Dashboard > **Authentication** > **Users** to verify user creation

---

## Environment Variables

No additional environment variables are needed. The OAuth configuration is managed entirely through the Supabase Dashboard.

Your existing environment variables should include:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Troubleshooting

### Google OAuth Issues
- Ensure redirect URIs exactly match (including https://)
- Check that OAuth consent screen is configured
- Verify Client ID and Secret are correct

### Kakao OAuth Issues
- For individual developers, avoid requesting `account_email` scope
- Ensure Kakao Login is activated in developer portal
- Verify REST API key and Client Secret are correct
- Check redirect URI matches exactly

---

## Sources

- [Login with Google | Supabase Docs](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Login with Kakao | Supabase Docs](https://supabase.com/docs/guides/auth/social-login/auth-kakao)
- [Social Login | Supabase Docs](https://supabase.com/docs/guides/auth/social-login)
