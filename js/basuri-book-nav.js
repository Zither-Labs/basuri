/* Learn Basuri — book-index config. Requires js/sangeet-book-nav.js first. */
(function () {
  "use strict";
  if (!window.SangeetBookNav) return;
  SangeetBookNav.mount({
    theory: {
      heading: "Shared",
      links: [{ href: "/theory/eastern/#swara", label: "Eastern theory" }]
    },
    room: "Basuri",
    index: [
      {
        id: "start",
        title: "Start here",
        pages: [
          { label: "Choose a flute", href: "choose.html" },
          { label: "First sound", href: "first-sound.html" },
          { label: "Practice routine", href: "routine.html" },
          { label: "Hold & posture", href: "hold.html" },
          { label: "Breath & long tones", href: "breath.html" },
          { label: "Layout calculator", href: "make.html" }
        ]
      },
      {
        id: "notes",
        title: "Notes",
        pages: [
          { label: "Swaras (Sa–Ni)", href: "swaras.html" },
          { label: "Finger ladder", href: "ladder.html" },
          { label: "Listen", href: "listen.html" },
          { label: "Alankars", href: "alankars.html" },
          { label: "Simple songs", href: "songs.html" }
        ]
      },
      {
        id: "story",
        title: "Story",
        pages: [
          { label: "The murali", href: "murali.html" },
          { label: "Carnatic venu", href: "venu.html" }
        ]
      },
      {
        id: "more",
        title: "More",
        pages: [
          { label: "Resources", href: "resources.html" },
          { label: "Home", href: "index.html" }
        ]
      }
    ]
  });
})();
