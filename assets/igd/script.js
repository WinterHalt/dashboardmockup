document.addEventListener("DOMContentLoaded", () => {
  const NS = "http://www.w3.org/2000/svg";
  const HOURS = Array.from({ length: 12 }, (_, i) => String(i).padStart(2, "0") + ":00");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pad = (n) => String(n).padStart(2, "0");

  const CHARTS = {
    arrival: { title: "Kedatangan pasien ranap / jam", color: "#2f6fed", soft: "#e8f0fe", data: [3, 4, 4, 6, 7, 6, 8, 9, 8, 10, 9, 11] },
    triage:  { title: "Triase merah / jam",            color: "#e5484d", soft: "#fdecec", data: [1, 2, 1, 2, 3, 2, 4, 3, 5, 3, 4, 3] },
    respon:  { title: "Response time (menit)",          color: "#1fa971", soft: "#e4f6ee", data: [16, 14, 15, 13, 17, 15, 14, 16, 13, 15, 14, 14], floor: 10 },
    visit:   { title: "Kunjungan / jam",             color: "#f2a20c", soft: "#fff4dc", data: [3, 4, 5, 6, 8, 7, 9, 10, 8, 9, 7, 11] },
  };

  const el = (name, attrs = {}) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };

  /* ---------- smooth monotone curve ---------- */
  function smoothPath(p) {
    const n = p.length, dx = [], m = [], t = [];
    for (let i = 0; i < n - 1; i++) { dx[i] = p[i + 1][0] - p[i][0]; m[i] = (p[i + 1][1] - p[i][1]) / dx[i]; }
    t[0] = m[0]; t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (m[i] === 0) { t[i] = t[i + 1] = 0; continue; }
      const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
      if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
    }
    let d = `M${p[0][0]},${p[0][1]}`;
    for (let i = 0; i < n - 1; i++) {
      const h = dx[i] / 3;
      d += `C${p[i][0] + h},${p[i][1] + t[i] * h} ${p[i + 1][0] - h},${p[i + 1][1] - t[i + 1] * h} ${p[i + 1][0]},${p[i + 1][1]}`;
    }
    return d;
  }
  function gradient(id, color, top, bottom) {
    const g = el("linearGradient", { id, x1: 0, y1: 0, x2: 0, y2: 1 });
    g.append(el("stop", { offset: "0%", "stop-color": color, "stop-opacity": top }),
             el("stop", { offset: "100%", "stop-color": color, "stop-opacity": bottom }));
    return g;
  }
  function drawIn(path, ms = 900) {
    if (reduceMotion) return;
    path.setAttribute("pathLength", 1);
    path.style.strokeDasharray = 1; path.style.strokeDashoffset = 1;
    path.getBoundingClientRect();
    path.style.transition = `stroke-dashoffset ${ms}ms cubic-bezier(.22,.8,.3,1)`;
    path.style.strokeDashoffset = 0;
    path.addEventListener("transitionend", () => { path.style.strokeDasharray = "none"; }, { once: true });
  }

  /* ---------- sparkline ---------- */
  const seen = new WeakSet();
  function drawSpark(card, key) {
    const cfg = CHARTS[key], svg = card.querySelector("svg"), d = cfg.data;
    const W = Math.round(svg.clientWidth) || 160, H = 84;
    const animate = !seen.has(svg); seen.add(svg);
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.replaceChildren();
    const max = Math.max(...d), min = Math.min(...d), span = max - min || 1;
    const pts = d.map((v, i) => [(i / (d.length - 1)) * (W - 6), H - 10 - ((v - min) / span) * (H - 26)]);
    const gid = "sg-" + key;
    const defs = el("defs"); defs.append(gradient(gid, cfg.color, 0.22, 0)); svg.append(defs);
    const line = smoothPath(pts);
    svg.append(el("path", { d: `${line}L${pts.at(-1)[0]},${H}L0,${H}Z`, fill: `url(#${gid})` }));
    const stroke = el("path", { d: line, fill: "none", stroke: cfg.color, "stroke-width": 2.75, "stroke-linecap": "round", "stroke-linejoin": "round" });
    svg.append(stroke);
    if (animate) drawIn(stroke);
    const [lx, ly] = pts.at(-1);
    svg.append(el("circle", { cx: lx, cy: ly, r: 4, fill: cfg.color, class: "pulse" }),
               el("circle", { cx: lx, cy: ly, r: 4.5, fill: "#fff", stroke: cfg.color, "stroke-width": 2.5 }));

  }
  const cards = [...document.querySelectorAll(".chart-card")];
  const redrawSparks = () => cards.forEach((c) => drawSpark(c, c.dataset.chart));
  new ResizeObserver(redrawSparks).observe(document.querySelector(".charts"));
  redrawSparks();
  cards.forEach((c) => c.addEventListener("click", () => openModal(c.dataset.chart, c)));

  /* ---------- clock ---------- */
  const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  function tick() {
    const d = new Date();
    document.getElementById("time").textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    document.getElementById("date").textContent = `${DAYS[d.getDay()]}, ${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
  }
  tick(); setInterval(tick, 1000);

  /* ---------- bed: data dummy -> segmen (gaya lama) ---------- */
  const IGD_ROOMS = [
    { name: "R. Resusitasi", cap: 4,  occ: 3 },
    { name: "Medikal",       cap: 12, occ: 9 },
    { name: "Surgikal",      cap: 12, occ: 10 },
    { name: "Ponek",         cap: 6,  occ: 4 },
    { name: "Anak",          cap: 6,  occ: 5 },
  ];
  const RANAP = [
    { name: "Mawar 1",  cap: 20, occ: 6 },  { name: "Tulip 2", cap: 24, occ: 15 },
    { name: "Anggrek",  cap: 30, occ: 23 }, { name: "Kelas 1", cap: 40, occ: 35 },
    { name: "Kenanga",  cap: 16, occ: 13 }, { name: "Melati",  cap: 20, occ: 18 },
    { name: "ICU",      cap: 10, occ: 8 },  { name: "VVIP",    cap: 5,  occ: 4 },
  ];
  const RANAP_TOP = 5;   // tampilkan yang sisanya paling banyak

  const freeOf = (w) => w.cap - w.occ;
  const toneOf = (free) => (free <= 2 ? "red" : free <= 5 ? "amber" : "green");

  function bedHTML(w) {
    const free = freeOf(w);
    const segs = Array.from({ length: w.cap }, (_, i) => `<i class="${i < w.occ ? "on" : "free"}" style="--k:${i}"></i>`).join("");
    return `<div class="bed" data-tone="${toneOf(free)}">
      <div class="bed-head"><span>${w.name}</span><span class="bed-free"><b class="num">${free}</b><small>dari ${w.cap}</small></span></div>
      <div class="seg">${segs}</div></div>`;
  }
  function paintBeds() {
    document.getElementById("bed-igd").innerHTML = IGD_ROOMS.map(bedHTML).join("");
    const top = [...RANAP].sort((a, b) => freeOf(b) - freeOf(a)).slice(0, RANAP_TOP);
    document.getElementById("bed-ranap").innerHTML = top.map(bedHTML).join("");
  }
  paintBeds();

  /* ---------- entrance ---------- */
  function countUp(node) {
    const m = node.textContent.trim().match(/^(\d+)(\D.*)?$/);
    if (!m || reduceMotion) return;
    const target = +m[1], suffix = m[2] || "", start = performance.now(), dur = 900;
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - t, 3);
      node.textContent = Math.round(target * e) + suffix;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  document.querySelectorAll(".card").forEach((c, i) => c.style.setProperty("--i", i));
  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.body.classList.add("ready", "go");
    document.querySelectorAll(".num").forEach(countUp);
    setTimeout(() => document.querySelectorAll(".card").forEach((c) => c.classList.add("settled")), 1300);
  }));

  /* ---------- tautan sementara: halaman belum ada, jangan loncat ke atas ---------- */
  document.querySelectorAll('a[href="#"]').forEach((a) =>
    a.addEventListener("click", (e) => e.preventDefault()));

  /* ---------- modal ---------- */
  const modal = document.getElementById("modal");
  const box = modal.querySelector(".modal-box");
  const big = document.getElementById("big");
  const tip = document.getElementById("tip");
  let lastFocus = null, key = null, animateBig = true;

  function openModal(k, trigger) {
    key = k; lastFocus = trigger; animateBig = true;
    const cfg = CHARTS[k], d = cfg.data;
    document.getElementById("modal-title").textContent = cfg.title;
    const sum = d.reduce((a, b) => a + b, 0), peak = Math.max(...d);
    document.getElementById("modal-stats").innerHTML =
      `<div><span>Total hari ini</span><b>${sum}</b></div>` +
      `<div><span>Rata-rata / jam</span><b>${(sum / d.length).toFixed(1)}</b></div>` +
      `<div><span>Puncak · ${HOURS[d.indexOf(peak)]}</span><b>${peak}</b></div>`;
    const r = trigger.getBoundingClientRect();
    box.style.transformOrigin = `${r.left + r.width / 2 - innerWidth / 2 + 490}px ${r.top + r.height / 2 - innerHeight / 2 + 260}px`;
    modal.classList.remove("closing");
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    drawBig();
    modal.querySelector(".modal-close").focus({ preventScroll: true });
  }
  function closeModal() {
    if (modal.hidden || modal.classList.contains("closing")) return;
    modal.classList.add("closing");
    tip.classList.remove("on");
    setTimeout(() => {
      modal.hidden = true; modal.classList.remove("closing");
      document.body.style.overflow = "";
      lastFocus && lastFocus.focus({ preventScroll: true });
    }, reduceMotion ? 0 : 200);
  }

  function drawBig() {
    const cfg = CHARTS[key], d = cfg.data;
    const r = big.getBoundingClientRect();
    const W = Math.max(r.width, 300), H = Math.max(r.height, 220);
    const m = { t: 20, r: 18, b: 32, l: 34 };
    big.setAttribute("viewBox", `0 0 ${W} ${H}`);
    big.replaceChildren();
    const lo = cfg.floor ?? 0, top = lo + Math.ceil((Math.max(...d) - lo) / 4) * 4;
    const x = (i) => m.l + (i / (d.length - 1)) * (W - m.l - m.r);
    const y = (v) => H - m.b - ((v - lo) / (top - lo)) * (H - m.t - m.b);

    const defs = el("defs"); defs.append(gradient("bg-" + key, cfg.color, 0.26, 0)); big.append(defs);
    for (let v = lo; v <= top; v += (top - lo) / 4) {
      const g = el("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: v === lo ? "#cfd8e6" : "#e6ecf4", "stroke-width": 1 });
      if (v !== lo) g.setAttribute("stroke-dasharray", "2 5");
      const t = el("text", { x: m.l - 10, y: y(v) + 4, "text-anchor": "end", fill: "#6a788f", "font-size": 12 });
      t.textContent = Math.round(v); big.append(g, t);
    }
    const every = W < 560 ? 2 : 1;
    d.forEach((_, i) => {
      if (i % every) return;
      const t = el("text", { x: x(i), y: H - 8, "text-anchor": "middle", fill: "#6a788f", "font-size": 12 });
      t.textContent = HOURS[i]; big.append(t);
    });

    const pts = d.map((v, i) => [x(i), y(v)]);
    const line = smoothPath(pts);
    const area = el("path", { d: `${line}L${x(d.length - 1)},${y(lo)}L${x(0)},${y(lo)}Z`, fill: `url(#bg-${key})` });
    if (animateBig && !reduceMotion) { area.style.opacity = 0; area.style.transition = "opacity .8s ease .3s"; requestAnimationFrame(() => (area.style.opacity = 1)); }
    const stroke = el("path", { d: line, fill: "none", stroke: cfg.color, "stroke-width": 3.5, "stroke-linecap": "round", "stroke-linejoin": "round" });
    big.append(area, stroke);
    if (animateBig) drawIn(stroke, 1100);
    animateBig = false;

    const pi = d.indexOf(Math.max(...d));
    big.append(el("circle", { cx: x(pi), cy: y(d[pi]), r: 5, fill: "#fff", stroke: cfg.color, "stroke-width": 2.5 }));

    const guide = el("line", { y1: m.t, y2: y(lo), stroke: "#9aa8bd", "stroke-dasharray": "3 4", opacity: 0, style: "transition:opacity .15s" });
    const halo = el("circle", { r: 12, fill: cfg.color, "fill-opacity": 0.18, opacity: 0, style: "transition:opacity .15s" });
    const dot = el("circle", { r: 6, fill: "#fff", stroke: cfg.color, "stroke-width": 3, opacity: 0, style: "transition:opacity .15s" });
    big.append(guide, halo, dot);

    const show = (e) => {
      const rect = big.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * W;
      const i = Math.min(d.length - 1, Math.max(0, Math.round(((px - m.l) / (W - m.l - m.r)) * (d.length - 1))));
      for (const n of [guide, halo, dot]) n.setAttribute("opacity", 1);
      guide.setAttribute("x1", x(i)); guide.setAttribute("x2", x(i));
      for (const n of [halo, dot]) { n.setAttribute("cx", x(i)); n.setAttribute("cy", y(d[i])); }
      tip.style.left = (x(i) / W) * rect.width + "px";
      tip.style.top = (y(d[i]) / H) * rect.height + "px";
      tip.innerHTML = `${HOURS[i]} &nbsp;<b>${d[i]}</b>`;
      tip.classList.add("on");
    };
    const hide = () => { for (const n of [guide, halo, dot]) n.setAttribute("opacity", 0); tip.classList.remove("on"); };
    big.onpointermove = show; big.onpointerdown = show; big.onpointerleave = hide;
  }

  modal.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
  new ResizeObserver(() => { if (!modal.hidden) drawBig(); }).observe(big);

  /* ---------- refresh tiap 15 dtk (data contoh) ---------- */
  setInterval(() => {
    for (const cfg of Object.values(CHARTS)) {
      const i = cfg.data.length - 1;
      cfg.data[i] = Math.max(0, cfg.data[i] + (Math.random() > 0.5 ? 1 : -1));
    }
    redrawSparks();
    if (!modal.hidden) drawBig();
  }, 15000);
});