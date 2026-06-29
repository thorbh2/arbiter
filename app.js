import { makeReader, write, connectWallet, activeAccount, balanceOf, short, toGen, GEN, fmtErr }
  from "../shared/genlayer-lite.js";

const CONTRACT = "0x7353435cE8B7fE0eCdBd59a048e1AC6234532154";
const { read } = makeReader(CONTRACT);
const OPENED = 0, JOINED = 1, RULED = 2;
const SIDE_NONE = 0, SIDE_CLAIMANT = 1, SIDE_RESPONDENT = 2;
const STLABEL = ["Open", "Joined", "Ruled"];
const CBADGE = ["cb-open", "cb-joined", "cb-ruled"];
let account = null, disputes = [];
const $ = (id) => document.getElementById(id);
const esc = (s) => (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const isZero = (a) => !a || /^0x0+$/.test(a);

$("contractLink").textContent = "Contract " + short(CONTRACT) + " ↗";

function toast(msg, kind = "", title = "arbiter") {
  const el = document.createElement("div"); el.className = "toast " + kind;
  el.innerHTML = `<span class="tt">${title}</span>`; el.appendChild(document.createTextNode(msg));
  $("log").appendChild(el); setTimeout(() => el.remove(), kind === "err" ? 15000 : 5000);
}

async function refreshWallet() {
  account = await activeAccount();
  const slot = $("walletslot");
  if (account) { let bal = 0n; try { bal = await balanceOf(account); } catch (_) {} slot.innerHTML = `<span class="mono" style="font-size:13px;color:var(--grey)">${short(account)} · ${toGen(bal)} GEN</span>`; }
  else { slot.innerHTML = `<button class="btn ghost sm" id="connectBtn">Connect</button>`; $("connectBtn").onclick = doConnect; }
}
async function doConnect() { try { account = await connectWallet(); toast("Connected on studionet.", "ok"); await refreshWallet(); } catch (e) { toast(fmtErr(e), "err"); } }
async function ensureWallet() { if (!account) account = await connectWallet(); await refreshWallet(); }

async function load() {
  try {
    const count = Number(await read("get_dispute_count"));
    const out = [];
    for (let i = 0; i < count; i++) out.push({ id: i, ...(await read("get_dispute", [i])) });
    disputes = out; renderCases();
    $("stTotal").textContent = count;
    $("docketCount").textContent = count + (count === 1 ? " dispute" : " disputes");
    $("frameStat").textContent = count + (count === 1 ? " dispute on the docket" : " disputes on the docket");
    $("stRuled").textContent = out.filter((d) => Number(d.status) === RULED).length;
    let locked = 0n;
    out.forEach((d) => { const st = Number(d.status); const s = BigInt(d.stake); if (st === OPENED) locked += s; else if (st === JOINED) locked += s * 2n; });
    $("stLocked").textContent = toGen(locked.toString());
  } catch (e) { $("caseList").innerHTML = `<div class="c-empty">Could not reach the chain. ${fmtErr(e)}</div>`; }
}

function renderCases() {
  const el = $("caseList");
  if (!disputes.length) { el.innerHTML = `<div class="c-empty">No disputes yet. Open the first case.</div>`; return; }
  el.innerHTML = "";
  [...disputes].reverse().forEach((d) => {
    const st = Number(d.status);
    const who = isZero(d.respondent) ? "awaiting respondent" : `${short(d.claimant)} v ${short(d.respondent)}`;
    const cell = document.createElement("div"); cell.className = "case";
    cell.innerHTML = `<div class="case-top"><span class="cbadge ${CBADGE[st]}">${STLABEL[st]}</span><span class="case-stake">${toGen(d.stake)} GEN</span></div>
      <div class="case-topic">${esc(d.topic)}</div>
      <div class="case-parties">${who}</div>`;
    cell.onclick = () => openDetail(d.id);
    el.appendChild(cell);
  });
}

function openDrawer() { $("scrim").classList.add("on"); $("drawer").classList.add("on"); }
function closeDrawer() { $("scrim").classList.remove("on"); $("drawer").classList.remove("on"); }

function openNew() {
  $("drawerTitle").textContent = "Open a dispute";
  $("drawerBody").innerHTML = `
    <p>State the dispute, make your case, cite public evidence, and stake GEN. A respondent must match your stake to join.</p>
    <label>Topic</label><input id="nTopic" maxlength="90" placeholder="Refund owed for undelivered work" />
    <label>Your case</label><textarea id="nCase" placeholder="Explain your side clearly."></textarea>
    <label>Evidence URL</label><input id="nEvidence" placeholder="https://… (recommended)" />
    <label>Your stake (GEN)</label><input id="nStake" type="number" min="0" step="0.1" value="2" />
    <button class="btn solid block" id="createBtn">Open &amp; stake →</button>`;
  $("createBtn").onclick = doCreate; openDrawer();
}

function openDetail(id) {
  const d = disputes.find((x) => x.id === id); if (!d) return;
  const st = Number(d.status), ruling = Number(d.ruling);
  $("drawerTitle").textContent = "Dispute #" + id;
  let verdict = "";
  if (st === RULED) {
    const w = ruling === SIDE_CLAIMANT ? "Claimant wins" : ruling === SIDE_RESPONDENT ? "Respondent wins" : "Tie — both refunded";
    verdict = `<div class="verdict-box"><b>${w}.</b> ${d.rationale ? esc(d.rationale) : "The validator set has ruled."}</div>`;
  }
  const claimantWin = st === RULED && ruling === SIDE_CLAIMANT;
  const respWin = st === RULED && ruling === SIDE_RESPONDENT;
  const sides = `
    <div class="side-card ${claimantWin ? "win" : ""}"><div class="side-h"><span>Claimant</span><span class="mono">${short(d.claimant)}</span></div><p>${esc(d.claimant_case)}</p>${d.claimant_evidence ? `<a href="${esc(d.claimant_evidence)}" target="_blank" rel="noopener" class="mono" style="font-size:11px">${esc(d.claimant_evidence)} ↗</a>` : ""}</div>
    ${isZero(d.respondent)
      ? `<div class="side-card"><div class="side-h"><span>Respondent</span><span>open seat</span></div><p style="color:var(--faint)">No respondent has joined yet.</p></div>`
      : `<div class="side-card ${respWin ? "win" : ""}"><div class="side-h"><span>Respondent</span><span class="mono">${short(d.respondent)}</span></div><p>${esc(d.respondent_case)}</p>${d.respondent_evidence ? `<a href="${esc(d.respondent_evidence)}" target="_blank" rel="noopener" class="mono" style="font-size:11px">${esc(d.respondent_evidence)} ↗</a>` : ""}</div>`}`;
  let actions = "";
  if (st === OPENED) actions = `<label>Your case (respondent)</label><textarea id="jCase" placeholder="State your side."></textarea><label>Evidence URL</label><input id="jEvidence" placeholder="https://…" /><button class="btn solid block" id="joinBtn">Join &amp; match ${toGen(d.stake)} GEN</button>`;
  else if (st === JOINED) actions = `<button class="btn solid block" id="ruleBtn">Convene the arbiter</button><div class="hint" style="text-align:center;margin-top:8px">Validators read both cases and the evidence. Calls a real LLM.</div>`;
  $("drawerBody").innerHTML = `
    <div class="d-topic">${esc(d.topic)}</div>
    <div class="kv"><span class="k">STAKE / SIDE</span><span class="v mono">${toGen(d.stake)} GEN · pot ${toGen((BigInt(d.stake) * 2n).toString())}</span></div>
    ${verdict}
    ${sides}
    <div style="margin-top:16px">${actions}</div>`;
  openDrawer();
  if (st === OPENED) $("joinBtn").onclick = () => doJoin(id, d.stake);
  else if (st === JOINED) $("ruleBtn").onclick = () => doRule(id);
}

async function doCreate() {
  const topic = $("nTopic").value.trim(), myCase = $("nCase").value.trim(), ev = $("nEvidence").value.trim(), stake = parseFloat($("nStake").value);
  if (!topic) return toast("Give the dispute a topic.", "err");
  if (!myCase) return toast("State your case.", "err");
  if (!(stake > 0)) return toast("Stake must be above zero.", "err");
  const btn = $("createBtn"); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> opening';
  try { await ensureWallet(); await write(CONTRACT, "open_dispute", [topic, myCase, ev], GEN(stake)); toast("Dispute opened.", "ok"); closeDrawer(); await load(); }
  catch (e) { toast(fmtErr(e), "err"); btn.disabled = false; btn.innerHTML = "Open & stake →"; }
}
async function doJoin(id, stakeWei) {
  const myCase = $("jCase").value.trim(), ev = $("jEvidence").value.trim();
  if (!myCase) return toast("State your case.", "err");
  const btn = $("joinBtn"); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> joining';
  try { await ensureWallet(); await write(CONTRACT, "join_dispute", [id, myCase, ev], BigInt(stakeWei)); toast("Joined and matched the stake.", "ok"); closeDrawer(); await load(); }
  catch (e) { toast(fmtErr(e), "err"); btn.disabled = false; btn.textContent = "Join & match stake"; }
}
async function doRule(id) {
  if (!confirm("Convene the arbiter? Validators read both cases and the cited evidence and rule. Calls a real LLM.")) return;
  const btn = $("ruleBtn"); btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> arbiter deliberating';
  try { await ensureWallet(); toast("Validators reading both cases…", "", "rule"); await write(CONTRACT, "rule", [id]); toast("Ruled on-chain.", "ok"); closeDrawer(); await load(); }
  catch (e) { toast(fmtErr(e), "err"); if (btn) { btn.disabled = false; btn.textContent = "Convene the arbiter"; } }
}

$("heroPostBtn").onclick = openNew;
$("ctaPostBtn").onclick = openNew;
$("navPostBtn").onclick = openNew;
$("refreshBtn").onclick = load;
$("closeDrawer").onclick = closeDrawer;
$("scrim").onclick = closeDrawer;
const _cb = $("connectBtn"); if (_cb) _cb.onclick = doConnect;
if (window.ethereum) window.ethereum.on?.("accountsChanged", refreshWallet);

refreshWallet();
load();

// ====== Monochrome wireframe balance scale (Three.js, Vercel-geometric) ======
(function scaleScene() {
  const canvas = $("scaleCanvas"); if (!canvas || !window.THREE) return;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0.5, 15);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight || 340; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }

  const line = (c = 0x000000, o = 1) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o });
  const edges = (geo, c, o) => new THREE.LineSegments(new THREE.EdgesGeometry(geo), line(c, o));
  const scale = new THREE.Group(); scene.add(scale);

  // base, column
  scale.add((() => { const m = edges(new THREE.CylinderGeometry(1.4, 1.8, 0.5, 6), 0x000000, .85); m.position.y = -4; return m; })());
  scale.add((() => { const m = edges(new THREE.BoxGeometry(0.3, 7, 0.3), 0x000000, .85); m.position.y = -0.7; return m; })());
  scale.add((() => { const m = edges(new THREE.IcosahedronGeometry(0.5, 0), 0x000000, .9); m.position.y = 3; return m; })());

  // beam + pans
  const beamGrp = new THREE.Group(); beamGrp.position.y = 2.8; scale.add(beamGrp);
  beamGrp.add(edges(new THREE.BoxGeometry(8, 0.16, 0.16), 0x000000, .9));
  function pan(x) {
    const g = new THREE.Group(); g.position.x = x;
    for (let i = -1; i <= 1; i += 2) { const w = edges(new THREE.CylinderGeometry(0.015, 0.015, 2.2, 3), 0x000000, .5); w.position.set(i * 0.7, -1.1, 0); w.rotation.z = i * 0.32; g.add(w); }
    const p = edges(new THREE.CylinderGeometry(1.05, 0.7, 0.22, 16, 1, true), 0x000000, .85); p.position.y = -2.2; g.add(p);
    beamGrp.add(g); return g;
  }
  const panL = pan(-3.5), panR = pan(3.5);

  // faint dotted field behind (geometric)
  const N = 90, pp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pp[i*3]=(Math.random()-.5)*30; pp[i*3+1]=(Math.random()-.5)*16; pp[i*3+2]=-6-Math.random()*6; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pp, 3));
  scene.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x000000, size: .045, transparent: true, opacity: .25 })));

  resize(); addEventListener("resize", resize);
  let t = 0, running = true;
  const vis = new IntersectionObserver((es) => { running = es[0].isIntersecting; if (running) loop(); }, { threshold: 0 });
  vis.observe(canvas);
  function loop() {
    if (!running) return;
    requestAnimationFrame(loop); t += 0.01;
    const tilt = Math.sin(t * 0.9) * 0.14;
    beamGrp.rotation.z = tilt; panL.rotation.z = -tilt; panR.rotation.z = -tilt;
    scale.rotation.y = Math.sin(t * 0.35) * 0.5;
    renderer.render(scene, camera);
  }
  loop();
})();
