/* ============================================================
   Vysan Studio — interactions
   ============================================================ */
(() => {
  "use strict";

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
    const cal = root.querySelector(".cal");
    const slotsEl = root.querySelector(".slots");
    const summary = root.querySelector(".summary");
    const stepperNums = root.querySelectorAll(".stepper .num");
    const confirmBtn = root.querySelector("[data-confirm]");

    const state = { service: null, date: null, slot: null };

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
    // Default-select first
    if (services[0]) services[0].click();

    // Build calendar (next 35 days, today first)
    if (cal) {
      cal.innerHTML = "";
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      days.forEach((d) => {
        const h = document.createElement("div");
        h.className = "d head";
        h.textContent = d;
        cal.appendChild(h);
      });
      const today = new Date();
      // Align to Monday-start
      const start = new Date(today);
      const day = (start.getDay() + 6) % 7; // 0=Mon
      start.setDate(start.getDate() - day);
      for (let i = 0; i < 28; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "d";
        cell.textContent = d.getDate();
        const isPast = d < new Date(today.toDateString());
        const isWeekendSunday = d.getDay() === 0;
        if (isPast || isWeekendSunday) cell.classList.add("dim");
        cell.dataset.iso = d.toISOString().slice(0, 10);
        cell.dataset.label = d.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" });
        cell.addEventListener("click", () => {
          if (cell.classList.contains("dim")) return;
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
      // Auto-select first available
      const firstAvail = cal.querySelector(".d:not(.head):not(.dim)");
      if (firstAvail) firstAvail.click();
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
