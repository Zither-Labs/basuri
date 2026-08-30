/*
 * CANONICAL: shared/js/sangeet-mobile-nav.js
 * Sync into each room with: powershell -File shared/sync-to-rooms.ps1
 *
 * Mobile Menu button + off-canvas drawer for parchment pages with .wrap > nav.
 * Desktop keeps the sticky sidebar; at ≤820px the sidebar is hidden by page CSS
 * and this script restores it as a slide-in drawer.
 */
(function () {
  var nav = document.querySelector(".wrap > nav");
  if (!nav) return;

  var style = document.createElement("style");
  style.textContent = [
    ".nav-menu-btn{display:none}",
    ".nav-menu-backdrop{display:none}",
    "@media (max-width:820px){",
    ".nav-menu-btn{display:inline-flex!important;align-items:center;gap:6px;",
    "position:fixed;top:10px;left:10px;z-index:90;margin:0;",
    "padding:8px 12px;border-radius:10px;border:1px solid #e7d8bf;",
    "background:#fffaf0;color:#3d2b1f;font-weight:700;font-size:.88rem;",
    "font-family:inherit;box-shadow:0 4px 14px rgba(40,20,8,.18);cursor:pointer}",
    ".nav-menu-btn:hover{background:#f3e6cf}",
    ".nav-menu-backdrop{display:none;position:fixed;inset:0;z-index:80;",
    "background:rgba(0,0,0,.4);border:0;padding:0;margin:0;cursor:pointer}",
    "body.nav-open .nav-menu-backdrop{display:block}",
    ".wrap>nav{display:block!important;position:fixed!important;top:0;left:0;bottom:0;",
    "width:min(86vw,300px)!important;min-width:0!important;height:100%!important;",
    "max-height:none;z-index:85;overflow-y:auto;-webkit-overflow-scrolling:touch;",
    "transform:translateX(-105%);transition:transform .2s ease;",
    "box-shadow:8px 0 28px rgba(0,0,0,.22);padding-top:56px}",
    "body.nav-open .wrap>nav{transform:translateX(0)}",
    "main{padding-top:56px!important}",
    "}"
  ].join("");
  document.head.appendChild(style);

  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "nav-menu-btn";
  btn.setAttribute("aria-controls", "site-nav");
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-label", "Open menu");
  btn.textContent = "Menu";
  if (!nav.id) nav.id = "site-nav";

  var backdrop = document.createElement("button");
  backdrop.type = "button";
  backdrop.className = "nav-menu-backdrop";
  backdrop.setAttribute("aria-label", "Close menu");
  backdrop.tabIndex = -1;

  function setNavOpen(open) {
    document.body.classList.toggle("nav-open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    btn.textContent = open ? "Close" : "Menu";
  }
  function toggleNav() { setNavOpen(!document.body.classList.contains("nav-open")); }

  btn.addEventListener("click", function (e) { e.stopPropagation(); toggleNav(); });
  backdrop.addEventListener("click", function () { setNavOpen(false); });
  nav.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a");
    if (a) setNavOpen(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") setNavOpen(false);
  });

  document.body.appendChild(backdrop);
  document.body.appendChild(btn);
})();
