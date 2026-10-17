# SyllabusIQ — Master Design & Motion System

## 1. Core Philosophy (The "Anti-Slop" Manifesto)

SyllabusIQ is a high-precision, academic-grade SaaS platform built for university professors and students. Its interface communicates mathematical clarity, speed, focus, and institutional trust.

### Strictly Enforced Design Laws:
- **No AI Slop:**
  - ❌ **NO** purple/indigo gradient soups, glassmorphism, or saturated candy tones.
  - ❌ **NO** emojis anywhere in the UI or AI responses. Use `lucide-react` exclusively.
  - ❌ **NO** arbitrary Tailwind values (`w-[317px]`, `mt-[13px]`, `text-[15px]`). Adhere strictly to the 4px grid.
  - ❌ **NO** bouncy, springy, cartoonish animations. Motion must be clinical, crisp, and purposeful ($150\text{--}250\,\text{ms}$, ease-out).
  - ❌ **NO** heavy floating drop shadows (`shadow-2xl`). Depth is established via crisp 1px borders (`border-border`) and muted tonal shifts.
  - ❌ **NO** layout shifts or spinner-only pages. Use structured skeleton loaders everywhere.

---

## 2. Tooling Ecosystem & Dependency Matrix

The frontend integrates five industry-standard design tools:
1. **`shadcn/ui`**: Accessible headless UI primitives built on Radix UI.
2. **`impeccable`**: Design token enforcer, CLI skill, and audit engine.
3. **`transitions.dev`**: Curated micro-interaction choreography and cubic-bezier easing models.
4. **`react-bits`**: Subtle interactive effects (spotlight borders, text decoders, smooth counters).
5. **`lucide-react`**: Institutional stroke-based iconography (stroke width: 1.75px).

### 2.1. CLI Installation Command
Run the following in the project root:

```bash
# 1. Initialize shadcn/ui (New York style, Slate neutral)
npx shadcn@latest init -d
npx shadcn@latest add button card input label dialog dropdown-menu \
  table tabs badge avatar separator scroll-area tooltip skeleton \
  radio-group checkbox switch progress alert-dialog sheet command popover

# 2. Add Impeccable Design Enforcer
npx skills add pbakaus/impeccable --skill impeccable

# 3. Install Motion, Smooth Scroll, and Animation Primitives
npm install framer-motion @studio-freight/lenis clsx tailwind-merge tailwindcss-animate canvas-confetti
npm install -D @types/canvas-confetti

# 4. Install Lucide Icons
npm install lucide-react
```

---

## 3. Impeccable Token Architecture

### 3.1. Color System (`src/styles/globals.css`)
Academic Slate with precision Blue-600 accents.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 210 20% 98%;          /* Slate-50 tint */
    --foreground: 222.2 84% 4.9%;       /* Slate-950 */

    --card: 0 0% 100%;                  /* Pure White */
    --card-foreground: 222.2 84% 4.9%;

    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;

    /* Academic Blue Focus (No Purple/Indigo) */
    --primary: 221.2 83.2% 53.3%;       /* Blue-600 */
    --primary-foreground: 210 40% 98%;

    --secondary: 210 40% 96.1%;         /* Slate-100 */
    --secondary-foreground: 222.2 47.4% 11.2%;

    --muted: 210 40% 96.1%;             /* Slate-100 */
    --muted-foreground: 215.4 16.3% 46.9%; /* Slate-500 */

    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;

    /* Strict Semantics */
    --destructive: 0 84.2% 60.2%;       /* Red-500 */
    --destructive-foreground: 210 40% 98%;

    --success: 142.1 76.2% 36.3%;       /* Emerald-600 */
    --success-foreground: 210 40% 98%;

    --warning: 38 92% 50%;              /* Amber-500 */
    --warning-foreground: 48 96% 12%;

    --border: 214.3 31.8% 91.4%;        /* Slate-200 */
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;

    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;       /* Slate-950 */
    --foreground: 210 40% 98%;

    --card: 222.2 84% 6.5%;             /* Slate-900 surface */
    --card-foreground: 210 40% 98%;

    --popover: 222.2 84% 6.5%;
    --popover-foreground: 210 40% 98%;

    --primary: 217.2 91.2% 59.8%;       /* Blue-500 */
    --primary-foreground: 222.2 47.4% 11.2%;

    --secondary: 217.2 32.6% 17.5%;     /* Slate-800 */
    --secondary-foreground: 210 40% 98%;

    --muted: 217.2 32.6% 14%;
    --muted-foreground: 215 20.2% 65.1%; /* Slate-400 */

    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;

    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;

    --success: 142 71% 45%;
    --success-foreground: 210 40% 98%;

    --warning: 38 92% 50%;
    --warning-foreground: 48 96% 12%;

    --border: 217.2 32.6% 17.5%;        /* Slate-800 */
    --input: 217.2 32.6% 17.5%;
    --ring: 217.2 91.2% 59.8%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground antialiased font-sans;
    font-feature-settings: "cv02", "cv03", "cv04", "cv11";
  }
}
```

### 3.2. Tailwind Configuration (`tailwind.config.js`)

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "accordion-up": "accordion-up 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

---

## 4. transitions.dev Physics & Motion Engine

All interface motion is calibrated to `transitions.dev` mechanical standards:

$$\text{Easing Function: } \text{cubic-bezier}(0.16, 1, 0.3, 1)$$

### 4.1. Motion Tokens (`src/lib/motion.ts`)

```typescript
import { Variants, Transition } from "framer-motion";

// Core transition definitions
export const transitionFast: Transition = {
  duration: 0.18,
  ease: [0.16, 1, 0.3, 1],
};

export const transitionMedium: Transition = {
  duration: 0.28,
  ease: [0.16, 1, 0.3, 1],
};

// Staggered list / card grid orchestration
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitionFast,
  },
};

// Modal & dialog scale-in
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 4 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitionMedium,
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.14, ease: [0.16, 1, 0.3, 1] },
  },
};

// Tab view swap transition
export const tabContentVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: transitionFast },
  exit: { opacity: 0, y: -4, transition: { duration: 0.12 } },
};
```

### 4.2. Lenis Smooth Scrolling Provider (`src/components/providers/SmoothScrollProvider.tsx`)

```tsx
import { useEffect } from "react";
import Lenis from "@studio-freight/lenis";

export const SmoothScrollProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 0.9,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
};
```

---

## 5. react-bits Component Implementations

Micro-interactions built from `react-bits` principles:

### 5.1. Spotlight Card (`src/components/ui/SpotlightCard.tsx`)
Adds a subtle cursor-tracking spotlight border on cards without excessive background glow.

```tsx
import React, { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  spotlightColor?: string;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className,
  spotlightColor = "rgba(59, 130, 246, 0.08)",
  ...props
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={cn(
        "relative rounded-lg border border-border bg-card p-6 overflow-hidden transition-colors",
        className
      )}
      {...props}
    >
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};
```

### 5.2. Animated Number Counter (`src/components/ui/AnimatedCounter.tsx`)
Used in teacher analytics and student result cards.

```tsx
import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

export const AnimatedCounter = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, { damping: 30, stiffness: 200 });
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      motionVal.set(value);
    }
  }, [isInView, value, motionVal]);

  useEffect(() => {
    return springVal.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = `${Math.round(latest)}${suffix}`;
      }
    });
  }, [springVal, suffix]);

  return <span ref={ref} className="font-mono font-semibold" />;
};
```

---

## 6. Where UI Libraries Apply Across Screens

| Screen / Feature | Primary Components | Library Used | Purpose |
| :--- | :--- | :--- | :--- |
| **Authentication** | Input, Label, Button, Tabs | `shadcn/ui` + `transitions.dev` | Clean role-toggle (Student/Teacher) with seamless tab transition. |
| **Classroom Grid** | SpotlightCard, Badge, DropdownMenu | `react-bits` + `shadcn/ui` | Course cards with subtle cursor tracking and status badges. |
| **Notes Ingestion** | Progress, ScrollArea, Sheet, Lucide | `shadcn/ui` + `lucide-react` | Document list with upload progress bar and chunk preview sheet. |
| **Quiz Draft Editor**| Accordion, RadioGroup, Dialog, Tooltip | `shadcn/ui` + `transitions.dev` | Question re-ordering, chunk reference drawer, instant question regenerate. |
| **Quiz Attempt View**| RadioGroup, Progress, AlertDialog | `shadcn/ui` + `transitions.dev` | Distraction-free exam runner with locked headers, timer, and autosave state. |
| **RAG Chatbot Tab** | ScrollArea, Avatar, Input, Badge | `shadcn/ui` + `lucide-react` | Notes-grounded doubts with citation preview drawers. |
| **Analytics Dashboard**| Table, AnimatedCounter, Tabs, Badge | `shadcn/ui` + `react-bits` | Question difficulty meters and grade-book exports. |

---

## 7. Domain-Specific Screen Specifications

### 7.1. Quiz Attempt Interface (Exam Runner)
- **Persistent Header (`h-14`):**
  - Left: Classroom name (`text-xs text-muted-foreground`) + Quiz Title (`font-medium text-sm`).
  - Center: Server-synced countdown timer inside a bordered badge (`font-mono text-sm px-3 py-1`). Turns `text-destructive border-destructive` when $< 5\text{ minutes}$ remain.
  - Right: Autosave status indicator (`LucideCheckCircle2 text-success h-4 w-4` + `"Saved at 10:42:01"`).
- **Question Layout:**
  - One question highlighted per viewport.
  - Question options rendered as full-width interactive cards using `shadcn/ui` `<RadioGroupItem>` wrapped in customized option borders.
  - Option selected state: `border-primary bg-primary/5 ring-1 ring-primary`.
  - Question navigation drawer: Small numerical pills displaying `answered`, `unanswered`, and `flagged` states.

### 7.2. Teacher Quiz Draft Editor
- **Question Card Structure:**
  - Question number badge + Bloom's taxonomy tag (`Easy | Medium | Hard`).
  - Editable question stem textarea (`focus-visible:ring-1`).
  - 4 radio options with clear indicator of the correct answer.
  - Explanation box directly below options (`bg-muted/40 p-3 rounded-md text-xs`).
  - **Source Drawer Trigger:** Button with `LucideFileText` displaying `"View Source Chunk (Doc: OS_Unit2.pdf, Page 12)"`.
  - Action footer: `"Regenerate with alternative prompt"`, `"Delete Question"`, `"Add Variation"`.

### 7.3. Notes-Grounded RAG Chatbot Tab
- **Conversation Container:**
  - Minimal message bubbles. Student queries are right-aligned with `bg-muted`.
  - Bot responses are left-aligned with clean typography, code-block syntax highlighting, and LaTeX math rendering (`KaTeX`).
- **Citation Badges:**
  - Sources rendered below answers as pill tags: `[📄 Unit_3_Deadlocks.pdf • Page 14]`.
  - Clicking a badge opens a right-side `shadcn/ui` Sheet containing the raw ingested chunk text with cosine similarity confidence score.
- **Out-of-Scope Fallback:**
  - Explicit refusal card if context is missing: `"This question is not covered in your classroom notes. The AI assistant only responds from teacher-provided materials."`

---

## 8. Impeccable CLI Workflow Guide

Use the Impeccable skill to keep code compliant:

```bash
# 1. Initialize context file
/impeccable init

# 2. Build standard compliant screens
/impeccable build classroom-feed
/impeccable build quiz-draft-editor

# 3. Polish and refine typography/padding
/impeccable polish

# 4. Audit before code review (checks for arbitrary Tailwind values & emojis)
/impeccable audit
```

---

## 9. AI Frontend Generation Checklist

Before generating any React component, verify:
- [ ] Every color token is semantic (`bg-background`, `text-foreground`, `border-border`).
- [ ] No raw hex codes (`#000`, `#FFF`) or arbitrary dimensions (`h-[62px]`).
- [ ] All icons come from `lucide-react` with `strokeWidth={1.75}` and size classes (`h-4 w-4`). Zero emojis.
- [ ] Interactive elements include `transitions.dev` easing `[0.16, 1, 0.3, 1]` with duration $150\text{--}250\,\text{ms}$.
- [ ] All lists use `staggerContainer` and `staggerItem` variants for entry.
- [ ] Primary actions use Blue-600 tokens (`bg-primary text-primary-foreground hover:bg-primary/90`), never purple/indigo.
- [ ] Smooth scrolling is handled cleanly by the root `SmoothScrollProvider`.