# Agent — basuri (bansuri) guide

You are the agent for the **Learn Basuri** site in this repository.

- Live site (when deployed): https://bikashacharya.com/basuri/
- Hub: https://bikashacharya.com/ ([Zither-Labs/sangeet-yatra](https://github.com/Zither-Labs/sangeet-yatra))
- Repo: this folder (`basuri/`). GitHub [Zither-Labs/basuri](https://github.com/Zither-Labs/basuri) when pushed.

Primary work: beginner bamboo-flute pedagogy (HTML + Markdown twins), especially
**first sound / embouchure**, **practice routine**, playable **alankars / songs**, the
**murali** page (end-blown / recorder-like bamboo, distinct from side-blown basuri),
and the **layout calculator** (`make.html` + `js/basuri-flute-calc.js`) for DIY tube/hole marks.

Audio: real bansuri samples in `samples/bansuri/` + `js/basuri-core.js`. Mic note
detector: `js/basuri-tuner.js` + `listen.html`. See `samples/bansuri/CREDITS.md`.
Do not invent a parallel practice-bar engine.

Cross-site audio engines, shared structure, and visual tokens: owned at the
parent `sangeet` workspace (`../AGENTS.md`, `../.cursor/rules/audio-engines-owner.mdc`).

Practice bar: shared `js/sangeet-practice-bar.js`. Never hand-edit copies of
`sangeet-theme.css`, `sangeet-paths.js`, `sangeet-practice-bar.*`, or
`sangeet-mobile-nav.js` — change `shared/` and sync.

Keep HTML ↔ Markdown twins in sync. Do not push unless the user asks.
