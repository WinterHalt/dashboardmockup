document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pad = (n) => String(n).padStart(2, "0");
  const $ = (s) => document.querySelector(s);

  /* ---------- data dummy ---------- */
  const CATS = {
    igd:     { label: "IGD",         color: "var(--red)" },
    biasa:   { label: "Rawat biasa", color: "var(--pink)" },
    intensif:{ label: "Intensif",    color: "var(--amber)" },
    vip:     { label: "VIP",         color: "var(--blue)" },
    vvip:    { label: "VVIP",        color: "var(--green)" },
  };
  const WARDS = [
    { id: "igd",    name: "IGD",     cat: "igd",      cap: 28, occ: 27 },
    { id: "tulip1", name: "Tulip 1", cat: "biasa",    cap: 12, occ: 12 },
    { id: "tulip2", name: "Tulip 2", cat: "biasa",    cap: 10, occ: 9 },
    { id: "tulip3", name: "Tulip 3", cat: "biasa",    cap: 15, occ: 14 },
    { id: "icu",    name: "ICU",     cat: "intensif", cap: 10, occ: 8 },
    { id: "vip",    name: "VIP",     cat: "vip",      cap: 12, occ: 9 },
    { id: "vvip",   name: "VVIP",    cat: "vvip",     cap: 5,  occ: 4 },
  ];
  const free = (w) => w.cap - w.occ;
  const pct = (w) => Math.round((w.occ / w.cap) * 100);

  const state = { cat: "all", sort: null, dir: 1 };
  const rowsEl = $("#rows"), emptyEl = $("#empty"), countEl = $("#count");

  /* ---------- clock ---------- */
  const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  function clock() {
    const d = new Date();
    $("#time").textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    $("#date").textContent = `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  /* ---------- chips ---------- */
  const chipsEl = $("#chips");
  chipsEl.innerHTML = [["all", "Semua", "var(--ink)"], ...Object.entries(CATS).map(([k, v]) => [k, v.label, v.color])]
    .map(([k, l, c]) => `<button class="chip" type="button" data-cat="${k}" style="--c:${c}"><i></i>${l}</button>`).join("");
  chipsEl.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    state.cat = state.cat === b.dataset.cat ? "all" : b.dataset.cat;
    render();
  });

  /* ---------- rows ---------- */
  const freeHTML = (w) => `<span class="r-free${free(w) === 0 ? " zero" : ""}">${free(w)}</span>`;

  function rowHTML(w, k) {
    return `<div class="row in" data-id="${w.id}" style="--c:${CATS[w.cat].color};--k:${k}">
      <div class="row-main grid">
        <span class="r-name"><i></i>${w.name}</span>
        <span class="r-num r-cap">${w.cap}</span>
        <span class="r-num r-occ">${w.occ}</span>
        <span class="r-free-cell">${freeHTML(w)}</span>
        <span class="meter"><span class="bar"><i></i></span><span class="pct">${pct(w)}%</span></span>
      </div>
    </div>`;
  }

  function visible() {
    const list = WARDS.filter((w) => state.cat === "all" || w.cat === state.cat);
    if (!state.sort) return list;
    const key = { name: (w) => w.name, cap: (w) => w.cap, occ: (w) => w.occ, free: free, pct }[state.sort];
    return [...list].sort((a, b) => (key(a) > key(b) ? 1 : key(a) < key(b) ? -1 : 0) * state.dir);
  }

  function render() {
    const list = visible();
    rowsEl.innerHTML = list.map(rowHTML).join("");
    if (reduceMotion) rowsEl.querySelectorAll(".row").forEach((r) => r.classList.remove("in"));
    requestAnimationFrame(() => requestAnimationFrame(() =>
      list.forEach((w) => { rowsEl.querySelector(`[data-id="${w.id}"] .bar i`).style.width = pct(w) + "%"; })));
    emptyEl.hidden = list.length > 0;
    countEl.textContent = `${list.length} dari ${WARDS.length} ruangan`;
    document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c.dataset.cat === state.cat));
    document.querySelectorAll(".head button").forEach((b) => {
      const on = b.dataset.sort === state.sort;
      b.classList.toggle("on", on);
      b.classList.toggle("desc", on && state.dir === -1);
    });
  }

  /* update satu baris tanpa membangun ulang */
  function updateRow(w) {
    const row = rowsEl.querySelector(`[data-id="${w.id}"]`);
    if (!row) return;
    row.querySelector(".r-occ").textContent = w.occ;
    row.querySelector(".r-free-cell").innerHTML = freeHTML(w);
    row.querySelector(".bar i").style.width = pct(w) + "%";
    row.querySelector(".pct").textContent = pct(w) + "%";
    row.classList.remove("flash"); void row.offsetWidth; row.classList.add("flash");
  }

  /* ---------- ringkasan ---------- */
  const shown = {};
  function paintStats(animate) {
    const cap = WARDS.reduce((a, w) => a + w.cap, 0), occ = WARDS.reduce((a, w) => a + w.occ, 0);
    const v = { cap, occ, free: cap - occ, pct: Math.round((occ / cap) * 100) };
    document.querySelectorAll("[data-key]").forEach((n) => {
      const k = n.dataset.key, to = v[k], from = shown[k] ?? 0;
      shown[k] = to;
      n.dataset.suffix = k === "pct" ? "%" : "";
      if (!animate || reduceMotion || from === to) { n.textContent = to; return; }
      const t0 = performance.now();
      const step = (t) => {
        const e = 1 - Math.pow(1 - Math.min(1, (t - t0) / 800), 3);
        n.textContent = Math.round(from + (to - from) * e);
        if (e < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /* ---------- events ---------- */
  document.querySelectorAll(".head button").forEach((b) =>
    b.addEventListener("click", () => {
      const k = b.dataset.sort;
      if (state.sort === k) state.dir *= -1; else { state.sort = k; state.dir = 1; }
      render();
    }));
  $("#reset").addEventListener("click", () => { state.cat = "all"; render(); });
  $("#theme").addEventListener("click", () => {
    const r = document.documentElement;
    r.dataset.theme = r.dataset.theme === "dark" ? "light" : "dark";
  });

  /* ---------- refresh tiap 15 dtk (data contoh) ---------- */
  setInterval(() => {
    const w = WARDS[Math.floor(Math.random() * WARDS.length)];
    const d = Math.random() > 0.5 ? 1 : -1;
    w.occ = Math.min(w.cap, Math.max(0, w.occ + d));
    updateRow(w);
    paintStats(true);
    const live = $("#live");
    live.classList.add("sync"); setTimeout(() => live.classList.remove("sync"), 400);
  }, 15000);

  setInterval(clock, 1000);
  clock();
  render();
  paintStats(true);
});