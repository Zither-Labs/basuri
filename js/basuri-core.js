/* Learn Basuri — real bansuri samples + sargam sequencer.
   Samples: Freesound sankalp (CC BY 4.0) + Ninad_P (CC0). See samples/bansuri/CREDITS.md */
(function (global) {
  "use strict";

  var SAMPLE_BASE = "samples/bansuri/";
  /* Sustained real-bansuri anchors (MIDI ≈ recorded pitch). */
  var ANCHORS = [
    { file: "sa-lower-F4.mp3", midi: 65 },
    { file: "sa-oct-low-E4.mp3", midi: 64 },
    { file: "sa-middle-E5.mp3", midi: 76 },
    { file: "sa-oct-high-F5.mp3", midi: 77 }
  ];
  var PHRASES = {
    "rag-jog": "phrase-rag-jog.mp3",
    "major-scale": "phrase-major-scale.mp3"
  };

  /* Semitones above Sa. Tivra Ma = 6 (default “M” in early alankars). */
  var SWAR = {
    S: 0, s: 0,
    r: 1, R: 2,
    g: 3, G: 4,
    M: 6, m: 5, "M#": 6, "m#": 6,
    P: 7, p: 7,
    d: 8, D: 9,
    n: 10, N: 11
  };

  var ctx = null;
  var master = null;
  var LOW = false;
  try {
    var ua = navigator.userAgent || "";
    LOW = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  } catch (e) {}

  var raw = {};
  var buf = {};
  var midis = [];
  var decoding = {};
  var phraseBuf = {};
  var phraseRaw = {};
  var seqTimer = null;
  var activeStops = [];
  var phraseSrc = null;

  function midiToHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = LOW ? 0.62 : 0.74;
      master.connect(ctx.destination);
      document.addEventListener("visibilitychange", function () {
        if (!ctx) return;
        try { document.hidden ? ctx.suspend() : ctx.resume(); } catch (err) {}
      });
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function prefetch() {
    ANCHORS.forEach(function (a) {
      fetch(SAMPLE_BASE + a.file)
        .then(function (r) { return r.ok ? r.arrayBuffer() : null; })
        .then(function (ab) { if (ab) raw[a.midi] = { ab: ab, midi: a.midi }; })
        .catch(function () {});
    });
    Object.keys(PHRASES).forEach(function (id) {
      fetch(SAMPLE_BASE + PHRASES[id])
        .then(function (r) { return r.ok ? r.arrayBuffer() : null; })
        .then(function (ab) { if (ab) phraseRaw[id] = ab; })
        .catch(function () {});
    });
  }
  prefetch();

  function decodeAnchors() {
    var ac = ensure();
    ANCHORS.forEach(function (a) {
      var pack = raw[a.midi];
      if (!pack || buf[a.midi] || decoding[a.midi]) return;
      decoding[a.midi] = true;
      ac.decodeAudioData(pack.ab.slice(0)).then(function (b) {
        buf[a.midi] = b;
        if (midis.indexOf(a.midi) < 0) {
          midis.push(a.midi);
          midis.sort(function (x, y) { return x - y; });
        }
      }).catch(function () { decoding[a.midi] = false; });
    });
  }

  function nearest(midi) {
    if (!midis.length) return null;
    var best = midis[0];
    var bestD = Math.abs(midi - best);
    for (var i = 1; i < midis.length; i++) {
      var d = Math.abs(midi - midis[i]);
      if (d < bestD) { best = midis[i]; bestD = d; }
    }
    /* Allow wider stretch than guitar — few anchors. */
    if (bestD > 8) return null;
    return best;
  }

  function getSaMidi() {
    try {
      if (global.SangeetPracticeBar && SangeetPracticeBar.getSaMidi) {
        return SangeetPracticeBar.getSaMidi();
      }
    } catch (e) {}
    return 60;
  }

  function unlock() {
    ensure();
    decodeAnchors();
    try {
      if (global.SangeetPracticeBar && SangeetPracticeBar.ensureAudioUnlocked) {
        SangeetPracticeBar.ensureAudioUnlocked();
      }
    } catch (e2) {}
  }

  function playSynth(midi, dur, start, peak) {
    var ac = ctx;
    var hz = midiToHz(midi);
    var out = ac.createGain();
    out.gain.setValueAtTime(0.0001, start);
    out.gain.linearRampToValueAtTime(peak * (LOW ? 0.45 : 0.55), start + 0.04);
    out.gain.setValueAtTime(peak * 0.4, start + Math.max(0.12, dur * 0.55));
    out.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    out.connect(master);

    var bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 4.5;
    bp.frequency.value = hz * 2.1;
    bp.connect(out);

    var osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = hz;
    var osc2 = ac.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.value = hz;
    var g2 = ac.createGain();
    g2.gain.value = 0.18;
    osc.connect(bp);
    osc2.connect(g2);
    g2.connect(bp);
    osc.start(start);
    osc2.start(start);
    try {
      osc.stop(start + dur + 0.05);
      osc2.stop(start + dur + 0.05);
    } catch (e) {}
    return {
      stop: function (at) {
        var t = at != null ? at : ac.currentTime;
        try {
          out.gain.cancelScheduledValues(t);
          out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), t);
          out.gain.linearRampToValueAtTime(0.0001, t + 0.04);
        } catch (err) {}
      }
    };
  }

  function playMidi(midi, durMs, whenSec) {
    var ac = ensure();
    decodeAnchors();
    var start = (typeof whenSec === "number" && whenSec > ac.currentTime)
      ? whenSec : ac.currentTime;
    var dur = Math.max(0.28, (durMs || 700) / 1000);
    var peak = LOW ? 0.78 : 0.9;
    try {
      if (global.SangeetPracticeBar && SangeetPracticeBar.duckDroneForNote) {
        SangeetPracticeBar.duckDroneForNote(durMs || 700);
      }
    } catch (e) {}

    var near = nearest(midi);
    if (near != null && buf[near]) {
      var src = ac.createBufferSource();
      src.buffer = buf[near];
      src.playbackRate.value = Math.pow(2, (midi - near) / 12);
      var out = ac.createGain();
      out.gain.setValueAtTime(0.0001, start);
      out.gain.linearRampToValueAtTime(peak, start + 0.025);
      var hold = Math.max(start + 0.1, start + dur - 0.14);
      out.gain.setValueAtTime(peak * 0.82, hold);
      out.gain.linearRampToValueAtTime(0.0001, start + dur);
      src.connect(out);
      out.connect(master);
      src.start(start);
      try { src.stop(start + dur + 0.05); } catch (e2) {}
      var handle = {
        stop: function (atSec) {
          var t = (typeof atSec === "number" && atSec > ac.currentTime) ? atSec : ac.currentTime;
          try {
            out.gain.cancelScheduledValues(t);
            out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), t);
            out.gain.linearRampToValueAtTime(0.0001, t + 0.04);
          } catch (err) {}
          try { src.stop(t + 0.05); } catch (err2) {}
        }
      };
      activeStops.push(handle);
      return handle;
    }
    var syn = playSynth(midi, dur, start, peak);
    activeStops.push(syn);
    return syn;
  }

  function parseToken(tok) {
    tok = String(tok || "").trim();
    if (!tok || tok === "-" || tok === ".") return null;
    var oct = 0;
    while (tok.charAt(0) === ",") { oct -= 1; tok = tok.slice(1); }
    while (tok.charAt(tok.length - 1) === "'") { oct += 1; tok = tok.slice(0, -1); }
    var st = SWAR[tok];
    if (st == null) return null;
    return getSaMidi() + st + oct * 12;
  }

  function parsePattern(pattern) {
    if (Array.isArray(pattern)) return pattern.map(parseToken);
    return String(pattern).trim().split(/\s+/).map(parseToken);
  }

  function stopAll() {
    if (seqTimer) { clearTimeout(seqTimer); seqTimer = null; }
    activeStops.forEach(function (h) {
      try { h.stop(); } catch (e) {}
    });
    activeStops = [];
    if (phraseSrc) {
      try { phraseSrc.stop(); } catch (e2) {}
      phraseSrc = null;
    }
  }

  function playSequence(pattern, opts) {
    opts = opts || {};
    stopAll();
    unlock();
    var notes = parsePattern(pattern);
    var gap = opts.gapMs != null ? opts.gapMs : 480;
    var noteMs = opts.noteMs != null ? opts.noteMs : Math.min(420, gap - 40);
    var onNote = typeof opts.onNote === "function" ? opts.onNote : null;
    var onDone = typeof opts.onDone === "function" ? opts.onDone : null;
    var i = 0;
    var ac = ensure();

    function step() {
      if (i >= notes.length) {
        seqTimer = null;
        if (onDone) onDone();
        return;
      }
      var midi = notes[i];
      if (onNote) onNote(i, midi, notes);
      if (midi != null) playMidi(midi, noteMs, ac.currentTime + 0.02);
      i += 1;
      seqTimer = setTimeout(step, gap);
    }
    step();
    return { stop: stopAll };
  }

  function playPhrase(id, onDone) {
    stopAll();
    unlock();
    var ac = ensure();
    function start(bufData) {
      var src = ac.createBufferSource();
      src.buffer = bufData;
      var out = ac.createGain();
      out.gain.value = LOW ? 0.7 : 0.85;
      src.connect(out);
      out.connect(master);
      src.onended = function () {
        phraseSrc = null;
        if (onDone) onDone();
      };
      phraseSrc = src;
      src.start();
    }
    if (phraseBuf[id]) {
      start(phraseBuf[id]);
      return;
    }
    var ab = phraseRaw[id];
    if (!ab) {
      if (onDone) onDone();
      return;
    }
    ac.decodeAudioData(ab.slice(0)).then(function (b) {
      phraseBuf[id] = b;
      start(b);
    }).catch(function () { if (onDone) onDone(); });
  }

  function playSwar(token, durMs) {
    unlock();
    var midi = parseToken(token);
    if (midi == null) return null;
    return playMidi(midi, durMs || 900);
  }

  global.BasuriCore = {
    unlock: unlock,
    playMidi: playMidi,
    playSwar: playSwar,
    playSequence: playSequence,
    playPhrase: playPhrase,
    stopAll: stopAll,
    parseToken: parseToken,
    getSaMidi: getSaMidi,
    SWAR: SWAR
  };
})(typeof window !== "undefined" ? window : globalThis);
