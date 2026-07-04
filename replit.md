# Dubai Racing Carnival 30th Anniversary — Interactive AR Journey

## Overview
This project delivers a luxury, dark-themed mobile web application for the Dubai Racing Carnival's 30th Anniversary. Its core purpose is to engage guests through an interactive augmented reality (AR) experience. Users register, select a horse companion, and embark on a digital heritage trail across six Emirati craft stations. Along this journey, they cumulatively customize their digital horse, culminating in an AR photo capture that can be shared on Instagram for a chance to win a significant prize. The application is designed to be fully bilingual (English and Arabic) and includes a comprehensive admin panel for managing participants and tracking key performance indicators. The business vision is to create a memorable, immersive brand experience that blends cultural heritage with modern technology, enhancing guest engagement and promoting the Dubai Racing Carnival brand internationally.

## User Preferences
I want iterative development. I want to be asked before you make major changes.

## System Architecture
The application is built as a single-page application with a React-based frontend using Vite, TailwindCSS for styling, and shadcn/ui for components. State management is handled by React Context (`JourneyContext`) with API synchronization for resilience. Routing is managed by `wouter`, and internationalization by `react-i18next`. Data fetching uses `TanStack Query`. The backend is an Express.js server, utilizing Drizzle ORM with a PostgreSQL database.

**UI/UX Decisions:**
- **Theme:** Bohemian Arabian-centric palette using client-specified brand colors. Background: warm cream `--bg: #D4C4A8`, surfaces `#E8DCC8` / `#C8B898`. Primary colors: chocolate `#5C3D2E`, camel tan `#B89B71`, terracotta `#8B3A2A`, Godolphin blue `#2E4A8B`. Secondary: sage green `#5A7A5A`, copper `#C4883A`. Text: dark brown `#3A2518`, muted `#7A6850`.
- **Branding:** Features custom logos, Playfair Display (serif headings/display), Outfit (sans body), and Guesswhat (Arabic) fonts. Copper/terracotta accenting throughout on a warm sand base. Apple Chancery used as serif fallback.
- **Visual Polish:** Al-Sadu woven pattern overlays (`SaduPattern` component with multiple variants), geometric sadu stripe borders (top bars, card footers in terracotta/copper/blue/sage), arabesque gradient borders, heritage dividers with copper lines, copper/blue ambient gradient orbs, mesh gradient backgrounds, card-pop elevation system with warm shadows. Buttons use `btn-vivid` (chocolate→terracotta→copper gradient with shimmer) and `btn-godolphin` (Godolphin blue gradient).
- **Key CSS classes:** `.sadu-strip-top` (4px geometric stripe), `.heritage-divider` (ornamental rule), `.arabesque-frame` (gradient border), `.gold-border` (copper gradient border), `.sadu-card-rich` (pattern overlay + stripe footer), `.btn-vivid` (primary CTA), `.btn-godolphin` (blue CTA), `.mesh-bg` (multi-gradient background), `.card-pop` (elevated card with hover).
- **Language Support:** Full English (LTR) and Arabic (RTL) localization, with Arabic prioritized in UI elements.
- **Interactive Elements:** Features full-page slide-in overlays for registration/map/guide (not bottom-sheets) and interactive horse animations on the Capture page.
- **"Arabian Majlis" UX concept:** Home uses full-bleed hero imagery with left-aligned text overlay. Register uses a 3-column grid of icon cards for actions. HorseSelect uses a horizontal swipeable carousel with dot indicators. JourneyMap uses a 2×3 grid of heritage image tiles (not a vertical timeline). Station is a single continuous scroll page with parallax-style heritage image header (no multi-phase flow).
- **Augmented Reality:** Integrates live camera feed (front/back) for AR photo capture with horse overlay. Supports touch gestures for repositioning (drag) and resizing (pinch). Front camera is mirrored for natural selfie view. Camera flip button for switching between front/back cameras. Retry mechanism when camera permission is denied.

**Technical Implementations:**
- **OTP Verification:** A secure email-based OTP system for user registration and login, with built-in security measures like expiry, attempt limits, and anti-enumeration.
- **Horse Customization System:** Users select a base horse and progressively customize it at craft stations. The system generates unique, pre-rendered combo images (e.g., `rebels_romance-gold-dark-natural.png`) for each cumulative customization combination, eliminating the need for real-time overlay rendering. This supports 2,184 unique combo images across three horses and six stations, ensuring natural-looking gear integration. Images are stored in `server/assets/images/` and served via Express static middleware (not bundled with Vite) to keep the production build small.
- **Heritage Education Layer:** Each craft station features a full-screen, bilingual storytelling introduction before gear selection, complete with heritage images, titles, bodies, and poetic taglines.
- **Onboarding Tutorial:** An animated, multi-page tutorial system guides first-time users through the core functionalities using spotlight overlays, tooltips, and progress indicators, with state persistence in local storage.
- **Video Animation System:** Utilizes a dual-video crossfade system for smooth transitions between horse actions (idle, walk, eat, play, run) on the Capture page. Videos are preloaded for the selected horse, with a static image fallback.
- **Photo Capture:** A canvas-based system composites the live camera feed, customized horse image, and branding elements into a downloadable PNG.
- **3D Horse Racing Game:** A complete racing mini-game accessible from Register and Capture pages. Features intro video, horse selection with 3D model previews (Tripo3D-generated GLB models for Rebel's Romance, Muraad, Commissioner King), horse naming, short/long sprint selection, top 3rd person 3D race with tap-to-accelerate mechanic, Emirates sponsor billboards, dust particles, audience in stands, AI opponents, and results screen with score submission to leaderboard and share card generation. Built with React Three Fiber and Three.js. All scene elements (grandstand, start gate, finish post, fences, billboards, crowd, environmental props like palm trees/flags/barriers) support GLB model loading via `useModelAvailable` + Suspense with procedural fallback rendering. Scene models can be generated via `scripts/generate-scene-models.cjs` using the Tripo3D text-to-model API.

## External Dependencies
- **PostgreSQL:** Primary database for storing participant, OTP, and race score data.
- **Resend:** Email API for sending OTPs.
- **React:** Frontend library.
- **Vite:** Build tool.
- **TailwindCSS:** Utility-first CSS framework.
- **shadcn/ui:** UI component library.
- **Framer Motion:** Animation library.
- **wouter:** Routing library.
- **react-i18next:** Internationalization framework.
- **TanStack Query:** Data fetching and caching library.
- **Express.js:** Backend web application framework.
- **Drizzle ORM:** TypeScript ORM for PostgreSQL.
- **Three.js / React Three Fiber / Drei:** 3D rendering engine and React bindings for the horse racing game.
- **Tripo3D API:** AI-powered image-to-3D-model generation service for creating horse GLB models from reference images. Models stored in `server/assets/models/`.
- **compression:** Gzip/Brotli compression middleware for Express responses.

## Performance Optimizations
- **Code splitting:** All page components except Home are lazy-loaded with `React.lazy()` and `Suspense`.
- **Server compression:** Gzip compression on all responses via `compression` middleware.
- **Cache headers:** Hashed assets get 1-year immutable cache; media assets get 24h cache with stale-while-revalidate; HTML is no-cache.
- **Database optimization:** Stats query uses SQL aggregation instead of loading all rows into memory.
- **Server-side image serving:** Combo and horse images (3 GB+) served via Express static middleware from `server/assets/images/` instead of being bundled with Vite, keeping production builds under 120 MB.
- **Video preloading:** Sequential instead of parallel to avoid choking mobile connections.
- **Font optimization:** Only required font weights loaded; `display=swap` and preload hints. Google Fonts (Felipa, Outfit, Playfair Display) self-hosted in `client/public/fonts/` for offline availability.
- **PWA (Progressive Web App):** Full offline support via `vite-plugin-pwa` with Workbox. Service worker precaches the app shell (HTML, JS, CSS). Runtime caching strategies: CacheFirst for combo images (dedicated `combo-images` cache with 5000 entry limit), CacheFirst for fonts and static images, CacheFirst with range requests for videos, NetworkFirst with 5s timeout for API responses. Web app manifest enables "Add to Home Screen" with standalone display mode. Offline indicator component shows connection status.
- **Logging:** Removed per-response JSON.stringify from server logging middleware.