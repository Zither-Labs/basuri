# Learn Basuri

Interactive beginner guide to the Eastern bamboo flute (**bansuri** / **basuri**),
in the same Sangeet Yatra style as Piano, Guitar, and Singing.

**Live (when deployed):** https://bikashacharya.com/basuri/

On merge to `main`, [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
syncs this repo to `s3://bikashacharya.com/basuri/` and invalidates CloudFront.

## Paths

| Page | Focus |
|------|--------|
| [index](index.html) | Landing — first sound + murali |
| [choose](choose.html) | Picking a starter flute |
| [first-sound](first-sound.html) | Straw, kiss-and-roll, troubleshooting silence |
| [routine](routine.html) | Daily practice plan + target-tone playback |
| [hold](hold.html) | Posture and hands |
| [breath](breath.html) | Long tones |
| [swaras](swaras.html) | Sa–Ni map, komal / tivra, high-register alternates |
| [ladder](ladder.html) | One-finger drills · Sa→Re→Ga→Ma · Pa bridge |
| [listen](listen.html) | Mic tuner — Hz, Western note, swara vs your Sa |
| [alankars](alankars.html) | Patterns with real bansuri playback |
| [songs](songs.html) | Simple sargam tunes with playback |
| [murali](murali.html) | End-blown bamboo (recorder-like) vs side-blown basuri |
| [resources](resources.html) | Curated free tutors |

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
