document.addEventListener("DOMContentLoaded", () => {
  const $ = (s) => document.querySelector(s);
  const pad = (n) => String(n).padStart(2, "0");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CAPACITY = 18, MIN = 60000;
  const ST = {
    run:  { label: "Berlangsung",     color: "var(--green)" },
    near: { label: "Hampir selesai",  color: "var(--amber)" },
    over: { label: "Melewati jadwal", color: "var(--red)" },
  };

  /* data contoh: waktu dibuat relatif terhadap jam sekarang agar progres hidup */
  const t0 = Math.floor(Date.now() / MIN);
  const mk = (ok, ini, sx, age, elapsed, dur, op, an, act, dest) =>
    ({ ok, ini, sx, age, start: (t0 - elapsed) * MIN, end: (t0 - elapsed + dur) * MIN, op, an, act, dest });
  const OPS = [
    mk(1,  "AE", "L", 18, 195, 205, "dr. Mulyadi Nasution, Sp.B",  "dr. Arif Syahputra, Sp.An", "Herniotomi",      "Tulip 1"),
    mk(2,  "NR", "P", 32, 140, 150, "dr. Annisa Syafitri, Sp.OG", "dr. Dewi Anggraini, Sp.An", "Sectio caesarea", "Tulip 2"),
    mk(5,  "AG", "L", 25, 100, 110, "dr. Budi Telaumbanua, Sp.B", "dr. Rahmat Maulana, Sp.An", "Apendektomi",     "Tulip 3"),
    mk(7,  "SB", "L", 67, 65,  120, "dr. Hendra Fauzi, Sp.B",     "dr. Arif Syahputra, Sp.An", "Laparotomi",      "ICU"),
    mk(11, "TY", "P", 59, 30,  240, "dr. Zulkarnain, Sp.BS",      "dr. Dewi Anggraini, Sp.An", "Kraniotomi",      "ICU"),
    mk(14, "LK", "P", 44, 15,  90,  "dr. Mulyadi Nasution, Sp.B", "dr. Rahmat Maulana, Sp.An", "Kolesistektomi",  "Tulip 1"),
  ];

  const roman = (n) => [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]].reduce((s, [v, r]) => { while (n >= v) { s += r; n -= v; } return s; }, "");
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const hm = (ms) => { const d = new Date(ms); return `${pad(d.getHours())}.${pad(d.getMinutes())}`; };
  const prog = (o) => Math.max(0, (Date.now() - o.start) / (o.end - o.start));
  const status = (o) => { const p = prog(o); return p >= 1 ? "over" : p >= 0.8 ? "near" : "run"; };
  const dur = (m) => (m >= 60 ? `${Math.floor(m / 60)} j ${m % 60} mnt` : `${m} mnt`);
  const leftText = (o) => { const m = Math.round((o.end - Date.now()) / MIN); return m >= 0 ? `${dur(m)} lagi` : `Lewat ${dur(-m)}`; };

  const state = { st: "all", room: null, sort: "ok", dir: 1 };
  const rowsEl = $("#rows");

  /* ---------- jam & tema ---------- */
  const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const clock = () => {
    const d = new Date();
    $("#time").textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    $("#date").textContent = `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };
  $("#theme").addEventListener("click", () => { const r = document.documentElement; r.dataset.theme = r.dataset.theme === "dark" ? "light" : "dark"; });

  /* ---------- filter, urut ---------- */
  const val = { ok: (o) => o.ok, ini: (o) => o.ini, sx: (o) => o.sx, age: (o) => o.age, end: (o) => o.end, op: (o) => o.op, an: (o) => o.an, act: (o) => o.act, dest: (o) => o.dest };
  function visible() {
    const list = OPS.filter((o) =>
      (state.st === "all" || status(o) === state.st) &&
      (!state.room || o.ok === state.room));
    const k = val[state.sort];
    return list.sort((a, b) => (k(a) > k(b) ? 1 : k(a) < k(b) ? -1 : 0) * state.dir);
  }

  /* ---------- tampilan ---------- */
  const rowHTML = (o, i, anim) => {
    const s = status(o), c = ST[s].color;
    return `<tr class="${anim ? "in" : ""}" data-ok="${o.ok}" style="--c:${c};--k:${i}">
      <td><span class="ok"><i></i>${roman(o.ok)}</span></td>
      <td class="ini">${esc(o.ini)}</td><td class="sx">${o.sx}</td><td class="age">${o.age} th</td>
      <td class="tm"><b>${hm(o.start)} - ${hm(o.end)}</b>
        <div class="meter"><span class="bar"><i data-p="${Math.min(100, Math.round(prog(o) * 100))}"></i></span><span class="left">${leftText(o)}</span></div></td>
      <td>${esc(o.op)}</td><td>${esc(o.an)}</td><td>${esc(o.act)}</td><td><span class="dest">${esc(o.dest)}</span></td></tr>`;
  };
  const fillBars = () => rowsEl.querySelectorAll(".bar i").forEach((b) => (b.style.width = b.dataset.p + "%"));

  function render(anim) {
    const list = visible();
    rowsEl.innerHTML = list.map((o, i) => rowHTML(o, i, anim && !reduce)).join("");
    requestAnimationFrame(() => requestAnimationFrame(fillBars));
    $("#empty").hidden = list.length > 0;
    $("#count").textContent = `${list.length} dari ${OPS.length} operasi berlangsung`;
    paintChips(); paintRooms();
    document.querySelectorAll("th button").forEach((b) => { const on = b.dataset.sort === state.sort; b.classList.toggle("on", on); b.classList.toggle("desc", on && state.dir === -1); });
  }

  function paintChips() {
    const n = (k) => OPS.filter((o) => k === "all" || status(o) === k).length;
    $("#chips").innerHTML = [["all", "Semua", "var(--ink)"], ...Object.entries(ST).map(([k, v]) => [k, v.label, v.color])]
      .map(([k, l, c]) => `<button class="chip ${state.st === k ? "on" : ""}" type="button" data-st="${k}" style="--c:${c}"><i></i>${l} <em>${n(k)}</em></button>`).join("");
  }
  function paintRooms() {
    $("#rooms").innerHTML = Array.from({ length: CAPACITY }, (_, i) => {
      const o = OPS.find((x) => x.ok === i + 1);
      if (!o) return `<span class="tile" title="OK ${roman(i + 1)}: kosong">${roman(i + 1)}</span>`;
      return `<button type="button" class="tile used ${state.room === o.ok ? "sel" : ""}" data-room="${o.ok}" style="--c:${ST[status(o)].color}" title="OK ${roman(o.ok)}: ${esc(o.act)}, ${leftText(o)}">${roman(o.ok)}</button>`;
    }).join("");
  }

  /* ---------- ringkasan ---------- */
  const shown = {};
  function paintStats(anim) {
    const occ = OPS.length, v = { cap: CAPACITY, occ, free: CAPACITY - occ, pct: Math.round((occ / CAPACITY) * 100) };
    document.querySelectorAll("[data-key]").forEach((n) => {
      const k = n.dataset.key, to = v[k], from = shown[k] ?? 0;
      shown[k] = to; n.dataset.suffix = k === "pct" ? "%" : "";
      if (!anim || reduce || from === to) { n.textContent = to; return; }
      const t = performance.now();
      const step = (now) => { const e = 1 - Math.pow(1 - Math.min(1, (now - t) / 800), 3); n.textContent = Math.round(from + (to - from) * e); if (e < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }

  /* ---------- event ---------- */
  $("#chips").addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (!b) return; state.st = state.st === b.dataset.st ? "all" : b.dataset.st; render(true); });
  $("#rooms").addEventListener("click", (e) => {
    const t = e.target.closest(".tile.used"); if (!t) return;
    const ok = +t.dataset.room; state.room = state.room === ok ? null : ok; state.st = "all"; render(false);
    const r = rowsEl.querySelector(`[data-ok="${ok}"]`);
    if (r) { r.classList.add("flash"); r.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" }); }
  });
  document.querySelectorAll("th button").forEach((b) => b.addEventListener("click", () => {
    const k = b.dataset.sort; if (state.sort === k) state.dir *= -1; else { state.sort = k; state.dir = 1; } render(true);
  }));
  $("#reset").addEventListener("click", () => { Object.assign(state, { st: "all", room: null }); render(true); });

  setInterval(clock, 1000);
  setInterval(() => render(false), 30000);
  clock(); render(true); paintStats(true);
});