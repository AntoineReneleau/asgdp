(function () {
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".site-nav");

  if (!header || !toggle || !nav) return;

  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    header.classList.toggle("is-menu-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  toggle.addEventListener("click", function () {
    setMenu(!nav.classList.contains("is-open"));
  });

  nav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      setMenu(false);
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") setMenu(false);
  });

  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var lockUntil = 0;

  function lockBriefly() {
    lockUntil = Date.now() + (reduceMotion ? 0 : 700);
  }

  function spy(links, options) {
    var pairs = links
      .map(function (link) {
        var id = link.getAttribute("href");
        if (!id || id.charAt(0) !== "#") return null;
        var section = document.querySelector(id);
        return section ? { link: link, section: section } : null;
      })
      .filter(Boolean);

    if (!pairs.length || !("IntersectionObserver" in window)) return;

    var observer = new IntersectionObserver(
      function (entries) {
        if (Date.now() < lockUntil) return;
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = "#" + entry.target.id;
          pairs.forEach(function (pair) {
            var active = pair.link.getAttribute("href") === id;
            pair.link.classList.toggle("is-active", active);
            if (active && options.scrollParent) {
              var parent = pair.link.parentElement;
              if (parent && parent.scrollWidth > parent.clientWidth) {
                parent.scrollTo({
                  left: pair.link.offsetLeft - parent.clientWidth / 2 + pair.link.offsetWidth / 2,
                  behavior: reduceMotion ? "auto" : "smooth",
                });
              }
            }
          });
        });
      },
      options
    );

    pairs.forEach(function (pair) {
      observer.observe(pair.section);
      pair.link.addEventListener("click", function () {
        lockBriefly();
        pairs.forEach(function (item) {
          item.link.classList.toggle("is-active", item.link === pair.link);
        });
      });
    });
  }

  spy(Array.prototype.slice.call(document.querySelectorAll("[data-spy]")), {
    rootMargin: "-45% 0px -50% 0px",
    threshold: 0,
  });

  spy(Array.prototype.slice.call(document.querySelectorAll("[data-pole]")), {
    rootMargin: "-20% 0px -65% 0px",
    threshold: 0,
    scrollParent: true,
  });
})();
