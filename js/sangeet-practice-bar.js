/*
 * CANONICAL: shared/js/sangeet-practice-bar.js
 * Sync into each room with: powershell -File shared/sync-to-rooms.ps1
 * Audio Engines Owner keeps room copies identical.
 *
 * Shared bottom practice bar: Sa, drone, metro (piano-style meters + beat dots),
 * optional tabla theka, optional playback/tone clusters.
 * Exposes window.SangeetPracticeBar and a PianoMetronome compatibility shim.
 */
(function (global) {
  "use strict";

  var DEFAULT_FILES = {
    na:  ["tabla_na.mp3", "tabla_na.flac"],
    tun: ["tabla_tun1.mp3", "tabla_tun1.flac"],
    ta:  ["tabla_tas1.mp3", "tabla_tas1.flac"],
    te:  ["tabla_te1.mp3", "tabla_te1.flac"],
    te2: ["tabla_te2.mp3", "tabla_te2.flac"],
    re:  ["tabla_re.mp3", "tabla_re.flac"],
    ge:  ["tabla_ghe1.mp3", "tabla_ghe1.flac"],
    ka:  ["tabla_ke1.mp3", "tabla_ke1.flac"]
  };
  var TABLA_DECODE_ORDER = ["na", "tun", "ge", "ta", "te", "te2", "re", "ka"];
  var THEKAS = {
    16: ["dha","dhin","dhin","dha","dha","dhin","dhin","dha","dha","tin","tin","ta","ta","dhin","dhin","dha"],
    12: ["dhin","dhin","dha","te","tu","na","ka","ta","dha","te","dhin","na"],
    10: ["dhi","na","dhi","dhi","na","ti","na","dhi","dhi","na"],
    8:  ["dha","ge","na","ti","na","ka","dhi","na"],
    6:  ["dha","dhin","na","dha","tin","na"],
    7:  ["tin","tin","na","dhin","na","dhin","na"]
  };
  var TAAL_GROUPS = {
    16: [4, 4, 4, 4],
    12: [2, 2, 2, 2, 2, 2],
    10: [2, 3, 2, 3],
    8:  [4, 4],
    6:  [3, 3],
    7:  [3, 2, 2]
  };
  var TANPURA_COMPANION_ST = { G: 4, P: 7, N: 11 };

  var cfg = null;
  var ready = false;
  var wired = false;
  var wireGeneration = 0;
  var unlockListenersInstalled = false;
  var audioCtx = null, masterGain = null, tablaGain = null, mixBus = null, mixCompressor = null;
  var activeDroneBus = null, tanpuraOn = false, droneSoftDucked = false, tanpuraNodes = [];
  var LOW_POWER = false;
  var TABLA_FILES = {};
  var tablaPool = {}, tablaFailed = {}, tablaBuffers = {}, tablaBufLoading = {}, tablaRaw = {}, tablaUrlUsed = {};
  var tablaReadyCount = 0, tablaReadyTotal = 0, tablaStatusEl = null;
  var offlineDecodeCtx = null, audioUnlocked = false, unlockSilentEl = null;

  var metroOn = false, metroTimer = null, metroBeat = 0, metroTickId = 0;
  var metroIntervalMs = 666, metroNextAt = 0, metroLastTickAt = 0, metroLastWasSam = false;

  function $(id) { return document.getElementById(id); }
  function midiToHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function isLowPowerAudio() {
    try {
      var ua = navigator.userAgent || "";
      if (/iPad|iPhone|iPod/.test(ua)) return true;
      if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
    } catch (e) {}
    return false;
  }

  function hook(name) {
    var h = cfg && cfg.hooks;
    return (h && typeof h[name] === "function") ? h[name] : null;
  }
  function callHook(name, a, b, c) {
    var fn = hook(name);
    if (fn) try { fn(a, b, c); } catch (e) {}
  }

  function saOptionsHtml(selected) {
    var parts = [];
    var names = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
    function group(label, from, to) {
      parts.push('<optgroup label="' + label + '">');
      for (var m = from; m <= to; m++) {
        parts.push('<option value="' + m + '"' + (m === selected ? " selected" : "") + ">"
          + names[m % 12] + (Math.floor(m / 12) - 1) + "</option>");
      }
      parts.push("</optgroup>");
    }
    group("Low · C2–B2", 36, 47);
    group("Mid · C3–B3", 48, 59);
    group("High · C4–B4", 60, 71);
    return parts.join("");
  }

  function beatsSelectHtml() {
    return [
      '<select id="taal-beats" aria-label="Beats per measure">',
      '  <optgroup label="Simple">',
      '    <option value="1@4">Steady</option>',
      '    <option value="2@4">2/4 · march</option>',
      '    <option value="3@4">3/4 · waltz</option>',
      '    <option value="4@4" selected>4/4 · common</option>',
      '    <option value="5@4">5/4 · flat</option>',
      '    <option value="6@4">6/4 · flat</option>',
      '    <option value="8@4">8/4 · flat</option>',
      "  </optgroup>",
      '  <optgroup label="Compound">',
      '    <option value="3+3@8">6/8 (3+3)</option>',
      '    <option value="3+3+3@8">9/8 (3+3+3)</option>',
      '    <option value="3+3+3+3@8">12/8 (3+3+3+3)</option>',
      "  </optgroup>",
      '  <optgroup label="Odd / irregular">',
      '    <option value="2+3@4">5/4 (2+3)</option>',
      '    <option value="3+2@8">5/8 (3+2)</option>',
      '    <option value="2+2+3@8">7/8 (2+2+3)</option>',
      '    <option value="3+2+2@4">7/4 (3+2+2)</option>',
      '    <option value="2+3+3@8">8/8 (2+3+3)</option>',
      '    <option value="2+2+2+3@8">9/8 (2+2+2+3)</option>',
      '    <option value="4+4+3@8">11/8 (4+4+3)</option>',
      "  </optgroup>",
      '  <optgroup label="Taal">',
      '    <option value="t16">16 Teentaal</option>',
      '    <option value="t12">12 Ektaal</option>',
      '    <option value="t10">10 Jhaptaal</option>',
      '    <option value="t8">8 Keherwa</option>',
      '    <option value="t6">6 Dadra</option>',
      '    <option value="t7">7 Rupak</option>',
      "  </optgroup>",
      "</select>"
    ].join("");
  }

  function buildBarHtml(features, toolbarLabel, defaultSa) {
    var moreCols = [];
    moreCols.push([
      '<div class="ctrl-cluster" aria-label="Drone options">',
      '  <span class="ctrl-cluster-title">Drone</span>',
      '  <label title="Companion string with Sa (jawari)">Strings',
      '    <select id="tanpura-string" aria-label="Tanpura strings">',
      '      <option value="P" selected>Sa + Pa</option>',
      '      <option value="G">Sa + Ga</option>',
      '      <option value="N">Sa + Ni</option>',
      "    </select>",
      "  </label>",
      '  <label>Vol <input type="range" id="drone-vol" min="0" max="1" step="0.01" value="0.55" aria-label="Tanpura volume" /></label>',
      '  <span class="hz" id="sa-hz" title="Frequency of your Sa">233.1 Hz</span>',
      "</div>"
    ].join(""));
    moreCols.push([
      '<div class="ctrl-cluster" aria-label="Beats options">',
      '  <span class="ctrl-cluster-title">Beats</span>',
      '  <label>Cycle ' + beatsSelectHtml() + "</label>",
      features.tablaTheka
        ? ('  <label title="Play real tabla theka bols instead of clicks">'
          + '    <input type="checkbox" id="tabla-theka"' + (features.tablaThekaDefault ? " checked" : "") + " /> Tabla"
          + "  </label>")
        : "",
      features.tablaTheka && features.tablaReady
        ? '<span id="tabla-ready" class="hz" title="Tabla sample download status" aria-live="polite">…</span>'
        : "",
      features.tablaTheka
        ? '  <label>Tabla <input type="range" id="tabla-vol" min="0" max="1" step="0.01" value="0.75" aria-label="Tabla volume" /></label>'
        : '  <label>Click <input type="range" id="tabla-vol" min="0" max="1" step="0.01" value="0.75" aria-label="Metronome click volume" /></label>',
      "</div>"
    ].join(""));
    if (features.playback) {
      moreCols.push([
        '<div class="ctrl-cluster" aria-label="Playback options">',
        '  <span class="ctrl-cluster-title">Playback</span>',
        '  <label title="Length of each swara relative to the BPM beat">Note',
        '    <select id="note-value" aria-label="Note value relative to BPM">',
        '      <option value="4">Whole</option>',
        '      <option value="2">Half</option>',
        '      <option value="1" selected>Quarter</option>',
        '      <option value="0.5">Eighth</option>',
        '      <option value="0.25">Sixteenth</option>',
        "    </select>",
        "  </label>",
        '  <label title="x 1.5 note length"><input type="checkbox" id="note-dotted" /> Dotted</label>',
        "</div>"
      ].join(""));
    }
    if (features.instrument) {
      moreCols.push([
        '<div class="ctrl-cluster" aria-label="Instrument options">',
        '  <span class="ctrl-cluster-title">Instrument</span>',
        '  <label>Vol <input type="range" id="inst-vol" min="0" max="1" step="0.01" value="0.85" aria-label="Instrument volume" /></label>',
        '  <label title="Click while a pattern plays"><input type="checkbox" id="pattern-click" checked /> Pattern click</label>',
        '  <button type="button" id="btn-stop-all" aria-label="Stop pattern and metronome">\u25A0 Stop all</button>',
        "</div>"
      ].join(""));
    }
    var tone = features.tone
      ? ('<span class="ctrl-gap" aria-hidden="true"></span><label title="Harmonium or synth practice tone">Tone'
        + ' <select id="practice-tone" aria-label="Practice tone: harmonium or synth">'
        + '<option value="harmonium">Harmonium</option><option value="synth">Synth</option></select></label>')
      : "";
    return [
      '<button type="button" class="ctrl-more-backdrop" id="ctrl-more-backdrop" tabindex="-1" aria-label="Close more controls" hidden></button>',
      '<div class="ctrl-more" id="ctrl-more" hidden><div class="ctrl-more-inner">' + moreCols.join("") + "</div></div>",
      '<div class="ctrl-strip" role="toolbar" aria-label="' + (toolbarLabel || "Practice controls") + '">',
      '  <label>Sa <select id="sa-select" aria-label="Choose your Sa (tonic)">' + saOptionsHtml(defaultSa) + "</select></label>",
      '  <span class="ctrl-gap" aria-hidden="true"></span>',
      '  <button type="button" id="btn-tanpura" aria-pressed="false" aria-label="Start or stop drone">\u25B6 Drone</button>',
      '  <button type="button" id="btn-metro" aria-pressed="false" aria-label="Start or stop metronome">\u25B6 Metro</button>',
      '  <label>BPM <input type="number" id="taal-bpm" min="30" max="200" value="90" aria-label="Tempo BPM" /></label>',
      '  <span class="mb-dots" id="metro-dots" aria-hidden="true"></span>',
      tone,
      '  <button type="button" id="ctrl-more-btn" aria-expanded="false" aria-controls="ctrl-more">More \u25BE</button>',
      "</div>"
    ].join("");
  }

  function injectBar() {
    var existing = $("controls");
    if (existing) {
      var strip = existing.querySelector(".ctrl-strip");
      var hasSa = existing.querySelector("#sa-select");
      var stamped = existing.getAttribute("data-tabla-theka");
      var want = cfg.features.tablaTheka ? "1" : "0";
      // Rebuild when features changed (e.g. auto-init {} then room init with tablaTheka:false).
      if (strip && hasSa && stamped === want) {
        if (!$("metro-dots")) {
          var bpmLabel = existing.querySelector("#taal-bpm");
          if (strip) {
            var dots = document.createElement("span");
            dots.className = "mb-dots";
            dots.id = "metro-dots";
            dots.setAttribute("aria-hidden", "true");
            if (bpmLabel && bpmLabel.parentNode) {
              var after = bpmLabel.parentNode.nextSibling;
              strip.insertBefore(dots, after);
            } else {
              strip.appendChild(dots);
            }
          }
        }
        return existing;
      }
      existing.parentNode.removeChild(existing);
      existing = null;
    }
    var bar = document.createElement("div");
    bar.id = "controls";
    var feats = cfg.features;
    var clusters = 2 + (feats.playback ? 1 : 0) + (feats.instrument ? 1 : 0);
    bar.setAttribute("data-clusters", String(clusters));
    bar.setAttribute("data-tabla-theka", feats.tablaTheka ? "1" : "0");
    bar.innerHTML = buildBarHtml(feats, cfg.toolbarLabel, cfg.defaultSa);
    document.body.appendChild(bar);
    return bar;
  }

  function parseBeatsSelect() {
    var el = $("taal-beats");
    var v = (el && el.value) || "4@4";
    if (v.charAt(0) === "t" || (/^\d+$/.test(v) && THEKAS[+v])) {
      var cycle = v.charAt(0) === "t" ? parseInt(v.slice(1), 10) : parseInt(v, 10);
      if (!cycle) cycle = 16;
      return { mode: "taal", cycle: cycle, groups: TAAL_GROUPS[cycle] || [cycle], denom: 4 };
    }
    if (v.charAt(0) === "s") {
      var n = parseInt(v.slice(1), 10) || 4;
      return { mode: "simple", cycle: n, groups: [n], denom: 4 };
    }
    var parts = v.split("@");
    var groups = parts[0].split("+").map(function (x) { return parseInt(x, 10); }).filter(function (n) { return n > 0; });
    if (!groups.length) groups = [4];
    var denom = parts.length > 1 ? parseInt(parts[1], 10) : 4;
    if (!(denom > 0)) denom = 4;
    var total = groups.reduce(function (a, b) { return a + b; }, 0);
    return { mode: "meter", cycle: total, groups: groups, denom: denom };
  }

  function accentLevel(idx, sel) {
    if (idx === 0) return sel.cycle > 1 ? 2 : 0;
    var g = sel.groups || [sel.cycle], acc = 0;
    for (var i = 0; i < g.length; i++) {
      if (acc === idx) return 1;
      acc += g[i];
    }
    return 0;
  }

  function buildDots() {
    var box = $("metro-dots");
    if (!box) return;
    box.innerHTML = "";
    var sel = parseBeatsSelect();
    var groups = sel.groups || [sel.cycle];
    groups.forEach(function (n, gi) {
      for (var i = 0; i < n; i++) {
        var d = document.createElement("span");
        d.className = "mb-dot";
        if (i === 0 && gi > 0) d.classList.add("grp-start");
        box.appendChild(d);
      }
    });
  }

  function lightDot(idx, level) {
    var dots = document.querySelectorAll("#metro-dots .mb-dot");
    for (var i = 0; i < dots.length; i++) dots[i].classList.remove("on", "accent", "mid");
    var d = dots[idx];
    if (!d) return;
    d.classList.add("on");
    if (level >= 2) d.classList.add("accent");
    else if (level === 1) d.classList.add("mid");
    setTimeout(function () { d.classList.remove("on", "accent", "mid"); }, 120);
  }

  function bpm() {
    var el = $("taal-bpm");
    var v = el ? parseInt(el.value, 10) : 90;
    if (isNaN(v)) v = 90;
    return Math.max(30, Math.min(200, v));
  }

  function beatMs() {
    var sel = parseBeatsSelect();
    return (60000 / bpm()) * (4 / (sel.denom || 4));
  }

  function getSaMidi() {
    var el = $("sa-select");
    return el ? parseInt(el.value, 10) : (cfg && cfg.defaultSa) || 58;
  }
  function getSaHz() { return midiToHz(getSaMidi()); }
  function updateSaLabel() {
    var el = $("sa-hz");
    if (el) el.textContent = getSaHz().toFixed(1) + " Hz";
  }
  function getTanpuraString() {
    var el = $("tanpura-string");
    return (el && el.value) || "P";
  }
  function defaultPracticeTone() { return LOW_POWER ? "synth" : "harmonium"; }
  function getPracticeTone() {
    var el = $("practice-tone");
    var v = el && el.value;
    if (v === "harmonium" || v === "synth") return v;
    return defaultPracticeTone();
  }

  function getOfflineDecodeCtx() {
    if (!offlineDecodeCtx) {
      try { offlineDecodeCtx = new OfflineAudioContext(1, 1, 44100); }
      catch (e) { offlineDecodeCtx = null; }
    }
    return offlineDecodeCtx;
  }
  function decodeSampleBuffer(ab) {
    var ctx = getOfflineDecodeCtx() || audioCtx;
    if (!ctx) return Promise.reject(new Error("no decode context"));
    return ctx.decodeAudioData(ab.slice(0));
  }
  function playSilentUnlockBuffer(ctx) {
    if (!ctx) return;
    try {
      var buf = ctx.createBuffer(1, 1, ctx.sampleRate || 44100);
      var src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      if (src.start) src.start(0);
      else if (src.noteOn) src.noteOn(0);
    } catch (e) {}
  }
  function playSilentHtmlUnlock() {
    try {
      if (!unlockSilentEl) {
        unlockSilentEl = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
        unlockSilentEl.setAttribute("x-webkit-airplay", "deny");
        unlockSilentEl.preload = "auto";
      }
      unlockSilentEl.currentTime = 0;
      var p = unlockSilentEl.play();
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }
  function ensureAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      mixBus = audioCtx.createGain();
      mixBus.gain.value = 1;
      if (LOW_POWER) {
        mixBus.connect(audioCtx.destination);
      } else {
        mixCompressor = audioCtx.createDynamicsCompressor();
        mixCompressor.threshold.value = -20;
        mixCompressor.knee.value = 18;
        mixCompressor.ratio.value = 4;
        mixCompressor.attack.value = 0.005;
        mixCompressor.release.value = 0.2;
        mixBus.connect(mixCompressor);
        mixCompressor.connect(audioCtx.destination);
      }
      masterGain = audioCtx.createGain();
      var dv = $("drone-vol");
      masterGain.gain.value = dv ? parseFloat(dv.value) : 0.55;
      masterGain.connect(mixBus);
      tablaGain = audioCtx.createGain();
      var tv = $("tabla-vol");
      tablaGain.gain.value = tv ? parseFloat(tv.value) : 0.75;
      tablaGain.connect(mixBus);
      preloadTablaBuffers();
    }
    if (audioCtx.state === "suspended") {
      try { audioCtx.resume(); } catch (e) {}
    }
    return audioCtx;
  }
  function ensureAudioUnlocked() {
    var ctx = ensureAudio();
    playSilentHtmlUnlock();
    playSilentUnlockBuffer(ctx);
    var resumeP = (ctx.state === "suspended" && ctx.resume) ? ctx.resume() : Promise.resolve();
    return Promise.resolve(resumeP).then(function () {
      audioUnlocked = (ctx.state === "running");
      playSilentUnlockBuffer(ctx);
      return ctx;
    }).catch(function () { return ctx; });
  }
  function installAudioUnlockListeners() {
    if (unlockListenersInstalled) return;
    unlockListenersInstalled = true;
    function onGesture() { ensureAudioUnlocked(); }
    ["pointerdown", "touchend", "keydown"].forEach(function (ev) {
      document.addEventListener(ev, onGesture, { capture: true, passive: true });
    });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") audioUnlocked = false;
      else if (audioCtx && audioCtx.state === "suspended") audioUnlocked = false;
    });
  }

  function tablaUrls(key) {
    var u = TABLA_FILES[key];
    if (!u) return [];
    var base = (cfg && cfg.sampleBase) || "samples/tabla/";
    if (base.slice(-1) !== "/") base += "/";
    return (Array.isArray(u) ? u : [u]).map(function (f) {
      if (/^https?:\/\//i.test(f) || f.indexOf("/") === 0 || f.indexOf("samples/") === 0) return f;
      return base + f;
    });
  }
  function tablaKeysPriority() {
    var keys = Object.keys(TABLA_FILES), out = [];
    TABLA_DECODE_ORDER.forEach(function (k) { if (TABLA_FILES[k]) out.push(k); });
    keys.forEach(function (k) { if (out.indexOf(k) < 0) out.push(k); });
    return out;
  }
  function updateTablaStatus() {
    if (!tablaStatusEl) return;
    var decoded = 0, failed = 0;
    Object.keys(TABLA_FILES).forEach(function (k) {
      if (tablaBuffers[k]) decoded++;
      else if (tablaFailed[k] || tablaBuffers[k] === null) failed++;
    });
    if (decoded >= Math.min(4, tablaReadyTotal)) {
      tablaStatusEl.textContent = "\u2713";
      tablaStatusEl.title = "Tabla samples ready";
    } else if (failed >= tablaReadyTotal) {
      tablaStatusEl.textContent = "\u2717";
      tablaStatusEl.title = "Tabla samples failed to load";
    } else {
      tablaStatusEl.textContent = "\u2026";
      tablaStatusEl.title = "Loading tabla samples\u2026";
    }
  }
  function tablaBuffersReady() {
    var n = 0;
    Object.keys(TABLA_FILES).forEach(function (k) { if (tablaBuffers[k]) n++; });
    return n >= Math.min(4, tablaReadyTotal);
  }
  function tablaAllFailed() {
    var keys = Object.keys(TABLA_FILES);
    if (!keys.length) return true;
    return keys.every(function (k) { return !!tablaFailed[k] || tablaBuffers[k] === null; });
  }
  function decodeTablaKey(key, cb) {
    if (tablaBuffers[key]) { cb(tablaBuffers[key]); return; }
    if (!tablaBufLoading[key]) tablaBufLoading[key] = [];
    tablaBufLoading[key].push(cb);
    if (tablaBufLoading[key].length > 1) return;
    function finish(buf) {
      tablaBuffers[key] = buf || null;
      var ws = tablaBufLoading[key] || [];
      tablaBufLoading[key] = [];
      updateTablaStatus();
      ws.forEach(function (fn) { try { fn(buf || null); } catch (e) {} });
    }
    var raw = tablaRaw[key];
    if (raw) {
      decodeSampleBuffer(raw).then(function (buf) { finish(buf); }).catch(function () { finish(null); });
      return;
    }
    var urls = tablaUrls(key);
    function tryDecode(i) {
      if (i >= urls.length) { finish(null); return; }
      fetch(urls[i]).then(function (r) {
        if (!r.ok) throw new Error("http " + r.status);
        return r.arrayBuffer();
      }).then(function (ab) {
        tablaRaw[key] = ab;
        tablaUrlUsed[key] = urls[i];
        return decodeSampleBuffer(ab);
      }).then(function (buf) { finish(buf); }).catch(function () { tryDecode(i + 1); });
    }
    tryDecode(0);
  }
  function prefetchTablaFiles() {
    tablaKeysPriority().forEach(function (k) {
      if (tablaRaw[k] || tablaBuffers[k]) return;
      var urls = tablaUrls(k);
      function tryFetch(i) {
        if (i >= urls.length) { tablaFailed[k] = true; updateTablaStatus(); return; }
        fetch(urls[i]).then(function (r) {
          if (!r.ok) throw new Error("http " + r.status);
          return r.arrayBuffer();
        }).then(function (ab) {
          tablaRaw[k] = ab;
          tablaUrlUsed[k] = urls[i];
          tablaReadyCount++;
          updateTablaStatus();
          decodeTablaKey(k, function () {});
        }).catch(function () { tryFetch(i + 1); });
      }
      tryFetch(0);
    });
    updateTablaStatus();
  }
  function preloadTablaBuffers() {
    tablaKeysPriority().forEach(function (k) { decodeTablaKey(k, function () {}); });
  }
  function initTablaPool() {
    Object.keys(TABLA_FILES).forEach(function (k) {
      var urls = tablaUrls(k);
      if (!urls.length) return;
      var a = new Audio(urls[0]);
      a.preload = "auto";
      a.addEventListener("error", function () {
        if (urls[1] && a.src.indexOf(".flac") < 0) { a.src = urls[1]; a.load(); return; }
        tablaFailed[k] = true;
        updateTablaStatus();
      });
      tablaPool[k] = a;
    });
  }

  function setDroneSoftDuck(on) {
    if (!activeDroneBus || !audioCtx) return;
    droneSoftDucked = !!on;
    try {
      var now = audioCtx.currentTime;
      var cur = Math.max(0.0001, activeDroneBus.gain.value);
      activeDroneBus.gain.cancelScheduledValues(now);
      activeDroneBus.gain.setValueAtTime(cur, now);
      activeDroneBus.gain.linearRampToValueAtTime(on ? 0.5 : 1, now + 0.08);
    } catch (e) {}
  }
  function duckDroneForNote(durMs) {
    if (!tanpuraOn || !activeDroneBus || !audioCtx) return;
    if (LOW_POWER) { if (!droneSoftDucked) setDroneSoftDuck(true); return; }
    try {
      var now = audioCtx.currentTime;
      var hold = Math.max(0.1, (durMs || 400) / 1000 * 0.85);
      var cur = Math.max(0.0001, activeDroneBus.gain.value);
      activeDroneBus.gain.cancelScheduledValues(now);
      activeDroneBus.gain.setValueAtTime(cur, now);
      activeDroneBus.gain.linearRampToValueAtTime(0.45, now + 0.025);
      activeDroneBus.gain.setValueAtTime(0.45, now + hold);
      activeDroneBus.gain.linearRampToValueAtTime(1, now + hold + 0.15);
    } catch (e) {}
  }
  function stopTanpuraVoices() {
    activeDroneBus = null;
    droneSoftDucked = false;
    tanpuraNodes.forEach(function (n) {
      try { if (n.stop) n.stop(); } catch (e) {}
      try { n.disconnect(); } catch (e) {}
    });
    tanpuraNodes = [];
  }
  function startSynthTanpura() {
    var ctx = ensureAudio();
    stopTanpuraVoices();
    droneSoftDucked = false;
    var sa = getSaHz();
    var st = TANPURA_COMPANION_ST[getTanpuraString()] || 7;
    var jawari = sa * Math.pow(2, st / 12);
    var now = ctx.currentTime;
    var filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = LOW_POWER ? 1100 : 1400;
    filter.Q.value = 0.35;
    var droneBus = ctx.createGain();
    droneBus.gain.setValueAtTime(0.0001, now);
    droneBus.gain.exponentialRampToValueAtTime(1, now + 0.4);
    filter.connect(droneBus);
    droneBus.connect(masterGain);
    activeDroneBus = droneBus;
    var specs = LOW_POWER
      ? [{ f: sa * 0.5, g: 0.14, type: "sine" }, { f: sa, g: 0.28, type: "sine" }, { f: jawari, g: 0.18, type: "sine" }]
      : [
          { f: sa * 0.5, g: 0.12, type: "sine" }, { f: sa, g: 0.22, type: "triangle" },
          { f: sa * 2, g: 0.10, type: "sine" }, { f: jawari, g: 0.15, type: "triangle" },
          { f: jawari * 2, g: 0.07, type: "sine" }
        ];
    specs.forEach(function (s) {
      var osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = s.type; osc.frequency.value = s.f; g.gain.value = s.g;
      osc.connect(g); g.connect(filter); osc.start();
      tanpuraNodes.push(osc, g);
    });
    tanpuraNodes.push(filter, droneBus);
  }
  function startTanpura() {
    ensureAudioUnlocked().then(function () {
      startSynthTanpura();
      callHook("preloadTone");
      preloadTablaBuffers();
      tanpuraOn = true;
      var btn = $("btn-tanpura");
      if (btn) {
        btn.textContent = "\u25A0 Stop";
        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");
      }
    });
  }
  function stopTanpura() {
    stopTanpuraVoices();
    tanpuraOn = false;
    var btn = $("btn-tanpura");
    if (btn) {
      btn.textContent = "\u25B6 Drone";
      btn.classList.remove("active");
      btn.setAttribute("aria-pressed", "false");
    }
  }

  function playTablaKey(key, volScale) {
    volScale = volScale == null ? 1 : volScale;
    var ctx = ensureAudio();
    var tv = $("tabla-vol");
    var peak = Math.max(0.0001, Math.min(1, (tv ? parseFloat(tv.value) : 0.75) * volScale));
    if (tablaBuffers[key]) {
      try {
        var src = ctx.createBufferSource(), g = ctx.createGain();
        src.buffer = tablaBuffers[key]; g.gain.value = peak;
        src.connect(g); g.connect(tablaGain || ctx.destination); src.start();
        return true;
      } catch (e) {}
    } else if (TABLA_FILES[key] && tablaBuffers[key] !== null) {
      decodeTablaKey(key, function () {});
    }
    var base = tablaPool[key];
    if (!base || tablaFailed[key]) return false;
    try {
      var n = base.cloneNode();
      n.volume = Math.max(0, Math.min(1, peak));
      n.currentTime = 0;
      var p = n.play();
      if (p && p.catch) p.catch(function () {});
      return true;
    } catch (e) { return false; }
  }
  function playBol(bol, volScale) {
    if (!bol || bol === "-") return;
    volScale = volScale == null ? 1 : volScale;
    switch (bol) {
      case "dha": playTablaKey("na", volScale); playTablaKey("ge", volScale); break;
      case "dhin": case "dhi": playTablaKey("tun", volScale); playTablaKey("ge", volScale); break;
      case "tin": case "ti": case "tu": playTablaKey("tun", volScale); break;
      case "ta": playTablaKey("ta", volScale); break;
      case "na": playTablaKey("na", volScale); break;
      case "ge": playTablaKey("ge", volScale); break;
      case "ka": case "kat": playTablaKey("ka", volScale); break;
      case "te": playTablaKey("te", volScale); break;
      default: playTablaKey("na", volScale); break;
    }
  }
  function playSamCue() {
    if (LOW_POWER) { playTablaKey("tun", 1.15); playTablaKey("ge", 1.1); return; }
    playTablaKey("tun", 1.2); playTablaKey("ge", 1.25); playTablaKey("ta", 0.9);
  }
  function playMetroTabla(sel, beatIndex) {
    if (!tablaBuffersReady()) preloadTablaBuffers();
    if (beatIndex === 0) { playSamCue(); return; }
    if (sel.mode !== "taal") { playBol("na", 0.65); return; }
    var theka = THEKAS[sel.cycle] || THEKAS[16];
    playBol(theka[beatIndex % theka.length], 0.8);
  }
  function clickSound(level) {
    var ctx = ensureAudio();
    if (ctx.state === "suspended" && ctx.resume) {
      try { ctx.resume(); } catch (e) {}
    }
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = level >= 2 ? 1200 : (level === 1 ? 1000 : 800);
    var now = ctx.currentTime;
    // Intrinsic peaks; output level is controlled by #tabla-vol via tablaGain.
    var peak = level >= 2 ? 0.4 : (level === 1 ? 0.28 : 0.2);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peak, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc.connect(g);
    g.connect(tablaGain || ctx.destination);
    osc.start(now); osc.stop(now + 0.09);
  }

  function stopMetro() {
    metroOn = false;
    if (metroTimer) { clearTimeout(metroTimer); metroTimer = null; }
    callHook("onBeatHighlight", 0, 0, "clear");
    callHook("onMetroStop");
    var btn = $("btn-metro");
    if (btn) {
      btn.textContent = "\u25B6 Metro";
      btn.classList.remove("active");
      btn.setAttribute("aria-pressed", "false");
    }
  }
  function startMetro() {
    if (metroTimer) { clearTimeout(metroTimer); metroTimer = null; }
    metroOn = true;
    metroBeat = 0;
    metroLastWasSam = false;
    buildDots();
    callHook("onMetroStart");
    var btn = $("btn-metro");
    if (btn) {
      btn.textContent = "\u25A0 Stop";
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
    }
    ensureAudioUnlocked().then(function (ctx) {
      if (!metroOn) return;
      function begin() {
        if (!metroOn) return;
        if (cfg.features.tablaTheka) preloadTablaBuffers();
        metroNextAt = performance.now();
        function tick() {
          if (!metroOn) return;
          metroTickId++;
          var sel = parseBeatsSelect();
          var cycle = sel.cycle;
          metroIntervalMs = beatMs();
          metroLastTickAt = performance.now();
          var isSam = metroBeat === 0;
          metroLastWasSam = isSam;
          var level = accentLevel(metroBeat % cycle, sel);
          var thekaEl = $("tabla-theka");
          var wantTabla = !!(cfg.features.tablaTheka && thekaEl && thekaEl.checked);
          // Prefer clicks whenever samples are not actually ready — otherwise metro is silent
          // while fetches fail (e.g. madal has no samples/tabla/).
          var useTabla = wantTabla && tablaBuffersReady();
          if (wantTabla && !useTabla && !cfg.useTablaFallbackClicks) useTabla = true;
          if (useTabla) playMetroTabla(sel, metroBeat % cycle);
          else clickSound(level);
          lightDot(metroBeat % cycle, level);
          if (sel.mode === "taal") callHook("onBeatHighlight", metroBeat + 1, cycle, "taal");
          else callHook("onBeatHighlight", 0, cycle, "clear");
          callHook("onTick", {
            beat: metroBeat, cycle: cycle, isSam: isSam, tickId: metroTickId,
            mode: sel.mode, intervalMs: metroIntervalMs, lastTickAt: metroLastTickAt,
            groups: sel.groups, denom: sel.denom, accent: level
          });
          metroBeat = (metroBeat + 1) % cycle;
          metroNextAt += metroIntervalMs;
          var now = performance.now();
          if (metroNextAt < now - metroIntervalMs) metroNextAt = now + metroIntervalMs;
          metroTimer = setTimeout(tick, Math.max(0, metroNextAt - now));
        }
        tick();
      }
      if (ctx && ctx.state === "suspended" && ctx.resume) {
        Promise.resolve(ctx.resume()).then(begin).catch(begin);
      } else {
        begin();
      }
    });
  }

  function initCtrlMore() {
    var root = $("controls");
    var btn = $("ctrl-more-btn");
    var panel = $("ctrl-more");
    var backdrop = $("ctrl-more-backdrop");
    if (!root || !btn || !panel) return;
    if (LOW_POWER) root.classList.add("ctrl-sheet-mode");
    function setOpen(on) {
      root.classList.toggle("more-open", !!on);
      btn.setAttribute("aria-expanded", on ? "true" : "false");
      btn.textContent = on ? "Less \u25B4" : "More \u25BE";
      if (on) {
        panel.removeAttribute("hidden");
        if (backdrop) backdrop.removeAttribute("hidden");
      } else {
        panel.setAttribute("hidden", "");
        if (backdrop) backdrop.setAttribute("hidden", "");
      }
    }
    btn.addEventListener("click", function () { setOpen(!root.classList.contains("more-open")); });
    if (backdrop) backdrop.addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && root.classList.contains("more-open")) setOpen(false);
    });
  }

  function initToneSelect() {
    var el = $("practice-tone");
    if (!el || !cfg.features.tone) return;
    var saved = null;
    if (cfg.persistToneKey) {
      try { saved = localStorage.getItem(cfg.persistToneKey); } catch (e) {}
    }
    if (saved === "harmonium" || saved === "synth") el.value = saved;
    else el.value = defaultPracticeTone();
    el.addEventListener("change", function () {
      if (cfg.persistToneKey) {
        try { localStorage.setItem(cfg.persistToneKey, el.value); } catch (e2) {}
      }
      callHook("onToneChange", el.value);
      if (el.value === "harmonium") callHook("preloadTone");
    });
    if (el.value === "harmonium") setTimeout(function () { callHook("preloadTone"); }, 0);
  }

  function upgradeBeatsSelectIfLegacy() {
    var el = $("taal-beats");
    if (!el) return;
    var hasMeter = false;
    for (var i = 0; i < el.options.length; i++) {
      if (String(el.options[i].value).indexOf("@") >= 0) { hasMeter = true; break; }
    }
    if (hasMeter) return;
    var prev = el.value;
    el.innerHTML = beatsSelectHtml().replace(/^<select[^>]*>/, "").replace(/<\/select>$/, "");
    setBeatsValue(prev);
  }

  function setBeatsValue(v) {
    var el = $("taal-beats");
    if (!el) return;
    var map = {
      s1: "1@4", s2: "2@4", s3: "3@4", s4: "4@4", s5: "5@4", s6: "6@4", s8: "8@4",
      "16": "t16", "12": "t12", "10": "t10", "8": "t8", "6": "t6", "7": "t7"
    };
    if (map[v]) v = map[v];
    el.value = v;
    if (el.value !== v) el.value = "4@4";
    buildDots();
    if (metroOn) startMetro();
  }

  function wire() {
    // Always refresh the bar from current cfg (auto-init {} may have run first).
    var bar = injectBar();
    upgradeBeatsSelectIfLegacy();
    document.body.classList.add("sangeet-has-practice-bar");
    tablaStatusEl = $("tabla-ready");
    // Bind controls once; if injectBar rebuilt the DOM, re-bind on the new nodes.
    var barId = bar && bar.getAttribute("data-wire-id");
    if (wired && barId && barId === String(wireGeneration)) {
      buildDots();
      updateSaLabel();
      return;
    }
    wireGeneration += 1;
    if (bar) bar.setAttribute("data-wire-id", String(wireGeneration));
    wired = true;
    initCtrlMore();
    initToneSelect();
    if (cfg.features.tablaTheka) {
      initTablaPool();
      prefetchTablaFiles();
    } else {
      Object.keys(TABLA_FILES).forEach(function (k) { tablaFailed[k] = true; });
    }
    installAudioUnlockListeners();
    buildDots();
    updateSaLabel();

    if (cfg.persistSaKey) {
      try {
        var sm = localStorage.getItem(cfg.persistSaKey);
        if (sm && $("sa-select")) $("sa-select").value = sm;
      } catch (e) {}
      updateSaLabel();
    }

    var btnTan = $("btn-tanpura");
    if (btnTan) btnTan.addEventListener("click", function () {
      if (tanpuraOn) stopTanpura(); else startTanpura();
    });
    var btnMetro = $("btn-metro");
    if (btnMetro) btnMetro.addEventListener("click", function () {
      if (metroOn) stopMetro(); else startMetro();
    });
    var saSelect = $("sa-select");
    if (saSelect) saSelect.addEventListener("change", function () {
      updateSaLabel();
      if (cfg.persistSaKey) {
        try { localStorage.setItem(cfg.persistSaKey, String(getSaMidi())); } catch (e) {}
      }
      if (tanpuraOn) startTanpura();
      callHook("onSaChange", getSaMidi());
    });
    var tstr = $("tanpura-string");
    if (tstr) tstr.addEventListener("change", function () { if (tanpuraOn) startTanpura(); });
    var droneVol = $("drone-vol");
    if (droneVol) droneVol.addEventListener("input", function () {
      if (masterGain) masterGain.gain.value = parseFloat(droneVol.value);
    });
    var tablaVol = $("tabla-vol");
    if (tablaVol) tablaVol.addEventListener("input", function () {
      if (tablaGain) tablaGain.gain.value = parseFloat(tablaVol.value);
    });
    var beats = $("taal-beats");
    if (beats) beats.addEventListener("change", function () {
      buildDots();
      if (metroOn) startMetro();
    });
    var bpmEl = $("taal-bpm");
    if (bpmEl) {
      bpmEl.addEventListener("change", function () {
        this.value = bpm();
        if (metroOn) startMetro();
      });
      bpmEl.addEventListener("keydown", function (e) {
        if (e.key === "Enter") this.blur();
      });
    }
    var stopAll = $("btn-stop-all");
    if (stopAll) stopAll.addEventListener("click", function () {
      stopMetro();
      callHook("onStopAll");
    });
    var instVol = $("inst-vol");
    if (instVol) instVol.addEventListener("input", function () {
      callHook("onInstVol", parseFloat(instVol.value));
    });
    ready = true;
  }

  function mergeCfg(opts) {
    opts = opts || {};
    var features = opts.features || {};
    // Default ON; rooms without tabla samples pass tablaTheka: false (e.g. madal).
    var tablaTheka = true;
    if (Object.prototype.hasOwnProperty.call(features, "tablaTheka")) {
      tablaTheka = !!features.tablaTheka;
    }
    return {
      sampleBase: opts.sampleBase != null ? opts.sampleBase : "samples/tabla/",
      files: opts.files || null,
      features: {
        playback: !!features.playback,
        tone: !!features.tone,
        instrument: !!features.instrument,
        tablaTheka: tablaTheka,
        tablaReady: tablaTheka && features.tablaReady !== false,
        tablaThekaDefault: !!features.tablaThekaDefault
      },
      persistSaKey: opts.persistSaKey || null,
      persistToneKey: opts.persistToneKey || null,
      toolbarLabel: opts.toolbarLabel || "Practice controls",
      defaultSa: opts.defaultSa != null ? opts.defaultSa : 58,
      useTablaFallbackClicks: !!opts.useTablaFallbackClicks,
      hooks: opts.hooks || {},
      autoWire: opts.autoWire !== false
    };
  }

  function init(opts) {
    cfg = mergeCfg(opts);
    LOW_POWER = isLowPowerAudio();
    TABLA_FILES = {};
    var src = cfg.files || DEFAULT_FILES;
    Object.keys(src).forEach(function (k) { TABLA_FILES[k] = src[k]; });
    tablaReadyTotal = Object.keys(TABLA_FILES).length;
    if (cfg.autoWire) {
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
      else wire();
    }
    return api;
  }

  var api = {
    init: init,
    isReady: function () { return ready; },
    ensureAudio: ensureAudio,
    ensureAudioUnlocked: ensureAudioUnlocked,
    getCtx: function () { return audioCtx; },
    getMixBus: function () { return mixBus; },
    getMasterGain: function () { return masterGain; },
    getTablaGain: function () { return tablaGain; },
    getSaMidi: getSaMidi,
    getSaHz: getSaHz,
    midiToHz: midiToHz,
    duckDroneForNote: duckDroneForNote,
    setDroneSoftDuck: setDroneSoftDuck,
    bpm: bpm,
    beats: function () { return parseBeatsSelect().cycle; },
    denom: function () { return parseBeatsSelect().denom || 4; },
    beatMs: beatMs,
    isMetroOn: function () { return metroOn; },
    getMetroTickId: function () { return metroTickId; },
    getMetroIntervalMs: function () { return metroIntervalMs; },
    wasLastSam: function () { return metroLastWasSam; },
    getMetroLastTickAt: function () { return metroLastTickAt; },
    getMetroNextAt: function () { return metroNextAt; },
    startMetro: startMetro,
    stopMetro: stopMetro,
    parseBeatsSelect: parseBeatsSelect,
    setBeatsValue: setBeatsValue,
    playBol: playBol,
    playTablaKey: playTablaKey,
    getPracticeTone: getPracticeTone,
    buildDots: buildDots,
    isLowPower: function () { return LOW_POWER; }
  };

  global.SangeetPracticeBar = api;
  global.PianoMetronome = {
    bpm: function () { return api.bpm(); },
    beats: function () { return api.beats(); },
    denom: function () { return api.denom(); },
    beatMs: function () { return api.beatMs(); },
    volume: function () {
      var el = $("tabla-vol");
      return el ? parseFloat(el.value) : 0.7;
    },
    isRunning: function () { return api.isMetroOn(); },
    start: function () { api.startMetro(); },
    stop: function () { api.stopMetro(); }
  };

  // Safety net only: every room page should call SangeetPracticeBar.init(opts)
  // explicitly. This fires if a page loads the script and forgets.
  var autoTimer = setTimeout(function () { if (!cfg) init({}); }, 0);
  var _init = init;
  api.init = function (opts) {
    if (autoTimer != null) {
      clearTimeout(autoTimer);
      autoTimer = null;
    }
    return _init(opts);
  };
})(window);
