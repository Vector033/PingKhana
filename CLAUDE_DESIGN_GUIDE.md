# CLAUDE_DESIGN_GUIDE: Professional Web Design System & Anti-AI-Slop Framework (PingKhana Edition)

> Master UI/UX, Live Radar Motion & Anti-AI-Slop Engineering Guide for Claude Code / Claude Chat.
> Incorporates the 10 World-Class Reference Websites, the 20 Rules to Unslop AI Designs, and PingKhana's Live Intelligence Radar Design System.

---

## 1. Core Mandate: Professional Web Design Skills & Zero AI Slop

When generating or refactoring UI for **PingKhana**, Claude must strictly apply professional **Web Design Skills** and completely eliminate **AI Slop**:

* **Activate Real Web Design Skills:**
  * **The Modern Intelligence Radar:** PingKhana is not a static WordPress blog; it is an active real-time radar monitoring faculty announcements. Visitor trust stems from fresh data, live beacons, and razor-sharp urgency indicators.
  * **Cognitive Fluency & Urgency Hierarchy:** Announcements are scattered across dozens of faculty sites. The core student pain point is missing deadlines. High cognitive fluency requires that deadlines within 3 days must visually command attention first via pulsating red urgency badges (`@keyframes urgencyPulse`).
  * **The 60-30-10 Color Architecture:**
    * **60% Slate Ground:** Clean slate surface (`--bg: #f8fafc` Light / `#0b1120` Dark).
    * **30% Card Surface & Structure:** Pure white card surfaces (`--surface: #ffffff`), hairline borders (`--line: #e2e8f0`), and crisp slate typography (`--fg: #0f172a`).
    * **10% High-Energy Action Accents:**
      * Deep Teal (`--brand: #0f766e`) for primary branding, active filters, and tags.
      * Urgency Red (`--danger: #b91c1c`) strictly for deadlines closing in < 3 days.
      * LINE Green (`--line-green: #06c755`) for the primary "Remind Me in LINE" conversion CTA.
  * **Tactile Physics & The Peak-End Rule:**
    * **The Peak:** Clicking an announcement and sliding open a concise 3-bullet AI summary drawer.
    * **The End (Conversion):** Clicking "Set LINE Reminder" with a satisfying bell-ringing micro-interaction.

* **Strict "Zero AI Slop" Prohibition:**
  * ❌ NO generic purple-to-blue linear gradients.
  * ❌ NO useless decorative badges (e.g. "✨ AI Smart Feed").
  * ❌ NO random italicized words in announcement titles.
  * ❌ NO unstyled, generic 3-card columns.
  * ❌ NO mismatched corner radii (must follow `inner = outer - padding`).
  * ❌ NO unformatted shifting countdown dates (must use `tabular-nums`).
  * ❌ NO scrolljacking (feed must scroll natively and smoothly).

---

## 2. The 10 Masterclass Reference Websites (Study & Emulate)

Study these 10 industry-standard websites. Prompt Claude to take inspiration from their specific design principles and adapt them to PingKhana:

| # | Reference Domain | Real URL | Core Principle to Study & Emulate | Application to PingKhana |
|---|---|---|---|---|
| 1 | **Animations** | [apple.com](https://www.apple.com) | Hardware-accelerated narrative scroll, spring easing curves. | Staggered entrance animation for announcement cards entering the feed. |
| 2 | **Onboarding** | [duolingo.com](https://duolingo.com) | Low-friction progression, rewarding milestones, delightful feedback. | 1-click LINE account link for immediate notification subscriptions. |
| 3 | **UI Design** | [linear.app](https://linear.app) | Hairline borders, high density, keyboard shortcuts, clean dark/light UI. | Precision metadata pills (Faculty, Year, GPAX), live status beacons. |
| 4 | **Typography** | [pentagram.com](https://www.pentagram.com) | Disciplined font scales, editorial grid discipline, deliberate line-heights. | Typographic balance between Thai headings and English date/GPAX badges. |
| 5 | **Minimalism** | [muji.com](https://www.muji.com) | Functional calm, unadorned utility, high breathing room. | Clean announcement card feed without noisy decorative banners. |
| 6 | **Search & Filters** | [airbnb.com](https://airbnb.com) | Clean pill filter bars, instant feedback, interactive filter states. | Filter announcements by category (Scholarships, Internships, Exchange, Jobs). |
| 7 | **Art Direction** | [aesop.com](https://aesop.com) | High-trust editorial mood, bespoke textures, storytelling. | High-trust academic radar aesthetic with high contrast and dark mode clarity. |
| 8 | **Dashboards** | [notion.com](https://notion.com) | High-density information architecture, modular blocks, distraction-free. | Slide-over drawer detailing announcement criteria, requirements, and links. |
| 9 | **Landing Page Layouts** | [stripe.com](https://stripe.com) | Gold-standard sectioning, interactive product demos, fluid responsive transitions. | Header stats bar showing: "42 active announcements, checked 5 mins ago". |
| 10 | **Micro-interactions** | [framer.com](framer.com) | Tactile spring physics, button compression, magnetic hover feedback. | Bell ringing animation on "Set LINE Reminder" CTA; card lift on hover. |

---

## 3. The 20 Rules to Unslop AI Designs (Complete Checklist & Rules)

Every UI component generated by Claude must pass this 20-rule checklist:

1. **Delete filler badges:** Remove meaningless pill badges (e.g., "AI Powered", "Smart Radar"). Keep only functional badges (e.g., "Closes in 2 days", "Faculty of Science", "GPAX 3.0+").
2. **Drop redundant labels:** Eliminate obvious labels (e.g., instead of "Deadline: 15 Nov", display "⏳ 15 Nov" or an urgency countdown pill).
3. **Unitalicize random words:** Claude often italicizes random adjectives. Remove all random italics—use font weight or hierarchy instead.
4. **Mono only where needed:** Restrict monospace fonts strictly to crawler timestamps and system status codes. Never use mono for announcement titles.
5. **Use a design system:** Always bind colors and typography to PingKhana's tokens (`--bg`, `--surface`, `--brand`, `--danger`, `--line-green`). Never hardcode random hex values.
6. **Show the actual product:** In hero sections, display actual live announcement cards with real faculty deadlines, not abstract 3D shapes.
7. **Enlarge the main feature:** The Urgency Countdown ("Ends in 24 hours") is the primary trigger—make urgent announcements visibly highlighted.
8. **Group with spacing:** Group announcement metadata using clean spacing (`gap-3`, `space-y-2`) instead of nesting cards inside cards.
9. **Make headlines specific:** Replace generic AI copy ("Never Miss an Opportunity Again") with concrete value ("Track scholarships, co-ops, and faculty deadlines with instant LINE alerts").
10. **Emphasize the CTA:** Make the primary conversion button ("Set LINE Reminder") stand out with LINE Green (`--line-green: #06c755`) and tactile spring compression (`active:scale-95`).
11. **Add an accent colour:** Use Teal (`--brand: #0f766e`) as the primary accent and Red (`--danger: #b91c1c`) exclusively for urgency < 3 days.
12. **Keep icons consistent:** Use Lucide-style inline SVG icons (no icon dependency; `lucide-react` is not installed), with a uniform ~1.5px rendered stroke (`strokeWidth × size / viewBox`) across all cards.
13. **Remove embellishments:** Strip away decorative background squiggles, floating shapes, and blurry gradient blobs.
14. **Inner radius = outer – padding:** Enforce the nested radius formula: `rounded_inner = rounded_outer - padding`. (e.g. announcement card `rounded-xl` (12px) with `p-3` (12px) requires inner tag `rounded-xs` (2px) or `rounded-none`).
15. **Improve text contrast:** Muted metadata (`--muted: #475569`) must maintain at least 4.5:1 contrast against the surface in both light and dark modes.
16. **Wrap headlines properly:** Apply `text-wrap: balance` to headings and prevent awkward line breaks or single-word orphan lines in Thai.
17. **Align by eye, not pixels:** Visually center calendar/clock icons alongside deadline text rather than relying purely on text bounding boxes.
18. **Use tabular nums:** Apply `tabular-nums` to all countdown hours, dates, and GPAX requirements to prevent jumping layouts.
19. **Add loading states:** Always implement skeleton cards (`animate-pulse`) while announcements are being fetched from the API.
20. **Animate useful feedback:** Trigger `animate-urgency` pulse on deadlines < 3 days; trigger bell wiggle when subscribing to LINE reminders.

---

## 4. PingKhana Design Tokens & Motion Recipes

Add/verify in `web/src/app/globals.css`:

```css
@keyframes urgencyPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.45); }
  50% { box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
}

@keyframes bellWiggle {
  0%, 100% { transform: rotate(0); }
  25% { transform: rotate(-12deg); }
  75% { transform: rotate(12deg); }
}

.animate-urgency {
  animation: urgencyPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-bell:hover {
  animation: bellWiggle 0.4s ease-in-out;
}
```

---

## 5. 22 Backgrounds to Make Designs Less Flat (Anti-Flatness Texture & Depth Guide)

To escape sterile, flat digital canvases without creating noisy **AI Slop**, apply tactile textures, optical glass, or structured grids deliberately. Always maintain WCAG AA contrast (≥ 4.5:1), use `pointer-events: none`, and keep pattern opacities subtle (`0.02`–`0.08`) or masked at edges (`mask-image: radial-gradient(...)`):

| # | Technique | Visual Style & Depth Effect | Pure CSS / SVG Implementation Hint |
|---|---|---|---|
| 1 | **Felt texture** | Soft matte textile fiber warmth | Inline SVG `<feTurbulence>` fine grain + soft warm tint overlay |
| 2 | **Fluted glass** | Vertical ribbed optical refraction | Repeating linear-gradient strips + `backdrop-filter: blur(12px)` |
| 3 | **Thermal gradients** | Infrared heat-map color transitions | Multi-stop smooth radial gradient (strictly for < 3-day urgency / radar accents) |
| 4 | **Water ripples** | Concentric liquid light refractions | Subtle SVG displacement map or layered concentric radar ring pulses |
| 5 | **Speckled graphite** | Fine charcoal/pencil grain on matte surfaces | Micro-dot radial pattern + SVG fractal noise (`opacity: 0.04`) |
| 6 | **Single-hue landscapes** | Layered monochrome depth planes | Layered SVG silhouettes in stepped opacities of `--brand` |
| 7 | **Blueprint grids** | Precision engineering grid lines | CSS `linear-gradient` 1px grid (`background-size: 24px 24px`) with radial fade mask |
| 8 | **Halftone** | Retro print dot matrix shading | CSS `radial-gradient(circle, currentColor 1px, transparent 1px)` staggered |
| 9 | **Grainy gradients** | Tactile film-grain gradient without plastic smoothness | CSS radial gradient + SVG `feTurbulence` noise layer (`mix-blend-mode: overlay`) |
| 10 | **Grass texture** | Organic natural directional fiber | Fine directional micro-stroke SVG pattern |
| 11 | **Dithered images** | 1-bit retro ordered pixel dithering | Pre-dithered SVG/Canvas image filter for crisp low-ink retro depth |
| 12 | **Paper texture** | Authentic cotton, vellum, or receipt stock fiber | Subtle SVG paper fiber noise (`baseFrequency="0.8"`) over `--surface` |
| 13 | **Contour lines** | Topographic elevation/radar sweep curves | Clean ultra-thin 1px SVG concentric/topographic curves (`opacity: 0.06`) |
| 14 | **Cloud sky** | Soft atmospheric depth with natural diffusion | Layered ultra-soft blurred radial ellipses at low opacity |
| 15 | **Pixel mosaics** | Structured color-stepped pixel blocks | Crisp `image-rendering: pixelated` low-res gradient grid |
| 16 | **Lens distortion** | Subtle optical edge vignette & light bending | Soft edge vignette + curved specular highlight arc |
| 17 | **Stippled gradients** | Hand-drawn stipple dot density fade | Variable-density SVG dot scatter or masked halftone fade |
| 18 | **Square-dot grids** | Crisp architectural radar dot matrix | CSS `radial-gradient` / `conic-gradient` 1.5px square dots (`20px × 20px`) |
| 19 | **Blurred photos** | Ambient photographic color wash | Real campus/faculty photo with `filter: blur(48px)` + high-contrast scrim |
| 20 | **Iridescent shapes** | Subtle holographic pearlescent sheen | Restrained `conic-gradient` specular highlight (very low opacity) |
| 21 | **Impressionist paintings** | Rich textured brushwork warmth | Softly blurred painterly color dabs under a translucent matte scrim |
| 22 | **ASCII and pixels** | Technical monospace character matrix & pixel art | Lightweight static telemetry dot/ASCII radar pattern in crawler banner |

### Best Background Picks for PingKhana (Live Intelligence Radar)
* **#13 Contour lines & #18 Square-dot grids:** Concentric radar rings and subtle coordinate dots in the top radar header (`page.tsx` / `Feed.tsx`)—instantly reinforcing the "Live Faculty Announcement Radar" metaphor in both Light and Dark mode.
* **#9 Teal tint (no noise layer) & #3 Thermal gradients:** Ultra-restrained teal (`--brand` at 6%) radial tint across the radar hero (`.radar-grain-tint`), and soft red thermal accent glow strictly behind `< 3 days` urgent deadline banners (`AnnouncementCard.tsx`). Do **not** add an SVG `<feTurbulence>` noise layer on top: at this opacity it is invisible and failed the removal test (removed 2026-11-13).
* **#2 Fluted glass:** Vertical ribbed translucent glass on `TopNav.tsx`, sticky filter pills, and the Quick Preview slide-over drawer.
* **#22 ASCII and pixels — not used:** The `[::.:] SCAN 1H` pixel matrix strip was removed (2026-11-13). It showed no real data, duplicated the live beacon + "อัปเดตล่าสุด" timestamp, and broke rules #1, #4 and #13. Do not re-add it.
* **Removal test (hero layers):** Hide each decorative layer in turn in Light and Dark; if nobody would notice, delete it. The hero keeps exactly: teal tint, `RadarShader`, square-dot grid (dots only, no ruled lines), and concentric rings + crosshair. No extra topographic curves.

---

## 6. GPU Shader Background Architecture (Andres The Designer Workflow)

Reference Tutorial: **Shaders Tutorial: SICK Website Backgrounds** ([YouTube](https://www.youtube.com/watch?v=XVfUl8DB2D8)) & **Paper Shaders** ([shaders.paper.design](https://shaders.paper.design) / [shaders.com](https://shaders.com)).

Unlike heavy MP4 videos or CPU-laggy CSS blurs, **WebGL/Canvas Fragment Shaders** compute textured motion directly on the GPU at 60 FPS with minimal bundle footprint.

### 6.1 Implementation Paths in Next.js 16 + React 19
* **Option A — `@paper-design/shaders-react` (Recommended):**
  * Install `npm install @paper-design/shaders-react` inside `web/` and tune props visually on [shaders.paper.design](https://shaders.paper.design).
* **Option B — Zero-Dependency WebGL `<canvas>` Fragment Shader:**
  * Write a lightweight `'use client'` GLSL fragment shader (`u_time`, `u_resolution`, `u_colors`) with `ResizeObserver` and clean GPU resource disposal (`gl.deleteProgram`) on unmount.

### 6.2 Mandatory Next.js & Anti-AI-Slop Guardrails for Shaders
1. **`'use client'` + Theme Reactivity:** Wrap shaders in a `'use client'` component (`RadarShader.tsx`) that listens to `prefers-color-scheme: dark` so colors adapt cleanly between Light Slate (`#f8fafc` + `#0f766e`) and Dark Radar (`#0b1120` + `#2dd4bf`).
2. **Battery & Accessibility (`prefers-reduced-motion` + Offscreen Pause):** Set `speed={0}` when `prefers-reduced-motion` is enabled, and pause animation via `IntersectionObserver` when scrolled out of view.
3. **Radar Header & Urgent Card Focus Only:** Keep the shader strictly inside the top Live Radar hero/telemetry header (`web/src/app/page.tsx`), masked smoothly (`mask-image: radial-gradient(...)`), never behind dense announcement feed text.
4. **Strict Brand Palette:** Use PingKhana's Teal & Slate tokens only—never purple AI slop.
5. **Cheap by Default:** The shader output is a soft glow, so render at 1 canvas pixel per CSS pixel (no `devicePixelRatio` scaling) and cap drawing at ~30 fps. Real-phone GPU cost has not been measured yet.

### 6.3 PingKhana Shader Recipe
```tsx
// web/src/components/RadarShader.tsx ('use client')
import { DotOrbit, NeuroNoise } from '@paper-design/shaders-react';

// Live intelligence radar telemetry backdrop (adapts Light/Dark automatically)
<DotOrbit
  colorBack={isDark ? '#0b1120' : '#f8fafc'}
  colors={
    isDark
      ? ['#2dd4bf', '#134e4a', '#1e293b']
      : ['#0f766e', '#99f6e4', '#cbd5e1']
  }
  scale={0.32}
  speed={reducedMotion || !isVisible ? 0 : 0.3}
  style={{ width: '100%', height: '100%' }}
/>
```
*(Alternative neural-radar look: `<NeuroNoise>` with `#0f766e` / `#2dd4bf` at low opacity in the top radar banner.)*

---

## 7. Synthesis of 6 UI/UX Masterclasses & 2026 Web Design Trends

Synthesized directly from 6 masterclasses on high-converting UI/UX, typography, spacing, and 2026 web trends:

### 7.1 Video-by-Video Technique Matrix (Apply Maximum Applicable Techniques)
1. **50 Web Design Tips & Tricks ([youtu.be/rRFD6tENX2U](https://youtu.be/rRFD6tENX2U)):**
   * **Layout & 3-Tier Hierarchy:** 12-column responsive grid; 3 importance tiers (1. Deadline / Title / LINE CTA -> 2. Category / Faculty / GPAX pills -> 3. Source crawler timestamp).
   * **60-30-10 Color Discipline:** 60% clean slate (`#f8fafc` / `#0b1120`), 30% crisp cards & ink (`#ffffff` / `#0f172a`), 10% Teal (`#0f766e` / `#2dd4bf`) & Urgency Red (`#b91c1c`) + LINE Green CTA (`#06c755`).
   * **Image Tone, WebP < 300KB & Gaze Cueing:** Keep announcement thumbnails (`Thumb.tsx`) crisp, uniform, and properly cropped; use subtle directional cues toward urgent deadlines.
   * **80% Top-Fold Rule & Scroll-Backward Audit:** Radar stats strip + category filters + top urgent cards must shine in the first screen; audit `/a/[id]` and `/liff` bottom-to-top on real mobile screens.
   * **Accessibility:** Never rely on red/green urgency color alone—pair with Clock/Alert icons and clear Thai deadline labels (`"ปิดรับใน 2 วัน"`).

2. **Discovery & Transformation Messaging ([youtu.be/BfHuIgjLC5E](https://youtu.be/BfHuIgjLC5E)):**
   * **Transformation > Features:** Lead with student peace of mind (*"ไม่พลาดทุน สหกิจ และงานสำคัญอีกต่อไป ให้ LINE เตือนก่อนปิดรับ 3 วัน"*) rather than raw scraper specs.

3. **9 Web Design Hacks ([youtu.be/TeMtV8BaZt0](https://youtu.be/TeMtV8BaZt0)):**
   * **Hack 1 — 50–75ch Text Chunking:** Limit AI summaries and announcement excerpts in `/a/[id]` and preview drawers to 50–75ch width.
   * **Hack 2 — Icon Bullet Points:** Display eligibility criteria & 3-bullet AI summaries with uniform Lucide icons.
   * **Hack 3 — 8pt Grid + Double-Rule Spacing:** `8/16px` inside `AnnouncementCard.tsx`, at least **double (`32px`)** between radar hero, filter bar, and announcement grid.
   * **Hack 4 — Line-Height Ratios (Thai-Safe):** Thai headlines `1.25–1.3`; Body `1.6`.
   * **Hack 5 — Letter Spacing by Role:** Display titles tight (`-0.02em`); Thai body `0`; Uppercase tags & CTA slight positive tracking (`+0.03em`).
   * **Hack 6 — Font Super Families:** Single consistent IBM Plex Sans Thai family (`--font-plex`) + `tabular-nums` for countdown dates and GPAX.
   * **Hack 7 — CSS Overview Audit:** Check Light and Dark contrast (`>= 4.5:1`) via Chrome DevTools CSS Overview.
   * **Hack 8 — Radial Text Scrim:** Keep a radial mask (`radar-mask-tr`) on `RadarShader` + contour lines so hero headline text never competes with dots/rings.
   * **Hack 9 — The Squint Test:** Blur/squint at `/` and `/a/[id]`—Radar Hero Headline, `< 3 days` Urgent Cards, and "เตือนฉันใน LINE" CTA must pop instantly.

4. **15 UI/UX Product Mistakes Fixed ([youtu.be/GGg61sdEjeI](https://youtu.be/GGg61sdEjeI)):**
   * **Contrast Protection Over Dynamic Posters (`Thumb.tsx`):** Floating category/urgency badges over bright faculty poster images MUST have dark/frosted backing pills + crisp 1px border so they never disappear!
   * **Consistent Catalog Grid (`AnnouncementCard.tsx`):** Uniform thumbnail aspect ratios and surface framing across every card so faculty feeds never look chaotic.
   * **Trust Signals Next to Title:** Place official source badge (`คณะวิทย์ฯ` / `สำนักทะเบียน`) and verification timestamp right next to the announcement title.
   * **Sticky Mobile CTA + 1-Tap Filter Presets:** Keep quick filter chips (`ทั้งหมด`, `ทุนการศึกษา`, `สหกิจ`, `ใกล้ปิดรับ`) 1-tap away; make `"เตือนฉันใน LINE"` sticky at the bottom of mobile detail views (`/a/[id]` / drawer).
   * **Drop Redundant Labels & Soft Dividers:** Remove `"หัวข้อ:"` / `"กำหนดส่ง:"` labels; soften borders (`border-line`).

5. **Top 3 Conversion & Trust Redesigns ([youtu.be/zr37ibqXl1U](https://youtu.be/zr37ibqXl1U)):**
   * **Core Law:** *"Every UI element asks the user a question. Easier question = faster action."*
   * **Safety Net > Sales Pitch (Transparency Bias):** On the LINE reminder action (`RemindButton.tsx`), show the exact transparent **3-step timeline** (*"กดเตือน -> เตือนก่อนปิด 3 วัน -> เตือนซ้ำก่อนปิด 1 วัน · ยกเลิกได้ตลอด"*).
   * **Ownership Microcopy + Specific Numbers:** Specific deadlines with day names (*"ปิด ศ. 14 พ.ย. · เหลือ 2 วัน"*, never vague ranges) save mental math; `"เตือนฉันใน LINE"` feels personal and immediate.

6. **Top 9 Web Design Trends of 2026 ([youtu.be/waHuVF3XuMA](https://youtu.be/waHuVF3XuMA)) & Workspace Background Rule:**
   * **Hero vs Feed Background Rule:** Keep `RadarShader`, concentric contour rings, and `radar-dot-grid` **strictly inside the top Live Radar Hero (`web/src/app/page.tsx`)**. Keep the announcement listing feed (`Listing.tsx` / `Feed.tsx`), `/a/[id]` reading pages, and `/liff` forms **clean, quiet slate (`--bg`)** so students can scan dozens of deadlines effortlessly.

| 2026 Trend | Use in PingKhana? | Exact Application to PingKhana |
|---|---|---|
| **1. "Barely There" AI Hyper-Minimalism + Telemetry** | ✅ **Primary Fit** | Clean Light/Dark slate canvas, 1 Teal accent, live hourly crawler metrics strip (`StatsStrip`). |
| **2. Maximalism with an Asterisk** | ❌ Skip | PingKhana is an intelligence feed—clarity and speed beat loud maximalist display clutter. |
| **3. Wabi-Sabi / Human Touch** | ✅ **Accent Fit** | Student highlighter `.marker` yellow underline (`--mark`) and warm conversational Thai summaries. |
| **4. Grade School Color Palettes** | ⚠️ Grounded | Grounded Teal, Slate, Amber, and Red urgency tones (plus dark mode parity). |
| **5. Spaceship Instruction Manual** | ✅ **Primary Fit** | Radar concentric rings, coordinate dot grids, live status beacons, `tabular-nums` scrape timestamps. |
| **6. Democratized WebGL Shaders** | ✅ **Radar Header Only** | Reactive Light/Dark `RadarShader` (`DotOrbit`) strictly inside top radar banner. |
| **7. Internet Nostalgia** | ❌ Skip | The ASCII/pixel status matrix was removed: decoration posing as telemetry (rules #1, #4, #13). |
| **8. Subtle Opt-In Micro-Sound** | ❌ Skip | Keep student announcement browsing silent by default. |
| **9. Custom Non-Slop Gradients** | ✅ **Subtle Only** | Subtle teal tint on radar hero (no noise layer) + faint red thermal corner accent strictly on `< 3 days` urgent cards. |

---

## 8. Claude Code Design Skills, 21st.dev & The $10,000 Website Workflow (Metics Media)

> **Source:** [Build a $10,000 website with Claude Code (Ultimate Guide) — Metics Media](https://www.youtube.com/watch?v=VMvZuhcDdnw)  
> **Key Insight:** Avoid generic prompt commands like "build a modern announcement board". Instead, load Anthropic's **frontend-design** and **ui-ux-pro-max** skills, draw copy-pasteable design-engineer components from **21st.dev** (interactive bento grids, glowing urgency badges, dynamic filter docks), and audit against the 8-pillar checklist to turn PingKhana into an executive-grade telemetry dashboard.

### 8.1 The Claude Code Design Skills Stack

| Tool / Skill | Repository / URL | Purpose & How Claude Uses It |
|---|---|---|
| **Frontend Design Skill** *(by Anthropic)* | [github.com/anthropics/skills/.../frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | Anthropic's official skill to eliminate AI slop. Teaches Claude to craft intentional radar telemetry visual rhythm, high-density information architecture, purposeful dark/light contrast, and reject generic dashboard templates. |
| **UI/UX Pro Max Skill** *(by NextLevelBuilder)* | [github.com/nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Principal Product Designer heuristics: strict mathematical radii (`r_in = r_out - p`), 60-30-10 color balance, WCAG AA contrast (>=4.5:1), 8pt spacing rhythm, micro-haptic feedback (`active:scale-[0.98]`), and mobile touch ergonomics (>=44-48px). |
| **21st.dev Component Library** | [21st.dev](https://21st.dev) | The "npm for design engineers" (shadcn/ui + Tailwind + Framer Motion). Supplies interactive bento announcement grids, pulsing beacon dots, glowing deadline pills, and dynamic slide-over preview drawers. |
| **Curated Design References** | Dribbble, Awwwards, Pinterest | Real design anchors: Linear (high-density precision & telemetry beacons), Airbnb (pill filters & search layout), Framer (spring physics & card hover lift), Stripe (clean status badges). |
| **The 8-Pillar $10,000 Checklist** | [Google Drive PDF Download](https://drive.google.com/file/d/1CCRCvSbJ1tNXmd2YDnUNr1XkTAguYG7v/view?usp=drive_link) | The definitive audit rubric ensuring PingKhana delivers an authoritative university announcement intelligence feed. |

---

### 8.2 The 8-Pillar $10,000 Website Framework (Applied to PingKhana)

1. **Pillar 1: Distinctive Brand Identity & Aesthetic Tension:**
   - University Telemetry Radar Identity: Slate canvas (`#f8fafc` light / `#0b1120` dark), pure white/dark cards, deep teal brand accent (`#0f766e` / `#2dd4bf`), and surgical urgency red (`#b91c1c` / `#f87171`) strictly for closing deadlines.
2. **Pillar 2: Intentional Hierarchy & Grid:**
   - 8pt spacing rhythm: 16px intra-card gap, >=32px inter-section gap. Tabular numbers for deadlines & countdowns (`tabular-nums font-mono`). Thai headings `1.2–1.3` line-height, body `1.6`.
3. **Pillar 3: Micro-Interactions & Tactile Feedback:**
   - Card hover elevation (`hover:-translate-y-1 hover:shadow-md`) with subtle teal border sheen.
   - Pulsing live crawler beacon (`animate-ping`) and urgency countdown badge roll-in.
4. **Pillar 4: Rich Visual Texture Without AI Slop (Radar Hero vs Feed Rule):**
   - Radar Hero: Subtle WebGL `RadarShader` with concentric telemetry rings.
   - Announcement Feed & `/a/[id]`: Calm slate surface + fluted glass header + crisp image thumbnail scrims. Strictly NO heavy background gradients behind announcement typography.
5. **Pillar 5: Trust Architecture & Frictionless Proof:**
   - Concrete telemetry claim: *"ไม่พลาดทุน ฝึกงาน และกิจกรรมสำคัญ มช. — ดึงประกาศตรงจากทุกคณะ แจ้งเตือนก่อนหมดเขตทันที"*.
   - Live scraper telemetry timestamp badge: *"อัปเดตล่าสุด 10 นาทีที่แล้ว · คณะวิศวกรรมศาสตร์, คณะวิทยาศาสตร์, ..."*.
6. **Pillar 6: Conversion & Frictionless Action:**
   - High-contrast LINE reminder CTA: `"เตือนฉันใน LINE (เหลือ 2 วัน)"`. Transparent 3-step safety timeline: *"กดเตือน -> เตือนก่อนปิด 3 วัน -> เตือนซ้ำก่อนปิด 1 วัน · ยกเลิกได้ตลอด"*.
7. **Pillar 7: Mobile-First Thumb Ergonomics:**
   - LIFF/Mobile-first ergonomics: Sticky bottom LINE notification bar on `/a/[id]` mobile views; all filter chips and buttons >= 44x44px. Zero scrolljacking.
8. **Pillar 8: Disciplined 4-Pass Polish Workflow:**
   - **Pass 1 (Structure):** Announcement feed models, FastAPI endpoints, LIFF auth.
   - **Pass 2 (Visual Polish):** Dual-theme tokens (Light/Dark), faculty badges, deadline countdown styling.
   - **Pass 3 (Motion & 21st.dev Components):** 21st.dev filter drawer, animated countdown badge, hover lift.
   - **Pass 4 (Quality & Build Audit):** WCAG AA contrast check across both light/dark themes, `npm run build` in `web/`.

---

### 8.3 How to Install & Use These Skills in Claude Code (วิธีติดตั้งและเรียกใช้)

มี 3 วิธีหลักในการนำทักษะ (Design Skills) ไปใช้กับ Claude Code:

1. **วิธีที่ 1: ติดตั้งเป็น Skill ในโปรเจกต์ (`.claude/skills/`):**
   - สร้างโฟลเดอร์ `.claude/skills/` ใน root ของโฟลเดอร์โปรเจกต์
   - โคลนหรือดาวน์โหลดไฟล์ `SKILL.md` จาก GitHub:
     - **Frontend Design:** นำไฟล์จาก [anthropics/skills/tree/main/skills/frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) ไปวางที่ `.claude/skills/frontend-design/SKILL.md`
     - **UI/UX Pro Max:** นำไฟล์จาก [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) ไปวางที่ `.claude/skills/ui-ux-pro-max/SKILL.md`
   - เมื่อเปิดรัน Claude Code ตัวระบบจะตรวจจับและโหลด Skill เหล่านี้เข้ามาใน Context ทันที (หรือเรียกใช้ผ่าน `/frontend-design` และ `/ui-ux-pro-max`)

2. **วิธีที่ 2: ตั้งค่าให้อ่านอัตโนมัติผ่าน `CLAUDE.md` (Zero-Config Auto-Load):**
   - Claude Code จะอ่านไฟล์ `CLAUDE.md` ใน root ของโปรเจกต์เสมอเมื่อเริ่มทำงาน
   - เพิ่มคำสั่งลงใน `CLAUDE.md` ของโปรเจกต์:
     ```markdown
     ## Design Standards
     - Before writing or modifying any UI/UX or styles, strictly follow `CLAUDE_DESIGN_GUIDE.md`.
     - Adopt the Anthropic Frontend Design Skill rules (radar telemetry, anti-AI-slop) and UI/UX Pro Max heuristics (60-30-10, r_in = r_out - p, tactile springs).
     - Source component implementation patterns from 21st.dev (shadcn + Tailwind + Framer Motion).
     ```

3. **วิธีที่ 3: สั่งตรงผ่าน Prompt (Prompt Injection):**
   - หากไม่ได้ติดตั้งโฟลเดอร์ skill สามารถใช้ **Prompt 6** ในคู่มือนี้ ซึ่งมีบล็อก `Step 0 — Load Skills & Reference Repositories` กำชับบทบาท กฎเกณฑ์ 20 ข้อ และพฤติกรรมของทั้ง 2 skills ให้ Claude ปฏิบัติตามทันที

---

### 8.4 The "Make It Feel Alive" Triad: Motion.dev, Anime.js & Shadcn Charts (Applied to PingKhana)

> *"Claude can build a website fast. Making it feel alive is harder. That part lives in the details: how things move, how charts look. Motion.dev handles the transitions. Anime.js handles the custom motion. Shadcn charts handle the data. Like giving Claude a better toolbox. Same builder, better finish. Keep all three open next build."*

| Tool & Resource | Core Role | Exact Application to PingKhana |
|---|---|---|
| **[Motion.dev](https://motion.dev)** *(formerly Framer Motion)* | **State & Layout Transitions** | • Slide-over preview drawer transitions (`AnnouncementDrawer.tsx`) without leaving the main feed.<br>• Filter chip selection transitions and layout reordering with `layout` prop.<br>• Staggered card entrance transitions on filter changes and infinite scroll. |
| **[Anime.js](https://animejs.com)** | **Custom Motion & Micro-Timelines** | • Concentric radar sweep animation in the top Radar Hero section.<br>• Live crawler telemetry beacon pulse timeline (`animate-ping`) synchronized with timestamp updates.<br>• Countdown urgency flip clock / rolling digits for deadlines closing within 72 hours. |
| **[Shadcn Charts](https://ui.shadcn.com/docs/components/chart)** | **Accessible Data Visualization** | • Announcement density by faculty over time (Area / Bar Chart).<br>• Scholarship vs internship vs competition breakdown (Donut Chart) styled with Deep Teal (`--brand`) and Urgency Red (`--danger`) tokens.<br>• Dark/Light mode reactive chart tooltips and legends. |

---

## 9. Token-Efficient Claude Prompts for PingKhana (Copy-Paste Ready)

### Prompt 1: Announcement Feed & Urgency Radar Motion Polish
```text
Role: Senior UI/UX Designer & Frontend Engineer
Task: Elevate PingKhana's announcement feed (`web/src/app/page.tsx`, `web/src/components/AnnouncementCard.tsx`, and `web/src/app/globals.css`).

Reference Websites:
- Airbnb (airbnb.com) for clean pill filters and search layout.
- Linear (linear.app) for high-density precision, 1px borders, and live status beacons.
- Framer (framer.com) for tactile card lift and spring interactions.

Anti-AI-Slop & Design System:
1. Palette: Slate background (`--bg: #f8fafc`), pure white cards (`--surface`), deep teal brand (`--brand: #0f766e`), and urgency red (`--danger: #b91c1c`). Full dark mode support.
2. `AnnouncementCard.tsx`:
   - Staggered entrance animation for cards in feed.
   - For deadlines closing within 3 days, display an Urgency Countdown Badge with an ambient pulsing red glow (`animate-urgency`).
   - Clean metadata tags (Faculty/Department, Year, minimum GPAX).
   - Smooth hover elevation (`hover:-translate-y-1 hover:shadow-md transition-all duration-200`) with a subtle teal border glow.
3. Filters & Stats Strip:
   - Filter chips with tactile press feedback (`active:scale-95`).
   - Live monitoring beacon (pulsing green dot) next to "Scraped 10 mins ago".
4. Anti-AI-Slop Checks:
   - Use tabular numbers (`tabular-nums`) for all countdown dates and GPAX values.
   - No generic purple gradients or filler "AI-Powered" badges. Follow `inner = outer - padding`.
5. Preserve existing backend API calls and FastAPI endpoints.
```

### Prompt 2: Slide-Over Quick Preview Drawer & LINE CTA
```text
Role: Senior Frontend Engineer
Task: Build an interactive Slide-Over Drawer component for announcement details in PingKhana (`web/src/components/AnnouncementDrawer.tsx`).

Reference Websites:
- Notion (notion.com) for clean side-drawer reading layout.
- Framer (framer.com) for smooth spring slide-in and tactile button interaction.

Requirements:
1. Quick Preview Drawer:
   - Clicking any announcement card slides open the detail drawer from the right on desktop, or slides up from bottom on mobile.
   - Drawer Content:
     * Full title and faculty source badge with `text-wrap: balance`.
     * 3-bullet AI summary highlighting key takeaways and requirements.
     * Eligibility table (eligible majors, academic year, minimum GPAX).
     * Deadline countdown with calendar icon and `tabular-nums`.
     * Primary CTA: "Set LINE Reminder" (LINE Green `--line-green: #06c755` with bell ringing animation `animate-bell` on hover).
     * Secondary link: "View Official Faculty Post".
2. Motion & Backdrop:
   - Smooth backdrop blur (`backdrop-blur-sm bg-black/40`) with exit on Esc key or outside click.
   - Spring entrance easing `cubic-bezier(0.16, 1, 0.3, 1)`.
3. Accessibility:
   - Strict WCAG AA contrast (>= 4.5:1) in both Light and Dark themes. Touch target >= 44px.
```

### Prompt 3: Background & Live Radar Depth (Anti-Flatness Without AI Slop)
```text
Role: Senior UI/UX Designer & Frontend Engineer
Task: Upgrade PingKhana's flat backgrounds into a sharp "Live Intelligence Radar" surface (`web/src/app/globals.css`, `web/src/app/page.tsx`, `web/src/components/TopNav.tsx`, `web/src/components/Feed.tsx`, and `web/src/components/AnnouncementCard.tsx`) using Section 5 ("22 Backgrounds to Make Designs Less Flat") with zero AI slop.

Requirements:
1. Radar Hero & Telemetry Strip (`web/src/app/page.tsx` & `Feed.tsx`):
   - Apply concentric SVG #13 radar rings + crosshair and a #18 Square-Dot Grid (2px `--line-strong` dots every 20px, dots only, no ruled lines) masked smoothly with `mask-image: radial-gradient(circle at top right, black 25%, transparent 75%)`.
   - Overlay a restrained teal radial tint (`--brand: #0f766e` light / `#2dd4bf` dark at 6% opacity). No SVG `<feTurbulence>` noise layer.
   - Do not add an ASCII/pixel matrix strip or any other decorative telemetry; the live dot + "อัปเดตล่าสุด" timestamp is the only status indicator.
2. Urgent Deadline Cards (`AnnouncementCard.tsx`):
   - For deadlines closing within 3 days, add a soft internal #3 Thermal Gradient corner highlight (`--danger` at 5% opacity) instead of loud neon borders.
3. Top Navigation & Preview Drawer (`TopNav.tsx` & drawer backdrop):
   - Use #2 Fluted Glass (`backdrop-blur-md` + subtle vertical linear-gradient light strips at 3% opacity) across sticky headers and modal scrims.
4. Guardrails:
   - Support both `@media (prefers-color-scheme: dark)` and Light mode seamlessly using CSS variables.
   - Zero heavy background PNGs; maintain WCAG AA contrast (>= 4.5:1) for all Thai/English copy. Do not alter FastAPI endpoints or `@line/liff` logic.
```

### Prompt 4: Read Guide & Implement GPU Shader Background (PingKhana)
```text
Task: First, read `CLAUDE_DESIGN_GUIDE.md` thoroughly (especially Section 3 Anti-AI-Slop Rules, Section 4 Design Tokens, and Section 6 GPU Shader Background Architecture). Then follow the guide to implement a GPU Shader background in PingKhana's radar header (`web/src/app/page.tsx` and `web/src/components/Feed.tsx`).

Steps to Follow:
1. Create a reusable `'use client'` component `web/src/components/RadarShader.tsx` using `@paper-design/shaders-react` (`DotOrbit` or `NeuroNoise` from Section 6.3) or a zero-dependency WebGL `<canvas>` radar shader inside `web/`.
2. Wire reactive Light/Dark color switching (`#f8fafc` + `#0f766e` for Light; `#0b1120` + `#2dd4bf` for Dark) matching `web/src/app/globals.css`. Never use purple AI slop.
3. Implement mandatory guardrails from Section 6.2:
   - Respect `prefers-reduced-motion` (`speed = 0`) and pause offscreen via `IntersectionObserver`.
   - Keep behind the top Radar Hero/Header only (`pointer-events-none`, `aria-hidden="true"`, radial mask) so announcement cards and deadlines stay 100% readable.
4. Verify WCAG AA contrast (>= 4.5:1) in both themes, and run `npm run build` / TypeScript check in `web/` without modifying FastAPI backend or `@line/liff` logic.
```

### Prompt 5: Read Guide & Apply All 6 Masterclasses + 2026 Trends (PingKhana)
```text
Task: First, read `CLAUDE_DESIGN_GUIDE.md` thoroughly (especially Section 3 Anti-AI-Slop Rules, Section 6 GPU Shader Architecture, and Section 7 Synthesis of 6 UI/UX Masterclasses & 2026 Web Design Trends). Then audit and elevate PingKhana (`web/src/app/page.tsx`, `web/src/app/globals.css`, `web/src/components/AnnouncementCard.tsx`, `web/src/components/Thumb.tsx`, `web/src/components/Feed.tsx`, `web/src/components/RemindButton.tsx`, and `web/src/app/a/[id]/page.tsx`).

Apply Maximum Applicable Techniques & Best-Fit 2026 Trends (Zero AI Slop):
1. Trends & Radar vs Feed Separation:
   - Emphasize #1 "Barely There" Minimalism + Telemetry, #3 Human Touch (`.marker` highlighter), and #5 "Spaceship Instruction Manual" radar rings & coordinate dots.
   - Keep `RadarShader` & concentric contours strictly in the top Radar Hero (`web/src/app/page.tsx`); keep the main announcement feed (`Listing.tsx` / `Feed.tsx`), `/a/[id]`, and `/liff` on calm `--bg` slate surfaces.
2. Product Feed Polish (`uxpeak` + `9 Web Design Hacks`):
   - Contrast Protection in `Thumb.tsx` & `AnnouncementCard.tsx`: give any badge or icon floating over faculty poster thumbnails a crisp frosted/dark pill backdrop (`>= 4.5:1`) so text never vanishes on bright images.
   - Uniform card alignment rails (`16px`/`24px`), uniform thumbnail framing, and place source faculty trust pill directly beside announcement titles.
   - Maintain 8pt double-rule spacing (`16px` inside cards, `>= 32px` between radar hero/filters/feed), Thai line-heights (`1.3` headings, `1.6` body), and `50–75ch` reading width in `/a/[id]` AI summaries with icon bullets.
3. Conversion & LINE Safety-Net UX (`zr37ibqXl1U`):
   - Format deadlines specifically with Thai day names + exact countdown (`"ปิด ศ. 14 พ.ย. · เหลือ 2 วัน"` — never vague ranges) and pair urgency red with Clock/Alert icons (never color alone).
   - Around `RemindButton.tsx` ("เตือนฉันใน LINE"), present a transparent 3-step safety timeline (*"กดเตือน -> เตือนก่อนปิด 3 วัน -> เตือนซ้ำก่อนปิด 1 วัน · ยกเลิกได้ตลอด"*) and make the LINE CTA sticky on mobile detail views (`/a/[id]`).
4. Verification:
   - Check both Light and Dark mode contrast (`>= 4.5:1`), pass the Squint Test, and run `npm run build` inside `web/` without altering FastAPI backend endpoints or `@line/liff` core flow.
```

### Prompt 6: Complete $10,000 Website Polish with Claude Skills & 21st.dev (PingKhana)
```text
Task: Elevate PingKhana (`web/src/app/page.tsx`, `web/src/app/globals.css`, and `web/src/components/**`) to an executive $10,000 custom web application standard, following the Metics Media ultimate workflow.

Step 0 — Load Skills & Reference Repositories:
You MUST adopt the specialized persona, heuristics, and execution standards from:
1. Anthropic Frontend Design Skill (github.com/anthropics/skills/tree/main/skills/frontend-design): Focus on high aesthetic intentionality, bespoke radar telemetry aesthetics, avoiding generic card feeds, and crafting clean structural contrast.
2. UI/UX Pro Max Skill (github.com/nextlevelbuilder/ui-ux-pro-max-skill): Enforce strict mathematical radii (r_in = r_out - p), 60-30-10 color balance, WCAG AA contrast (>= 4.5:1), 8pt spacing rhythm, and tactile micro-interactions (active:scale-[0.98]).
3. 21st.dev Component Patterns (21st.dev): Adapt design-engineer primitives (interactive bento announcement feed, glowing urgency countdown pills, pulsing telemetry beacons, dynamic slide-over preview drawer) using Tailwind CSS and Framer Motion.
4. Design Reference Anchors: Linear (high-density precision & live status beacons), Airbnb (clean pill filters), Framer (tactile card hover lift), Stripe (clean status badges).

Execute the 4-Pass $10,000 Polish Method:

Pass 1: Information Architecture & Intelligence Feed (Anti-AI-Slop)
- Replace generic placeholder headings with high-conversion Thai proposition: "ไม่พลาดทุน ฝึกงาน และกิจกรรมสำคัญ มช. — ดึงประกาศตรงจากทุกคณะ แจ้งเตือนก่อนหมดเขตทันที".
- Eliminate all filler badges and generic centered cards. Present a live telemetry radar header with active crawler timestamp and filter chips.
- Maintain clear visual distinction between radar header, filter pill strip, announcement card grid, and the detail preview drawer.

Pass 2: Visual Style, Hierarchy & Dual-Theme Contrast (Radar vs Feed Rule)
- Enforce the Telemetry Slate system: `--bg: #f8fafc` (light) / `#0b1120` (dark), `--surface: #ffffff` / `#1e293b`, `--brand: #0f766e` / `#2dd4bf`, and `--danger: #b91c1c` / `#f87171` for urgent deadlines.
- Radar vs Feed Rule: Keep animated `RadarShader` strictly in the top hero/header. Keep announcement cards on clean surface with 1px borders (`--border: #e2e8f0` / `#334155`).
- Thumbnail scrims: Any badge or icon floating over faculty poster thumbnails MUST have a frosted/dark pill backdrop with >= 4.5:1 contrast.
- Typography: Kanit display with Anuphan body; line-heights 1.2–1.3 headings, 1.6 body. Tabular numbers for countdown dates (`tabular-nums font-mono`). Inner radius = outer radius - padding.

Pass 3: Micro-Interactions, Motion & 21st.dev Primitives
- 21st.dev Slide-Over Drawer: Implement a fluid spring-physics preview drawer for reading announcement summaries without leaving the feed.
- Hover & active physics: Card hover lift (`hover:-translate-y-1 hover:shadow-md transition-all duration-200`) and button press compression `active:scale-[0.98]`.
- Live Beacon & Countdown: Pulsing green live crawler beacon dot (`animate-ping`) and urgency badge roll-in for deadlines within 3 days.

Pass 4: Mobile Ergonomics & Production QA
- Mobile thumb ergonomics: Sticky bottom LINE notification bar on mobile detail views (`/a/[id]`); all filter chips and buttons >= 44x44px.
- Conversion clarity: Transparent 3-step safety timeline around `RemindButton.tsx` ("กดเตือน -> เตือนก่อนปิด 3 วัน -> เตือนซ้ำก่อนปิด 1 วัน · ยกเลิกได้ตลอด").
- Production safety: Strictly preserve FastAPI backend endpoints, crawler models, and `@line/liff` integration. Run `npm run build` inside `web/` with zero errors.
```
