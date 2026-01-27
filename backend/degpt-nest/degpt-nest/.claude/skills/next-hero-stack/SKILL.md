---
name: next-hero-stack
description: 'Standardized Next.js 16 workflow. Stack: App Router (SSR/SEO), HeroUI, Tailwind 4, GSAP (Animations), next-intl, Zustand, ahooks. Focus on SEO, performance, and high-end interactions.'
version: 1.2.0
---

# Next.js 16 Hero Stack - Development Standard

This skill guides the development of applications using the **Next.js 16 + HeroUI + Tailwind 4 + GSAP** stack. The goal is to build SEO-friendly, high-performance, and visually stunning applications (especially the initial loading experience).

## 🛠 Core Tech Stack Reference

| Category       | Technology         | Version | Key Guideline                                                 |
| -------------- | ------------------ | ------- | ------------------------------------------------------------- |
| **Framework**  | Next.js App Router | 16+     | **Server-First**. Heavy focus on SSR & Metadata.              |
| **UI Library** | **HeroUI**         | Latest  | **PRIORITY**. Reuse existing components first.                |
| **Styling**    | Tailwind CSS       | **4.0** | Layout, spacing, and simple transitions.                      |
| **Animation**  | **GSAP**           | Latest  | Use for complex timelines, scroll effects, and **Preloader**. |
| **Icons**      | iconify-icon       | 3.0.2   | Standard: `<iconify-icon icon="..." />`.                      |
| **Theme**      | next-themes        | 0.4.6   | **3 Modes**: Light, Dark, System.                             |
| **i18n**       | next-intl          | 4.5.5   | `zh-CN`, `en`, `ko`. Strategy: `always`.                      |
| **State**      | Zustand            | 5.0.9   | For complex global state.                                     |
| **Hooks**      | ahooks             | 3.9.6   | Prefer `ahooks` for logic simplification.                     |

---

## 🧠 Decision Algorithm (How to think)

When User requests a feature, follow this logic:

1.  **SSR & SEO Strategy (Vital)**:
    - Is this a Page (`page.tsx`)? -> **Must** export `generateMetadata` or `metadata`.
    - Does it need user interaction? -> Add `'use client'` to the specific component, not the whole page. Keep the page wrapper Server-Side for SEO.

2.  **Animation Strategy (GSAP vs Tailwind)**:
    - _Simple Hover/Fade_: Use Tailwind `transition-all duration-300`.
    - _Complex Sequence / Scroll / Opening_: Use **GSAP** (`@gsap/react`).
    - **Preloader**: Always include a cool, GSAP-driven initial loading screen for the app entry.

3.  **UI Component Strategy**:
    - First, search **HeroUI**. Use it with standard props.
    - If missing, build with Tailwind + HTML.

4.  **Logic Strategy**:
    - Check **ahooks** first (e.g., `useRequest`, `useInterval`).
5.  **Complexity Management (Refactoring Strategy)**:
    - _Trigger_: The logic is getting tangled, or the script section is too long.
    - _Extract Hooks_: Move stateful logic (watchers, computed, async calls) into **Composables** (e.g., `composables/useOrderLogic.ts`).
    - _Extract Utils_: Move pure functions (formatting dates, calculating totals, regex validation) into **Utils** (e.g., `utils/format.ts`).
    - _Goal_: The `.vue` file should be thin—handling UI events and binding data only.

---

## 📐 Coding Standards & Patterns

### 1. The "Cool" Preloader (GSAP)

Every app should have a `Preloader` component that runs once on mount.

```tsx
// components/common/Preloader.tsx
'use client';
import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function Preloader({ onComplete }: { onComplete: () => void }) {
  const comp = useRef(null);

  useGSAP(() => {
    const tl = gsap.timeline({
      onComplete: onComplete
    });

    // Example: Cool text reveal or SVG animation
    tl.to(".loader-text", { y: 0, opacity: 1, duration: 1, ease: "power4.out" })
      .to(".loader-overlay", { y: "-100%", duration: 1.5, ease: "expo.inOut", delay: 0.5 });

  }, { scope: comp });

  return (
    <div ref={comp} className="loader-overlay fixed inset-0 z-[9999] bg-background flex items-center justify-center">
      <h1 className="loader-text translate-y-10 opacity-0 text-4xl font-bold">
        App Loading...
      </h1>
    </div>
  );
}

2. SEO & Metadata (Server Side)
Every page must be SEO-ready.
// app/[locale]/page.tsx
import { Metadata } from 'next';

export async function generateMetadata({ params: { locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return {
    title: t('title'),
    description: t('description'),
    openGraph: { images: ['/og-image.png'] }
  };
}

export default function Page() {
  // ... content
}

3. Theme Configuration (3 Modes)
Ensure System preference is respected.
<HeroUIProvider>
  <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
    {children}
  </NextThemesProvider>
</HeroUIProvider>

📂 Project Structure Reference
app/
├── [locale]/
│   ├── layout.tsx        # Server Layout (Include Metadata base)
│   ├── template.tsx      # Good place for page transitions
│   └── page.tsx
components/
├── common/
│   └── Preloader.tsx     # GSAP powered entry animation
├── ui/                   # HeroUI wrappers
hooks/
messages/

📝 New Feature Checklist
Before generating code, verify:
 * [ ] SEO: Is metadata defined for new pages?
 * [ ] SSR: Is 'use client' only used where necessary?
 * [ ] Animation: Did I use GSAP for the "Wow" factor (like Preloader)?
 * [ ] UI: Am I maximizing HeroUI usage?
<!-- end list -->

---
```
