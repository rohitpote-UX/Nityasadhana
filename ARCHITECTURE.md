# Nityasādhanā Technical Architecture Document

> **"Technology should reduce the administrative burden of seva, not create more work."**
>
> **Project Phase:** _Phase 5: Guru Invitation & Shishya Onboarding System (25–30% Milestone)_

---

## 1. Architectural Overview

Nityasādhanā is architected as a **mobile-first**, high-performance web application designed to support Brahmacharya students (Shishyas) and Gurus at **ISKCON Pune**.

### Core Technical Tenets

1. **Mobile-First Priority**: With ~98% of target usage occurring on mobile phones, all layouts, touch targets, and interactions prioritize mobile constraints (360px–430px) first, expanding gracefully to tablet and desktop.
2. **Server Components by Default**: React Server Components (RSC) are utilized by default to eliminate client bundle bloat. Client components (`"use client"`) are strictly isolated to leaves where user interactivity, form state, or device hooks are required.
3. **Fail-Closed Security**: The browser is treated as untrusted. Role assignment, invitation redemption, and route authorization are strictly verified server-side.

---

## 2. Directory & Component Architecture

```
nityasadhana/
├── middleware.ts                 # Next.js edge route protection using first-party session cookies
├── app/
│   ├── (auth)/                   # Authentication route group (login, signup, forgot-password, reset-password, invite, invite/[token])
│   ├── (guru)/                   # Protected Guru guidance area (/guru, /guru/shishyas)
│   ├── (public)/                 # Public routes (landing, about, design-system)
│   ├── (student)/                # Protected Student sadhana area (/student)
│   ├── error.tsx                 # Client error boundary (calm Gurukul error view)
│   ├── global-error.tsx          # Root HTML/body fallback error boundary
│   ├── globals.css               # CSS custom properties, resets, safe-area insets
│   ├── layout.tsx                # Root layout with PWA providers, fonts & SEO metadata
│   ├── loading.tsx               # Root suspense fallback with spiritual indicator
│   ├── manifest.ts               # PWA Web App Manifest
│   └── not-found.tsx             # 404 handler ("Looks like this path has wandered")
├── components/
│   ├── auth/                     # LoginForm, SignupForm, ForgotPasswordForm, UserMenu
│   ├── branding/                 # BrandMark, Logo, VrindavanAtmosphere
│   ├── feedback/                 # EmptyState, LoadingState, ErrorState
│   ├── invitations/              # InviteModal, ShishyaList, PendingInvitationsList, AcceptInviteCard, CodeEntryForm
│   ├── landing/                  # Modular landing page sections
│   ├── layout/                   # Container, Section, PageHeader
│   ├── navigation/               # TopBar, BottomNavigation, GuruNavTabs
│   ├── typography/               # Heading, Text, SanskritQuote
│   └── ui/                       # Button, IconButton, Input, Textarea, Select, Stepper, Toggle, SegmentedControl, Card, Badge, Divider, Avatar
├── docs/
│   ├── AUTHENTICATION.md         # Authentication and authorization specification
│   └── INVITATION_SECURITY.md    # Guru invitation & relationship security specification
├── lib/
│   ├── actions/                  # Server Actions (invitations.ts)
│   ├── auth/                     # Server auth guards (guards.ts), roles (roles.ts), identity (auth.ts)
│   ├── config/                   # Site configuration, environment accessors (env.ts)
│   ├── constants/                # Design tokens (tokens.ts), navigation items (nav.ts)
│   ├── db/                       # Schema (schema.ts) & Transactional Store (store.ts)
│   ├── invitations/              # Crypto (crypto.ts), Config (config.ts), Service (service.ts)
│   ├── utils/                    # Class merging utilities (cn.ts)
│   └── validations/              # Validation helpers
├── public/                       # Static brand assets, PWA icons, favicon.ico
├── types/                        # Strict TypeScript domain definitions (auth, common, user, navigation)
├── ARCHITECTURE.md               # This technical specification
├── DESIGN_SYSTEM.md              # Visual design system source of truth
├── README.md                     # Getting started & project documentation
├── package.json                  # Dependencies and npm scripts
├── tailwind.config.ts            # Semantic Tailwind token configuration
└── tsconfig.json                 # Strict TypeScript configuration
```

---

## 3. Guru $\rightarrow$ Shishya Invitation Architecture (Phase 5)

```
Guru
  │
  ▼ (Taps "+ Invite Shishya" in /guru/shishyas)
Server Action: createInvitationAction()
  │
  ├──► Generates 256-bit URL Token + Readable Code (NITYA-XXXX-XXXX)
  ├──► Computes SHA-256 Hashes (tokenHash, codeHash)
  └──► Persists Invitation { createdByUserId: guru.id, status: 'pending', expiresAt: +7d }
  │
  ▼
Shishya opens /invite/<rawToken>
  │
  ▼ (Creates account or signs in)
Server Action: acceptInvitationAction(secret)
  │
  ├──► Validates invitation tokenHash/codeHash, status == 'pending', expiresAt > NOW()
  ├──► Atomic Mutex Transaction Claims Invitation (status = 'used', usedByUserId = shishya.id)
  ├──► Automatically creates GuruShishyaRelationship { guruId, shishyaId, status: 'active' }
  └──► Updates Shishya role = 'shishya'
  │
  ▼
Connected! Shishya redirected to /student (shows assigned Guru).
Guru's /guru/shishyas automatically shows newly connected Shishya.
```

### Key Security Guarantees

1. **Zero Client Trust for IDs**: `guruId` and `shishyaId` are NEVER accepted from client request payloads. Derived strictly from server sessions.
2. **One-Way Hashing**: Raw secrets are never saved in plaintext in the database.
3. **Atomic Acceptance & Mutex Locks**: Multiple concurrent attempts to claim the same invitation cannot double-claim.
4. **Single Guru Constraint**: 1 Shishya $\rightarrow$ 1 Guru. Existing relationships cannot be silently overwritten.
5. **No Cross-Guru Access**: Gurus can only view and revoke their own invitations and Shishyas.
