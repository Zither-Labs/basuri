/**
 * Eastern flute layout calculator — bamboo bansuri, PVC bansuri, murali (end-blown),
 * Carnatic venu (8 finger holes). Craft hole % calibrated from published FluteMate
 * E-bass example; venu marks denser interpolate across that span. Starting points only.
 */
(function (global) {
  'use strict';

  var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  /** Fractions of total tube length from the cork/cap (top) end — FluteMate-style. */
  var HOLE_FRAC = {
    h1: 0.485564,
    h2: 0.547638,
    h3: 0.605512,
    h4: 0.682546,
    h5: 0.723622,
    h6: 0.798950,
    h7: 0.906955
  };

  /** Typical embouchure fraction used to remap bansuri marks onto murali sounding length. */
  var BANSURI_EMB_FRAC = 0.125;

  /**
   * Schedule 40 PVC (approximate mm). Nominal inch → ID / OD / wall.
   * Sources: common plumbing tables; wall = (OD − ID) / 2.
   */
  var PVC_PIPES = [
    { id: 'sch40-1-2', label: '½″ Sch.40 PVC', nominalIn: 0.5, idMm: 15.8, odMm: 21.3, wallMm: 2.8 },
    { id: 'sch40-3-4', label: '¾″ Sch.40 PVC', nominalIn: 0.75, idMm: 20.9, odMm: 26.7, wallMm: 2.9 },
    { id: 'sch40-1', label: '1″ Sch.40 PVC', nominalIn: 1, idMm: 26.6, odMm: 33.4, wallMm: 3.4 },
    { id: 'sch40-1-1-4', label: '1¼″ Sch.40 PVC', nominalIn: 1.25, idMm: 35.1, odMm: 42.2, wallMm: 3.6 }
  ];

  /**
   * Bass = ~4th-octave Sa (3 holes closed). Medium = ~5th-octave Sa.
   * Length inches, ID mm, wall mm — FluteMate public chart (approximate).
   */
  var BANSURI_PRESETS = [
    { id: 'C4-bass', label: 'C Natural Bass (White-1)', family: 'bass', pc: 0, octave: 4, inches: 36, idMm: 28, wallMm: 3 },
    { id: 'Cs4-bass', label: 'C♯ Bass (Black-1)', family: 'bass', pc: 1, octave: 4, inches: 34, idMm: 27, wallMm: 3 },
    { id: 'D4-bass', label: 'D Natural Bass (White-2)', family: 'bass', pc: 2, octave: 4, inches: 33.5, idMm: 26, wallMm: 2.5 },
    { id: 'Ds4-bass', label: 'D♯ Bass (Black-2)', family: 'bass', pc: 3, octave: 4, inches: 32.5, idMm: 26, wallMm: 2.5 },
    { id: 'E4-bass', label: 'E Natural Bass (White-3)', family: 'bass', pc: 4, octave: 4, inches: 30, idMm: 25, wallMm: 2.5 },
    { id: 'F4-bass', label: 'F Natural Bass (White-4)', family: 'bass', pc: 5, octave: 4, inches: 28.5, idMm: 24, wallMm: 2.5 },
    { id: 'Fs4-bass', label: 'F♯ Bass (Black-3)', family: 'bass', pc: 6, octave: 4, inches: 27.5, idMm: 23, wallMm: 2.5 },
    { id: 'G4-bass', label: 'G Natural Bass (White-5)', family: 'bass', pc: 7, octave: 4, inches: 25, idMm: 22, wallMm: 2.2 },
    { id: 'Gs4-bass', label: 'G♯ Bass (Black-4)', family: 'bass', pc: 8, octave: 4, inches: 24, idMm: 21.5, wallMm: 2.2 },
    { id: 'A4-bass', label: 'A Natural Bass (White-6)', family: 'bass', pc: 9, octave: 4, inches: 23, idMm: 20.5, wallMm: 2.2 },
    { id: 'As4-bass', label: 'A♯ Bass (Black-5)', family: 'bass', pc: 10, octave: 4, inches: 22.5, idMm: 20, wallMm: 2 },
    { id: 'B4-bass', label: 'B Natural Bass (White-7)', family: 'bass', pc: 11, octave: 4, inches: 20, idMm: 20, wallMm: 2 },
    { id: 'C5-med', label: 'C Natural Medium (White-1) — beginner', family: 'medium', pc: 0, octave: 5, inches: 19, idMm: 19, wallMm: 2 },
    { id: 'Cs5-med', label: 'C♯ Medium (Black-1)', family: 'medium', pc: 1, octave: 5, inches: 18, idMm: 18, wallMm: 2 },
    { id: 'D5-med', label: 'D Natural Medium (White-2)', family: 'medium', pc: 2, octave: 5, inches: 17, idMm: 17, wallMm: 1.5 },
    { id: 'Ds5-med', label: 'D♯ Medium (Black-2)', family: 'medium', pc: 3, octave: 5, inches: 16.5, idMm: 16.5, wallMm: 1.5 },
    { id: 'E5-med', label: 'E Natural Medium (White-3)', family: 'medium', pc: 4, octave: 5, inches: 15, idMm: 16, wallMm: 1.5 },
    { id: 'F5-med', label: 'F Natural Medium (White-4)', family: 'medium', pc: 5, octave: 5, inches: 14.5, idMm: 15, wallMm: 1.5 },
    { id: 'Fs5-med', label: 'F♯ Medium (Black-3)', family: 'medium', pc: 6, octave: 5, inches: 14, idMm: 14, wallMm: 1.5 },
    { id: 'G5-med', label: 'G Natural Medium (White-5)', family: 'medium', pc: 7, octave: 5, inches: 13.5, idMm: 13.5, wallMm: 1.2 },
    { id: 'Gs5-med', label: 'G♯ Medium (Black-4)', family: 'medium', pc: 8, octave: 5, inches: 12, idMm: 12, wallMm: 1.2 },
    { id: 'A5-med', label: 'A Natural Medium (White-6)', family: 'medium', pc: 9, octave: 5, inches: 11.5, idMm: 11.5, wallMm: 1 },
    { id: 'As5-med', label: 'A♯ Medium (Black-5)', family: 'medium', pc: 10, octave: 5, inches: 11.5, idMm: 11.5, wallMm: 1 },
    { id: 'B5-med', label: 'B Natural Medium (White-7)', family: 'medium', pc: 11, octave: 5, inches: 11, idMm: 11.5, wallMm: 1 }
  ];

  function nearestPvcPipe(targetIdMm) {
    var best = PVC_PIPES[0];
    var bestDiff = Math.abs(best.idMm - targetIdMm);
    for (var i = 1; i < PVC_PIPES.length; i++) {
      var d = Math.abs(PVC_PIPES[i].idMm - targetIdMm);
      if (d < bestDiff) {
        best = PVC_PIPES[i];
        bestDiff = d;
      }
    }
    return best;
  }

  /** PVC bansuri presets: same keys/lengths as bamboo, bore snapped to Sch.40. */
  var PVC_PRESETS = BANSURI_PRESETS.map(function (p) {
    var pipe = nearestPvcPipe(p.idMm);
    return {
      id: 'pvc-' + p.id,
      label: p.label.replace(/ \(White.*/, '') + ' · ' + pipe.label,
      family: p.family,
      pc: p.pc,
      octave: p.octave,
      inches: p.inches,
      idMm: pipe.idMm,
      wallMm: pipe.wallMm,
      odMm: pipe.odMm,
      pipeId: pipe.id,
      pipeLabel: pipe.label,
      bambooIdMm: p.idMm
    };
  });

  /**
   * End-blown murali / recorder-like folk flutes.
   * Length ≈ medium bansuri charts; bore a touch smaller; 6 finger holes (no pancham).
   */
  var MURALI_PRESETS = [
    { id: 'mur-C5', label: 'C murali (beginner folk)', family: 'medium', pc: 0, octave: 5, inches: 18.5, idMm: 16, wallMm: 2 },
    { id: 'mur-D5', label: 'D murali', family: 'medium', pc: 2, octave: 5, inches: 16.5, idMm: 15, wallMm: 1.8 },
    { id: 'mur-E5', label: 'E murali', family: 'medium', pc: 4, octave: 5, inches: 15, idMm: 14, wallMm: 1.6 },
    { id: 'mur-F5', label: 'F murali', family: 'medium', pc: 5, octave: 5, inches: 14.2, idMm: 13.5, wallMm: 1.5 },
    { id: 'mur-G5', label: 'G murali (small hands)', family: 'medium', pc: 7, octave: 5, inches: 13, idMm: 12.5, wallMm: 1.4 },
    { id: 'mur-A5', label: 'A murali (high / toy-scale)', family: 'medium', pc: 9, octave: 5, inches: 11.5, idMm: 11.5, wallMm: 1.2 },
    { id: 'mur-G4', label: 'G murali low (longer folk)', family: 'bass', pc: 7, octave: 4, inches: 24, idMm: 18, wallMm: 2.2 },
    { id: 'mur-C4', label: 'C murali low', family: 'bass', pc: 0, octave: 4, inches: 32, idMm: 22, wallMm: 2.5 }
  ];

  /**
   * Carnatic venu (south Indian) — side-blown, eight finger holes in a line.
   * Classical ~14″ × ~¾″ descriptions; Sa = top two closed (not three).
   * Hole % = denser interpolate across the bansuri finger span (educational start marks).
   */
  var VENU_HOLE_FRAC = {
    h1: 0.455,
    h2: 0.505,
    h3: 0.555,
    h4: 0.608,
    h5: 0.660,
    h6: 0.715,
    h7: 0.770,
    h8: 0.840
  };

  var VENU_PRESETS = [
    { id: 'venu-Gs5', label: 'G♯ Carnatic (common concert size)', family: 'medium', pc: 8, octave: 5, inches: 14.5, idMm: 17, wallMm: 2 },
    { id: 'venu-A5', label: 'A Carnatic', family: 'medium', pc: 9, octave: 5, inches: 14, idMm: 16.5, wallMm: 2 },
    { id: 'venu-B5', label: 'B Carnatic', family: 'medium', pc: 11, octave: 5, inches: 13.2, idMm: 16, wallMm: 1.8 },
    { id: 'venu-C5', label: 'C Carnatic (brighter / shorter)', family: 'medium', pc: 0, octave: 5, inches: 12.8, idMm: 15.5, wallMm: 1.8 },
    { id: 'venu-Cs5', label: 'C♯ Carnatic', family: 'medium', pc: 1, octave: 5, inches: 12.4, idMm: 15, wallMm: 1.7 },
    { id: 'venu-D5', label: 'D Carnatic', family: 'medium', pc: 2, octave: 5, inches: 12, idMm: 14.5, wallMm: 1.6 },
    { id: 'venu-Ds5', label: 'D♯ Carnatic', family: 'medium', pc: 3, octave: 5, inches: 11.6, idMm: 14, wallMm: 1.6 },
    { id: 'venu-E5', label: 'E Carnatic', family: 'medium', pc: 4, octave: 5, inches: 11.2, idMm: 13.5, wallMm: 1.5 },
    { id: 'venu-Ds4', label: 'D♯ bass Carnatic (longer)', family: 'bass', pc: 3, octave: 4, inches: 22, idMm: 22, wallMm: 2.4 },
    { id: 'venu-G4', label: 'G bass Carnatic', family: 'bass', pc: 7, octave: 4, inches: 20, idMm: 20, wallMm: 2.2 }
  ];

  var HOLE_META = [
    { key: 'h1', label: 'Hole 1 (nearest mouth)', swara: 'Ma / tivra Ma', role: 'Madhyam', openSemis: 6 },
    { key: 'h2', label: 'Hole 2', swara: 'Ga', role: 'Gandhar', openSemis: 4 },
    { key: 'h3', label: 'Hole 3', swara: 'Re', role: 'Rishabh', openSemis: 2 },
    { key: 'h4', label: 'Hole 4', swara: 'Sa', role: 'Shadaj', openSemis: 0 },
    { key: 'h5', label: 'Hole 5 (often largest)', swara: 'Ni', role: 'Nishad', openSemis: -2 },
    { key: 'h6', label: 'Hole 6', swara: 'Dha', role: 'Dhaivat', openSemis: -5 },
    { key: 'h7', label: 'Hole 7 · Pancham (offset)', swara: 'Pa', role: 'Pancham / tuning', openSemis: -7, offset: true }
  ];

  /** Eight-hole Carnatic layout — openSemis ≈ note when that hole is first open above Sa (2 closed). */
  var VENU_HOLE_META = [
    { key: 'h1', label: 'Hole 1 · L index', swara: 'above Sa / gamaka', role: 'Left hand 1', openSemis: 4, finger: 'L1' },
    { key: 'h2', label: 'Hole 2 · L middle', swara: 'Sa region', role: 'Left hand 2 (Sa pair)', openSemis: 2, finger: 'L2' },
    { key: 'h3', label: 'Hole 3 · L ring', swara: 'toward Ri / Ga', role: 'Left hand 3', openSemis: 0, finger: 'L3' },
    { key: 'h4', label: 'Hole 4 · R index', swara: 'toward Ga / Ma', role: 'Right hand 1', openSemis: -2, finger: 'R1' },
    { key: 'h5', label: 'Hole 5 · R middle', swara: 'Pa (5 closed)', role: 'Right hand 2', openSemis: -5, finger: 'R2' },
    { key: 'h6', label: 'Hole 6 · R ring', swara: 'toward Ma / Da', role: 'Right hand 3', openSemis: -7, finger: 'R3' },
    { key: 'h7', label: 'Hole 7 · R pinky', swara: 'lower region', role: 'Right hand 4', openSemis: -9, finger: 'R4' },
    { key: 'h8', label: 'Hole 8 · usually open', swara: 'tuning / special', role: 'Often left open', openSemis: -12, finger: 'open', tuning: true }
  ];

  var INSTRUMENTS = {
    bansuri: {
      id: 'bansuri',
      label: 'Bamboo bansuri (side-blown)',
      presets: BANSURI_PRESETS,
      defaultPreset: 'C5-med',
      includePancham: true,
      material: 'bamboo',
      holeSystem: 'bansuri'
    },
    pvc: {
      id: 'pvc',
      label: 'PVC bansuri (side-blown)',
      presets: PVC_PRESETS,
      defaultPreset: 'pvc-C5-med',
      includePancham: true,
      material: 'pvc',
      holeSystem: 'bansuri'
    },
    murali: {
      id: 'murali',
      label: 'Murali (end-blown / fipple)',
      presets: MURALI_PRESETS,
      defaultPreset: 'mur-C5',
      includePancham: false,
      material: 'bamboo',
      holeSystem: 'murali'
    },
    venu: {
      id: 'venu',
      label: 'Carnatic venu (8 finger holes)',
      presets: VENU_PRESETS,
      defaultPreset: 'venu-Gs5',
      includePancham: false,
      material: 'bamboo',
      holeSystem: 'venu'
    }
  };

  function midiToHz(midi, a4) {
    return a4 * Math.pow(2, (midi - 69) / 12);
  }

  function saMidi(pc, octave) {
    return (octave + 1) * 12 + pc;
  }

  function noteLabel(pc, octave) {
    return NOTE_NAMES[pc] + octave;
  }

  function speedOfSound(tempC) {
    return 331.3 + 0.606 * tempC;
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function round1(n) {
    return Math.round(n * 10) / 10;
  }

  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  function inchesToMm(inches) {
    return inches * 25.4;
  }

  function mmToIn(mm) {
    return mm / 25.4;
  }

  function getInstrument(id) {
    return INSTRUMENTS[id] || INSTRUMENTS.bansuri;
  }

  function presetsFor(instrumentId) {
    return getInstrument(instrumentId).presets;
  }

  function findPreset(presetId, instrumentId) {
    var list = presetsFor(instrumentId || 'bansuri');
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === presetId) return list[i];
    }
    return list[0];
  }

  function suggestDiameters(idMm, wallMm, family, instrumentId) {
    var base = clamp(idMm * 0.48, family === 'bass' ? 8 : 6, family === 'bass' ? 12.5 : 10.5);
    if (instrumentId === 'murali') {
      base = clamp(idMm * 0.42, 5.5, family === 'bass' ? 11 : 9.5);
    }
    if (instrumentId === 'venu') {
      /* Carnatic holes are often more uniform and a touch smaller than bansuri Ni hole. */
      base = clamp(idMm * 0.44, 5.5, family === 'bass' ? 11.5 : 9.5);
    }
    var embMajor = clamp(idMm * 0.72, 8, 16);
    var embMinor = clamp(idMm * 0.55, 6.5, 13);
    var startBit = clamp(base * 0.55, 4, 7);
    var ni = clamp(base + (instrumentId === 'murali' ? 0.8 : 1.2), base, family === 'bass' ? 13.5 : 11.5);
    var pa = clamp(base - 0.8, startBit + 1, base);
    var note;
    if (instrumentId === 'pvc') {
      note = 'PVC only: drill and file — never heat or burn PVC (toxic fumes). Start undersize; enlarge while checking a tuner.';
    } else if (instrumentId === 'murali') {
      note = 'Drill undersize, then enlarge while checking a tuner. Fipple window size changes speaking more than tiny hole shifts — tune the voicing first.';
    } else if (instrumentId === 'venu') {
      note = 'Carnatic venu holes are often nearly equal size. Start undersize; enlarge while checking Sa (top two closed) and Pa (top five closed). Hole 8 is usually left open.';
    } else {
      note = 'Burn or drill undersize, then enlarge while checking a tuner. You can raise pitch by enlarging a hole; you cannot easily shrink it.';
    }
    var fingerTargetMm;
    if (instrumentId === 'venu') {
      fingerTargetMm = [];
      for (var v = 0; v < 8; v++) {
        fingerTargetMm.push(round1(base));
      }
    } else {
      fingerTargetMm = [
        round1(base),
        round1(base),
        round1(base),
        round1(base),
        round1(ni),
        round1(base),
        round1(pa)
      ];
    }
    return {
      embouchureOval: { majorMm: round1(embMajor), minorMm: round1(embMinor) },
      windowHintMm: {
        lengthMm: round1(clamp(idMm * 0.55, 6, 12)),
        widthMm: round1(clamp(idMm * 0.4, 4.5, 9))
      },
      windwayHintMm: {
        lengthMm: round1(clamp(idMm * 1.8, 18, 40)),
        depthMm: round1(clamp(idMm * 0.08, 0.8, 1.6))
      },
      startDrillMm: round1(startBit),
      fingerTargetMm: fingerTargetMm,
      wallMm: wallMm,
      note: note
    };
  }

  function defaultEmbouchureFromTopMm(lengthMm, idMm, instrumentId) {
    if (instrumentId === 'murali') {
      return defaultLabiumFromTipMm(lengthMm, idMm);
    }
    var cork = clamp(idMm * 0.85, 12, 28);
    var faceToHole = clamp(idMm * 1.05, 14, 32);
    var guess = cork + faceToHole;
    var cap = lengthMm * HOLE_FRAC.h1 * 0.42;
    return round1(clamp(guess, 28, cap));
  }

  function defaultLabiumFromTipMm(lengthMm, idMm) {
    var beak = clamp(idMm * 2.4, 28, 55);
    var cap = lengthMm * 0.22;
    return round1(clamp(beak, 26, cap));
  }

  function acousticLengthMm(freqHz, idMm, embDiaMm, wallMm, tempC) {
    var c = speedOfSound(tempC) * 1000;
    var L0 = c / (2 * freqHz);
    var embCorr = 0.28 * idMm + 0.35 * embDiaMm;
    var holeCorr = wallMm * Math.pow(idMm / Math.max(embDiaMm, 1), 0.85) * 0.35;
    return L0 - embCorr - holeCorr;
  }

  /** Map bansuri hole fraction onto murali tube: marks from tip via labium + sounding fraction. */
  function muraliHoleFromTip(lengthMm, labiumFromTip, holeKey) {
    var embF = BANSURI_EMB_FRAC;
    var holeF = HOLE_FRAC[holeKey];
    var soundingFrac = (holeF - embF) / (1 - embF);
    soundingFrac = clamp(soundingFrac, 0.05, 0.98);
    var soundingLen = Math.max(40, lengthMm - labiumFromTip);
    return labiumFromTip + soundingFrac * soundingLen;
  }

  function compute(input) {
    var instrumentId = input.instrument || 'bansuri';
    var inst = getInstrument(instrumentId);
    var lengthMm = Number(input.lengthMm);
    var idMm = Number(input.idMm);
    var wallMm = Number(input.wallMm);
    var tempC = Number(input.tempC);
    var a4 = Number(input.a4) || 440;
    var saHz = Number(input.saHz);
    var embFromTop = Number(input.embouchureFromTopMm);
    var family = input.family || 'medium';
    var handed = input.handed || 'right';
    var includePancham = input.includePancham != null ? !!input.includePancham : inst.includePancham;

    if (!(lengthMm > 0 && idMm > 0)) {
      return { error: 'Length and inner diameter must be positive.' };
    }

    if (!(embFromTop > 0)) {
      embFromTop = defaultEmbouchureFromTopMm(lengthMm, idMm, instrumentId);
    }

    var diameters = suggestDiameters(idMm, wallMm, family, instrumentId);
    var embDia = instrumentId === 'murali'
      ? diameters.windowHintMm.widthMm
      : diameters.embouchureOval.majorMm;

    var metas;
    var fracTable = HOLE_FRAC;
    if (instrumentId === 'venu') {
      metas = VENU_HOLE_META.slice();
      fracTable = VENU_HOLE_FRAC;
    } else {
      metas = HOLE_META.filter(function (m) {
        return includePancham || m.key !== 'h7';
      });
    }

    var craftHoles = metas.map(function (meta, i) {
      var fromTop;
      if (instrumentId === 'murali') {
        fromTop = muraliHoleFromTip(lengthMm, embFromTop, meta.key);
      } else {
        fromTop = lengthMm * fracTable[meta.key];
      }
      var fromEmb = fromTop - embFromTop;
      var fromFoot = lengthMm - fromTop;
      var targetHz = saHz * Math.pow(2, meta.openSemis / 12);
      var diaMm = diameters.fingerTargetMm[i] != null
        ? diameters.fingerTargetMm[i]
        : diameters.fingerTargetMm[diameters.fingerTargetMm.length - 1];
      var acousticFromEmb = acousticLengthMm(targetHz, idMm, diaMm, wallMm, tempC);
      return {
        index: i + 1,
        key: meta.key,
        label: meta.label,
        swara: meta.swara,
        role: meta.role,
        offset: !!meta.offset,
        tuning: !!meta.tuning,
        fromTopMm: round1(fromTop),
        fromTopIn: round2(mmToIn(fromTop)),
        fromEmbouchureMm: round1(fromEmb),
        fromFootMm: round1(fromFoot),
        spacingFromPrevMm: 0,
        targetHz: round1(targetHz),
        acousticHintMm: round1(acousticFromEmb),
        diameterMm: diaMm,
        startDrillMm: diameters.startDrillMm
      };
    });

    for (var i = 0; i < craftHoles.length; i++) {
      if (i === 0) {
        craftHoles[i].spacingFromPrevMm = round1(craftHoles[i].fromTopMm - embFromTop);
      } else {
        craftHoles[i].spacingFromPrevMm = round1(craftHoles[i].fromTopMm - craftHoles[i - 1].fromTopMm);
      }
    }

    var paHz = saHz * Math.pow(2, -7 / 12);
    var allClosedLen = acousticLengthMm(paHz, idMm, embDia, wallMm, tempC);
    var odMm = input.odMm != null ? Number(input.odMm) : idMm + 2 * wallMm;

    var panchamSide;
    if (instrumentId === 'venu') {
      panchamSide = 'Eight finger holes in one line (not offset). Hole 8 is usually left open in normal playing and used for fine tuning / special fingerings. Sa = top two closed — different from this room’s bansuri map (top three).';
    } else if (!includePancham) {
      panchamSide = 'No pancham (7th) hole on this murali layout — six finger holes only. Folk spacing varies; use Sa by ear if the chart feels off.';
    } else if (handed === 'left') {
      panchamSide = 'Offset toward the player’s body for a left-hand flute (~90–120° from the finger-hole line).';
    } else {
      panchamSide = 'Offset toward the player’s body for a right-hand flute (~240–270° from the finger-hole line).';
    }

    var warnings;
    if (instrumentId === 'pvc') {
      warnings = [
        'PVC is a practice / prototype tube — tone is brighter and less complex than bamboo.',
        'Never heat, melt, or burn PVC to make holes. Drill slowly; file to enlarge. Work ventilated; avoid inhaling dust.',
        'Use a slip cap or plug at the top instead of cork. Same hole % layout as bamboo bansuri; trim the foot to set lower Pa first.'
      ];
    } else if (instrumentId === 'murali') {
      warnings = [
        'Murali here means end-blown with a duct / fipple (recorder-like), not a side-blown bansuri.',
        'Build and tune the mouthpiece (block, windway, labium/window) before trusting finger-hole sizes — voicing dominates the tone.',
        'Folk muralis often ignore classical “Sa = top three closed” spacing. Pick a steady tonic, then half-hole between notes by ear.',
        'Starting marks only — shorten the foot to flatten, enlarge holes to sharpen.'
      ];
    } else if (instrumentId === 'venu') {
      warnings = [
        'Carnatic venu: eight finger holes. Normal Sa uses the top two closed (not the bansuri “top three”).',
        'Hole positions are denser educational marks — concert venu makers tune by ear for gamaka-friendly intonation.',
        'Traditional Ma often needs half-holing (≈6½) or cross-fingering; some modern “Shashank style” flutes set Ma at six closed.',
        'Start holes small; check Sa and Pa (five closed) against a drone before chasing every swara.'
      ];
    } else {
      warnings = [
        'These numbers are a starting layout, not a finished concert flute. Bamboo density, oval bore, wall thickness, and embouchure shape all shift pitch.',
        'Always start holes small. Enlarge while checking each note against a drone or chromatic tuner.',
        'Cut the tube a little long; trim the open (foot) end to bring lower Pa / all-closed pitch down to target before trusting finger-hole sizes.'
      ];
    }

    return {
      instrument: instrumentId,
      instrumentLabel: inst.label,
      material: inst.material,
      lengthMm: round1(lengthMm),
      lengthIn: round2(mmToIn(lengthMm)),
      idMm: round1(idMm),
      odMm: round1(odMm),
      wallMm: round1(wallMm),
      pipeLabel: input.pipeLabel || '',
      embouchureFromTopMm: round1(embFromTop),
      embouchureFromTopIn: round2(mmToIn(embFromTop)),
      referenceName: instrumentId === 'murali' ? 'Labium / window from tip' : 'Mouth hole from top',
      plugName: instrumentId === 'pvc' ? 'End-cap depth hint' : (instrumentId === 'murali' ? 'Block / beak region' : 'Cork depth hint'),
      embouchure: diameters.embouchureOval,
      windowHintMm: diameters.windowHintMm,
      windwayHintMm: diameters.windwayHintMm,
      corkDepthHintMm: round1(clamp(idMm * 0.85, 12, 28)),
      saHz: round1(saHz),
      saLabel: input.saLabel || '',
      paHz: round1(paHz),
      a4: a4,
      tempC: tempC,
      speedMs: round1(speedOfSound(tempC)),
      allClosedAcousticMm: round1(allClosedLen),
      footBeyondPaHintMm: round1(Math.max(8, idMm * 0.6)),
      holes: craftHoles,
      includePancham: includePancham,
      holeCount: craftHoles.length,
      diameters: diameters,
      panchamSide: panchamSide,
      buyExtraMm: round1(25.4),
      warnings: warnings
    };
  }

  function computeFromPreset(presetId, opts) {
    opts = opts || {};
    var instrumentId = opts.instrument || 'bansuri';
    var p = findPreset(presetId, instrumentId);
    var a4 = opts.a4 || 440;
    var tempC = opts.tempC != null ? opts.tempC : 22;
    var lengthMm = opts.lengthMm != null ? opts.lengthMm : inchesToMm(p.inches);
    var idMm = opts.idMm != null ? opts.idMm : p.idMm;
    var wallMm = opts.wallMm != null ? opts.wallMm : p.wallMm;
    var sa = midiToHz(saMidi(p.pc, p.octave), a4);
    if (opts.saHz) sa = opts.saHz;
    var emb = opts.embouchureFromTopMm;
    if (emb == null) emb = defaultEmbouchureFromTopMm(lengthMm, idMm, instrumentId);
    return compute({
      instrument: instrumentId,
      lengthMm: lengthMm,
      idMm: idMm,
      wallMm: wallMm,
      odMm: p.odMm,
      pipeLabel: p.pipeLabel,
      tempC: tempC,
      a4: a4,
      saHz: sa,
      saLabel: noteLabel(p.pc, p.octave),
      embouchureFromTopMm: emb,
      family: p.family,
      handed: opts.handed || 'right',
      includePancham: opts.includePancham
    });
  }

  // Back-compat alias
  var PRESETS = BANSURI_PRESETS;

  global.BasuriFluteCalc = {
    INSTRUMENTS: INSTRUMENTS,
    PRESETS: PRESETS,
    BANSURI_PRESETS: BANSURI_PRESETS,
    PVC_PRESETS: PVC_PRESETS,
    MURALI_PRESETS: MURALI_PRESETS,
    VENU_PRESETS: VENU_PRESETS,
    VENU_HOLE_FRAC: VENU_HOLE_FRAC,
    VENU_HOLE_META: VENU_HOLE_META,
    PVC_PIPES: PVC_PIPES,
    HOLE_FRAC: HOLE_FRAC,
    HOLE_META: HOLE_META,
    NOTE_NAMES: NOTE_NAMES,
    getInstrument: getInstrument,
    presetsFor: presetsFor,
    findPreset: findPreset,
    midiToHz: midiToHz,
    saMidi: saMidi,
    noteLabel: noteLabel,
    inchesToMm: inchesToMm,
    mmToIn: mmToIn,
    defaultEmbouchureFromTopMm: defaultEmbouchureFromTopMm,
    defaultLabiumFromTipMm: defaultLabiumFromTipMm,
    suggestDiameters: suggestDiameters,
    nearestPvcPipe: nearestPvcPipe,
    compute: compute,
    computeFromPreset: computeFromPreset
  };
})(typeof window !== 'undefined' ? window : globalThis);
