# Learn Basuri

Interactive beginner guide to the Eastern bamboo flute (**bansuri** / **basuri**),
in the same Sangeet Yatra style as Piano, Guitar, and Singing.

**Live (when deployed):** https://bikashacharya.com/basuri/

On merge to `main`, [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
syncs this repo to `s3://bikashacharya.com/basuri/` and invalidates CloudFront.

## Paths

| Page | Focus |
|------|--------|
| [index](index.html) | Landing — path map |
| [choose](choose.html) | Picking a starter flute |
| [hold](hold.html) | Posture and hands |
| [first-sound](first-sound.html) | Straw, kiss-and-roll, troubleshooting silence |
| [breath](breath.html) | Long tones |
| [routine](routine.html) | Daily plan for *getting a tone* (before named notes) |
| [swaras](swaras.html) | Sa–Ni fingerings |
| [ladder](ladder.html) | One finger change at a time |
| [listen](listen.html) | Mic tuner |
| [alankars](alankars.html) · [songs](songs.html) | Patterns and tunes |
| [make](make.html) | DIY layout calculator — bamboo / PVC / murali / venu |
| [murali](murali.html) · [venu](venu.html) | End-blown / Carnatic cousins |
| [resources](resources.html) | Links and credits |

Each HTML page has a Markdown twin.

## Audio

Real bansuri long tones + phrases in `samples/bansuri/` (see [CREDITS](samples/bansuri/CREDITS.md)).
Playback engine: `js/basuri-core.js` (pitch-shifts samples to the practice-bar Sa).

## Shared assets

From `../shared/` via `sync-to-rooms.ps1`: theme, paths, practice bar, mobile nav.

## Sources

Beginner pedagogy informed by public tutorials from Radhe Flutes, bansuri.com,
bansuriflute.co.uk, and instrument notes on chandrakantha.com / Wikipedia — rewritten
here; see [resources](resources.html).
