## Permanente Health Plan — Digital Member User

This repository contains the member-facing web portal for Permanente Health Plan (PHP) — the Digital Member User app. Members can register, log in, view dashboards, manage appointments, and access prescription/history information in a modern, responsive SvelteKit application.

### Key Features
- **Member authentication**: Register and log in to your member account
- **Member dashboard**: Quick access to key information and actions
- **Profile management**: View and update profile details
- **Appointments**: Book and manage appointments
- **History**: View medical visit/prescription history
- **Responsive UI**: Tailored layouts for desktop and mobile
- **Accessible design**: Focus on semantics and keyboard navigation

## Tech Stack
- **Framework**: SvelteKit (TypeScript)
- **Styling**: Tailwind CSS, Flowbite + Flowbite-Svelte components
- **Auth/Backend**: Firebase (Auth/Firestore) — see environment variables below
- **Payments (optional)**: Stripe (client + server SDK references present)
- **Tooling**: Vite, ESLint, Prettier, svelte-check

## Getting Started

### Prerequisites
- Node.js 18+ and npm 9+
- Firebase project for authentication/data (if enabled)
- Stripe account (only if enabling payments)

### Installation
```bash
npm install
```

### Environment Variables
Create a `.env` file at the project root. For SvelteKit, use `VITE_` (or `PUBLIC_` for SvelteKit 2) prefixes to expose client-safe values. Example (adjust keys as needed):

```bash
# Firebase (client-safe)
PUBLIC_FIREBASE_API_KEY=your_api_key
PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
PUBLIC_FIREBASE_PROJECT_ID=your_project_id
PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
PUBLIC_FIREBASE_APP_ID=your_app_id

# Stripe (client-safe publishable key only)
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_or_test_key

# Server-side secrets (do NOT expose to client)
STRIPE_SECRET_KEY=sk_live_or_test_key
```

Update your Firebase/Stripe initialization code to read from these variables where applicable.

### Development
```bash
npm run dev
# or open a new browser tab automatically
npm run dev -- --open
```

### Type Checking & Linting
```bash
npm run check       # svelte-check (TypeScript)
npm run lint        # prettier + eslint
npm run format      # fix formatting
```

### Production Build
```bash
npm run build
npm run preview     # preview the production build locally
```

## Project Structure (high-level)
- `src/routes/+page.svelte` — Landing page (with social links and branding)
- `src/routes/loginPatient/+page.svelte` — Member login
- `src/routes/registerPatient/+page.svelte` — Member registration
- `src/routes/auth/*` — Authenticated app (dashboard, profile, appointment, history)
- `src/app.html` — Base HTML template
- `tailwind.config.ts`, `postcss.config.js` — Styling configuration
- `svelte.config.js` — SvelteKit adapter configuration
- `netlify.toml` — Netlify build settings

## Deployment

This project includes multiple adapter references to support common hosts. The current `svelte.config.js` uses the **Vercel** adapter, while a `netlify.toml` is present for Netlify builds.

### Vercel
1. Ensure `svelte.config.js` uses `@sveltejs/adapter-vercel` (already set)
2. Connect the repository to Vercel and deploy

### Netlify
1. Switch adapter to `@sveltejs/adapter-netlify` in `svelte.config.js` if you prefer Netlify
2. Netlify will use `npm run build` and publish from `.svelte-kit/netlify` (configured in `netlify.toml`)

> Only one adapter should be active at a time. Choose the host you prefer and align the adapter accordingly.

## Accessibility & UX
- Keyboard-focusable interactive elements and descriptive `aria-label`s
- Color contrast tuned to brand palette with readability
- Responsive behavior for mobile/desktop

## Security Notes
- Never commit secrets. Use environment variables for API keys/secrets
- Only expose client-safe keys with `PUBLIC_` prefix
- Validate and sanitize all user input

## Scripts
- `npm run dev` — start dev server
- `npm run build` — create production build
- `npm run preview` — preview production build
- `npm run check` — svelte-check type analysis
- `npm run lint` — eslint + prettier check
- `npm run format` — auto-format

## Branding & Assets
- Primary logo and hero image are in `static/images/`
- Social links (Facebook, Instagram, X) are defined on the landing page in `src/routes/+page.svelte`

## Support & Contact
- Website: `https://www.permanentehealthplan.org`
- Facebook: `https://www.facebook.com/permanentehealthplan`
- Instagram: `https://www.instagram.com/permanentehealthplan`
- X (Twitter): `https://x.com/permanenteplan`

For internal developer questions or contributions, please open an issue or submit a pull request.

## License
Copyright © Permanente Health Plan. All rights reserved.

## Screenshots
Add screenshots to `static/images/screenshots/` and reference them here. Example:

```md
![Landing](static/images/screenshots/landing.png)
![Dashboard](static/images/screenshots/dashboard.png)
```

Tip: Keep images under 2MB for fast repo clones. Prefer PNG or optimized JPEG/WebP.

## Firebase Setup (Auth + Firestore)
1. Create a Firebase project at `https://console.firebase.google.com`
2. Add a Web App, copy the config and map to env vars in `.env` (see Environment Variables section)
3. Enable Authentication providers (e.g., Email/Password) under Authentication > Sign-in method
4. Create a Firestore database in Production mode
5. Configure Firestore security rules (`firestore.rules` exists in the repo)
6. If using Storage, enable it and set rules as needed

Example client initialization (pseudocode):

```ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

## CI/CD

### Vercel
- Connect the GitHub repo to Vercel
- Set Environment Variables in Vercel Project Settings
- Every push to `main` triggers a production deployment (or use Preview for branches)

### Netlify
- Import the repo in Netlify
- Build command: `npm run build`
- Publish directory: `.svelte-kit/netlify`
- Set Environment Variables in Site Settings

### GitHub Actions (example)
Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run check
      - run: npm run lint
      - run: npm run build
```

Optionally add a deploy step using your preferred action for Vercel or Netlify.
