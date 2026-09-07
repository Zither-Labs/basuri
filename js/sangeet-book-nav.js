/*
 * Sangeet Yatra — shared book-index left nav (accordion).
 * Mount: <div id="sy-book-index"></div> inside .wrap > nav.
 * Load before sangeet-mobile-nav.js so the drawer sees the same index.
 *
 *   SangeetBookNav.mount({
 *     theory: { heading: "Shared", links: [{ href, label }] },  // optional
 *     room: "Ukulele",  // optional underlined room scope before chapters
 *     index: [{ id, title, pages: [{ id?, label, href, sub? }] }],
 *     aliases: { "exercises-folk.html": "drills-folk.html" },
 *     hashFiles: ["strumming.html"]  // optional: hash-aware current leaf
 *   });
 */
(function (global) {
  "use strict";

  var DEFAULT_MOUNT = "sy-book-index";

  function pageFile() {
    var path = "";
    try {
      path = decodeURIComponent(location.pathname || "");
    } catch (e) {
      path = location.pathname || "";
    }
    path = path.replace(/\\/g, "/").replace(/\/+$/, "");
    var last = path.split("/").pop() || "";
    if (!last || last.indexOf(".") === -1) {
      if (path.indexOf("/theory/") >= 0) return path;
      return "index.html";
    }
    return last;
  }

  function pathnameNorm() {
    try {
      return decodeURIComponent(location.pathname || "").replace(/\\/g, "/");
    } catch (e) {
      return (location.pathname || "").replace(/\\/g, "/");
    }
  }

  function hrefParts(href) {
    var h = href || "";
    var hash = "";
    var i = h.indexOf("#");
    if (i >= 0) {
      hash = h.slice(i).toLowerCase();
      h = h.slice(0, i);
    }
    var abs = h.charAt(0) === "/";
    var file = abs ? h : h.split("/").pop() || h;
    return { file: file, hash: hash, abs: abs, path: h };
  }

  function createController(opts) {
    var mountId = opts.mountId || DEFAULT_MOUNT;
    var INDEX = opts.index || [];
    var FILE_ALIASES = opts.aliases || {};
    var HASH_FILES = opts.hashFiles || [];
    var theory = opts.theory || null;
    var roomLabel = opts.room || "";
    var manualOpen = {};

    function leafIsCurrent(leaf) {
      var file = pageFile();
      var aliased = FILE_ALIASES[file] || file;
      var parts = hrefParts(leaf.href);
      var locHash = (location.hash || "").toLowerCase();
      var path = pathnameNorm();

      if (parts.abs) {
        var target = parts.path.replace(/\/+$/, "") || parts.path;
        var here = path.replace(/\/+$/, "");
        if (here === target || here.indexOf(target + "/") === 0) {
          if (!parts.hash) return true;
          return locHash === parts.hash;
        }
        if (target.charAt(target.length - 1) !== "/" && here === target + "/index.html") {
          return !parts.hash || locHash === parts.hash;
        }
        return false;
      }

      var matchFile = parts.file === file || parts.file === aliased;
      if (!matchFile) return false;

      var hashAware =
        HASH_FILES.indexOf(parts.file) >= 0 || HASH_FILES.indexOf(file) >= 0;
      if (hashAware) {
        if (parts.hash) return locHash === parts.hash;
        /* Default leaf (no hash): current when location has no hash that
           another leaf on the same file claims. */
        return !INDEX.some(function (sec) {
          return sec.pages.some(function (p) {
            if (p === leaf) return false;
            var hp = hrefParts(p.href);
            return (
              !hp.abs &&
              hp.file === parts.file &&
              hp.hash &&
              locHash === hp.hash
            );
          });
        });
      }

      if (parts.hash) return locHash === parts.hash;
      return true;
    }

    function activeSectionId() {
      var i, j, sec;
      for (i = 0; i < INDEX.length; i++) {
        sec = INDEX[i];
        for (j = 0; j < sec.pages.length; j++) {
          if (leafIsCurrent(sec.pages[j])) return sec.id;
        }
      }
      return INDEX.length ? INDEX[0].id : "";
    }

    function sectionIsOpen(secId, activeId) {
      if (Object.prototype.hasOwnProperty.call(manualOpen, secId)) {
        return manualOpen[secId];
      }
      return secId === activeId;
    }

    function resolveHref(href) {
      if (global.SangeetPaths && href && href.charAt(0) === "/") {
        return global.SangeetPaths.resolve(href);
      }
      return href;
    }

    function render() {
      var mount = document.getElementById(mountId);
      if (!mount) return;

      var activeId = activeSectionId();
      var frag = document.createDocumentFragment();

      if (theory && theory.links && theory.links.length) {
        var theoryWrap = document.createElement("div");
        theoryWrap.className = "sy-book-theory";
        var th = document.createElement("h2");
        th.textContent = theory.heading || "Theory";
        theoryWrap.appendChild(th);
        theory.links.forEach(function (link) {
          var a = document.createElement("a");
          a.href = resolveHref(link.href);
          a.textContent = link.label;
          if (leafIsCurrent(link)) a.setAttribute("aria-current", "page");
          theoryWrap.appendChild(a);
        });
        frag.appendChild(theoryWrap);
      }

      if (roomLabel) {
        var roomEl = document.createElement("h2");
        roomEl.className = "sy-book-room";
        roomEl.textContent = roomLabel;
        frag.appendChild(roomEl);
      }

      INDEX.forEach(function (sec) {
        var open = sectionIsOpen(sec.id, activeId);
        var here = sec.id === activeId;

        var wrap = document.createElement("div");
        wrap.className = "sy-book-sec";

        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "sy-book-toggle" + (here ? " is-here" : "");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        btn.setAttribute("aria-controls", "sy-book-" + sec.id);

        var chev = document.createElement("span");
        chev.className = "sy-book-chevron";
        chev.setAttribute("aria-hidden", "true");
        btn.appendChild(chev);

        var label = document.createElement("span");
        label.textContent = sec.title;
        btn.appendChild(label);

        btn.addEventListener("click", function () {
          var cur = activeSectionId();
          var isOpen = sectionIsOpen(sec.id, cur);
          manualOpen[sec.id] = !isOpen;
          render();
        });
        wrap.appendChild(btn);

        var list = document.createElement("div");
        list.id = "sy-book-" + sec.id;
        list.className = "sy-book-pages";
        list.hidden = !open;

        sec.pages.forEach(function (p) {
          var a = document.createElement("a");
          a.href = resolveHref(p.href);
          a.textContent = p.label;
          if (p.sub) a.className = "sub";
          if (leafIsCurrent(p)) a.setAttribute("aria-current", "page");
          list.appendChild(a);
        });

        wrap.appendChild(list);
        frag.appendChild(wrap);
      });

      mount.textContent = "";
      mount.appendChild(frag);

      if (global.SangeetPaths && global.SangeetPaths.rewrite) {
        global.SangeetPaths.rewrite(mount);
      }
    }

    function onHashChange() {
      manualOpen = {};
      render();
    }

    function boot() {
      if (!document.getElementById(mountId)) return;
      render();
      window.addEventListener("hashchange", onHashChange);
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }

    return { render: render };
  }

  global.SangeetBookNav = {
    mount: createController,
    MOUNT_ID: DEFAULT_MOUNT
  };
})(typeof window !== "undefined" ? window : this);
