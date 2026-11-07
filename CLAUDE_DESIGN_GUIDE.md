# CLAUDE_DESIGN_GUIDE: Modern Web Design, Motion System & Psychological Framework (PingKhana Edition)

> Master UI/UX, Live Radar Motion System & Psychological Framework for Claude Code / Claude Chat.
> Synthesized from 6 World-Class Design Masterclasses (Apple, Stripe, byCrawford, Scrollcraft, MotionSites).

---

## 1. Synthesis of the 6 Design Masterclasses & Psychology

### 1.1 Psychological Architecture of High-Urgency Feeds (Sam Crawford)
1. **The 50ms Halo Effect (Live Intelligence Radar):**
   * Students seeking scholarships and co-op deadlines want to feel that they are looking at real-time, verified intelligence.
   * By designing the interface as a **Modern Intelligence Radar** (Teal accent `--brand: #0f766e`, clean slate surface, dark mode capability, and live status pulses), visitors immediately trust the freshness of the data.
2. **Cognitive Fluency & Urgency Hierarchy:**
   * Announcements are scattered across dozens of faculty sites. The biggest pain point is missing deadlines.
   * High cognitive fluency demands that deadlines within 3 days must visually command attention first via pulsating amber/red urgency badges (`@keyframes urgencyPulse`).
3. **The Peak-End Rule & Conversion to LINE Notification:**
   * Reading a long announcement PDF is tedious. The **Peak** is opening a clean 3-bullet AI summary drawer.
   * The **End** (primary conversion action) is clicking "Remind Me in LINE" (before 3 days and 1 day)—engineer a satisfying bell ringing micro-interaction and subtle glowing button.

### 1.2 Anti-AI Slop & The Radar Aesthetic (Mikey Website)
* **Reject Generic Blog Cards:** PingKhana is not a WordPress blog. It is an active monitoring feed with status indicators, department badges, and countdown timers.
* **Multi-Pass Refinement:** Instruct Claude in scoped passes (Feed & Card Layout -> Urgency Badges & Filters -> Slide-over Preview Drawer).

### 1.3 The 60-30-10 Color System (Chris Misterek)
* **60% Slate Surface:** Light `#f8fafc` / Dark `#0b1120`.
* **30% Structure & Card Surface:** Light `#ffffff` / Dark `#111827`, with hairline slate borders.
* **10% Action & Alert Accents:**
  * Teal `--brand: #0f766e` for active filters and category tags.
  * Flame red `--danger: #b91c1c` for deadlines closing within 3 days.

### 1.4 Kinetic Motion & Staggered Radar Entrance (Nate Herk)
* **Staggered Card Reveals:** Announcement cards enter with a staggered 50ms delay (`animate-card-enter`) simulating a radar ping updating the feed.
* **Filter Pill Morph:** Switching filters triggers a spring-animated active indicator pill.
* **No Scrolljacking:** Infinite or paginated feed scrolls naturally on all mobile devices.

### 1.5 Interactive Prototyping & Motion Libraries (Viktor Oddy)
* **MotionSites.ai & GetDesign.ai Patterns:** Lightweight CSS keyframes, pulsating status rings, and smooth slide-over modal drawers without heavy external libraries.

---

## 2. Curated Resource Directory (from Masterclass Video Descriptions)

* **Scrollcraft by Nate Herk:** Agentic design workflow and scroll-driven page mechanics (`skool.com/ai-automation-society`).
* **byCrawford Premium Website Checklist & System (Sam Crawford):** Principles of cognitive fluency, halo effect engineering, and conversion architecture (`bycrawford.com/premium-website-checklist`).
* **MotionSites.ai & GetDesign.ai (Viktor Oddy):** Curated prompt library for interactive hero sections, 3D card depth, and motion recipes (`motionsites.ai`, `getdesign.ai`).
* **Design Rocket (`designrocket.io`):** Interactive web prototyping course and workflows.

---

## 3. Tailwind CSS v4 & Next.js 16 Motion Recipes for PingKhana

Add to `web/src/app/globals.css`:

```css
@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.99);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes urgencyPulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(220, 38, 38, 0);
  }
}

@keyframes bellRing {
  0%, 100% { transform: rotate(0); }
  20%, 60% { transform: rotate(12deg); }
  40%, 80% { transform: rotate(-12deg); }
}

.animate-card-enter {
  animation: cardEnter 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.animate-urgency {
  animation: urgencyPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.animate-bell {
  animation: bellRing 0.5s ease-in-out;
}
```

---

## 4. Project-Specific Elevation Blueprint (PingKhana)

* **Current State:** Functional announcement aggregator, but cards are static and the listing feels flat.
* **Target Transformation:**
  1. **Staggered Radar Cards:** Announcements enter smoothly with subtle lift on hover (`hover:-translate-y-1 hover:shadow-lg`).
  2. **Urgency Countdown Pill:** Deadlines closing in < 3 days feature a red pulsing badge.
  3. **Quick Preview Drawer:** Clicking a card slides open a detailed view with a 3-bullet AI summary, eligibility criteria, and a prominent "Remind Me in LINE" button with bell animation.

---

## 5. Token-Efficient English Prompts for Claude (Ready to Copy-Paste)

> **Pro-Tip for Saving Claude Tokens:** English prompts save ~60% of tokenizer capacity, allowing Claude to write clean code without hitting rate limits.

### Prompt 1: Announcement Card Polish & Urgency Radar Motion
```text
Task: Elevate the UI and motion design of PingKhana's announcement feed (`web/src/app/page.tsx`, `web/src/components/AnnouncementCard.tsx`, and `web/src/app/globals.css`).

Design System:
Live Intelligence Radar (Teal brand `--brand: #0f766e`, Slate neutral background, and high-urgency red for approaching deadlines).

Requirements:
1. `AnnouncementCard.tsx`:
   - Add staggered entrance animation (`animate-card-enter`) when cards render in the feed.
   - For deadlines closing within 3 days, display an Urgency Countdown Badge with an ambient pulsing red glow (`animate-urgency`).
   - Add clear metadata tags (Faculty/Department, Year, minimum GPAX).
   - Implement smooth hover elevation (`hover:-translate-y-1 hover:shadow-md transition-all duration-200`) with a subtle teal border glow.
2. Filters & Stats Strip:
   - Make filter chips interactive with tactile press feedback (`active:scale-95`).
   - Display a live monitoring beacon (green pulsing dot) next to the "Scraped 10 mins ago" status text.
3. Dark Mode & Accessibility:
   - Ensure seamless theme consistency in both Light and Dark modes.
   - Strict adherence to WCAG AA contrast ratios and touch targets ≥ 44px.
```

### Prompt 2: Slide-Over Quick Preview Drawer & LINE CTA
```text
Task: Build an interactive Slide-Over Drawer component for announcement details in PingKhana (`web/src/components/`).

Requirements:
1. Quick Preview Drawer:
   - When a user clicks any announcement card, slide in a detail drawer from the right on desktop, or slide up from bottom on mobile.
   - Drawer Content:
     * Full title and faculty source badge.
     * 3-bullet AI summary highlighting key takeaways.
     * Eligibility table (eligible majors, year, GPAX).
     * Deadline countdown with calendar icon.
     * Primary CTA: "Set LINE Reminder" (LINE green brand color with bell ringing micro-interaction on hover).
     * Secondary link: "View Official Faculty Post".
2. Motion & Backdrop:
   - Smooth backdrop blur (`backdrop-blur-sm bg-black/40`) with exit on Esc key or outside click.
   - Spring-like entrance easing `cubic-bezier(0.16, 1, 0.3, 1)`.
```
