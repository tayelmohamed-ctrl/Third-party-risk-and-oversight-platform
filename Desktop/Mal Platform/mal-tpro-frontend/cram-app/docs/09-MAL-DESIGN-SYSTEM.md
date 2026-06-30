# 09 — Mal Design System (brand-aligned UI tokens)

The platform must look and feel like a **Mal** product. This file translates the
Mal Brand Guidelines into concrete UI tokens Cursor should use everywhere — the
visual targets in `prototypes/` already apply them. Brand voice and colours are
not decoration; they are part of "looks trustworthy to a regulator and to staff."

## 1. Brand essence
- **Name:** always **Mal** (sentence case — never "MAL"). Product: *Mal FinCrime OS*.
- **Logomark:** a mirrored abstract Arabic "م" / English "m" forming an arabesque
  Islamic-pattern star — a radial ring of petals symbolising growth, flow and
  continuity. Use the gradient star as the app mark (see the sidebar SVG in the
  prototype). Wordmark "Mal" in Outfit. Respect clearspace = width of the "M";
  never stretch, recolour arbitrarily, add shadows, or place on busy backgrounds.

## 2. Tone of voice (drives all UI copy & Mohsen/Sayed/Jana phrasing)
- **Smart** — insightful, not arrogant.
- **Straightforward** — no fluff, just clarity.
- **Human** — warm, friendly, conversational.
- **Bold** — confident in vision and values.
Apply to button labels, empty states, AI explanations and error messages:
short, plain, confident. e.g. "No alerts need you right now." not "Zero records returned."

## 3. Colour tokens
| Token | Hex | Use |
|---|---|---|
| Mal Black | `#020A18` | App background (dark theme) |
| Mal Navy | `#10103C` | Panels, secondary background |
| Mal Purple | `#A953DF` | Primary accent / AI (Mohsen) / brand |
| Mal Cyan | `#39B9ED` | Secondary accent (Sayed) |
| Mal White | `#F8F6FE` | Primary text on dark; light background |
| Brand gradient | `linear-gradient(135deg,#A953DF,#39B9ED)` | Logo, pipe flow, hero accents, focus states |

**Agent colours** (distinct, on-brand): **Sayed** = Mal Cyan `#39B9ED` · **Mohsen**
= Mal Purple `#A953DF` · **Jana** = brand violet blend `#7C6CF7` (sits between
purple and cyan). 

**Functional risk colours** (semantic — override brand for clarity, used only for
ratings/alerts): Low `#2FD8A6` · Medium `#F6A623` · High `#FF5C77` · Prohibited
`#B23A5B`. Keep these consistent everywhere a risk band appears.

**Dark-theme support tokens** (derived, used in the prototype): panel `#0A1130`,
panel-2 `#10103C`, lines `#26285C`, muted text `#A7ACDB`, faint `#6E72A6`.
A light theme may invert to Mal White `#F8F6FE` background with Mal Navy text.

## 4. Typography
- **Primary (display / headings / numbers):** **Outfit** — weights Black(900),
  Bold(700), Medium(500), Regular(400), Light(300).
- **Secondary (body / UI):** **Inter** — 400/450/500/600.
- **Data / IDs / code:** a monospace (JetBrains Mono) for reference numbers and
  `cram_ref` — functional, brand-neutral.
- Load via Google Fonts: `Outfit` + `Inter`. Headings and the big risk score use
  Outfit; everything else Inter.

## 5. Component conventions (carry the brand into UI)
- **Radius:** generous (10–16px) cards/buttons — friendly, modern, matches the
  rounded brand shapes.
- **Accent usage:** purple is the primary action/AI colour; cyan is the secondary
  / data colour; reserve the gradient for the logo, the pipe-flow motif and key
  focus/hero moments — don't flood screens with gradient.
- **The pipe / waterworks motif** uses the brand gradient as the flowing element —
  it is the platform's signature and ties to the logomark's "digital flow".
- **Backgrounds stay calm** (Mal Black / Navy); colour earns attention.
- **Focus ring:** `2px` purple at ~35% opacity.

## 6. Implementation note for Cursor
Define these as CSS variables / a theme file once and consume everywhere; never
hard-code hexes in components. The prototypes (`prototypes/Mal-FinCrimeOS-prototype.html`,
`prototypes/cram-scoring-mock.html`) are the canonical visual reference — match
their tokens, fonts and the logomark SVG. Keep the three agent colours and the
risk-band colours stable across the whole platform so users learn them once.
