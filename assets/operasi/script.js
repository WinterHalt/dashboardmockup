document.addEventListener("DOMContentLoaded", () => {
  const $ = (s) => document.querySelector(s);
  const pad = (n) => String(n).padStart(2, "0");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MIN = 60000;
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

  const state = { sort: "ok", dir: 1 };
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

  /* ---------- urut ---------- */
  const val = { ok: (o) => o.ok, ini: (o) => o.ini, sx: (o) => o.sx, age: (o) => o.age, end: (o) => o.end, op: (o) => o.op, an: (o) => o.an, act: (o) => o.act, dest: (o) => o.dest };
  function sorted() {
    const k = val[state.sort];
    return [...OPS].sort((a, b) => (k(a) > k(b) ? 1 : k(a) < k(b) ? -1 : 0) * state.dir);
  }

  /* ---------- tampilan ---------- */
  const rowHTML = (o, i, anim) => {
    const c = ST[status(o)].color;
    return `<tr class="${anim ? "in" : ""}" data-ok="${o.ok}" style="--c:${c};--k:${i}">
      <td><span class="ok"><i></i>${roman(o.ok)}</span></td>
      <td class="ini">${esc(o.ini)}</td><td class="sx">${o.sx}</td><td class="age">${o.age} th</td>
      <td class="tm"><b>${hm(o.start)} - ${hm(o.end)}</b></td>
      <td>${esc(o.op)}</td><td>${esc(o.an)}</td><td>${esc(o.act)}</td><td><span class="dest">${esc(o.dest)}</span></td></tr>`;
  };

  function render(anim) {
    const list = sorted();
    rowsEl.innerHTML = list.map((o, i) => rowHTML(o, i, anim && !reduce)).join("");
    $("#empty").hidden = list.length > 0;
    $("#count").textContent = `${list.length} operasi berlangsung`;
    document.querySelectorAll("th button").forEach((b) => { const on = b.dataset.sort === state.sort; b.classList.toggle("on", on); b.classList.toggle("desc", on && state.dir === -1); });
  }

  /* ---------- event ---------- */
  document.querySelectorAll("th button").forEach((b) => b.addEventListener("click", () => {
    const k = b.dataset.sort; if (state.sort === k) state.dir *= -1; else { state.sort = k; state.dir = 1; } render(true);
  }));

  setInterval(clock, 1000);
  setInterval(() => render(false), 30000);
  clock(); render(true);
});
