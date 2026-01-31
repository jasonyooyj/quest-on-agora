# Testing Roadmap - Quest on Agora

**Goal**: Achieve production-grade test coverage and quality in 3 months

---

## Phase 1: Critical Gaps (Weeks 1-2)
**Goal**: Cover highest-risk areas and set up infrastructure

### Week 1: AI & Payments
**Priority**: CRITICAL

#### Day 1-3: AI Chat Route Tests
- [ ] Create `app/api/discussions/[id]/chat/__tests__/route.test.ts`
- [ ] Test socratic mode (5 tests)
- [ ] Test balanced mode (5 tests)
- [ ] Test debate mode (5 tests)
- [ ] Test minimal mode (5 tests)
- [ ] Test streaming vs non-streaming
- [ ] Test turn limit enforcement
- [ ] Test wrap-up message generation
- [ ] Test AI provider failover (Gemini → OpenAI)
- [ ] Test rate limiting
- [ ] **Target**: 20+ tests

#### Day 4-5: Payment Webhooks
- [ ] Create `app/api/webhooks/__tests__/stripe.test.ts`
- [ ] Test subscription.created event (3 tests)
- [ ] Test subscription.updated event (3 tests)
- [ ] Test subscription.deleted event (3 tests)
- [ ] Test invoice.payment_succeeded (3 tests)
- [ ] Test invoice.payment_failed (3 tests)
- [ ] Test customer.subscription.trial_will_end (2 tests)
- [ ] Test idempotency handling (3 tests)
- [ ] Test database state transitions (5 tests)
- [ ] Create `app/api/webhooks/__tests__/toss.test.ts`
- [ ] Test Toss payment confirmation (5 tests)
- [ ] **Target**: 30+ tests

**Deliverables**:
- 50+ new tests
- Critical payment and AI flows covered
- CI passing with new tests

---

### Week 2: Discussion Core & Infrastructure
**Priority**: CRITICAL

#### Day 1-2: Discussion CRUD
- [ ] Create `app/api/discussions/__tests__/route.test.ts`
- [ ] Test POST discussion creation (5 tests)
- [ ] Test GET discussion list (3 tests)
- [ ] Test subscription limit enforcement (4 tests)
- [ ] Test join code generation (2 tests)
- [ ] Create `app/api/discussions/[id]/__tests__/route.test.ts`
- [ ] Test GET single discussion (3 tests)
- [ ] Test PATCH update discussion (3 tests)
- [ ] Test DELETE discussion (2 tests)
- [ ] **Target**: 22+ tests

#### Day 3: Validation Schemas
- [ ] Create `lib/validations/__tests__/discussion.test.ts`
- [ ] Test createDiscussionSchema (5+ tests)
- [ ] Test discussionSettingsSchema (5+ tests)
- [ ] Test joinDiscussionSchema (3+ tests)
- [ ] Test sendMessageSchema (3+ tests)
- [ ] Test Korean error messages
- [ ] Test edge cases (max lengths, special chars)
- [ ] **Target**: 20+ tests

#### Day 4-5: Coverage & CI
- [ ] Install @vitest/coverage-v8
- [ ] Configure coverage thresholds (60%)
- [ ] Add coverage reports to CI
- [ ] Set up codecov.io integration
- [ ] Add E2E tests to CI pipeline
- [ ] Configure test parallelization
- [ ] **Target**: Coverage visible in PRs

**Deliverables**:
- 42+ new tests
- Coverage enforcement active
- Total coverage: ~50%

**Milestone 1 Complete**: 110+ total tests, CRITICAL paths covered

---

## Phase 2: Integration & Expansion (Weeks 3-6)
**Goal**: Add integration layer and expand API coverage

### Week 3: Integration Test Foundation
**Priority**: HIGH

#### Day 1-2: Test Infrastructure
- [ ] Set up Supabase local dev environment
- [ ] Create test database seed scripts
- [ ] Create `tests/factories/` directory
- [ ] Build User factory (with @faker-js/faker)
- [ ] Build Discussion factory
- [ ] Build Participant factory
- [ ] Build Message factory
- [ ] Build Subscription factory
- [ ] Create `tests/integration/` directory
- [ ] Create test helpers (authenticatedRequest, etc.)

#### Day 3-5: Integration Tests
- [ ] Create `tests/integration/auth/` (5 tests)
  - Full OAuth flow
  - Profile creation
  - Session refresh
- [ ] Create `tests/integration/discussions/` (10 tests)
  - Create → join → message → close flow
  - Concurrent participant joins
  - Message real-time sync
  - Subscription limit enforcement
- [ ] Create `tests/integration/payments/` (8 tests)
  - Checkout → webhook → activation flow
  - Trial expiration
  - Plan upgrades/downgrades
- [ ] **Target**: 23+ integration tests

**Deliverables**:
- Test factory system
- 23+ integration tests
- Real DB testing setup

---

### Week 4: API Route Expansion
**Priority**: HIGH

#### Critical Routes (15 tests)
- [ ] `/api/discussions/[id]/messages` (5 tests)
- [ ] `/api/discussions/[id]/participants` (5 tests)
- [ ] `/api/discussions/[id]/close` (2 tests)
- [ ] `/api/join/[code]` (3 tests)

#### Important Routes (15 tests)
- [ ] `/api/discussions/[id]/intervention` (4 tests)
- [ ] `/api/discussions/[id]/settings` (3 tests)
- [ ] `/api/discussions/[id]/pins` (3 tests)
- [ ] `/api/discussions/[id]/stances` (2 tests)
- [ ] `/api/discussions/[id]/activity` (3 tests)

#### Supporting Routes (10 tests)
- [ ] `/api/discussions/[id]/gallery` (3 tests)
- [ ] `/api/discussions/[id]/comments` (2 tests)
- [ ] `/api/discussions/[id]/likes` (2 tests)
- [ ] `/api/discussions/[id]/topics` (3 tests)

**Deliverables**:
- 40+ API route tests
- API coverage: ~70%

---

### Week 5: Component Testing
**Priority**: HIGH

#### Critical Components (12 tests)
- [ ] `components/discussion/ChatInterface.tsx` (5 tests)
- [ ] `components/instructor/ParticipantList.tsx` (4 tests)
- [ ] `components/discussion/MessageBubble.tsx` (3 tests)

#### Dashboard Components (10 tests)
- [ ] `components/instructor/DiscussionCard.tsx` (4 tests)
- [ ] `components/instructor/StatsPanel.tsx` (3 tests)
- [ ] `components/instructor/RealTimeMonitor.tsx` (3 tests)

#### Form Components (8 tests)
- [ ] `components/instructor/CreateDiscussionForm.tsx` (5 tests)
- [ ] `components/discussion/JoinDiscussionForm.tsx` (3 tests)

**Deliverables**:
- 30+ component tests
- Component coverage: ~40%

---

### Week 6: E2E Expansion
**Priority**: MEDIUM

#### Instructor Journeys (10 tests)
- [ ] Create discussion with custom settings
- [ ] Monitor real-time participant activity
- [ ] Pin important quotes
- [ ] Add instructor interventions
- [ ] Close discussion and view report
- [ ] Export discussion data
- [ ] Manage multiple concurrent discussions
- [ ] Preview discussion before launch
- [ ] Edit discussion settings mid-session
- [ ] Archive old discussions

#### Student Journeys (8 tests)
- [ ] Join discussion with code
- [ ] Anonymous mode participation
- [ ] Submit stance
- [ ] Chat with AI (all 4 modes)
- [ ] React to other messages
- [ ] Submit final position
- [ ] View discussion gallery
- [ ] Request help from instructor

#### Payment Journeys (5 tests)
- [ ] View pricing page
- [ ] Select plan and checkout (Stripe)
- [ ] Select plan and checkout (Toss)
- [ ] Upgrade subscription
- [ ] Cancel subscription

**Deliverables**:
- 23+ E2E tests
- Total E2E: ~35 tests
- All critical user flows covered

**Milestone 2 Complete**: 220+ total tests, 65% coverage

---

## Phase 3: Advanced Testing (Weeks 7-12)
**Goal**: Production-grade quality and advanced testing

### Week 7-8: Visual & Performance
- [ ] Set up Percy or Chromatic
- [ ] Add visual regression for 10 key pages
- [ ] Set up Lighthouse CI
- [ ] Add performance budgets (<200ms API, <3s page load)
- [ ] Add database query performance tests
- [ ] Add concurrent load tests (50+ users)
- [ ] **Target**: Visual + perf testing integrated

### Week 9: Security & Accessibility
- [ ] Integrate OWASP ZAP
- [ ] Add automated security scans to CI
- [ ] Test RLS bypass attempts (10 tests)
- [ ] Test XSS/CSRF scenarios (10 tests)
- [ ] Integrate axe-core with Playwright
- [ ] Test WCAG 2.1 AA compliance (15 pages)
- [ ] Test keyboard navigation
- [ ] **Target**: Security + a11y coverage

### Week 10: Mutation Testing
- [ ] Install Stryker Mutator
- [ ] Run mutation testing on auth module
- [ ] Run mutation testing on subscription module
- [ ] Identify weak tests
- [ ] Improve tests to achieve 70%+ mutation score
- [ ] **Target**: 70%+ mutation coverage

### Week 11: Contract & Property Testing
- [ ] Set up Pact for API contracts
- [ ] Define contracts for 10 key endpoints
- [ ] Add property-based tests with fast-check
- [ ] Test validation schemas with random inputs
- [ ] Test AI prompts with edge cases
- [ ] **Target**: Contract + property tests

### Week 12: Polish & Documentation
- [ ] Flaky test elimination
- [ ] Test performance optimization (<3s total)
- [ ] Test documentation (TESTING.md)
- [ ] Test templates for common scenarios
- [ ] Team training materials
- [ ] Test metrics dashboard
- [ ] **Target**: Production-ready test suite

**Milestone 3 Complete**: 300+ tests, 80%+ coverage, production-ready

---

## Success Criteria

### Phase 1 Success (Week 2)
- ✅ 110+ passing tests
- ✅ AI chat fully tested
- ✅ Payment webhooks fully tested
- ✅ Coverage reporting active
- ✅ Coverage >50%

### Phase 2 Success (Week 6)
- ✅ 220+ passing tests
- ✅ 23+ integration tests
- ✅ API coverage >70%
- ✅ Component coverage >40%
- ✅ Coverage >65%
- ✅ All critical user flows E2E tested

### Phase 3 Success (Week 12)
- ✅ 300+ passing tests
- ✅ Coverage >80%
- ✅ Mutation score >70%
- ✅ Visual regression testing
- ✅ Performance testing
- ✅ Security testing
- ✅ Accessibility compliance
- ✅ CI pipeline <5min
- ✅ Flaky rate <2%
- ✅ Production-ready quality gates

---

## Ongoing Maintenance

### Weekly
- [ ] Review flaky tests
- [ ] Update test snapshots
- [ ] Review coverage reports
- [ ] Triage test failures

### Monthly
- [ ] Review test metrics
- [ ] Update test documentation
- [ ] Team test review session
- [ ] Identify new gaps

### Quarterly
- [ ] Full test suite audit
- [ ] Update testing strategy
- [ ] Evaluate new testing tools
- [ ] Test infrastructure optimization

---

## Resource Allocation

### Team Requirements
- **Phase 1**: 1 developer, 2 weeks
- **Phase 2**: 1-2 developers, 4 weeks
- **Phase 3**: 1 developer, 6 weeks

### Budget Estimate
- Testing tools: $200/month (Percy, Chromatic, coverage)
- CI compute: $50/month additional
- Training: 1 week developer time

---

## Risk Mitigation

### High-Risk Areas (Extra attention)
1. Payment webhooks - financial impact
2. AI chat - core product feature
3. Real-time sync - complex concurrency
4. RLS policies - security critical

### Contingency Plans
- If behind schedule: Extend Phase 1 by 1 week (critical paths must be covered)
- If flaky tests emerge: Pause new tests, fix flakes first
- If coverage too low: Add integration tests before components

---

**Roadmap Owner**: Development Team  
**Last Updated**: January 22, 2026  
**Next Review**: February 1, 2026
