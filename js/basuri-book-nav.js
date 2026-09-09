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
          { label: "Hold & posture", href: "hold.html" },
          { label: "First sound", href: "first-sound.html" },
          { label: "Breath & long tones", href: "breath.html" },
          { label: "Practice routine", href: "routine.html" }
        ]
      },
      {
        id: "swaras",
        title: "Swaras",
        pages: [
          { label: "One hole at a time", href: "ladder.html" },
          { label: "Fingering charts", href: "swaras.html" },
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
          { label: "Layout calculator", href: "make.html" },
          { label: "Resources", href: "resources.html" },
          { label: "Home", href: "index.html" }
        ]
      }
    ]
  });
})();
