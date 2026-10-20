document.addEventListener("DOMContentLoaded", () => {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pad = (n) => String(n).padStart(2, "0");
  const hm = (ms) => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  /* ---------- data dummy ----------
     off  = menit sejak pasien terdaftar saat halaman dibuka
     ward = menit dari waktu terdaftar sampai registrasi bangsal (null = belum)
     Waktu terdaftar dihitung dari jam sekarang, sehingga angka selalu terlihat realistis. */
  const base = Math.floor(Date.now() / 60000) * 60000;
  const PATIENTS = [
    { id: 1, name: "S*****I",    rm: "01320987", doctor: "dr. Rahmat, Sp.B",              off: 216, disp: "Rawat Inap", ward: 84 },
    { id: 2, name: "R*****A",    rm: "01321221", doctor: "dr. Hendri, Sp.OG",             off: 193, disp: "-",          ward: null },
    { id: 3, name: "I********A", rm: "01321305", doctor: "dr. Firman, Sp.PD",             off: 167, disp: "Rawat Inap", ward: 85, accepted: true },
    { id: 4, name: "M*****N",    rm: "01321377", doctor: "dr. Firman, Sp.PD",             off: 131, disp: "Rawat Inap", ward: 149 },
    { id: 5, name: "D*****Y",    rm: "01321399", doctor: "dr. Rahmat, Sp.B",              off: 76,  disp: "Pulang",     ward: null },
    { id: 6, name: "A******H",   rm: "01321410", doctor: "dr. Lia Amelia, Sp.A",          off: 49,  disp: "Observasi",  ward: null },
    { id: 7, name: "N*******O",  rm: "01321392", doctor: "dr. Septia Harma Putri, Sp.PD", off: 15,  disp: "-",          ward: null },
    { id: 8, name: "Z*****K",    rm: "01321415", doctor: "dr. Septia Harma Putri, Sp.PD", off: 9,   disp: "-",          ward: null },
  ].map((p) => ({
    ...p,
    registered: base - p.off * 60000,
    wardAt: p.ward == null ? null : base - p.off * 60000 + p.ward * 60000,
  }));

  /* ---------- perhitungan ---------- */
  const respMin = (p, now) => Math.max(0, Math.floor((now - p.registered) / 60000));
  const statusOf = (p, now) => {
    if (p.accepted) return "accepted";
    const m = respMin(p, now);
    return m >= 180 ? "delayed" : m >= 120 ? "warning" : "normal";
  };
  const LABEL = { normal: "NORMAL", warning: "WARNING", delayed: "DELAYED", accepted: "ACCEPTED" };
  const fmtResp = (m) => `${Math.floor(m / 60)} Jam ${pad(m % 60)} Menit`;
  const fmtOver = (m) => (m >= 60 ? `${Math.floor(m / 60)} Jam ${pad(m % 60)} Menit` : `${m} Menit`);
  const LIMIT = 180;
  const group = (s) => (s === "accepted" ? "normal" : s);

  /* ---------- state ---------- */
  const state = { filter: "all", sort: "registered", dir: 1 };
  const $ = (s) => document.querySelector(s);
  const tbody = $("#rows"), empty = $("#empty"), countEl = $("#count");
  let now = Date.now();
  let shownIds = "";

  /* ---------- clock ---------- */
  const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  function clock() {
    const d = new Date(now);
    $("#time").textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    $("#date").textContent = `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  /* ---------- view ---------- */
  function visible() {
    const list = PATIENTS.filter((p) => {
      const s = group(statusOf(p, now));
      if (state.filter !== "all" && s !== state.filter) return false;
      return true;
    });
    const key = { name: (p) => p.name, doctor: (p) => p.doctor, registered: (p) => p.registered, response: (p) => -p.registered }[state.sort];
    return list.sort((a, b) => (key(a) > key(b) ? 1 : key(a) < key(b) ? -1 : 0) * state.dir);
  }

  function rowHTML(p, k) {
    return `<tr data-id="${p.id}" class="in" style="--k:${k}">
      <td><span class="p-name">${p.name}</span><span class="p-rm">${p.rm}</span></td>
      <td class="doc">${p.doctor}</td>
      <td class="mono">${hm(p.registered)}</td>
      <td><div class="resp"><div class="resp-top"><b></b><svg class="warn-ic" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l10 18H2L12 3z"/><path d="M12 10v4M12 17.5v.01"/></svg></div><div class="bar"><i></i></div></div></td>
      <td>${p.disp}</td>
      <td class="mono ${p.wardAt ? "" : "dim"}">${p.wardAt ? hm(p.wardAt) : "--:--"}</td>
      <td class="ta-r"><span class="pill"></span></td>
    </tr>`;
  }

  /* update bagian yang berubah tiap detik, tanpa membangun ulang baris */
  function fill() {
    tbody.querySelectorAll("tr").forEach((tr) => {
      const p = PATIENTS.find((x) => x.id === +tr.dataset.id);
      const m = respMin(p, now), s = statusOf(p, now);
      tr.className = `s-${s}` + (tr.classList.contains("in") ? " in" : "") + "";
      tr.querySelector(".resp b").textContent = fmtResp(m);
      tr.querySelector(".resp").title = s === "delayed" ? `Melewati batas 3 jam (+${fmtOver(m - LIMIT)})` : "";
      tr.querySelector(".bar i").style.width = Math.min(100, (m / 180) * 100) + "%";
      const pill = tr.querySelector(".pill");
      pill.textContent = LABEL[s];
      pill.className = "pill " + s;
    });
  }

  function render() {
    const list = visible();
    tbody.innerHTML = list.map(rowHTML).join("");
    shownIds = list.map((p) => p.id).join();
    if (reduceMotion) tbody.querySelectorAll("tr").forEach((tr) => tr.classList.remove("in"));
    fill();
    empty.hidden = list.length > 0;
    countEl.textContent = `Menampilkan ${list.length} dari ${PATIENTS.length} pasien`;
    document.querySelectorAll("th button").forEach((b) => {
      const on = b.dataset.sort === state.sort;
      b.classList.toggle("on", on);
      b.classList.toggle("desc", on && state.dir === -1);
    });
    document.querySelectorAll(".stat").forEach((b) => b.classList.toggle("active", b.dataset.filter === state.filter));
  }

  function counts() {
    const c = { all: PATIENTS.length, normal: 0, warning: 0, delayed: 0 };
    PATIENTS.forEach((p) => c[group(statusOf(p, now))]++);
    return c;
  }
  const shown = {};
  function paintCounts(animate) {
    const c = counts();
    document.querySelectorAll("[data-key]").forEach((n) => {
      const k = n.dataset.key, to = c[k], from = shown[k] ?? 0;
      shown[k] = to;
      if (!animate || reduceMotion || from === to) { n.textContent = to; return; }
      const t0 = performance.now(), dur = 800;
      const step = (t) => {
        const e = 1 - Math.pow(1 - Math.min(1, (t - t0) / dur), 3);
        n.textContent = Math.round(from + (to - from) * e);
        if (e < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /* ---------- peringatan > 3 jam ---------- */
  const toasts = $("#toasts"), BASE_TITLE = document.title;
  let known = null;
  function toast(text) {
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = "<i></i><span></span>";
    t.querySelector("span").textContent = text;
    toasts.append(t);
    setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 300); }, 6000);
  }
  function paintAlert() {
    const late = PATIENTS.filter((p) => statusOf(p, now) === "delayed");
    document.title = (late.length ? `(${late.length}) ` : "") + BASE_TITLE;
    document.querySelector(".s-red").classList.toggle("alert-on", late.length > 0);
    const ids = new Set(late.map((p) => p.id));
    if (known) late.filter((p) => !known.has(p.id)).forEach((p) => toast(`${p.name} melewati batas respon 3 jam`));
    known = ids;
  }

  /* ---------- events ---------- */
  document.querySelectorAll(".stat").forEach((b) =>
    b.addEventListener("click", () => { state.filter = state.filter === b.dataset.filter ? "all" : b.dataset.filter; render(); }));


  document.querySelectorAll("th button").forEach((b) =>
    b.addEventListener("click", () => {
      const k = b.dataset.sort;
      if (state.sort === k) state.dir *= -1; else { state.sort = k; state.dir = 1; }
      render();
    }));

  $("#reset").addEventListener("click", () => { state.filter = "all"; render(); });

  $("#theme").addEventListener("click", () => {
    const root = document.documentElement;
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  });

  /* ---------- tick tiap detik ---------- */
  setInterval(() => {
    now = Date.now();
    clock();
    const list = visible().map((p) => p.id).join();
    if (list !== shownIds) render(); else fill();
    paintCounts(false);
    paintAlert();
  }, 1000);

  clock();
  render();
  paintCounts(true);
  paintAlert();
});