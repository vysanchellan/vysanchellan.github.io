/* ============================================================
   Vysan Studio — interactions
   ============================================================ */
(() => {
  "use strict";

  // -- Scroll progress + nav scrolled state --------------------------------
  let progressEl = document.querySelector(".scroll-progress");
  if (!progressEl) {
    progressEl = document.createElement("div");
    progressEl.className = "scroll-progress";
    progressEl.setAttribute("aria-hidden", "true");
    document.body.prepend(progressEl);
  }
  function onScroll() {
    const h = document.documentElement;
    const max = (h.scrollHeight - h.clientHeight) || 1;
    const pct = Math.min(100, Math.max(0, (h.scrollTop / max) * 100));
    progressEl.style.setProperty("--scroll", pct + "%");
    document.body.classList.toggle("scrolled", h.scrollTop > 32);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // -- Reveal on scroll ----------------------------------------------------
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  // -- Mobile menu ---------------------------------------------------------
  const toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => {
      document.body.classList.toggle("menu-open");
      toggle.setAttribute("aria-expanded", document.body.classList.contains("menu-open"));
    });
    document.querySelectorAll(".nav-mobile a").forEach((a) =>
      a.addEventListener("click", () => document.body.classList.remove("menu-open"))
    );
  }

  // -- Smooth scroll fallback for anchor links -----------------------------
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length > 1 && document.querySelector(id)) {
        e.preventDefault();
        document.querySelector(id).scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // -- Year stamp ----------------------------------------------------------
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

  // -- Toast helper --------------------------------------------------------
  function toast(msg) {
    let t = document.querySelector(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(() => t.classList.add("show"));
    clearTimeout(t._tm);
    t._tm = setTimeout(() => t.classList.remove("show"), 2600);
  }
  window.__toast = toast;

  // -- Contact form (mailto fallback) -------------------------------------
  const form = document.querySelector("[data-contact-form]");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = (data.get("name") || "").toString().trim();
      const email = (data.get("email") || "").toString().trim();
      const business = (data.get("business") || "").toString().trim();
      const budget = (data.get("budget") || "").toString().trim();
      const message = (data.get("message") || "").toString().trim();
      if (!name || !email || !message) {
        toast("Please fill name, email and message.");
        return;
      }
      const subject = encodeURIComponent(`New project enquiry from ${name}`);
      const body = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\nBusiness: ${business}\nBudget: ${budget}\n\n${message}\n\n— Sent from vysanchellan.github.io`
      );
      window.location.href = `mailto:chellanvysan@gmail.com?subject=${subject}&body=${body}`;
      toast("Opening your email app…");
    });
  }

  // -- Booking widget ------------------------------------------------------
  document.querySelectorAll("[data-booking]").forEach((root) => initBooking(root));

  function initBooking(root) {
    const services = root.querySelectorAll(".svc");
    const calShell = root.querySelector("[data-cal]");
    const cal = root.querySelector(".cal");
    const calTitle = root.querySelector("[data-cal-title]");
    const calPrev = root.querySelector("[data-cal-prev]");
    const calNext = root.querySelector("[data-cal-next]");
    const slotsEl = root.querySelector(".slots");
    const summary = root.querySelector(".summary");
    const stepperNums = root.querySelectorAll(".stepper .num");
    const confirmBtn = root.querySelector("[data-confirm]");

    const state = { service: null, date: null, slot: null };
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const view = { y: today.getFullYear(), m: today.getMonth() }; // m: 0=Jan
    const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
                          "July", "August", "September", "October", "November", "December"];

    // Service selection
    services.forEach((s) => {
      s.addEventListener("click", () => {
        services.forEach((o) => o.setAttribute("aria-pressed", "false"));
        s.setAttribute("aria-pressed", "true");
        state.service = { name: s.dataset.name, duration: s.dataset.duration };
        updateStepper();
        renderSummary();
      });
    });
    if (services[0]) services[0].click();

    function fmtLabel(d) {
      return d.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" });
    }
    function isoOf(d) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    }

    function renderCalendar() {
      if (!cal) return;
      cal.innerHTML = "";

      const firstOfMonth = new Date(view.y, view.m, 1);
      const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
      // Monday-start offset (0=Mon ... 6=Sun)
      const leadingPad = (firstOfMonth.getDay() + 6) % 7;

      if (calTitle) calTitle.textContent = `${MONTH_NAMES[view.m]} ${view.y}`;
      if (calPrev) {
        const atCurrent = view.y === today.getFullYear() && view.m === today.getMonth();
        calPrev.disabled = atCurrent;
        calPrev.setAttribute("aria-disabled", atCurrent ? "true" : "false");
      }

      // Leading pads (previous month, dimmed, non-interactive)
      for (let i = 0; i < leadingPad; i++) {
        const cell = document.createElement("span");
        cell.className = "d pad";
        cell.setAttribute("aria-hidden", "true");
        cal.appendChild(cell);
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(view.y, view.m, day);
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "d";
        cell.setAttribute("role", "gridcell");
        cell.textContent = day;

        const isPast = d < todayMidnight;
        const isSunday = d.getDay() === 0;
        // Deterministic blocked day: every 9th day index per (y,m) is "fully booked"
        const blockedSeed = (view.y * 31 + view.m * 7 + day) % 11;
        const isBlocked = blockedSeed === 0;

        if (isPast || isSunday || isBlocked) {
          cell.classList.add("dim");
          cell.disabled = true;
          if (isPast) cell.setAttribute("aria-label", `${fmtLabel(d)} — past`);
          else if (isSunday) cell.setAttribute("aria-label", `${fmtLabel(d)} — closed`);
          else cell.setAttribute("aria-label", `${fmtLabel(d)} — fully booked`);
        } else {
          cell.setAttribute("aria-label", fmtLabel(d));
        }

        cell.dataset.iso = isoOf(d);
        cell.dataset.label = fmtLabel(d);

        if (state.date && state.date.iso === cell.dataset.iso) {
          cell.setAttribute("aria-pressed", "true");
        }

        cell.addEventListener("click", () => {
          if (cell.disabled) return;
          cal.querySelectorAll(".d").forEach((o) => o.setAttribute("aria-pressed", "false"));
          cell.setAttribute("aria-pressed", "true");
          state.date = { iso: cell.dataset.iso, label: cell.dataset.label };
          state.slot = null;
          renderSlots();
          updateStepper();
          renderSummary();
        });

        cal.appendChild(cell);
      }
    }

    function selectFirstAvailable() {
      const firstAvail = cal && cal.querySelector(".d:not(.dim):not(.pad)");
      if (firstAvail) firstAvail.click();
    }

    if (calPrev) {
      calPrev.addEventListener("click", () => {
        if (calPrev.disabled) return;
        view.m -= 1;
        if (view.m < 0) { view.m = 11; view.y -= 1; }
        renderCalendar();
      });
    }
    if (calNext) {
      calNext.addEventListener("click", () => {
        view.m += 1;
        if (view.m > 11) { view.m = 0; view.y += 1; }
        renderCalendar();
      });
    }

    if (cal) {
      renderCalendar();
      selectFirstAvailable();
    }

    function renderSlots() {
      if (!slotsEl) return;
      slotsEl.innerHTML = "";
      const base = ["08:30", "09:15", "10:00", "10:45", "11:30", "13:00", "13:45", "14:30", "15:15", "16:00", "16:45"];
      // Pseudo-random unavailables based on date
      const seed = (state.date?.iso || "").split("-").join("");
      base.forEach((t, idx) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "slot"; b.textContent = t;
        const taken = parseInt(seed.slice(-2) || "0", 10) % 7 === idx % 7 || idx === 4;
        if (taken) { b.disabled = true; }
        b.addEventListener("click", () => {
          if (b.disabled) return;
          slotsEl.querySelectorAll(".slot").forEach((o) => o.setAttribute("aria-pressed", "false"));
          b.setAttribute("aria-pressed", "true");
          state.slot = t;
          updateStepper();
          renderSummary();
        });
        slotsEl.appendChild(b);
      });
    }

    function renderSummary() {
      if (!summary) return;
      summary.innerHTML = `
        <div class="row"><span>Service</span><strong>${state.service?.name || "—"}</strong></div>
        <div class="row"><span>Duration</span><strong>${state.service?.duration || "—"}</strong></div>
        <div class="row"><span>Date</span><strong>${state.date?.label || "—"}</strong></div>
        <div class="row"><span>Time</span><strong>${state.slot || "—"}</strong></div>
      `;
    }

    function updateStepper() {
      const filled = [!!state.service, !!state.date, !!state.slot].filter(Boolean).length + 1;
      stepperNums.forEach((n, i) => n.classList.toggle("active", i < filled));
    }

    if (confirmBtn) {
      confirmBtn.addEventListener("click", () => {
        if (!state.service || !state.date || !state.slot) {
          toast("Please choose service, date and time.");
          return;
        }
        toast(`Demo booking confirmed: ${state.service.name} • ${state.date.label} • ${state.slot}`);
      });
    }
  }

  // -- Chat demo -----------------------------------------------------------
  document.querySelectorAll("[data-chat]").forEach((root) => initChat(root));

  function initChat(root) {
    const win = root.querySelector(".chat-window");
    const input = root.querySelector("input");
    const send = root.querySelector("button");
    const replies = JSON.parse(root.dataset.replies || "[]");
    let i = 0;

    function add(text, who = "bot") {
      const b = document.createElement("div");
      b.className = `bubble ${who}`;
      b.textContent = text;
      win.appendChild(b);
      win.scrollTop = win.scrollHeight;
      return b;
    }
    function typing() {
      const b = document.createElement("div");
      b.className = "bubble bot";
      b.innerHTML = '<span class="typing"><span></span><span></span><span></span></span>';
      win.appendChild(b);
      win.scrollTop = win.scrollHeight;
      return b;
    }

    function reply(userText) {
      add(userText, "user");
      const t = typing();
      const next = replies[i % replies.length] || "I'd be happy to help with that. Want me to forward you to a human agent?";
      i++;
      setTimeout(() => {
        t.remove();
        add(next, "bot");
      }, 700 + Math.random() * 500);
    }

    function commit() {
      const v = input.value.trim();
      if (!v) return;
      input.value = "";
      reply(v);
    }
    if (send) send.addEventListener("click", commit);
    if (input)
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") commit();
      });

    // Suggested chips
    root.querySelectorAll("[data-suggest]").forEach((c) => {
      c.addEventListener("click", () => reply(c.dataset.suggest));
    });
  }
})();
