import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutGrid, ShieldCheck, FileText, Stamp, Lightbulb, Clock, Layers,
  Plus, X, User, Building2, Calendar, Hash, MapPin, Scale, Sparkles,
  AlertTriangle, LogOut, ArrowRight, BookOpen, Newspaper, ExternalLink
} from "lucide-react";
import { supabase } from "./supabaseClient";

/* ---------- helpers ---------- */
const today = new Date();
const daysTo = (s) => { if (!s) return null; const t = new Date(s + "T00:00:00"); return Math.round((t - today) / 86400000); };
const clean = (a) => {
  const o = { ...a };
  ["score_protect", "score_value"].forEach((k) => { o[k] = (o[k] === "" || o[k] == null) ? null : Number(o[k]); });
  ["disclosure_date", "key_deadline", "benchmark_verdict", "deadline_type", "decision", "disclosed_publicly", "registration_no", "jurisdiction", "owner", "creator", "notes"].forEach((k) => { if (o[k] === "") o[k] = null; });
  return o;
};
const normJur = (j) => { if (!j) return "—"; return String(j).split("—")[0].split("(")[0].trim() || "—"; };

const VEHICLES = {
  patent:         { label: "Patent",       chip: "bg-[#44546A]", border: "border-[#44546A]", tint: "bg-[#44546A]/10", ring: "border-[#44546A]/30", text: "text-[#44546A]", icon: Lightbulb },
  copyright:      { label: "Copyright",    chip: "bg-[#7F7F7F]", border: "border-[#7F7F7F]", tint: "bg-[#7F7F7F]/12", ring: "border-[#7F7F7F]/30", text: "text-[#5f5f5f]", icon: FileText },
  trademark:      { label: "Trademark",    chip: "bg-[#941100]", border: "border-[#941100]", tint: "bg-[#941100]/8",  ring: "border-[#941100]/30", text: "text-[#941100]", icon: Stamp },
  "trade-secret": { label: "Trade secret", chip: "bg-[#374454]", border: "border-[#374454]", tint: "bg-[#374454]/10", ring: "border-[#374454]/30", text: "text-[#374454]", icon: ShieldCheck },
  mixed:          { label: "Mixed",        chip: "bg-[#7F7F7F]", border: "border-[#7F7F7F]", tint: "bg-[#7F7F7F]/10", ring: "border-[#7F7F7F]/25", text: "text-[#5f5f5f]", icon: Building2 },
};
const STAGES = [
  { key: "01_disclosure", short: "Disclosure" }, { key: "02_classification", short: "Classification" },
  { key: "03_universe", short: "Universe" }, { key: "04_benchmark", short: "Benchmark" },
  { key: "05_enhancement", short: "Enhancement" }, { key: "06_scoring", short: "Scoring" },
  { key: "07_filing", short: "Filing" }, { key: "closed", short: "Registered" },
];
const sIdx = (k) => { const i = STAGES.findIndex((s) => s.key === k); return i < 0 ? 0 : i; };
const statusOf = (a) => {
  const n = daysTo(a.key_deadline);
  if (n !== null && n < 0) return { label: "Expired", cls: "bg-[#941100]/12 text-[#941100]" };
  if (a.stage === "closed") return { label: "Registered / granted", cls: "bg-[#44546A]/12 text-[#44546A]" };
  if (a.stage === "07_filing") return { label: "Filed / pending", cls: "bg-[#7F7F7F]/15 text-[#5f5f5f]" };
  return { label: "In audit", cls: "bg-[#7F7F7F]/10 text-[#5f5f5f]" };
};

const PRODUCTS = [
  { name: "SSI Index", tag: "the foundation", border: "border-t-[#44546A]", text: "text-[#44546A]", tint: "bg-[#44546A]/5", desc: "Scores the health of every electrical substation. Open grid-resilience framework (Monte Carlo). Base work of the entire copyright family." },
  { name: "SSI-ENN", tag: "the analytical engine", border: "border-t-[#7F7F7F]", text: "text-[#7F7F7F]", tint: "bg-[#7F7F7F]/8", desc: "Neural network that values how worthwhile it is to install a BESS at each substation. Layer 1 documentation, code and audits." },
  { name: "KINETIC SHIELD™", tag: "the commercial product", border: "border-t-[#941100]", text: "text-[#941100]", tint: "bg-[#941100]/5", desc: "Sovereign edge 'neocloud' · pairs HPC with the power grid · leased to investors. The device is protected by the PCT application; its control/coordination by the G5 patent family." },
];
const OWNERSHIP_NOTE = "Current structure: all IP is held by Altinium Invest SRL, except the 21 G5 provisional patents, which are held by Ikenga.eu SL. Planned: transfer the IP held by Altinium Invest SRL to Ikenga.eu SL.";

const flagCls = (f) => {
  const x = (f || "").toLowerCase();
  if (x.includes("urgent")) return "bg-[#941100]/12 text-[#941100]";
  if (x.includes("register")) return "bg-[#44546A]/12 text-[#44546A]";
  if (x.includes("pending") || x.includes("filed")) return "bg-[#7F7F7F]/15 text-[#5f5f5f]";
  return "bg-[#7F7F7F]/10 text-[#5f5f5f]";
};
const FAMILIES = [
  { type: "trademark", title: "Trademarks · 2", flag: "registered",
    meta: "Owner: Altinium Invest SRL · classes 9 & 42 · rep. Arochi & Lindner",
    items: [
      "ikenga — registered · EUIPO 019222233 (granted 22/01/2026, renews 2035), extended internationally via Madrid (ref. H26/001)",
      "KINETIC SHIELD — registered · EUIPO 019222238 (granted 22/01/2026, renews 2035), extended internationally via Madrid (ref. H26/002)",
    ],
    note: "Further marks in progress (GROW PROTECT SUSTAIN IN THE 4IR, Terranode) and the Land Tool app name — to be confirmed." },
  { type: "patent", title: "Utility model · 1", flag: "URGENT",
    meta: "OEPM · U202531782 · rep. Marina Gómez Calvo (Arochi & Lindner)",
    items: [
      "Distributed multifunctional device (electrical + data services)",
      "2nd official action (3 Jun) · BOPI 09/06/2026 · response deadline ~09/08/2026 (extendable by 2 months)",
      "OEPM objects that several claims are process/software-type and suggests considering conversion to an invention patent.",
    ] },
  { type: "patent", title: "PCT international application · 1", flag: "filed",
    meta: "Kinetic Shield device · WIPO (PCT) · owner Altinium Invest SRL",
    items: [
      "'Distributed Multifunctional Device and Method...' — 27 claims",
      "Claims Paris-Convention priority to Spanish utility model U202531782 (15/09/2025)",
      "National-phase entries before the 30-month deadline (15/03/2028) · ref. PCT/IB2026/053119",
    ] },
  { type: "copyright", title: "Copyright SIAE (Italy) · 3", flag: "registered",
    meta: "Owner: Altinium Invest SRL · author: Cédric Bérard · renews 2031",
    items: [
      "SSI Index 4.0 — Source Code · Rep. 2026/00869",
      "SSI Index 4.0 — Technical Reference · Rep. 2026/00867",
      "SSI Index 4.0 — Competitive Landscape · Rep. 2026/00868",
      "Deposit of unpublished work (proof of existence and priority).",
    ] },
  { type: "copyright", title: "Copyright USCO (United States) · 35", flag: "pending",
    meta: "Owner: Altinium Invest SRL · all in 'Open' status (pending registration)",
    items: [
      "SSI Index v4.0 / v4.0.2 family — 34 cases · author: Cédric Bérard",
      "USA, Canada, Australia, Japan, Chile, Spain, UK, Germany, Switzerland, Austria, France, Poland, Finland, Norway, Sweden, Denmark, Mexico + a 7-country combined filing (Korea, Colombia, Israel, Hungary, Slovakia, Costa Rica, Iceland)",
      "Land & Energy Network Analyzer v33 — 1 case · standalone work (BESS land-suitability DSP)",
      "Authors: Gianluca Raucci, Lorenzo Rossi & Dario Cosentino · 'work made for hire'.",
    ] },
  { type: "patent", title: "USPTO provisional patents · G5 family · 21", flag: "pending",
    meta: "Owner: Ikenga.eu SL · inventor: Cédric Bérard · small entity · pro-se · 12-month priority (expires May 2027)",
    items: [
      "Wave 0 (5): G5.1 master arbitration · G5.2 IEC 61850-90-7 · G5.3 HMAC/anti-replay · G5.4 Lyapunov/ISS · G5.5 membership changes",
      "Wave 1 (5): G5.6 manufacturing platform · G5.7 multi-fractal-edge · G5.8 cross-substrate · G5.9 multi-EMS · G5.10 HAL portability",
      "Wave 2 (1): G5.11 fractal cross-scale MPC",
      "Wave 3 (4): G5.12 adjoint QP solver · G5.13 FNV-1a hashing · G5.14 hierarchical reference · G5.15 grid+compute MPC cost",
      "Wave 4 (2): G5.16 dual-loop edge inverter · G5.17 BESS + compute payload",
      "Wave 5 (4): G5.18 SDFT demodulator · G5.19 Bayesian SCR · G5.20 Mahalanobis OOD detector · G5.21 dwell-counter supervisor",
    ],
    note: "USPTO application numbers still to be added for G5.2, G5.6 and G5.7 (filing receipt not yet on file)." },
];

const NAV = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "portfolio", label: "Portfolio", icon: BookOpen },
  { key: "assets", label: "Assets", icon: Layers },
  { key: "reports", label: "Reports", icon: Newspaper },
  { key: "consult", label: "AI Consultation", icon: Sparkles },
];
const TITLES = { overview: "The ecosystem · IP portfolio", portfolio: "Portfolio · detail by family", assets: "Assets · full register", reports: "Reports · supporting documents", consult: "AI Consultation — Mode A" };
const DTYPES = ["", "us-grace-bar", "priority-12mo", "foreign-filing-30mo", "office-action-response", "copyright-timely-reg", "maintenance", "renewal", "other"];
const ROUTE_FILTERS = [["all", "All"], ["patent", "Patents"], ["copyright", "Copyright"], ["trademark", "Trademarks"], ["trade-secret", "Trade secrets"]];

/* ---------- small components ---------- */
function Kpi({ label, value, accent, valueCls, dashed, tint }) {
  return (
    <div className={`${tint || "bg-white"} rounded-xl border ${dashed ? "border-dashed border-slate-300" : "border-slate-200"} border-t-4 ${accent} px-5 py-4 shadow-sm`}>
      <div className={`text-3xl font-bold ${valueCls}`}>{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mt-1">{label}</div>
    </div>
  );
}
function Chips({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {ROUTE_FILTERS.map(([k, l]) => (
        <button key={k} onClick={() => onChange(k)}
          className={`text-xs font-semibold px-3 py-1 rounded-full border ${value === k ? "bg-[#44546A] text-white border-[#44546A]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>{l}</button>
      ))}
    </div>
  );
}
function AssetCard({ a, onClick }) {
  const v = VEHICLES[a.type] || VEHICLES.mixed; const Icon = v.icon; const s = statusOf(a); const n = daysTo(a.key_deadline);
  return (
    <button onClick={onClick} className={`text-left bg-white rounded-xl border border-slate-200 border-l-4 ${v.border} p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition w-full`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2"><span className={`${v.chip} text-white rounded-md p-1.5 inline-flex`}><Icon size={15} /></span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span></div>
        <span className="text-xs text-slate-400 font-mono">{a.id}</span>
      </div>
      <div className="font-semibold text-slate-800 mt-2 leading-snug text-sm">{a.title}</div>
      <div className="text-xs text-slate-500 mt-1">{v.label} · {a.jurisdiction || "—"}</div>
      <div className="mt-3 pt-2 border-t border-slate-100 text-xs flex items-center justify-between">
        <span className="text-slate-400 font-mono truncate">{a.registration_no || "no number"}</span>
        {a.key_deadline ? <span className={n < 0 ? "text-[#941100] font-semibold" : n <= 90 ? "text-[#941100] font-semibold" : "text-[#7F7F7F]"}>{n < 0 ? `${-n}d overdue` : `${n}d`}</span> : <span className="text-slate-300">no deadline</span>}
      </div>
    </button>
  );
}
function Detail({ a, onClose }) {
  if (!a) return null;
  const v = VEHICLES[a.type] || VEHICLES.mixed; const Icon = v.icon; const s = statusOf(a); const n = daysTo(a.key_deadline);
  const Row = ({ icon: I, k, val }) => (
    <div className="flex items-start gap-3 py-2 border-b border-slate-100"><I size={15} className="text-slate-400 mt-0.5 shrink-0" />
      <div className="text-xs text-slate-500 w-40 shrink-0">{k}</div><div className="text-sm text-slate-800 font-medium break-words">{val || "—"}</div></div>
  );
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900 opacity-40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-xl overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2"><span className={`${v.chip} text-white rounded-md p-1.5 inline-flex`}><Icon size={16} /></span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span></div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        <div className="px-6 py-5">
          <div className="text-xs text-slate-400 font-mono">{a.id}</div>
          <h2 className="text-lg font-bold text-slate-800 mt-1 leading-snug">{a.title}</h2>
          <div className="text-sm text-slate-500 mt-1">{v.label}</div>
          <div className="mt-5">
            <Row icon={MapPin} k="Office / jurisdiction" val={a.jurisdiction} />
            <Row icon={Hash} k="Registration / application no." val={a.registration_no} />
            <Row icon={Building2} k="Owner" val={a.owner} />
            <Row icon={User} k="Inventor / author" val={a.creator} />
            <Row icon={Calendar} k="Stage" val={STAGES[sIdx(a.stage)].short} />
            <Row icon={Clock} k="Next deadline" val={a.key_deadline ? `${a.key_deadline} · ${a.deadline_type || "—"}${n !== null ? ` (${n < 0 ? "expired" : n + " d"})` : ""}` : "no deadline"} />
          </div>
          {a.notes ? <div className="mt-5 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700">{a.notes}</div> : null}
          <div className="mt-5 text-xs text-slate-400">General information, not legal advice.</div>
        </div>
      </div>
    </div>
  );
}
function NewAssetModal({ onClose, onAdd }) {
  const blank = { title: "", type: "patent", owner: "", jurisdiction: "", registration_no: "", key_deadline: "", deadline_type: "", stage: "07_filing", notes: "" };
  const [f, setF] = useState(blank);
  const set = (k, val) => setF((p) => ({ ...p, [k]: val }));
  const Field = ({ label, children }) => (<label className="block"><span className="text-xs font-semibold text-slate-500">{label}</span>{children}</label>);
  const inputCls = "mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#44546A]";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900 opacity-40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-full overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200"><h2 className="font-bold text-slate-800">New asset</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button></div>
        <div className="px-6 py-5 space-y-3">
          <Field label="Title"><input className={inputCls} value={f.title} onChange={(e) => set("title", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type"><select className={inputCls} value={f.type} onChange={(e) => set("type", e.target.value)}>{Object.keys(VEHICLES).map((k) => <option key={k} value={k}>{VEHICLES[k].label}</option>)}</select></Field>
            <Field label="Stage"><select className={inputCls} value={f.stage} onChange={(e) => set("stage", e.target.value)}>{STAGES.map((s) => <option key={s.key} value={s.key}>{s.short}</option>)}</select></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Owner"><input className={inputCls} value={f.owner} onChange={(e) => set("owner", e.target.value)} /></Field>
            <Field label="Office / jurisdiction"><input className={inputCls} value={f.jurisdiction} onChange={(e) => set("jurisdiction", e.target.value)} /></Field>
          </div>
          <Field label="Registration / application no."><input className={inputCls} value={f.registration_no} onChange={(e) => set("registration_no", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Next deadline"><input type="date" className={inputCls} value={f.key_deadline} onChange={(e) => set("key_deadline", e.target.value)} /></Field>
            <Field label="Deadline type"><select className={inputCls} value={f.deadline_type} onChange={(e) => set("deadline_type", e.target.value)}>{DTYPES.map((d) => <option key={d} value={d}>{d || "—"}</option>)}</select></Field>
          </div>
          <Field label="Notes"><textarea className={inputCls} rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">Cancel</button>
          <button onClick={() => { if (f.title.trim()) onAdd({ ...f, decision: (f.stage === "07_filing" || f.stage === "closed") ? "file" : "pending", benchmark_verdict: "n/a" }); }}
            className="px-4 py-2 text-sm font-semibold bg-[#44546A] text-white rounded-lg hover:bg-[#374454]">Save</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- app ---------- */
const DOC_TYPES = ["report", "paper", "filing", "methodology", "other"];
function DocCard({ d }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 border-l-4 border-[#44546A] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="bg-[#44546A] text-white rounded-md p-1.5 inline-flex"><Newspaper size={15} /></span>
        <span className="text-xs text-slate-400 font-mono">{d.id}</span>
      </div>
      <div className="font-semibold text-slate-800 mt-2 leading-snug text-sm">{d.title}</div>
      <div className="text-xs text-slate-500 mt-1">{[d.doc_type, d.authors, d.doc_date].filter(Boolean).join(" · ")}</div>
      {d.notes ? <div className="text-xs text-slate-500 mt-2 leading-relaxed">{d.notes}</div> : null}
      {d.url
        ? <a href={d.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#44546A] hover:underline"><ExternalLink size={14} /> Open document</a>
        : <div className="mt-3 text-xs text-slate-400 italic">No link yet</div>}
    </div>
  );
}
function NewReportModal({ onClose, onAdd }) {
  const [f, setF] = useState({ title: "", doc_type: "report", authors: "", doc_date: "", url: "", related_asset: "", notes: "" });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const Field = ({ label, children }) => (<label className="block"><span className="text-xs font-semibold text-slate-500">{label}</span>{children}</label>);
  const inputCls = "mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#44546A]";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900 opacity-40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-full overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200"><h2 className="font-bold text-slate-800">New report</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button></div>
        <div className="px-6 py-5 space-y-3">
          <Field label="Title"><input className={inputCls} value={f.title} onChange={(e) => set("title", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type"><select className={inputCls} value={f.doc_type} onChange={(e) => set("doc_type", e.target.value)}>{DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
            <Field label="Date"><input type="date" className={inputCls} value={f.doc_date} onChange={(e) => set("doc_date", e.target.value)} /></Field>
          </div>
          <Field label="Authors"><input className={inputCls} value={f.authors} onChange={(e) => set("authors", e.target.value)} /></Field>
          <Field label="Link (URL to the file)"><input className={inputCls} placeholder="https://…  (OneDrive / Drive / SharePoint)" value={f.url} onChange={(e) => set("url", e.target.value)} /></Field>
          <Field label="Related asset (optional)"><input className={inputCls} value={f.related_asset} onChange={(e) => set("related_asset", e.target.value)} /></Field>
          <Field label="Notes"><textarea className={inputCls} rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">Cancel</button>
          <button onClick={() => { if (f.title.trim()) onAdd(f); }} className="px-4 py-2 text-sm font-semibold bg-[#44546A] text-white rounded-lg hover:bg-[#374454]">Save</button>
        </div>
      </div>
    </div>
  );
}

export default function App({ session }) {
  const [assets, setAssets] = useState([]);
  const [docs, setDocs] = useState([]);
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [section, setSection] = useState("overview");
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [routeFilter, setRouteFilter] = useState("all");
  const [cInput, setCInput] = useState(""); const [cLoading, setCLoading] = useState(false);
  const [cResult, setCResult] = useState(null); const [cError, setCError] = useState("");

  const load = async () => { const { data, error } = await supabase.from("assets").select("*"); if (!error && data) setAssets(data); };
  useEffect(() => { load(); }, []);
  const loadDocs = async () => { const { data, error } = await supabase.from("documents").select("*"); if (!error && data) setDocs(data); };
  useEffect(() => { loadDocs(); }, []);
  const addDoc = async (d) => {
    const id = `DOC-${String(docs.length + 1).padStart(3, "0")}`;
    const { error } = await supabase.from("documents").insert([{ ...d, id, doc_date: d.doc_date || null }]);
    if (error) { alert("Could not save: " + error.message); return; }
    setShowNewDoc(false); loadDocs();
  };

  const addAsset = async (a) => {
    const id = `IK-${String(assets.length + 1).padStart(3, "0")}`;
    const { error } = await supabase.from("assets").insert([clean({ ...a, id })]);
    if (error) { alert("Could not save: " + error.message); return; }
    setShowNew(false); load();
  };
  const runConsulta = async () => {
    if (!cInput.trim()) return;
    setCLoading(true); setCError(""); setCResult(null);
    try {
      const resp = await fetch("/.netlify/functions/consulta-ia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: cInput }) });
      const data = await resp.json();
      if (data && data.rutas) setCResult(data); else setCError(data.raw || data.error || "Could not interpret the response.");
    } catch (e) { setCError("Network error: " + (e && e.message ? e.message : e)); } finally { setCLoading(false); }
  };

  const stats = useMemo(() => {
    let granted = 0, filed = 0, audit = 0;
    assets.forEach((a) => { if (a.stage === "closed") granted++; else if (a.stage === "07_filing") filed++; else audit++; });
    return { total: granted + filed, granted, filed, audit };
  }, [assets]);
  const groups = useMemo(() => {
    const m = {};
    assets.forEach((a) => { const jur = normJur(a.jurisdiction); const key = `${a.type}|${jur}`;
      if (!m[key]) m[key] = { type: a.type, jur, count: 0, urgent: false };
      m[key].count++; const n = daysTo(a.key_deadline); if (n !== null && n <= 90) m[key].urgent = true; });
    return Object.values(m).sort((x, y) => y.count - x.count);
  }, [assets]);
  const owners = useMemo(() => { const m = {}; assets.forEach((a) => { const o = a.owner || "—"; m[o] = (m[o] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); }, [assets]);
  const deadlines = useMemo(() => assets.filter((a) => a.key_deadline).sort((a, b) => daysTo(a.key_deadline) - daysTo(b.key_deadline)), [assets]);
  const list = useMemo(() => routeFilter === "all" ? assets : assets.filter((a) => a.type === routeFilter), [assets, routeFilter]);

  const Section = ({ n, title, sub }) => (
    <div className="flex items-center gap-3 mt-8 mb-3">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#44546A] text-white text-xs font-bold shrink-0">{n}</span>
      <h2 className="font-bold text-slate-800">{title}</h2>
      <span className="text-xs text-slate-400">{sub}</span>
      <div className="flex-1 border-t border-slate-200" />
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
            <aside className="w-60 shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-200 flex items-center gap-2">
          <span className="bg-[#44546A] text-white rounded-md p-1.5 inline-flex"><ShieldCheck size={18} /></span>
          <div><div className="text-slate-800 font-bold text-lg leading-tight">IP&nbsp;Folio</div><div className="text-slate-400 text-xs">Altinium ecosystem</div></div>
        </div>
        <nav className="px-3 py-4"><div className="px-2 text-xs uppercase tracking-wider text-slate-400 mb-2">Main</div>
          <div className="space-y-1">{NAV.map((item) => { const Icon = item.icon; const on = section === item.key;
            return (<button key={item.key} onClick={() => { setSection(item.key); setSelected(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${on ? "bg-[#44546A] text-white font-semibold" : "text-slate-600 hover:bg-slate-100"}`}><Icon size={17} /> {item.label}</button>); })}</div>
        </nav>
        <div className="mt-auto px-5 py-4 text-xs text-slate-400 border-t border-slate-200">Internal app · data in Supabase</div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="flex items-center justify-between px-8 py-5">
          <h1 className="text-2xl font-bold text-slate-800">{TITLES[section]}</h1>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowNew(true)} className="flex items-center gap-2 bg-[#44546A] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#374454]"><Plus size={16} /> New asset</button>
            <div className="flex items-center gap-2 text-sm text-slate-500"><User size={16} /> {session && session.user ? session.user.email : ""}</div>
            <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700"><LogOut size={15} /> Sign out</button>
          </div>
        </div>

        <div className="px-8 pb-12">
          {section === "overview" && (
            <>
              <Section n="1" title="The products" sub="how they stack" />
              <div className="grid md:grid-cols-3 gap-4">
                {PRODUCTS.map((p, i) => (
                  <div key={i} className={`${p.tint} rounded-xl border border-slate-200 border-t-4 ${p.border} shadow-sm p-5`}>
                    <div className={`font-bold ${p.text}`}>{p.name}</div>
                    <div className="text-xs italic text-slate-500 mb-2">{p.tag}</div>
                    <div className="text-sm text-slate-600 leading-relaxed">{p.desc}</div>
                  </div>
                ))}
              </div>

              <Section n="2" title="The portfolio in numbers" sub="overall status" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Kpi label="Assets in total" value={stats.total} accent="border-[#44546A]" valueCls="text-[#44546A]" tint="bg-[#44546A]/5" />
                <Kpi label="Granted / registered" value={stats.granted} accent="border-[#44546A]" valueCls="text-[#44546A]" tint="bg-[#44546A]/5" />
                <Kpi label="Filed / pending" value={stats.filed} accent="border-[#7F7F7F]" valueCls="text-[#5f5f5f]" tint="bg-[#7F7F7F]/8" />
                <Kpi label="In audit / in progress" value={stats.audit} accent="border-[#7F7F7F]" valueCls="text-[#5f5f5f]" dashed tint="bg-[#7F7F7F]/5" />
              </div>

              <Section n="3" title="By type of protection" sub="how many, where and at what stage" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {groups.map((g, i) => { const v = VEHICLES[g.type] || VEHICLES.mixed; const Icon = v.icon;
                  return (
                    <div key={i} className={`rounded-xl border ${v.ring} ${v.tint} shadow-sm p-4`}>
                      <div className="flex items-center justify-between">
                        <div className={`text-3xl font-bold ${v.text}`}>{g.count}</div>
                        <span className={`${v.chip} text-white rounded-md p-1.5 inline-flex`}><Icon size={14} /></span>
                      </div>
                      <div className="text-sm font-semibold text-slate-700 mt-1">{v.label}</div>
                      <div className="text-xs text-slate-500">{g.jur}</div>
                      {g.urgent && <div className="mt-1 text-xs font-bold text-[#941100]">deadline soon</div>}
                    </div>
                  ); })}
              </div>

              <Section n="4" title="Critical deadlines" sub="what expires and when" />
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                {deadlines.length === 0 && <div className="p-4 text-sm text-slate-400 italic">No deadlines on file.</div>}
                {deadlines.map((a) => { const n = daysTo(a.key_deadline);
                  return (
                    <button key={a.id} onClick={() => { setSection("assets"); setSelected(a); }} className="w-full flex items-center justify-between text-left px-4 py-3 hover:bg-slate-50">
                      <div className="flex items-center gap-4 min-w-0">
                        <span className={`text-sm font-bold w-28 shrink-0 ${n < 0 ? "text-[#941100]" : n <= 90 ? "text-[#941100]" : "text-[#44546A]"}`}>{a.key_deadline}</span>
                        <span className="text-sm text-slate-700 truncate">{a.title}</span>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0 ml-3">{a.deadline_type || ""} · {n < 0 ? `${-n}d overdue` : `${n}d`}</span>
                    </button>
                  ); })}
              </div>

              <Section n="5" title="Ownership" sub="who holds what" />
              <div className="grid md:grid-cols-2 gap-4">
                {owners.slice(0, 4).map(([o, c], i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
                    <Building2 size={18} className="text-[#44546A]" />
                    <div><div className="font-semibold text-slate-800">{o}</div><div className="text-xs text-slate-500">{c} asset(s)</div></div>
                  </div>
                ))}
              </div>
              <div className="mt-3 bg-[#941100]/5 border border-[#941100]/25 rounded-xl p-4 text-sm text-slate-700 flex gap-2">
                <AlertTriangle size={16} className="text-[#941100] mt-0.5 shrink-0" /><div>{OWNERSHIP_NOTE}</div>
              </div>
            </>
          )}

          {section === "portfolio" && (
            <div className="grid lg:grid-cols-2 gap-4">
              {FAMILIES.map((fam, i) => { const v = VEHICLES[fam.type] || VEHICLES.mixed; const Icon = v.icon;
                return (
                  <div key={i} className={`bg-white rounded-xl border border-slate-200 border-l-4 ${v.border} shadow-sm p-5`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`${v.chip} text-white rounded-md p-1 inline-flex shrink-0`}><Icon size={15} /></span>
                      <h3 className="font-bold text-slate-800">{fam.title}</h3>
                      {fam.flag && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${flagCls(fam.flag)}`}>{fam.flag}</span>}
                    </div>
                    <div className="text-xs italic text-slate-500 mt-1">{fam.meta}</div>
                    <ul className="mt-3 space-y-1.5">
                      {fam.items.map((it, j) => (
                        <li key={j} className="text-sm text-slate-700 flex gap-2"><span className="text-slate-300 mt-1 shrink-0">•</span><span>{it}</span></li>
                      ))}
                    </ul>
                    {fam.note && <div className="mt-3 text-xs text-slate-400 border-t border-slate-100 pt-2">{fam.note}</div>}
                  </div>
                ); })}
            </div>
          )}

          {section === "assets" && (
            <>
              <Chips value={routeFilter} onChange={setRouteFilter} />
              {list.length ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{list.map((a) => <AssetCard key={a.id} a={a} onClick={() => setSelected(a)} />)}</div>
              ) : <div className="text-sm text-slate-400 italic py-10 text-center">No assets in this view.</div>}
            </>
          )}

          {section === "reports" && (
            <>
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowNewDoc(true)} className="flex items-center gap-2 bg-[#44546A] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#374454]"><Plus size={16} /> New report</button>
              </div>
              {docs.length
                ? <div className="grid sm:grid-cols-2 gap-4">{docs.map((d) => <DocCard key={d.id} d={d} />)}</div>
                : <div className="text-sm text-slate-400 italic py-10 text-center">No reports yet. Use “New report” to add your first document.</div>}
            </>
          )}

          {section === "consult" && (
            <div className="max-w-2xl">
              <p className="text-sm text-slate-500 mb-3">Describe a creation: the app classifies the route, flags the clocks and suggests the next step. General screening, not legal advice.</p>
              <textarea value={cInput} onChange={(e) => setCInput(e.target.value)} rows={4} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#44546A]" placeholder="e.g. A dog collar with a sensor and a proprietary algorithm that detects dehydration. I showed it at a trade fair on 10 March." />
              <button onClick={runConsulta} disabled={cLoading} className="mt-3 flex items-center gap-2 bg-[#44546A] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#374454] disabled:opacity-50"><Sparkles size={16} /> {cLoading ? "Analyzing…" : "Consult"}</button>
              {cError && <div className="mt-4 bg-[#941100]/5 border border-[#941100]/25 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">{cError}</div>}
              {cResult && (
                <div className="mt-5 space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Suggested routes</div>
                    <div className="space-y-2">{(cResult.rutas || []).map((r, i) => { const v = VEHICLES[r.tipo] || VEHICLES.mixed; const Icon = v.icon;
                      return (<div key={i} className="flex items-start gap-2"><span className={`${v.chip} text-white rounded-md p-1 inline-flex shrink-0`}><Icon size={14} /></span><div className="text-sm"><span className="font-semibold text-slate-800">{v.label}</span><span className="text-slate-600"> — {r.motivo}</span></div></div>); })}</div>
                  </div>
                  {cResult.relojes && <div className="bg-[#941100]/5 border border-[#941100]/25 rounded-xl p-4 text-sm text-slate-700 flex gap-2"><AlertTriangle size={16} className="text-[#941100] mt-0.5 shrink-0" /><div><span className="font-semibold">Clocks / risks:</span> {cResult.relojes}</div></div>}
                  {cResult.siguiente_paso && <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-sm"><span className="font-semibold text-slate-800">Next step:</span> <span className="text-slate-700">{cResult.siguiente_paso}</span></div>}
                  {cResult.limite && <div className="text-xs text-slate-400">{cResult.limite}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {selected && <Detail a={selected} onClose={() => setSelected(null)} />}
      {showNew && <NewAssetModal onClose={() => setShowNew(false)} onAdd={addAsset} />}
      {showNewDoc && <NewReportModal onClose={() => setShowNewDoc(false)} onAdd={addDoc} />}
    </div>
  );
}
