# MA-ZEN — THE FLOOR Protocol Library
### Structured Silence Studio · MVP Prototype

---

## What This Is

THE FLOOR is the protocol library web application for MA-ZEN. It is **not** a soundscape app, a meditation platform, or a wellness product. It is a governed catalogue of silence protocols — accessed by specification, not by emotional state.

This prototype implements the full system architecture as specified in the MA-ZEN MVP Architecture Report v3.

---

## Structure

```
mazen-floor/
├── index.html          THE FLOOR — Protocol Library (main entry)
├── account.html        Practitioner Account + Session Log
├── admin.html          StudioCMS — Operator panel
├── css/
│   ├── system.css      Design system tokens, typography, reset
│   └── components.css  Component library (cards, buttons, modals, player)
├── js/
│   ├── SilenceEngine.js  WebAudio protocol engine (M-01, Singleton)
│   ├── Practitioner.js   Account Aggregate Root (M-04)
│   ├── modules.js        ProtocolLibrary, SessionLog, MembershipService,
│   │                     AccessProtocol, StudioCMS (M-02,05,06,08,09)
│   └── App.js            Application controller + UI utilities
├── data/
│   └── protocols.json  25 seed protocols, 12 collections (fully specified)
└── README.md
```

---

## Core Modules Implemented

| Module | Class | Pattern | Status |
|--------|-------|---------|--------|
| M-01 | SilenceEngine | Singleton | ✓ WebAudio |
| M-02 | ProtocolLibrary | Repository | ✓ Cursor pagination |
| M-03 | ProtocolSession | State Machine | ✓ Via engine |
| M-04 | Practitioner | Aggregate Root | ✓ Auth + calibration |
| M-05 | AccessProtocol | Policy Object | ✓ 3-tier enforcement |
| M-06 | MembershipService | Service Layer | ✓ Trial + billing sim |
| M-08 | StudioCMS | Command Pattern | ✓ Append-only audit |
| M-09 | SessionLog | Observer | ✓ Append-only log |

---

## Design System

**Typography**
- Display: Cormorant Garamond (session titles, page headings)
- Monospace: DM Mono (all UI labels, specs, code)
- Accent: Shippori Mincho (fallback for display)

**Colour Palette**
- Background: `#06080F` (deep void)
- Surface: `#0A0F1A` (navy)
- Signal: `#0E1E30` (structural layer)
- Accent: `#C4944A` (gold — precision, not warmth)
- Type: `#F0EDE8` (warm white)

---

## Language Protocol

The following terms are **banned** from all product surfaces. The `doPublish()` function in StudioCMS enforces this at the operator layer:

| Banned | Use Instead |
|--------|------------|
| soundscape / ambient | protocol session / governed silence |
| wellness / wellbeing | protocol practice / toaoint discipline |
| relax / calm / unwind | enter the session / begin the protocol |
| meditation / mindfulness | silence protocol / structured discipline |
| user / listener | Practitioner |
| content / track | protocol / session |

---

## Running

Open `index.html` in a browser directly (file:// protocol).

No build step required. All modules load as vanilla JS.

**Note:** WebAudio requires a user gesture before activation. Click "Begin Session" to initialise the engine — browsers block autoplay.

---

## Prototype Constraints

- Auth uses `localStorage` + `sessionStorage` — not JWT in production
- Billing uses a `window.confirm()` simulation — Stripe Checkout in production
- Audio URLs are placeholder — wire to signed S3/R2 URLs in production
- `data/protocols.json` serves as the protocol store — PostgreSQL in production

---

## Toaoint Philosophy Frame

> Silence is a discipline. The Floor is the protocol infrastructure for silence as practice.  
> Every session published is a governance act — not a content drop.  
> Build the floor first. The rest is governed by it.

---

*MA-ZEN Architecture v3 · THE FLOOR Protocol Library · Toaoint Philosophy Framework*
