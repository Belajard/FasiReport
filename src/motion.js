// Angka statistik menghitung naik saat pertama kali tampil. Aman untuk React: animasi dibatalkan
// bila teks diubah pihak lain, dan selalu berakhir pada nilai asli.
const SEL = ".tabular-nums.font-extrabold, .tabular-nums.font-black";
const done = new WeakSet();
const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function parse(text) {
  const m = /^(\D*?)(\d[\d.]*)(\D*)$/.exec(text.trim());
  if (!m) return null;
  const [, pre, num, post] = m;
  if (/^\d{1,3}(\.\d{3})+$/.test(num)) return { pre, post, value: Number(num.replace(/\./g, "")), fmt: (v) => Math.round(v).toLocaleString("id-ID") };
  if (/^\d+\.\d+$/.test(num)) {
    const dec = num.split(".")[1].length;
    return { pre, post, value: Number(num), fmt: (v) => v.toFixed(dec) };
  }
  if (/^\d+$/.test(num)) return { pre, post, value: Number(num), fmt: (v) => String(Math.round(v)) };
  return null;
}

function animate(el) {
  if (done.has(el) || el.childNodes.length !== 1 || el.firstChild.nodeType !== 3) return;
  done.add(el);
  const node = el.firstChild;
  const original = node.nodeValue;
  const p = parse(original);
  if (!p || p.value === 0) return;
  const start = performance.now();
  const dur = 900;
  let last = null;
  const tick = (now) => {
    if (last !== null && node.nodeValue !== last) return; // diubah pihak lain: berhenti
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    last = t >= 1 ? original : `${p.pre}${p.fmt(p.value * eased)}${p.post}`;
    node.nodeValue = last;
    if (t < 1) requestAnimationFrame(tick);
  };
  node.nodeValue = `${p.pre}${p.fmt(0)}${p.post}`;
  last = node.nodeValue;
  requestAnimationFrame(tick);
}

function initBurst() {
  document.addEventListener("pointerdown", (e) => {
    const t = e.target.closest?.("button, a, [role=button]");
    if (!t || t.disabled) return;
    const ring = document.createElement("span");
    ring.className = "fr-burst";
    ring.style.left = `${e.clientX}px`;
    ring.style.top = `${e.clientY}px`;
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 600);
  }, { passive: true });
}

let io;
function reveal(root) {
  if (!("IntersectionObserver" in window)) return;
  io = io || new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add("fr-in"); io.unobserve(en.target); }
  }, { threshold: 0.08 });
  const page = root.closest?.(".anim-page") || (root.matches?.(".anim-page") ? root : null) || root.querySelector?.(".anim-page");
  if (!page) return;
  page.querySelectorAll('[class*="rounded-2xl"],[class*="rounded-3xl"]').forEach((el) => {
    if (el.parentElement === page || el.dataset.frSeen || el.closest("[class*='fixed']")) return;
    el.dataset.frSeen = "1";
    if (el.getBoundingClientRect().top > innerHeight + 20) { el.classList.add("fr-hide"); io.observe(el); }
  });
}

export function initMotion() {
  if (typeof document === "undefined" || reduced()) return;
  initBurst();
  const scan = (root) => {
    if (root.nodeType !== 1) return;
    if (root.matches?.(SEL)) animate(root);
    root.querySelectorAll?.(SEL).forEach(animate);
    requestAnimationFrame(() => reveal(root));
  };
  new MutationObserver((muts) => {
    for (const m of muts) m.addedNodes.forEach(scan);
  }).observe(document.body, { childList: true, subtree: true });
  scan(document.body);
}
