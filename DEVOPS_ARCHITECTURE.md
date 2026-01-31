# DevOps Architecture - Current & Target
## Quest on Agora

**Updated:** January 22, 2026
**Current State:** Level 2.5 with Basic CI/CD
**Target State:** Level 4 with Full Continuous Deployment

---

## 1. Current Architecture (Jan 22, 2026)

### Deployment Pipeline

```
┌────────────────────────────────────────────────────────────────┐
│                    GITHUB REPOSITORY                           │
│                    (quest-on-agora)                            │
└────────────────────┬───────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │  Feature │  │ Develop  │  │   Main   │
   │ Branches │  │ Branch   │  │ Branch   │
   └──────────┘  └──────────┘  └──────────┘
        │            │            │
        ▼            ▼            ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │  GitHub  │  │ Vercel   │  │ Vercel   │
   │ Actions  │  │(Manual)  │  │(Auto)    │
   │(Validate)│  │          │  │          │
   └──────────┘  └──────────┘  └──────────┘
        │                       │
        ▼                       ▼
   ┌──────────┐            ┌─────────────┐
   │ Vercel   │            │ Production  │
   │ Preview  │            │(LIVE)       │
   │Deploy    │            └─────────────┘
   └──────────┘

CURRENT FLOW:
main branch push
    ↓
Vercel webhook
    ↓
Build + Deploy (NO tests run in webhook)
    ↓
Production live (health check fails ❌)
    ↓
No visibility/monitoring
```

### Services Topology

```
┌─────────────────────────────────────────────────────────────┐
│                        INTERNET                             │
└────────────┬───────────────────────────────────────────────┘
             │
    ┌────────▼────────┐
    │  VERCEL EDGE    │
    │  (Global CDN)   │
    └────────┬────────┘
             │
    ┌────────▼────────────────────────────────┐
    │   NEXT.JS APPLICATION (Vercel)          │
    │  - Production: quest-on-agora.vercel.app│
    │  - Preview: [branch]--quest-on-agora... │
    │  - Staging: (MISSING)                   │
    └────┬───────────────────────────┬────────┘
         │                           │
    ┌────▼────────────┐      ┌───────▼──────────┐
    │ SUPABASE        │      │ EXTERNAL APIs    │
    │ (Database)      │      │ - OpenAI/Gemini  │
    │ - Postgres DB   │      │ - Stripe/Toss    │
    │ - Auth          │      │ (Payment)        │
    │ - Storage       │      └──────────────────┘
    └─────────────────┘

ERROR TRACKING: ❌ (Missing - Sentry)
MONITORING: ❌ (Missing)
LOGGING: ⚠️ (Vercel default only)
PERFORMANCE: ⚠️ (Vercel Analytics only)
SECURITY SCAN: ❌ (Missing)
```

### CI/CD Stage Diagram

```
┌──────────────────────────────────────────────────────────────┐
│ STAGE 1: CODE PUSH                                           │
│ Developer pushes to GitHub                                   │
└────────────────────┬─────────────────────────────────────────┘
                     │
      ┌──────────────▼──────────────┐
      │ Run on: ubuntu-latest       │
      │ Node: v20                   │
      │ Time: 2-4 minutes           │
      └──────────────┬──────────────┘
                     │
    ┌────────────────┴────────────────┐
    │ STAGE 2: VALIDATE              │
    │ ✅ Checkout repo               │
    │ ✅ Setup Node (cache)          │
    │ ✅ npm ci --legacy-peer-deps   │
    │ ✅ ESLint (should fail now ⚠️)  │
    │ ✅ TypeScript type check       │
    │ ✅ Build verification          │
    │ ⏱️ Time: 2-3 minutes            │
    └────────────────┬────────────────┘
                     │
              FAIL ──┴── PASS
               │            │
               ▼            ▼
         ┌─────────┐  ┌──────────────┐
         │ ❌ STOP │  │ Continue     │
         │ (Notify)│  │              │
         └─────────┘  └──────┬───────┘
                             │
         ┌───────────────────┴───────────────────┐
         │                                       │
         ▼ (if PR)                              ▼ (if main)
    ┌─────────────┐                         ┌────────────┐
    │ STAGE 3:    │                         │ STAGE 4:   │
    │ PREVIEW     │                         │ TEST       │
    │             │                         │            │
    │ ✅ Vercel   │                         │ ✅ Vitest  │
    │ deploy      │                         │    run     │
    │ ✅ Comment  │                         │ ⏱️ 30sec-1m│
    │ PR with URL │                         │            │
    │ ⏱️ 2-3min   │                         └────┬───────┘
    └─────────────┘                             │
                                         FAIL ──┴── PASS
                                          │           │
                                          ▼           ▼
                                    ┌────────┐  ┌──────────┐
                                    │ ❌ STOP│  │ Deploy   │
                                    │ to      │  │          │
                                    │ Prod    │  └──┬───────┘
                                    └────────┘     │
                                              ┌────▼──────────┐
                                              │ STAGE 5: PROD │
                                              │               │
                                              │ ✅ Deploy to  │
                                              │    Vercel     │
                                              │ ✅ Health     │
                                              │    check      │
                                              │    (fails ❌)   │
                                              │ ✅ Slack      │
                                              │    notify     │
                                              │ ⏱️ 3-5min     │
                                              └────────────────┘
```

---

## 2. Target Architecture (Level 4)

### Enhanced Pipeline

```
┌────────────────────────────────────────────────────────────────┐
│                    GITHUB REPOSITORY                           │
│  - Main (production)                                           │
│  - Develop (staging)                                           │
│  - Feature branches                                            │
└────────────────────┬───────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ Feature  │  │ Develop  │  │ Main     │
   │ Branches │  │ (Staging)│  │ (Prod)   │
   └──────────┘  └──────────┘  └──────────┘
        │            │            │
        ▼            ▼            ▼
   ┌──────────────┐  ┌────────────────┐
   │ GitHub       │  │ GitHub Actions │
   │ Actions CI   │  │ Multi-Stage    │
   │ Pipeline     │  │                │
   └──────────────┘  └────────────────┘
        │                      │
    ┌───┼──────────────────┬───┼──────┐
    │   │                  │   │      │
    ▼   ▼                  ▼   ▼      ▼
┌──────────┐         ┌──────────┐  ┌─────────┐
│ Preview  │         │ Staging  │  │ Canary  │
│ Vercel   │         │ Vercel   │  │ 10%     │
│ Deploy   │         │ Deploy   │  │ Traffic │
└──────────┘         └──────────┘  └────┬────┘
                                         │
                                    ┌────▼─────────┐
                                    │ Monitor 5min │
                                    │ (Health OK?) │
                                    └────┬─────────┘
                                         │
                                    ┌────▼─────────┐
                                    │ Progressive  │
                                    │ Rollout:     │
                                    │ 10%→50%→100% │
                                    └────┬─────────┘
                                         │
                                    ┌────▼─────────────┐
                                    │ Production Live  │
                                    │ (Full Traffic)   │
                                    └──────────────────┘

IMPROVED FLOW:
feature branch
    ↓
GitHub Actions validates (lint, types, build, tests)
    ↓
Preview deployed to Vercel (ephemeral URL)
    ↓
Merged to develop
    ↓
Deployed to staging (full environment test)
    ↓
Merged to main
    ↓
Canary deployment (10% traffic) + monitoring
    ↓
Progressive rollout (50% → 100%)
    ↓
Health checks pass ✅
    ↓
Full monitoring/alerts
    ↓
Automatic rollback if errors detected
```

### Full Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                 │
└──────────────────────┬──────────────────────────────────────────┘
                       │
    ┌──────────────────▼──────────────────┐
    │    VERCEL EDGE NETWORK (CDN)        │
    │    - Global regions                 │
    │    - Request routing                │
    │    - SSL/TLS termination            │
    └──────────────────┬──────────────────┘
                       │
    ┌──────────────────▼──────────────────────────────────────┐
    │         LOAD BALANCER / TRAFFIC SPLIT                   │
    │  - Production (90%) → Main Deployment                   │
    │  - Canary (5%) → New Release                            │
    │  - Rollback (5%) → Previous Stable Version              │
    └──────────────────┬──────────────────────────────────────┘
                       │
    ┌──────────────────┴──────────────────────┐
    │                                         │
    │  ┌──────────────────┐  ┌────────────┐  │
    │  │ PRODUCTION NEXT  │  │ CANARY     │  │
    │  │ .JS INSTANCE     │  │ NEXT.JS    │  │
    │  │                  │  │ INSTANCE   │  │
    │  └──────────────────┘  └────────────┘  │
    │         (v0.13.3)         (v0.13.4)    │
    │                                         │
    └────┬──────────────────────────────────┬─┘
         │                                  │
    ┌────▼────────────────┐        ┌───────▼─────────┐
    │ OBSERVABILITY STACK │        │ EXTERNAL APIS   │
    │                     │        │                 │
    │ ┌────────────────┐  │        │ ┌─────────────┐ │
    │ │ SENTRY         │  │        │ │ OpenAI/     │ │
    │ │ Error Tracking │  │        │ │ Gemini      │ │
    │ └────────────────┘  │        │ │ (AI Models) │ │
    │                     │        │ └─────────────┘ │
    │ ┌────────────────┐  │        │                 │
    │ │ VERCEL         │  │        │ ┌─────────────┐ │
    │ │ Analytics      │  │        │ │ Stripe +    │ │
    │ └────────────────┘  │        │ │ Toss        │ │
    │                     │        │ │ (Payments)  │ │
    │ ┌────────────────┐  │        │ └─────────────┘ │
    │ │ MONITORING     │  │        │                 │
    │ │ (Datadog/      │  │        └─────────────────┘
    │ │  New Relic)    │  │
    │ └────────────────┘  │
    └─────────────────────┘
         │
    ┌────▼──────────────────────────────────┐
    │ DATA LAYER                             │
    │                                        │
    │ ┌──────────────────────────────────┐  │
    │ │ SUPABASE / POSTGRESQL            │  │
    │ │ - User profiles + sessions       │  │
    │ │ - Discussion data                │  │
    │ │ - Subscriptions + billing        │  │
    │ │ - RLS security policies          │  │
    │ │ - Real-time subscriptions        │  │
    │ └──────────────────────────────────┘  │
    │                                        │
    │ ┌──────────────────────────────────┐  │
    │ │ BACKUPS / DISASTER RECOVERY      │  │
    │ │ - Daily snapshots                │  │
    │ │ - Point-in-time recovery         │  │
    │ │ - Geo-redundant storage          │  │
    │ └──────────────────────────────────┘  │
    └────────────────────────────────────────┘

KEY IMPROVEMENTS:
✅ Full visibility (Sentry + monitoring)
✅ Progressive deployments (canary + rollout)
✅ Automatic health checks
✅ Error tracking & alerting
✅ Performance monitoring
✅ Disaster recovery plan
✅ Load balancer for traffic control
✅ Multi-instance redundancy
```

---

## 3. CI/CD Comparison Matrix

### Current vs. Target

```
CAPABILITY              | CURRENT      | TARGET           | GAP
─────────────────────────────────────────────────────────────
Code Quality Gate       | ✅ Good      | ✅ Excellent     | 0%
Test Automation         | ⚠️ Partial   | ✅ Full          | -40%
Security Scanning       | ❌ None      | ✅ Full          | -100%
Preview Deployments     | ✅ Yes       | ✅ Yes           | 0%
Staging Environment     | ❌ No        | ✅ Yes           | -100%
Health Checks          | ❌ Broken    | ✅ Comprehensive | -100%
Error Tracking         | ❌ None      | ✅ Sentry        | -100%
Performance Monitoring | ⚠️ Basic     | ✅ Advanced      | -50%
Canary Deployment      | ❌ No        | ✅ Yes           | -100%
Automated Rollback     | ❌ No        | ✅ Yes           | -100%
Incident Response      | ⚠️ Manual    | ✅ Automated     | -50%
Documentation          | ⚠️ Partial   | ✅ Complete      | -50%
─────────────────────────────────────────────────────────────
OVERALL COMPLETENESS   | 50%          | 100%             | -50%
```

---

## 4. Deployment Flow Comparison

### Current (Linear, No Safety)

```
Code Change
    ↓
GitHub Webhook
    ↓
Vercel Build
    ↓
Deploy to Production (IMMEDIATE)
    ↓
❌ No validation
❌ No health checks (endpoint missing)
❌ No monitoring
❌ No rollback mechanism
```

### Target (Multi-Gate, Safe)

```
Code Change
    ↓
Create Feature Branch
    ↓
Push to GitHub
    ↓
─────────────────────────────────────────────
GATE 1: VALIDATION (Code Quality)
- ESLint checks ✅
- TypeScript checks ✅
- Build verification ✅
- FAIL → Stop PR
─────────────────────────────────────────────
    ↓ PASS
─────────────────────────────────────────────
GATE 2: TESTING (Behavior Verification)
- Unit tests ✅
- Integration tests ✅
- E2E tests ✅
- FAIL → Stop PR
─────────────────────────────────────────────
    ↓ PASS
─────────────────────────────────────────────
GATE 3: SECURITY (Vulnerability Scanning)
- Dependency scanning ✅
- Secret detection ✅
- SAST analysis ✅
─────────────────────────────────────────────
    ↓
─────────────────────────────────────────────
GATE 4: PREVIEW (Manual Testing)
- Deploy to Vercel preview ✅
- Manual QA testing ✅
- Comment PR with URL ✅
─────────────────────────────────────────────
    ↓ PR Approved & Merged
─────────────────────────────────────────────
GATE 5: STAGING (Full Environment Test)
- Deploy to staging ✅
- Smoke tests ✅
- Performance checks ✅
─────────────────────────────────────────────
    ↓ Staging Verified
─────────────────────────────────────────────
GATE 6: PRODUCTION DEPLOYMENT (with safety)
- Deploy to canary (10% traffic) ✅
- Monitor for 5 minutes ✅
- Automatic rollback if errors ✅
- Progressive rollout (50% → 100%) ✅
- Final health check ✅
─────────────────────────────────────────────
    ↓ SUCCESS
─────────────────────────────────────────────
GATE 7: POST-DEPLOYMENT
- Error tracking active ✅
- Performance monitoring ✅
- Alert routing configured ✅
- Incident response ready ✅
─────────────────────────────────────────────
```

---

## 5. Infrastructure as Code

### Current State (Manual)

```
Development
  ↓
Manual Deploy (git push)
  ↓
Vercel auto-detects changes
  ↓
Manual environment variables
  ↓
Manual monitoring setup
  ↓
Manual database migrations
```

### Target State (Automated)

```
Infrastructure Code (IaC)
  ├─ Terraform configs
  ├─ Kubernetes manifests (if scaling)
  └─ CloudFormation templates
       ↓
Version Control
  ├─ Git commit
  ├─ Code review
  └─ Approval gate
       ↓
Automated Deployment
  ├─ Parse infrastructure code
  ├─ Create/update resources
  ├─ Validate configuration
  └─ Apply changes
       ↓
Monitoring & Verification
  ├─ Verify health
  ├─ Test connectivity
  ├─ Validate performance
  └─ Alert on issues
```

---

## 6. Monitoring & Observability Stack

### Current (Minimal)

```
Application Errors → ❌ Nowhere

User Performance → Vercel Analytics (basic)

Infrastructure Health → ⚠️ Vercel default

Logs → ⚠️ Vercel logs (limited retention)

Alerting → ❌ Manual check only
```

### Target (Comprehensive)

```
Application Errors → Sentry
                     ├─ Stack trace
                     ├─ User context
                     ├─ Session replay
                     └─ Alert to Slack

User Performance → Vercel + Custom
                   ├─ Page load times
                   ├─ Core Web Vitals
                   ├─ Business metrics
                   └─ Trends over time

Infrastructure → Multiple sources
              ├─ Vercel metrics
              ├─ Custom health checks
              ├─ Database performance
              └─ API response times

Logs → Aggregated
    ├─ Application logs
    ├─ API logs
    ├─ Database logs
    ├─ Error logs
    └─ Full text search

Alerting → Smart & Automated
        ├─ Error threshold alerts
        ├─ Performance degradation
        ├─ Deployment failures
        ├─ Health check failures
        ├─ Security issues
        └─ Escalation policy
```

---

## 7. Deployment Environments

### Current (2 Environments)

```
Preview (Ephemeral)
├─ URL: [branch]--quest-on-agora.vercel.app
├─ Purpose: PR testing
├─ Database: Shared (Staging)
├─ TTL: Destroyed on PR close
└─ Cost: Free (included in plan)

Production (Permanent)
├─ URL: quest-on-agora.vercel.app
├─ Purpose: User-facing
├─ Database: Production
├─ TTL: Permanent
└─ Cost: $20/month (Vercel Pro)
```

### Target (4 Environments)

```
Preview (Ephemeral)
├─ URL: [branch]--quest-on-agora.vercel.app
├─ Purpose: Feature testing (PR)
├─ Database: Staging replica
├─ TTL: Destroyed on PR close
└─ Cost: Free (included)

Development (Long-lived)
├─ URL: dev.quest-on-agora.vercel.app
├─ Purpose: Experimental features
├─ Database: Dev snapshot
├─ TTL: Permanent
└─ Cost: $20/month (additional project)

Staging (Long-lived)
├─ URL: staging.quest-on-agora.vercel.app
├─ Purpose: Pre-production testing
├─ Database: Production snapshot
├─ TTL: Permanent
├─ Deployment: From develop branch
└─ Cost: $20/month (additional project)

Production (Long-lived)
├─ URL: quest-on-agora.vercel.app
├─ Purpose: User-facing
├─ Database: Production (primary)
├─ TTL: Permanent
├─ Deployment: From main branch
└─ Cost: $20/month (existing)
```

---

## 8. Migration Path

### Week 1: Critical Fixes
```
Current State → Fix #1-4
├─ Health endpoint ✅
├─ ESLint blocking ✅
├─ Sentry setup ✅
└─ Dependabot ✅

Maturity: Level 2.5 → Level 2.6
```

### Week 2-3: Deployment Improvements
```
Week 2 State → Fix #5-7
├─ Staging env ✅
├─ Monitoring ✅
└─ E2E tests ✅

Maturity: Level 2.6 → Level 3.0
```

### Week 4: Advanced Features
```
Level 3 State → Add Canary + Automated Rollback
├─ Canary deployment ✅
├─ Progressive rollout ✅
└─ Auto-rollback ✅

Maturity: Level 3.0 → Level 3.5
```

### Month 2: Full Automation
```
Level 3.5 State → Complete Infrastructure as Code
├─ Terraform configs ✅
├─ Auto-scaling ✅
├─ Disaster recovery ✅
└─ On-call automation ✅

Maturity: Level 3.5 → Level 4.0
```

---

## 9. Data Flow Architecture

### Current

```
User Request
    ↓
Vercel CDN
    ↓
Next.js App
    ├─ User queries Supabase
    ├─ Calls OpenAI/Gemini
    ├─ Processes Stripe webhook
    └─ Returns HTML/JSON
         ↓
        Browser
         ↓
    ❌ No error tracking
    ❌ No performance monitoring
    ❌ No usage tracking
```

### Target

```
User Request
    ↓
Vercel CDN (geo-distributed)
    ↓
    ├─→ Load Balancer
    │   ├─ Route to canary or prod
    │   └─ Health check
    │
    ├─→ Next.js App
    │   ├─ Supabase queries
    │   ├─ OpenAI/Gemini calls
    │   ├─ Stripe webhooks
    │   ├─ Emit to monitoring
    │   └─ Return response
    │
    ├─→ Monitoring Pipeline
    │   ├─ Sentry (errors)
    │   ├─ Analytics (metrics)
    │   ├─ Performance (traces)
    │   └─ Logs (debugging)
    │
    └─→ Alerting System
        ├─ Threshold check
        ├─ Anomaly detection
        └─ Slack notification
```

---

## 10. Technology Stack Addition

### Current Stack
```
Frontend:      React 19 + Next.js 16 + TypeScript + Tailwind
Backend:       Next.js API routes + Supabase
Database:      PostgreSQL (Supabase)
Payment:       Stripe + Toss
AI:            OpenAI + Gemini
Deployment:    Vercel
CI/CD:         GitHub Actions (basic)
```

### Added for DevOps
```
Error Tracking:       Sentry (free tier)
Monitoring:           Vercel + Custom dashboards
Security Scanning:    Dependabot + GitHub
Log Aggregation:      Supabase + Vercel logs
Performance:          Vercel Analytics + Speed Insights
Alerting:             Slack + Email
Database Backup:      Supabase auto-backups
IaC (future):         Terraform
Container Registry:   Docker (if scaling)
```

---

## Summary: Current vs. Target

| Aspect | Current | Target |
|--------|---------|--------|
| **Pipeline Stages** | 3 (Validate, Test, Deploy) | 7 (+ Security, Staging, Canary) |
| **Environments** | 2 (Preview, Prod) | 4 (Dev, Preview, Staging, Prod) |
| **Monitoring** | ❌ None | ✅ Sentry + Vercel |
| **Health Checks** | ❌ Broken | ✅ Comprehensive |
| **Error Visibility** | ❌ Zero | ✅ 100% |
| **Deployment Safety** | ❌ Risky | ✅ Safe (Canary) |
| **Rollback Capability** | ❌ Manual | ✅ Automatic |
| **Security Scanning** | ❌ None | ✅ Automatic |
| **Maturity Level** | 2.5 | 4.0 |
| **Risk Level** | Medium-High | Low |

---

**Document Created:** January 22, 2026
**Last Updated:** January 22, 2026
**Architecture Version:** 1.0
