---
name: NotebookLM Hub
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#424656'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737687'
  outline-variant: '#c2c6d9'
  surface-tint: '#0052dc'
  primary: '#004bca'
  on-primary: '#ffffff'
  primary-container: '#0061ff'
  on-primary-container: '#f1f2ff'
  inverse-primary: '#b4c5ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#9d3000'
  on-tertiary: '#ffffff'
  tertiary-container: '#c73f00'
  on-tertiary-container: '#ffefeb'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#ffb59d'
  on-tertiary-fixed: '#390c00'
  on-tertiary-fixed-variant: '#832700'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  border-subtle: '#E2E8F0'
  text-main: '#1E293B'
  text-muted: '#64748B'
  surface-white: '#FFFFFF'
  success-green: '#10B981'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1200px
  gutter: 1.5rem
  margin-mobile: 1rem
  margin-desktop: 2rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 2rem
---

## Brand & Style

The brand identity for the design system is rooted in the intersection of **curation and community**. It targets a tech-literate audience of students, researchers, and AI enthusiasts who value efficiency and discovery. The aesthetic is "Product Hunt meets Dribbble"—meaning it balances functional density with high-end polish.

The design style is **Corporate / Modern with a Minimalist lean**. It utilizes expansive whitespace, precise alignment, and a sophisticated use of depth to create a sense of organized intelligence. The interface should feel "invisible," allowing the user-generated content (the notebooks) to remain the focal point while providing a premium, reliable framework for browsing and submission.

## Colors

The palette is anchored by a high-energy **Vibrant Blue (#0061FF)**, used purposefully for primary actions and brand presence. This is offset by a sophisticated suite of neutrals that range from a cool-white surface to a deep slate for typography.

- **Primary:** Used for the main call-to-action (CTA), active states, and focus indicators.
- **Secondary:** A deep navy slate used for high-contrast elements like headers or dark-themed buttons.
- **Neutral:** A systematic progression of grays (`#F8FAFC`, `#E2E8F0`, `#64748B`) used for backgrounds, borders, and secondary text.
- **Success:** A clean emerald used exclusively for the "Notebook Published" state and positive feedback loops.

## Typography

This design system uses a dual-font strategy to balance character with utility. 

**Plus Jakarta Sans** is the headline face. Its slightly wider apertures and modern geometric construction provide a friendly, tech-forward "Dribbble-like" feel for titles and hero sections. 

**Inter** is the workhorse for body copy, labels, and form inputs. It ensures maximum readability at small sizes and maintains a "Product Hunt" utility for descriptions and metadata. 

**Responsive Note:** For mobile devices, `display-lg` should scale down to 32px and `headline-lg` should scale to 24px to prevent excessive line wrapping.

## Layout & Spacing

The layout utilizes a **12-column fluid grid** for desktop and a **single-column stack** for mobile. The system follows an 8px spacing scale to ensure mathematical harmony between elements.

- **Desktop:** The main content container is capped at 1200px and centered. Sidebars for filters should occupy 3 columns (approx. 25%), with the main feed occupying 9 columns.
- **Cards Grid:** On desktop, notebooks are displayed in a 3-column grid. On tablets, this shifts to a 2-column grid.
- **Vertical Rhythm:** Use `stack-lg` for separating major sections (Hero, Feed, Footer) and `stack-md` for internal spacing within cards and forms.

## Elevation & Depth

To achieve the "modern and clean" look, the design system avoids heavy shadows and instead uses **Tonal Layers** combined with **Ambient Shadows**.

1.  **Level 0 (Background):** The base layer uses the neutral background color (`#F8FAFC`).
2.  **Level 1 (Cards/Sheets):** White surfaces (`#FFFFFF`) with a 1px border (`#E2E8F0`). This creates a crisp, architectural feel.
3.  **Level 2 (Hover/Active):** When hovering over a card, apply a soft, diffused shadow: `0px 10px 15px -3px rgba(0, 0, 0, 0.05)`. The border color may also transition to a slightly darker gray or the primary blue to indicate interactivity.
4.  **Level 3 (Modals/Popovers):** Higher elevation with a more pronounced shadow to separate the element from the page context.

## Shapes

The shape language is **Rounded**, favoring 0.5rem (8px) as the standard radius. This softens the technical nature of the AI-focused content, making the platform feel approachable and community-driven.

- **Standard (8px):** Primary buttons, cards, and input fields.
- **Large (16px):** Featured thumbnails and main container backgrounds.
- **Pill (Full):** Used exclusively for Category Chips and Tags to distinguish them from actionable buttons or card elements.

## Components

### Buttons
- **Primary:** Solid background (`#0061FF`), white text. Uses a 1px shadow for depth.
- **Secondary/Ghost:** Border only (`#E2E8F0`) with text in `#1E293B`. For low-priority actions.

### Cards (The Core Unit)
Cards must feature a consistent 16:9 thumbnail area (even if empty, use a geometric placeholder). Titles should be limited to 2 lines of `headline-sm`. Badges (categories) are positioned at the bottom left of the card content area.

### Input Fields
Inputs use a white background with an 8px radius and a subtle gray border. On focus, the border transitions to the primary blue with a soft blue outer glow (2px).

### Chips & Tags
- **Categories:** Semi-transparent blue background with deep blue text. Pill-shaped.
- **Tags:** Light gray background (`#F1F5F9`) with slate text. Smaller font size than categories.

### Lists & Navigation
Navigation is minimal. The Header should be sticky with a semi-transparent blur (`backdrop-filter: blur(8px)`) to provide a sense of depth as the user scrolls the notebook feed.

### Form (Submission)
The submission form is presented as a single-column "Sheet" (max-width 600px). Large, clear labels sit above each input field. The "Publish" button is full-width at the bottom of the form for mobile accessibility.