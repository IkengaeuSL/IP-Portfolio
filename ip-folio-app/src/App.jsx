import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutGrid, ShieldCheck, FileText, Stamp, Lightbulb, Clock, Layers,
  Plus, X, User, Building2, Calendar, Hash, MapPin, Scale, Sparkles,
  AlertTriangle, LogOut, ArrowRight, BookOpen
} from "lucide-react";
import { supabase } from "./supabaseClient";

/* ---------- helpers ---------- */
const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const daysTo = (s) => { if (!s) return null; const t = new Date(s + "T00:00:00"); return Math.round((t - today) / 86400000); };
const clean = (a) => {
  const o = { ...a };
  ["score_protect", "score_value"].forEach((k) => { o[k] = (o[k] === "" || o[k] == null) ? null : Number(o[k]); });
  ["disclosure_date", "key_deadline", "benchmark_verdict", "deadline_type", "decision", "disclosed_publicly", "registration_no", "jurisdiction", "owner", "creator", "notes"].forEach((k) => { if (o[k] === "") o[k] = null; });
  return o;
};
const normJur = (j) => { if (!j) return "—"; return String(j).split("—")[0].split("(")[0].trim() || "—"; };

const VEHICLES = {
  patent:         { label: "Patente",          chip: "bg-blue-600",    border: "border-blue-600",    icon: Lightbulb },
  copyright:      { label: "Copyright",         chip: "bg-emerald-600", border: "border-emerald-600", icon: FileText },
  trademark:      { label: "Marca",             chip: "bg-violet-600",  border: "border-violet-600",  icon: Stamp },
  "trade-secret": { label: "Secreto comercial", chip: "bg-slate-600",   border: "border-slate-600",   icon: ShieldCheck },
  mixed:          { label: "Mixto",             chip: "bg-slate-400",   border: "border-slate-400",   icon: Building2 },
};
const STAGES = [
  { key: "01_disclosure", short: "Divulgación" }, { key: "02_classification", short: "Clasificación" },
  { key: "03_universe", short: "Universo" }, { key: "04_benchmark", short: "Benchmark" },
  { key: "05_enhancement", short: "Mejora" }, { key: "06_scoring", short: "Puntuación" },
  { key: "07_filing", short: "Presentación" }, { key: "closed", short: "Registrado" },
];
const sIdx = (k) => { const i = STAGES.findIndex((s) => s.key === k); return i < 0 ? 0 : i; };
const statusOf = (a) => {
  const n = daysTo(a.key_deadline);
  if (n !== null && n < 0) return { label: "Caducado", cls: "bg-rose-100 text-rose-700" };
  if (a.stage === "closed") return { label: "Registrado / concedido", cls: "bg-emerald-100 text-emerald-700" };
  if (a.stage === "07_filing") return { label: "Solicitado / pendiente", cls: "bg-blue-100 text-blue-700" };
  return { label: "En auditoría", cls: "bg-slate-100 text-slate-600" };
};

const PRODUCTS = [
  { name: "SSI Index", tag: "la base", border: "border-t-blue-600", desc: "Mide la salud de cada subestación eléctrica. Marco abierto de resiliencia de red (Monte Carlo). Obra base de toda la familia de copyright." },
  { name: "SSI-ENN", tag: "el motor analítico", border: "border-t-emerald-600", desc: "Red neuronal que valora cuánto conviene instalar un BESS en cada subestación. Documentación, código y auditorías de capa 1." },
  { name: "KINETIC SHIELD™", tag: "el producto comercial", border: "border-t-rose-600", desc: "«Neocloud» soberano de borde · une HPC con la red eléctrica · arrendado a inversores. El dispositivo lo protege la solicitud PCT; su control/coordinación, la familia de patentes G5." },
];
const OWNERSHIP_NOTE = "Estructura actual: toda la PI es de Altinium Invest SRL, salvo las 21 patentes provisionales G5, que son de Ikenga.eu SL. Plan: transferir la PI de Altinium Invest SRL a Ikenga.eu SL.";

const flagCls = (f) => {
  const x = (f || "").toLowerCase();
  if (x.includes("urgente")) return "bg-rose-100 text-rose-700";
  if (x.includes("registrad")) return "bg-emerald-100 text-emerald-700";
  if (x.includes("pendiente") || x.includes("presentad")) return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-600";
};
const FAMILIES = [
  { type: "trademark", title: "Marcas · 2", flag: "registrado",
    meta: "Titular: Altinium Invest SRL · clases 9 y 42 · rep. Arochi & Lindner",
    items: [
      "ikenga — registrada · EUIPO 019222233 (concedida 22/01/2026, renueva 2035), extendida internacionalmente vía Madrid (ref. H26/001)",
      "KINETIC SHIELD — registrada · EUIPO 019222238 (concedida 22/01/2026, renueva 2035), extendida internacionalmente vía Madrid (ref. H26/002)",
    ],
    note: "Otras marcas en curso (GROW PROTECT SUSTAIN IN THE 4IR, Terranode) y el nombre de la app Land Tool — pendientes de confirmar." },
  { type: "patent", title: "Modelo de utilidad · 1", flag: "URGENTE",
    meta: "OEPM · U202531782 · rep. Marina Gómez Calvo (Arochi & Lindner)",
    items: [
      "Dispositivo multifuncional distribuido (servicios eléctricos + de datos)",
      "2ª acción oficial (3 jun) · BOPI 09/06/2026 · plazo de respuesta ~09/08/2026 (prorrogable 2 meses)",
      "La OEPM objeta que varias reivindicaciones son de tipo proceso/software y sugiere valorar la conversión a patente de invención.",
    ] },
  { type: "patent", title: "Solicitud internacional PCT · 1", flag: "presentada",
    meta: "Dispositivo Kinetic Shield · WIPO (PCT) · titular Altinium Invest SRL",
    items: [
      "«Distributed Multifunctional Device and Method...» — 27 reivindicaciones",
      "Reivindica prioridad (Convenio de París) del modelo de utilidad español U202531782 (15/09/2025)",
      "Entradas en fase nacional antes del plazo de 30 meses (15/03/2028) · ref. PCT/IB2026/053119",
    ] },
  { type: "copyright", title: "Copyright SIAE (Italia) · 3", flag: "registrado",
    meta: "Titular: Altinium Invest SRL · autor: Cédric Bérard · renueva 2031",
    items: [
      "SSI Index 4.0 — Source Code · Rep. 2026/00869",
      "SSI Index 4.0 — Technical Reference · Rep. 2026/00867",
      "SSI Index 4.0 — Competitive Landscape · Rep. 2026/00868",
      "Depósito de obra inédita (prueba de existencia y prioridad).",
    ] },
  { type: "copyright", title: "Copyright USCO (EE. UU.) · 35", flag: "pendiente",
    meta: "Titular: Altinium Invest SRL · todos en estado «Open» (registro pendiente)",
    items: [
      "Familia SSI Index v4.0 / v4.0.2 — 34 casos · autor: Cédric Bérard",
      "EE. UU., Canadá, Australia, Japón, Chile, España, Reino Unido, Alemania, Suiza, Austria, Francia, Polonia, Finlandia, Noruega, Suecia, Dinamarca, México + presentación combinada de 7 países (Corea, Colombia, Israel, Hungría, Eslovaquia, Costa Rica, Islandia)",
      "Land & Energy Network Analyzer v33 — 1 caso · obra independiente (DSP de idoneidad de terreno para BESS)",
      "Autores: Gianluca Raucci, Lorenzo Rossi y Dario Cosentino · «work made for hire».",
    ] },
  { type: "patent", title: "Patentes provisionales USPTO · familia G5 · 21", flag: "pendiente",
    meta: "Titular: Ikenga.eu SL · inventor: Cédric Bérard · small entity · pro-se · prioridad 12 meses (vence may 2027)",
    items: [
      "Wave 0 (5): G5.1 arbitraje maestro · G5.2 IEC 61850-90-7 · G5.3 HMAC/anti-replay · G5.4 Lyapunov/ISS · G5.5 cambios de membresía",
      "Wave 1 (5): G5.6 plataforma de fabricación · G5.7 multi-fractal-edge · G5.8 cross-substrate · G5.9 multi-EMS · G5.10 portabilidad HAL",
      "Wave 2 (1): G5.11 MPC fractal cross-scale",
      "Wave 3 (4): G5.12 solver QP adjunto · G5.13 hashing FNV-1a · G5.14 referencia jerárquica · G5.15 coste MPC red+cómputo",
      "Wave 4 (2): G5.16 inversor de doble lazo · G5.17 BESS + carga de cómputo",
      "Wave 5 (4): G5.18 demodulador SDFT · G5.19 SCR bayesiano · G5.20 detector OOD Mahalanobis · G5.21 supervisor dwell-counter",
    ],
    note: "Faltan por añadir los nº de solicitud USPTO de G5.2, G5.6 y G5.7 (recibo de presentación aún no disponible)." },
];

const NAV = [
  { key: "resumen", label: "Resumen", icon: LayoutGrid },
  { key: "familia", label: "Por familia", icon: BookOpen },
  { key: "cartera", label: "Cartera", icon: Layers },
  { key: "consulta", label: "Consulta IA", icon: Sparkles },
];
const TITLES = { resumen: "El ecosistema · cartera de PI", familia: "Detalle por familia", cartera: "Cartera · detalle de activos", consulta: "Consulta IA — Modo A" };
const DTYPES = ["", "us-grace-bar", "priority-12mo", "foreign-filing-30mo", "office-action-response", "copyright-timely-reg", "maintenance", "renewal", "other"];
const ROUTE_FILTERS = [["all", "Todas"], ["patent", "Patentes"], ["copyright", "Copyright"], ["trademark", "Marcas"], ["trade-secret", "Secretos"]];

/* ---------- small components ---------- */
function Kpi({ label, value, accent, valueCls, dashed }) {
  return (
    <div className={`bg-white rounded-xl border ${dashed ? "border-dashed border-slate-300" : "border-slate-200"} border-t-4 ${accent} px-5 py-4 shadow-sm`}>
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
          className={`text-xs font-semibold px-3 py-1 rounded-full border ${value === k ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>{l}</button>
      ))}
    </div>
  );
}
function AssetCard({ a, onClick }) {
  const v = VEHICLES[a.type] || VEHICLES.mixed; const Icon = v.icon; const s = statusOf(a); const n = daysTo(a.key_deadline);
  return (
    <button onClick={onClick} className="text-left bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition w-full">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2"><span className={`${v.chip} text-white rounded-md p-1.5 inline-flex`}><Icon size={15} /></span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span></div>
        <span className="text-xs text-slate-400 font-mono">{a.id}</span>
      </div>
      <div className="font-semibold text-slate-800 mt-2 leading-snug text-sm">{a.title}</div>
      <div className="text-xs text-slate-500 mt-1">{v.label} · {a.jurisdiction || "—"}</div>
      <div className="mt-3 pt-2 border-t border-slate-100 text-xs flex items-center justify-between">
        <span className="text-slate-400 font-mono truncate">{a.registration_no || "sin nº"}</span>
        {a.key_deadline ? <span className={n < 0 ? "text-rose-600 font-semibold" : n <= 90 ? "text-amber-600 font-semibold" : "text-slate-500"}>{n < 0 ? `venció hace ${-n}d` : `${n}d`}</span> : <span className="text-slate-300">sin plazo</span>}
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
            <Row icon={MapPin} k="Oficina / jurisdicción" val={a.jurisdiction} />
            <Row icon={Hash} k="Nº registro / solicitud" val={a.registration_no} />
            <Row icon={Building2} k="Titular" val={a.owner} />
            <Row icon={User} k="Inventor / autor" val={a.creator} />
            <Row icon={Calendar} k="Etapa" val={STAGES[sIdx(a.stage)].short} />
            <Row icon={Clock} k="Próximo vencimiento" val={a.key_deadline ? `${a.key_deadline} · ${a.deadline_type || "—"}${n !== null ? ` (${n < 0 ? "vencido" : n + " d"})` : ""}` : "sin plazo"} />
          </div>
          {a.notes ? <div className="mt-5 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-700">{a.notes}</div> : null}
          <div className="mt-5 text-xs text-slate-400">Información general, no asesoría legal.</div>
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
  const inputCls = "mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-500";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900 opacity-40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-full overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200"><h2 className="font-bold text-slate-800">Nuevo activo</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button></div>
        <div className="px-6 py-5 space-y-3">
          <Field label="Título"><input className={inputCls} value={f.title} onChange={(e) => set("title", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vía"><select className={inputCls} value={f.type} onChange={(e) => set("type", e.target.value)}>{Object.keys(VEHICLES).map((k) => <option key={k} value={k}>{VEHICLES[k].label}</option>)}</select></Field>
            <Field label="Etapa"><select className={inputCls} value={f.stage} onChange={(e) => set("stage", e.target.value)}>{STAGES.map((s) => <option key={s.key} value={s.key}>{s.short}</option>)}</select></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Titular"><input className={inputCls} value={f.owner} onChange={(e) => set("owner", e.target.value)} /></Field>
            <Field label="Oficina / jurisdicción"><input className={inputCls} value={f.jurisdiction} onChange={(e) => set("jurisdiction", e.target.value)} /></Field>
          </div>
          <Field label="Nº registro / solicitud"><input className={inputCls} value={f.registration_no} onChange={(e) => set("registration_no", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Próximo vencimiento"><input type="date" className={inputCls} value={f.key_deadline} onChange={(e) => set("key_deadline", e.target.value)} /></Field>
            <Field label="Tipo de plazo"><select className={inputCls} value={f.deadline_type} onChange={(e) => set("deadline_type", e.target.value)}>{DTYPES.map((d) => <option key={d} value={d}>{d || "—"}</option>)}</select></Field>
          </div>
          <Field label="Notas"><textarea className={inputCls} rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">Cancelar</button>
          <button onClick={() => { if (f.title.trim()) onAdd({ ...f, decision: (f.stage === "07_filing" || f.stage === "closed") ? "file" : "pending", benchmark_verdict: "n/a" }); }}
            className="px-4 py-2 text-sm font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800">Guardar</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- app ---------- */
export default function App({ session }) {
  const [assets, setAssets] = useState([]);
  const [section, setSection] = useState("resumen");
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [routeFilter, setRouteFilter] = useState("all");
  const [cInput, setCInput] = useState(""); const [cLoading, setCLoading] = useState(false);
  const [cResult, setCResult] = useState(null); const [cError, setCError] = useState("");

  const load = async () => { const { data, error } = await supabase.from("assets").select("*"); if (!error && data) setAssets(data); };
  useEffect(() => { load(); }, []);

  const addAsset = async (a) => {
    const year = new Date().getFullYear();
    const id = `IK-${String(assets.length + 1).padStart(3, "0")}`;
    const { error } = await supabase.from("assets").insert([clean({ ...a, id })]);
    if (error) { alert("No se pudo guardar: " + error.message); return; }
    setShowNew(false); load();
  };
  const runConsulta = async () => {
    if (!cInput.trim()) return;
    setCLoading(true); setCError(""); setCResult(null);
    try {
      const resp = await fetch("/.netlify/functions/consulta-ia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: cInput }) });
      const data = await resp.json();
      if (data && data.rutas) setCResult(data); else setCError(data.raw || data.error || "No se pudo interpretar la respuesta.");
    } catch (e) { setCError("Error de red: " + (e && e.message ? e.message : e)); } finally { setCLoading(false); }
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
      <span className="text-xs font-bold text-slate-400">{n}</span>
      <h2 className="font-bold text-slate-800">{title}</h2>
      <span className="text-xs text-slate-400">{sub}</span>
      <div className="flex-1 border-t border-slate-200" />
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <aside className="w-60 shrink-0 bg-slate-900 text-slate-300 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-700"><div className="text-white font-bold text-lg leading-tight">IP&nbsp;Folio</div><div className="text-slate-400 text-xs">Ecosistema Altinium · cartera de PI</div></div>
        <nav className="px-3 py-4"><div className="px-2 text-xs uppercase tracking-wider text-slate-500 mb-2">Principal</div>
          <div className="space-y-1">{NAV.map((item) => { const Icon = item.icon; const on = section === item.key;
            return (<button key={item.key} onClick={() => { setSection(item.key); setSelected(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${on ? "bg-slate-800 text-white font-semibold" : "hover:bg-slate-800"}`}><Icon size={17} /> {item.label}</button>); })}</div>
        </nav>
        <div className="mt-auto px-5 py-4 text-xs text-slate-500 border-t border-slate-700">App interna · datos en Supabase</div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="flex items-center justify-between px-8 py-5">
          <h1 className="text-2xl font-bold text-slate-800">{TITLES[section]}</h1>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowNew(true)} className="flex items-center gap-2 bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-800"><Plus size={16} /> Nuevo activo</button>
            <div className="flex items-center gap-2 text-sm text-slate-500"><User size={16} /> {session && session.user ? session.user.email : ""}</div>
            <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700"><LogOut size={15} /> Salir</button>
          </div>
        </div>

        <div className="px-8 pb-12">
          {section === "resumen" && (
            <>
              <Section n="1" title="Los productos" sub="cómo encajan" />
              <div className="grid md:grid-cols-3 gap-4">
                {PRODUCTS.map((p, i) => (
                  <div key={i} className={`bg-white rounded-xl border border-slate-200 border-t-4 ${p.border} shadow-sm p-5`}>
                    <div className="font-bold text-slate-800">{p.name}</div>
                    <div className="text-xs italic text-slate-500 mb-2">{p.tag}</div>
                    <div className="text-sm text-slate-600 leading-relaxed">{p.desc}</div>
                  </div>
                ))}
              </div>

              <Section n="2" title="El portafolio en números" sub="estado general" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Kpi label="Activos en total" value={stats.total} accent="border-blue-600" valueCls="text-slate-800" />
                <Kpi label="Registrados / concedidos" value={stats.granted} accent="border-emerald-500" valueCls="text-emerald-600" />
                <Kpi label="Solicitados / pendientes" value={stats.filed} accent="border-amber-500" valueCls="text-amber-600" />
                <Kpi label="En auditoría / en curso" value={stats.audit} accent="border-slate-400" valueCls="text-slate-500" dashed />
              </div>

              <Section n="3" title="Por tipo de protección" sub="cuántos, dónde y en qué estado" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {groups.map((g, i) => { const v = VEHICLES[g.type] || VEHICLES.mixed;
                  return (
                    <div key={i} className={`bg-white rounded-xl border border-slate-200 border-l-4 ${v.border} shadow-sm p-4`}>
                      <div className="text-2xl font-bold text-slate-800">{g.count}</div>
                      <div className="text-sm font-semibold text-slate-700">{v.label}</div>
                      <div className="text-xs text-slate-500">{g.jur}</div>
                      {g.urgent && <div className="mt-1 text-xs font-bold text-rose-600">vencimiento próximo</div>}
                    </div>
                  ); })}
              </div>

              <Section n="4" title="Plazos críticos" sub="qué vence y cuándo" />
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                {deadlines.length === 0 && <div className="p-4 text-sm text-slate-400 italic">Sin vencimientos registrados.</div>}
                {deadlines.map((a) => { const n = daysTo(a.key_deadline);
                  return (
                    <button key={a.id} onClick={() => { setSection("cartera"); setSelected(a); }} className="w-full flex items-center justify-between text-left px-4 py-3 hover:bg-slate-50">
                      <div className="flex items-center gap-4 min-w-0">
                        <span className={`text-sm font-bold w-28 shrink-0 ${n < 0 ? "text-rose-600" : n <= 90 ? "text-amber-600" : "text-emerald-600"}`}>{a.key_deadline}</span>
                        <span className="text-sm text-slate-700 truncate">{a.title}</span>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0 ml-3">{a.deadline_type || ""} · {n < 0 ? `${-n}d vencido` : `${n}d`}</span>
                    </button>
                  ); })}
              </div>

              <Section n="5" title="Titularidad" sub="quién tiene qué" />
              <div className="grid md:grid-cols-2 gap-4">
                {owners.slice(0, 4).map(([o, c], i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
                    <Building2 size={18} className="text-slate-400" />
                    <div><div className="font-semibold text-slate-800">{o}</div><div className="text-xs text-slate-500">{c} activo(s)</div></div>
                  </div>
                ))}
              </div>
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-slate-700 flex gap-2">
                <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" /><div>{OWNERSHIP_NOTE}</div>
              </div>
            </>
          )}

          {section === "familia" && (
            <div className="grid lg:grid-cols-2 gap-4">
              {FAMILIES.map((fam, i) => { const v = VEHICLES[fam.type] || VEHICLES.mixed;
                return (
                  <div key={i} className={`bg-white rounded-xl border border-slate-200 border-l-4 ${v.border} shadow-sm p-5`}>
                    <div className="flex items-center gap-2 flex-wrap">
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

          {section === "cartera" && (
            <>
              <Chips value={routeFilter} onChange={setRouteFilter} />
              {list.length ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{list.map((a) => <AssetCard key={a.id} a={a} onClick={() => setSelected(a)} />)}</div>
              ) : <div className="text-sm text-slate-400 italic py-10 text-center">No hay activos en esta vista.</div>}
            </>
          )}

          {section === "consulta" && (
            <div className="max-w-2xl">
              <p className="text-sm text-slate-500 mb-3">Describe una creación: la app clasifica la vía, avisa de los relojes y propone el siguiente paso. Información general (cribado), no asesoría legal.</p>
              <textarea value={cInput} onChange={(e) => setCInput(e.target.value)} rows={4} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-500" placeholder="p. ej. Un collar para perros con un sensor y un algoritmo propio que detecta deshidratación. Lo enseñé en una feria el 10 de marzo." />
              <button onClick={runConsulta} disabled={cLoading} className="mt-3 flex items-center gap-2 bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50"><Sparkles size={16} /> {cLoading ? "Analizando…" : "Consultar"}</button>
              {cError && <div className="mt-4 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">{cError}</div>}
              {cResult && (
                <div className="mt-5 space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Vías sugeridas</div>
                    <div className="space-y-2">{(cResult.rutas || []).map((r, i) => { const v = VEHICLES[r.tipo] || VEHICLES.mixed; const Icon = v.icon;
                      return (<div key={i} className="flex items-start gap-2"><span className={`${v.chip} text-white rounded-md p-1 inline-flex shrink-0`}><Icon size={14} /></span><div className="text-sm"><span className="font-semibold text-slate-800">{v.label}</span><span className="text-slate-600"> — {r.motivo}</span></div></div>); })}</div>
                  </div>
                  {cResult.relojes && <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-slate-700 flex gap-2"><AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" /><div><span className="font-semibold">Relojes / riesgos:</span> {cResult.relojes}</div></div>}
                  {cResult.siguiente_paso && <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-sm"><span className="font-semibold text-slate-800">Siguiente paso:</span> <span className="text-slate-700">{cResult.siguiente_paso}</span></div>}
                  {cResult.limite && <div className="text-xs text-slate-400">{cResult.limite}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {selected && <Detail a={selected} onClose={() => setSelected(null)} />}
      {showNew && <NewAssetModal onClose={() => setShowNew(false)} onAdd={addAsset} />}
    </div>
  );
}
