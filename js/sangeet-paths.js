/*
 * CANONICAL: shared/js/sangeet-paths.js
 * Sync with: powershell -File shared/sync-to-rooms.ps1
 *
 * Online (http/https): root-relative hrefs work as-is —
 *   "/" → hub, "/singing/" → singing room, etc. (bucket layout).
 * Local file://: the workspace mirror is sangeet/{hub,singing,piano,guitar,basuri,madal,tabla,sing-along}/
 *   so "/" would otherwise become C:/. This script rewrites those anchors to the
 *   matching folder under sangeet/ (hub ≈ live site root).
 */
(function (global) {
  "use strict";

  var ROOMS = "hub|singing|piano|guitar|basuri|madal|tabla|sing-along|pitch-trainer";

  function isFile() {
    return location.protocol === "file:";
  }

  function pathName() {
    try {
      return decodeURIComponent(location.pathname || "").replace(/\\/g, "/");
    } catch (e) {
      return (location.pathname || "").replace(/\\/g, "/");
    }
  }

  /** Absolute filesystem path to the sangeet workspace, e.g. /C:/Users/.../sangeet */
  function sangeetRoot() {
    var path = pathName();
    var m = path.match(new RegExp("^(.*\\/sangeet)\\/(" + ROOMS + ")(?:\\/|$)", "i"));
    return m ? m[1] : null;
  }

  /** Map legacy room URL slug to the current folder name. */
  function roomFolder(slug) {
    var s = String(slug || "").toLowerCase();
    if (s === "pitch-trainer") return "sing-along";
    return s;
  }

  function toFileUrl(absPath) {
    if (!absPath) return absPath;
    if (absPath.charAt(0) !== "/") absPath = "/" + absPath;
    return "file://" + absPath;
  }

  /**
   * Map a site-root href ("/", "/singing/", "/piano/theory.html", "/css/...")
   * to a file:// URL under the local sangeet tree. No-op when not file://.
   */
  function resolve(href) {
    if (!href || href.charAt(0) !== "/") return href;
    if (!isFile()) return href;
    var root = sangeetRoot();
    if (!root) return href;

    var hash = "";
    var q = "";
    var h = href;
    var hi = h.indexOf("#");
    if (hi >= 0) {
      hash = h.slice(hi);
      h = h.slice(0, hi);
    }
    var qi = h.indexOf("?");
    if (qi >= 0) {
      q = h.slice(qi);
      h = h.slice(0, qi);
    }

    if (h === "/" || h === "") {
      return toFileUrl(root + "/hub/index.html") + q + hash;
    }

    var room = h.match(/^\/(singing|piano|guitar|basuri|madal|tabla|sing-along|pitch-trainer)\/?(.*)$/i);
    if (room) {
      var rest = room[2] || "";
      if (!rest || rest.slice(-1) === "/") rest = rest + "index.html";
      return toFileUrl(root + "/" + roomFolder(room[1]) + "/" + rest) + q + hash;
    }

    // Live hub assets at bucket root (/css/...) live under hub/ locally
    if (h.indexOf("/css/") === 0 || h.indexOf("/js/") === 0) {
      return toFileUrl(root + "/hub" + h) + q + hash;
    }

    return href;
  }

  function rewriteAnchors(scope) {
    if (!isFile()) return;
    var nodes = (scope || document).querySelectorAll('a[href^="/"]');
    for (var i = 0; i < nodes.length; i++) {
      var a = nodes[i];
      var raw = a.getAttribute("href");
      if (!raw || raw.charAt(0) !== "/") continue;
      if (!a.getAttribute("data-site-href")) a.setAttribute("data-site-href", raw);
      a.setAttribute("href", resolve(raw));
    }
  }

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  onReady(function () {
    rewriteAnchors(document);
  });

  // Catch late-added links / keep data-site-href in sync on click
  document.addEventListener(
    "click",
    function (e) {
      if (!isFile()) return;
      var t = e.target;
      while (t && t.tagName !== "A") t = t.parentNode;
      if (!t || !t.getAttribute) return;
      var raw = t.getAttribute("data-site-href") || t.getAttribute("href");
      if (!raw || raw.charAt(0) !== "/") return;
      var next = resolve(raw);
      if (next !== t.getAttribute("href")) t.setAttribute("href", next);
    },
    true
  );

  global.SangeetPaths = {
    isFile: isFile,
    resolve: resolve,
    rewrite: rewriteAnchors,
    hub: function () {
      return resolve("/");
    },
    room: function (name) {
      return resolve("/" + name + "/");
    }
  };
})(window);
