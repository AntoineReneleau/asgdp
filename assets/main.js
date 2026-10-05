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

(function () {
  var root = document.querySelector("#events");
  if (!root) return;

  var endpoint =
    "https://www.googleapis.com/calendar/v3/calendars/066c5fa56ca811d0f49dc94653c37deb408dcb68883c531a6c08153a6b3c6750@group.calendar.google.com/events?key=AIzaSyCT83qiuXzPvwkbHaUNno60iD35uGJJL4Q";

  var dayFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", timeZone: "Europe/Paris" });
  var monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "Europe/Paris" });
  var dateFmt = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });
  var timeFmt = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });

  function showStatus(message) {
    root.replaceChildren();
    var paragraph = document.createElement("p");
    paragraph.className = "events-status";
    paragraph.textContent = message;
    root.appendChild(paragraph);
  }

  function parsePoint(value) {
    if (!value) return null;
    if (value.dateTime) return { date: new Date(value.dateTime), allDay: false };
    if (!value.date) return null;
    var parts = value.date.split("-");
    return {
      date: new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])),
      allDay: true,
    };
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function inclusiveEnd(end) {
    if (!end) return null;
    if (!end.allDay) return end.date;
    var day = new Date(end.date.getTime());
    day.setDate(day.getDate() - 1);
    return day;
  }

  function isUpcoming(start, end) {
    var finish = inclusiveEnd(end) || start.date;
    if (start.allDay) {
      var today = new Date();
      var startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return new Date(finish.getFullYear(), finish.getMonth(), finish.getDate()).getTime() >= startToday.getTime();
    }
    return finish.getTime() >= Date.now();
  }

  function whenLabel(start, end) {
    var finish = inclusiveEnd(end);
    if (start.allDay) {
      if (!finish || sameDay(start.date, finish)) return dateFmt.format(start.date);
      return dateFmt.format(start.date) + " – " + dateFmt.format(finish);
    }
    var label = dateFmt.format(start.date) + ", " + timeFmt.format(start.date);
    if (!end || end.allDay) return label;
    if (sameDay(start.date, end.date)) return label + " – " + timeFmt.format(end.date);
    return label + " – " + dateFmt.format(end.date) + ", " + timeFmt.format(end.date);
  }

  function render(events) {
    var upcoming = events.filter(function (event) {
      if (event.status === "cancelled") return false;
      var start = parsePoint(event.start);
      if (!start) return false;
      return isUpcoming(start, parsePoint(event.end));
    });

    if (!upcoming.length) {
      showStatus("Aucun événement à venir.");
      return;
    }

    var list = document.createElement("ol");
    list.className = "events";

    upcoming.forEach(function (event) {
      var start = parsePoint(event.start);
      var end = parsePoint(event.end);
      var item = document.createElement("li");
      item.className = "event";

      var time = document.createElement("time");
      time.dateTime = (event.start && (event.start.dateTime || event.start.date)) || "";
      var day = document.createElement("span");
      day.className = "event-day";
      day.textContent = dayFmt.format(start.date);
      var month = document.createElement("span");
      month.className = "event-month";
      month.textContent = monthFmt.format(start.date);
      time.append(day, month);

      var body = document.createElement("div");
      var title = document.createElement("h3");
      title.textContent = event.summary || "Événement";
      var when = document.createElement("p");
      when.className = "event-when";
      when.textContent = whenLabel(start, end);
      body.append(title, when);

      if (event.location) {
        var place = document.createElement("p");
        place.className = "event-where";
        place.textContent = event.location;
        body.appendChild(place);
      }

      if (event.description) {
        var description = document.createElement("p");
        description.className = "event-desc";
        description.textContent = event.description;
        body.appendChild(description);
      }

      if (event.htmlLink) {
        var link = document.createElement("a");
        link.href = event.htmlLink;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Voir dans l'agenda";
        body.appendChild(link);
      }

      item.append(time, body);
      list.appendChild(item);
    });

    root.replaceChildren(list);
  }

  var url = new URL(endpoint);
  url.searchParams.set("timeMin", new Date().toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "20");

  fetch(url.toString())
    .then(function (response) {
      if (!response.ok) throw new Error("calendar");
      return response.json();
    })
    .then(function (data) {
      render(data.items || []);
    })
    .catch(function () {
      showStatus("L'agenda n'a pas pu être chargé.");
    });
})();
