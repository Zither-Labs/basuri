/* Sangeet Yatra — shared play/stop button state.
   Canonical: shared/js/sangeet-play-toggle.js — run shared/sync-to-rooms.ps1 after editing.

   Action language (see each room's css/shared.css):
     .btn.play          starts sound → green, leading ▶ from CSS
     .btn.play.is-stop  is now Stop  → neutral, ■ Stop from textContent

   The page owns its audio; this owns the label/class and the "only one thing
   plays at a time" bookkeeping, so starting B reverts A's button.

     var T = SangeetPlayToggle;
     btn.onclick = function () {
       if (T.isPlaying(btn)) { T.stop(btn); return; }
       T.start(btn, silenceMySound);   // reverts any other Stop button first
       playSomething();                // then T.finish(btn) when it ends by itself
     };

   For a one-shot of known length, T.hold(btn, ms, silenceMySound) does the
   start + auto-revert in one call.

   Icon-only buttons (a bare ▶ in a table cell) would reflow the column if they
   grew to "■ Stop", so they opt out with data-stop-label="■" and carry an
   aria-label; the aria-label becomes "Stop" while playing so the glyph is not
   the only cue a screen reader gets.
*/
(function (global) {
  "use strict";

  var STOP_LABEL = "\u25A0\u00A0Stop";
  var LABEL_ATTR = "data-play-label";
  var ARIA_ATTR = "data-play-aria";
  var STOP_LABEL_ATTR = "data-stop-label";
  var active = null; /* { btn: Element, onStop: function|null } */

  function originalLabel(btn) {
    if (!btn.hasAttribute(LABEL_ATTR)) btn.setAttribute(LABEL_ATTR, btn.textContent);
    return btn.getAttribute(LABEL_ATTR);
  }

  function stopLabel(btn) {
    return btn.getAttribute(STOP_LABEL_ATTR) || STOP_LABEL;
  }

  /** Label + class + aria only. Prefer start/stop, which also keep the registry. */
  function mark(btn, playing) {
    if (!btn) return;
    var label = originalLabel(btn);
    btn.classList.toggle("is-stop", !!playing);
    btn.textContent = playing ? stopLabel(btn) : label;
    btn.setAttribute("aria-pressed", playing ? "true" : "false");
    if (btn.hasAttribute("aria-label") || btn.hasAttribute(ARIA_ATTR)) {
      if (!btn.hasAttribute(ARIA_ATTR)) {
        btn.setAttribute(ARIA_ATTR, btn.getAttribute("aria-label") || "");
      }
      btn.setAttribute("aria-label", playing ? "Stop" : btn.getAttribute(ARIA_ATTR));
    }
  }

  function isPlaying(btn) { return !!btn && !!active && active.btn === btn; }

  function playingButton() { return active ? active.btn : null; }

  /** Revert whatever is showing Stop and let it silence itself. */
  function stopAll() {
    var prev = active;
    active = null;
    if (!prev) return;
    mark(prev.btn, false);
    if (prev.onStop) prev.onStop();
  }

  /**
   * Show `btn` as Stop and make it the only thing playing. `onStop` (optional)
   * runs when another button takes over or when stop/stopAll is called; it
   * should silence this button's sound.
   */
  function start(btn, onStop) {
    stopAll();
    if (!btn) return;
    active = { btn: btn, onStop: onStop || null };
    mark(btn, true);
  }

  /** User asked to stop: revert `btn` and silence it. */
  function stop(btn) {
    if (isPlaying(btn)) stopAll();
    else mark(btn, false);
  }

  /** Sound ended on its own: revert the label, don't re-silence. */
  function finish(btn) {
    if (!isPlaying(btn)) return;
    active = null;
    mark(btn, false);
  }

  /** One-shot of known length: Stop for `ms`, then back to Play by itself. */
  function hold(btn, ms, onStop) {
    var timer = 0;
    start(btn, function () {
      clearTimeout(timer);
      if (onStop) onStop();
    });
    timer = setTimeout(function () { finish(btn); }, Math.max(0, ms || 0));
  }

  global.SangeetPlayToggle = {
    STOP_LABEL: STOP_LABEL,
    mark: mark,
    start: start,
    stop: stop,
    finish: finish,
    hold: hold,
    stopAll: stopAll,
    isPlaying: isPlaying,
    playingButton: playingButton
  };
})(window);
