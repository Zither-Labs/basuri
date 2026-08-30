/* Basuri pitch listener — YIN mic detector + sargam relative to practice-bar Sa.
   Detector adapted from sing-along/pitch.js (same workspace family). */
(function (global) {
  "use strict";

  var NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  var SWAR_12 = ["S", "r", "R", "g", "G", "m", "M", "P", "d", "D", "n", "N"];
  var SWAR_FULL = [
    "Sa", "komal Re", "Re", "komal Ga", "Ga", "shuddha Ma",
    "tivra Ma", "Pa", "komal Dha", "Dha", "komal Ni", "Ni"
  ];

  var audioCtx = null, analyser = null, micBuf = null, micStream = null;
  var micSource = null, micHP = null;
  var micOn = false, userMidi = null, userClarity = 0, userHz = null;
  var micProfile = "laptop";
  var _yinBuf = null;
  var pitchState = {
    noiseRms: 0.004,
    lockMidi: null,
    lockFrames: 0,
    hold: 0,
    hist: []
  };

  function midiToName(m) {
    var r = Math.round(m);
    return NOTE_NAMES[((r % 12) + 12) % 12] + (Math.floor(r / 12) - 1);
  }

  function midiToHz(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  function getSaMidi() {
    try {
      if (global.SangeetPracticeBar && SangeetPracticeBar.getSaMidi) {
        return SangeetPracticeBar.getSaMidi();
      }
    } catch (e) {}
    return 60;
  }

  function micConstraints(profile) {
    if (profile === "headphones") {
      return { echoCancellation: false, noiseSuppression: false, autoGainControl: false };
    }
    if (profile === "speakers") {
      return { echoCancellation: true, noiseSuppression: true, autoGainControl: false };
    }
    return {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1
    };
  }

  function bufRms(buf) {
    var s = 0;
    for (var i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    return Math.sqrt(s / buf.length);
  }

  function yinPitch(buf, sr, fMin, fMax) {
    var N = buf.length;
    var tauMin = Math.max(2, Math.floor(sr / fMax));
    var tauMax = Math.min(Math.floor(N / 2) - 2, Math.floor(sr / fMin));
    if (tauMax <= tauMin + 2) return [-1, 0];

    if (!_yinBuf || _yinBuf.length < tauMax + 1) _yinBuf = new Float32Array(tauMax + 1);
    var yin = _yinBuf;
    var step = N > 2048 ? 2 : 1;
    var tau, i, sum, d;
    for (tau = 1; tau <= tauMax; tau++) {
      sum = 0;
      for (i = 0; i < N - tau; i += step) {
        d = buf[i] - buf[i + tau];
        sum += d * d;
      }
      yin[tau] = sum;
    }
    yin[0] = 1;
    var running = 0;
    for (tau = 1; tau <= tauMax; tau++) {
      running += yin[tau];
      yin[tau] = running > 0 ? (yin[tau] * tau) / running : 1;
    }

    var thresh = micProfile === "laptop" ? 0.12 : 0.15;
    var tauBest = -1;
    for (tau = tauMin; tau <= tauMax; tau++) {
      if (yin[tau] < thresh) {
        while (tau + 1 <= tauMax && yin[tau + 1] < yin[tau]) tau++;
        tauBest = tau;
        break;
      }
    }
    if (tauBest < 0) {
      var minV = 1, minT = -1;
      for (tau = tauMin; tau <= tauMax; tau++) {
        if (yin[tau] < minV) { minV = yin[tau]; minT = tau; }
      }
      if (minT < 0 || minV > 0.35) return [-1, 0];
      tauBest = minT;
    }

    var x0 = yin[tauBest - 1] || yin[tauBest];
    var x1 = yin[tauBest];
    var x2 = yin[tauBest + 1] || yin[tauBest];
    var denom = x0 + x2 - 2 * x1;
    tau = tauBest;
    if (denom !== 0) tau = tauBest + (x0 - x2) / (2 * denom);

    var freq = sr / tau;
    var clarity = Math.max(0, Math.min(1, 1 - (yin[tauBest] || 1)));
    if (freq < fMin || freq > fMax) return [-1, 0];
    return [freq, clarity];
  }

  function harmonicityScore(buf, sr, f0) {
    if (f0 <= 0) return 0;
    function toneEnergy(freq) {
      var w = (2 * Math.PI * freq) / sr;
      var s0 = 0, s1 = 0, s2 = 0;
      var c = 2 * Math.cos(w);
      for (var i = 0; i < buf.length; i++) {
        s0 = buf[i] + c * s1 - s2;
        s2 = s1;
        s1 = s0;
      }
      return s1 * s1 + s2 * s2 - c * s1 * s2;
    }
    var total = 0;
    for (var j = 0; j < buf.length; j++) total += buf[j] * buf[j];
    if (total < 1e-12) return 0;
    var e1 = toneEnergy(f0);
    var e2 = toneEnergy(f0 * 2);
    return Math.min(1, (e1 + 0.6 * e2) / (total * buf.length * 0.15 + 1e-9));
  }

  function medianOf(arr) {
    if (!arr.length) return null;
    var a = arr.slice().sort(function (x, y) { return x - y; });
    var m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : 0.5 * (a[m - 1] + a[m]);
  }

  function preferOctaveNearSa(midi) {
    var sa = getSaMidi();
    var best = midi;
    var bestD = Math.abs(midi - sa);
    var octs = [-24, -12, 0, 12, 24];
    for (var i = 0; i < octs.length; i++) {
      var m = midi + octs[i];
      var d = Math.abs(m - sa);
      /* Prefer near Sa or one octave up (common bansuri range). */
      if (d < bestD) { bestD = d; best = m; }
    }
    return best;
  }

  function swarFromMidi(midi) {
    var sa = getSaMidi();
    var rel = midi - sa;
    var oct = Math.floor((rel + 0.5) / 12);
    var pc = ((Math.round(rel) % 12) + 12) % 12;
    /* Fine: use fractional for cents to nearest swara step */
    var relExact = rel - oct * 12;
    while (relExact < -0.5) { relExact += 12; oct -= 1; }
    while (relExact >= 11.5) { relExact -= 12; oct += 1; }
    var nearest = Math.round(relExact);
    if (nearest < 0) nearest = 0;
    if (nearest > 11) nearest = 11;
    var cents = Math.round((relExact - nearest) * 100);
    var label = SWAR_12[nearest];
    var mark = "";
    if (oct <= -1) {
      for (var i = 0; i < -oct; i++) mark += ",";
      label = mark + label;
    } else if (oct >= 1) {
      for (var j = 0; j < oct; j++) mark += "'";
      label = label + mark;
    }
    return {
      pc: nearest,
      oct: oct,
      label: label,
      name: SWAR_FULL[nearest],
      cents: cents,
      saMidi: sa,
      saHz: midiToHz(sa)
    };
  }

  async function enableMic() {
    try {
      if (micStream) {
        micStream.getTracks().forEach(function (t) { t.stop(); });
        micStream = null;
      }
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: micConstraints(micProfile)
      });
      audioCtx = audioCtx || new (global.AudioContext || global.webkitAudioContext)();
      if (audioCtx.state === "suspended") await audioCtx.resume();
      try {
        if (global.SangeetPracticeBar && SangeetPracticeBar.ensureAudioUnlocked) {
          SangeetPracticeBar.ensureAudioUnlocked();
        }
      } catch (e) {}
      if (micSource) { try { micSource.disconnect(); } catch (e2) {} }
      if (micHP) { try { micHP.disconnect(); } catch (e3) {} }
      micSource = audioCtx.createMediaStreamSource(micStream);
      micHP = audioCtx.createBiquadFilter();
      micHP.type = "highpass";
      micHP.frequency.value = 120;
      micHP.Q.value = 0.7;
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.15;
      micSource.connect(micHP);
      micHP.connect(analyser);
      micBuf = new Float32Array(analyser.fftSize);
      pitchState.noiseRms = 0.004;
      pitchState.lockMidi = null;
      pitchState.lockFrames = 0;
      pitchState.hold = 0;
      pitchState.hist = [];
      micOn = true;
      detectLoop();
      return true;
    } catch (e) {
      alert("Could not access microphone: " + e.message);
      return false;
    }
  }

  function disableMic() {
    micOn = false;
    userMidi = null;
    userClarity = 0;
    userHz = null;
    if (micStream) {
      micStream.getTracks().forEach(function (t) { t.stop(); });
      micStream = null;
    }
    try { if (micSource) micSource.disconnect(); } catch (e) {}
    try { if (micHP) micHP.disconnect(); } catch (e2) {}
    micSource = null;
    micHP = null;
    analyser = null;
  }

  function detectLoop() {
    if (!micOn || !analyser || !micBuf) return;
    analyser.getFloatTimeDomainData(micBuf);

    var rms = bufRms(micBuf);
    if (rms < pitchState.noiseRms * 1.4) {
      pitchState.noiseRms = pitchState.noiseRms * 0.98 + rms * 0.02;
    } else if (rms < pitchState.noiseRms) {
      pitchState.noiseRms = pitchState.noiseRms * 0.9 + rms * 0.1;
    }

    var laptop = micProfile === "laptop";
    var gate = Math.max(laptop ? 0.01 : 0.007, pitchState.noiseRms * (laptop ? 3.0 : 2.2));
    /* Bansuri range: roughly G3–C7 */
    var fMin = 180;
    var fMax = 2200;

    var freq = -1, clarity = 0, harm = 0;
    if (rms >= gate) {
      var yp = yinPitch(micBuf, audioCtx.sampleRate, fMin, fMax);
      freq = yp[0];
      clarity = yp[1];
      if (freq > 0) harm = harmonicityScore(micBuf, audioCtx.sampleRate, freq);
    }

    var clarityNeed = laptop ? 0.5 : 0.42;
    var harmNeed = laptop ? 0.06 : 0.035;
    var voiced = freq > 0 && clarity >= clarityNeed && harm >= harmNeed && rms >= gate;

    if (voiced) {
      var midi = 69 + 12 * Math.log2(freq / 440);
      midi = preferOctaveNearSa(midi);
      pitchState.hist.push(midi);
      if (pitchState.hist.length > 5) pitchState.hist.shift();
      var smooth = medianOf(pitchState.hist);

      if (pitchState.lockMidi == null || Math.abs(smooth - pitchState.lockMidi) < 1.15) {
        pitchState.lockFrames++;
      } else {
        pitchState.lockFrames = 1;
      }
      pitchState.lockMidi = smooth;
      if (pitchState.lockFrames >= (laptop ? 3 : 2)) {
        userMidi = smooth;
        userHz = midiToHz(smooth);
        userClarity = Math.min(1, clarity * 0.65 + harm * 0.35);
        pitchState.hold = laptop ? 10 : 6;
      }
    } else {
      pitchState.lockFrames = 0;
      pitchState.hist = [];
      if (pitchState.hold > 0) {
        pitchState.hold--;
        userClarity *= 0.88;
      } else {
        pitchState.lockMidi = null;
        userClarity *= 0.55;
        if (userClarity < 0.18) {
          userMidi = null;
          userHz = null;
        }
      }
    }

    requestAnimationFrame(detectLoop);
  }

  function getReading() {
    if (userMidi == null) {
      return {
        on: micOn,
        hearing: false,
        hz: null,
        midi: null,
        western: null,
        clarity: userClarity,
        swar: null
      };
    }
    return {
      on: micOn,
      hearing: true,
      hz: userHz,
      midi: userMidi,
      western: midiToName(userMidi),
      clarity: userClarity,
      swar: swarFromMidi(userMidi)
    };
  }

  function setSaFromHearing() {
    if (userMidi == null) return false;
    var m = Math.round(userMidi);
    var el = document.getElementById("sa-select");
    if (!el) {
      try {
        localStorage.setItem("basuri-sa-midi", String(m));
      } catch (e) {}
      return false;
    }
    /* Pick closest option in the select */
    var opts = el.options;
    var best = null;
    var bestD = 999;
    for (var i = 0; i < opts.length; i++) {
      var v = parseInt(opts[i].value, 10);
      if (isNaN(v)) continue;
      var d = Math.abs(v - m);
      if (d < bestD) { bestD = d; best = String(v); }
    }
    if (best == null) return false;
    el.value = best;
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  global.BasuriTuner = {
    enableMic: enableMic,
    disableMic: disableMic,
    isOn: function () { return micOn; },
    get: getReading,
    setProfile: function (p) { micProfile = p || "laptop"; },
    getProfile: function () { return micProfile; },
    setSaFromHearing: setSaFromHearing,
    getSaMidi: getSaMidi,
    midiToHz: midiToHz,
    midiToName: midiToName,
    SWAR_12: SWAR_12
  };
})(typeof window !== "undefined" ? window : globalThis);
