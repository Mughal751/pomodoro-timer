# ANSWERS.md

## 1. How to Run

**Requirements:** A modern browser. No install needed to open locally.

**Option A — Quickest:**
Open `index.html` directly in your browser (double-click the file).

**Option B — Local server (recommended):**
```bash
npx serve .
```
Then visit http://localhost:3000

No build step, no dependencies to install.

---

## 2. Stack & Design Choices

**Stack:** Vanilla HTML, CSS, and JavaScript — no frameworks.

I chose vanilla JS because this app's logic (a countdown, DOM updates, localStorage) maps directly to browser APIs without needing a framework. Adding React or Vue would increase complexity with no benefit for a single-screen app.

**Design decision 1 — The ring takes up ~70% of the viewport width on mobile.**
The timer is the core interaction — the thing users glance at constantly. By making the ring large and central, the time remaining is always readable at a glance, even from across a desk. A smaller timer would make users lean in to read it, which defeats the purpose of a focus tool.

**Design decision 2 — Color drives the entire state system.**
Instead of relying on text labels alone, every part of the UI (the ring, the badge, the start button, the session count) shifts color together: red for focus, green for break, amber for paused. This means the user can understand the current state in under a second, even after being away from their screen. The CSS `--current` variable propagates the active color across all elements from a single point.

---

## 3. Responsive & Accessibility

**Responsive behavior:**
On a 360px phone, the ring scales using `min(72vw, 280px)` so it never overflows the screen. The settings row stays centered with flex-wrap. Font sizes use `clamp()` to scale smoothly between phone and desktop. On a 1440px laptop the layout is centered with a max-width of 420px — the timer doesn't sprawl across a wide screen, which would hurt readability.

**Accessibility handled — Keyboard navigation:**
Users can operate the entire app without a mouse. `Space` starts/pauses, `R` resets. All buttons have `aria-label` attributes for screen readers. Focus states use `focus-visible` outlines that match the current mode color, so keyboard users always know which element is active.

**Accessibility skipped — Reduced motion:**
I did not add a `prefers-reduced-motion` media query to disable the ring pulse animation. Users who have motion sensitivity enabled in their OS would still see the pulsing ring. With more time I would wrap the animation in `@media (prefers-reduced-motion: no-preference)` to disable it for those users.

---

## 4. AI Usage

I used Claude (Anthropic) throughout this project as a coding assistant.

**What I used AI for:**
- Initial project structure (HTML skeleton, CSS variables setup, JS state management pattern)
- The SVG ring progress calculation (stroke-dashoffset math for `r="114"`)
- The Web Audio API sound implementation (creating a pleasant C-E-G chord without any audio files)
- localStorage date-keyed history structure

**Something I changed from the AI output:**
The AI initially generated the history list showing sessions in chronological order (oldest first). I changed it to show newest first by reversing the array before rendering: `[...sessions].reverse().forEach(...)`. The original order meant the most recent session was always at the bottom, forcing the user to scroll — unhelpful because you most often want to see what you just completed. Reversing gives the most recent session immediate visibility without any scrolling.

---

## 5. Honest Gap

The settings inputs (focus and break duration) only apply when the timer is not running — if you change them mid-session, nothing happens until the next reset. This is intentional to avoid breaking an active countdown, but there's no feedback to the user explaining why their input had no effect.

With another day, I would add a small tooltip or inline message that appears when a user edits the inputs while the timer is running — something like "will apply after reset" — so the behavior is clear rather than silently ignored.
