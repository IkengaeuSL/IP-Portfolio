import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutGrid, ShieldCheck, FileText, Stamp, Lightbulb, Clock, GitBranch,
  Plus, X, User, Building2, Calendar, Hash, MapPin, Scale, BookOpen,
  CheckCircle2, Circle, Sparkles, AlertTriangle, LogOut
} from "lucide-react";
import { supabase } from "./supabaseClient";

/* ---------- helpers ---------- */
const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return iso(d); };
const daysTo = (s) => { if (!s) return null; const t = new Date(s + "T00:00:00"); return Math.round((t - today) / 86400000); };

// Normaliza para Postgres: cadenas vacías -> null; puntuaciones a número o null.
const clean = (a) => {
  const o = { ...a };
  ["score_protect", "score_value"].forEach((k) => { o[k] = (o[k] === "" || o[k] == null) ? null : Number(o[k]); });
  ["disclosure_date", "key_deadline", "benchmark_verdict", "deadline_type", "decision", "disclosed_publicly", "registration_no", "jurisdiction", "owner", "creator", "notes"].forEach((k) => { if (o[k] === "") o[k] = null; });
  return o;
};

const VEHICLES = {
  patent:         { label: "Patente",          chip: "bg-blue-600",    icon: Lightbulb },
  copyright:      { label: "Copyright",         chip: "bg-emerald-600", icon: FileText },
  trademark:      { label: "Marca",             chip: "bg-violet-600",  icon: Stamp },
  "trade-secret": { label: "Secreto comercial", chip: "bg-slate-600",   icon: ShieldCheck },
  mixed:          { label: "Mixto",             chip: "bg-slate-400",   icon: Building2 },
};

const STAGES = [
  { key: "01_disclosure", short: "Divulgación" },
  { key: "02_classification", short: "Clasificación" },
  { key: "03_universe", short: "Universo" },
  { key: "04_benchmark", short: "Benchmark" },
  { key: "05_enhancement", short: "Mejora" },
  { key: "06_scoring", short: "Puntuación" },
  { key: "07_filing", short: "Presentación" },
  { key: "closed", short: "Cerrado" },
];
const sIdx = (k) => { const i = STAGES.findIndex((s) => s.key === k); return i < 0 ? 0 : i; };

const VERDICTS = {
  clears:   { l: "Despeja",    c: "bg-emerald-100 text-emerald-700" },
  enhance:  { l: "Mejorar",    c: "bg-amber-100 text-amber-700" },
  blocked:  { l: "Bloqueado",  c: "bg-rose-100 text-rose-700" },
  "n/a":    { l: "N/A",        c: "bg-slate-100 text-slate-500" },
};

const statusOf = (a) => {
  const n = daysTo(a.key_deadline);
  if (n !== null && n < 0) return { label: "Caducado", cls: "bg-rose-100 text-rose-700" };
  if (a.stage === "closed") return { label: "Registrado", cls: "bg-emerald-100 text-emerald-700" };
  if (a.stage === "07_filing") return { label: "En trámite", cls: "bg-blue-100 text-blue-700" };
  return { label: "En curso", cls: "bg-slate-100 text-slate-600" };
};

const ROUTES = [
  { type: "patent",        protege: "Cómo funciona algo: un mecanismo, método o proceso.", requiere: "Novedad, utilidad y no-obviedad. A cambio, hay que publicar cómo funciona.", obtiene: "Solicitud examinada durante años en la oficina de patentes.", dura: "~20 años desde la solicitud." },
  { type: "copyright",     protege: "La expresión original: cómo se escribe, dibuja, codifica o compone (no la idea ni la función).", requiere: "Creación original. Surge automáticamente al crear.", obtiene: "Existe solo; el registro es opcional y barato (en EE. UU. es la entrada a los tribunales).", dura: "Vida del autor + 70 años (general)." },
  { type: "trade-secret",  protege: "Lo que mantienes confidencial: fórmulas, algoritmos internos, datasets, procesos.", requiere: "Medidas de secreto reales (control de acceso, NDAs).", obtiene: "No se presenta nada; se protege manteniéndolo en secreto.", dura: "Indefinido… hasta que se hace público." },
  { type: "trademark",     protege: "El signo distintivo con el que vendes: nombre, logo, eslogan (no el producto).", requiere: "Carácter distintivo y uso en el mercado.", obtiene: "Registro en la oficina de marcas + uso continuado.", dura: "Indefinido, mientras se use y se renueve." },
];

const PRINCIPLES = [
  { t: "El reloj de la divulgación", d: "Mostrar, vender u ofrecer algo públicamente arranca un plazo de 1 año en EE. UU.; en muchos países la divulgación previa puede impedir la patente. Por eso se registra la fecha antes de nada." },
  { t: "Patentabilidad ≠ libertad de operar", d: "«¿Puedo patentarlo?» y «¿puedo venderlo sin infringir a otros?» son preguntas distintas. Siempre se hacen ambos análisis, más un gap-analysis del espacio en blanco." },
  { t: "Cribado ≠ dictamen", d: "Las búsquedas en bases públicas gratuitas sirven para triar y priorizar, no son una opinión legal. Lo de alto valor lo valida un abogado de PI." },
];

const MODEA_SYSTEM = `Eres un asistente de identificación de propiedad intelectual operando en MODO A (orientación rápida), para uso interno. El usuario describe una creación. Tu tarea:
(1) Clasifícala en una o varias vías y explica por qué en lenguaje claro: la patente protege cómo funciona algo; el copyright protege la expresión original; el secreto comercial protege lo que se mantiene confidencial; la marca protege el signo distintivo (nombre, logo). El software suele ser híbrido.
(2) Avisa de relojes y riesgos: si hubo divulgación pública, venta u oferta, en EE. UU. corre un plazo de 1 año para patentar y en muchos países la divulgación previa puede impedir la patente; si no consta la fecha de primera divulgación, pídela.
(3) Da un siguiente paso concreto.
(4) Recuerda el límite: información general de cribado, no asesoría legal; las decisiones de alto valor las valida un abogado de PI. No confundas patentabilidad con libertad de operar.
Responde SOLO con JSON válido, sin markdown ni texto adicional, con esta forma exacta:
{"rutas":[{"tipo":"patent|copyright|trade-secret|trademark|mixed","motivo":"texto"}],"relojes":"texto","siguiente_paso":"texto","limite":"texto"}`;

const SEED = [
  { id: "2026-010", title: "Collar canino — método de detección de deshidratación", type: "patent", owner: "PetSense", jurisdiction: "USPTO", registration_no: "", disclosure_date: "2026-03-10", stage: "04_benchmark", benchmark_verdict: "enhance", decision: "enhance", score_protect: 3, score_value: 5, key_deadline: "2027-03-10", deadline_type: "us-grace-bar", notes: "Demostrado en feria el 10-mar (reloj de 1 año activo). Aparecen 3 patentes de sensores de hidratación → mejorar para diferenciar." },
  { id: "2026-011", title: "Collar canino — app móvil (código)", type: "copyright", owner: "PetSense", jurisdiction: "USCO", registration_no: "", disclosure_date: "2026-02-01", stage: "03_universe", benchmark_verdict: "n/a", decision: "pending", score_protect: "", score_value: "", key_deadline: "", deadline_type: "", notes: "Código de la app: vía copyright." },
  { id: "2026-012", title: "Collar canino — datos de entrenamiento", type: "trade-secret", owner: "PetSense", jurisdiction: "—", registration_no: "", disclosure_date: "", stage: "02_classification", benchmark_verdict: "n/a", decision: "trade-secret", score_protect: "", score_value: "", key_deadline: "", deadline_type: "", notes: "Dataset propietario: secreto comercial. El contenido NO se almacena aquí; se protege con control de acceso y NDAs." },
  { id: "2026-013", title: "Collar canino — nombre de marca", type: "trademark", owner: "PetSense", jurisdiction: "EUIPO", registration_no: "", disclosure_date: "", stage: "03_universe", benchmark_verdict: "n/a", decision: "pending", score_protect: "", score_value: "", key_deadline: "", deadline_type: "", notes: "Nombre comercial: vía marca." },
  { id: "2026-001", title: "Mecanismo de plegado rápido", type: "patent", owner: "Acme S.L.", jurisdiction: "USPTO", registration_no: "US 63/123,456 (prov.)", disclosure_date: "2025-09-10", stage: "07_filing", benchmark_verdict: "clears", decision: "file", score_protect: 4, score_value: 5, key_deadline: addDays(75), deadline_type: "priority-12mo", notes: "Provisional presentada; preparar la no provisional dentro del plazo." },
  { id: "2026-004", title: "Algoritmo de compresión adaptativa", type: "patent", owner: "Acme Labs", jurisdiction: "EPO", registration_no: "EP 4 123 456", disclosure_date: "2024-06-01", stage: "closed", benchmark_verdict: "clears", decision: "file", score_protect: 4, score_value: 4, key_deadline: addDays(180), deadline_type: "maintenance", notes: "Concedida; anualidad pendiente." },
  { id: "2026-005", title: "Identidad visual de producto", type: "trademark", owner: "Acme S.L.", jurisdiction: "OEPM", registration_no: "OEPM M-4xxxxxx", disclosure_date: "", stage: "closed", benchmark_verdict: "n/a", decision: "file", score_protect: 4, score_value: 3, key_deadline: addDays(-12), deadline_type: "renewal", notes: "Renovación VENCIDA — revisar plazo de gracia." },
  { id: "2026-007", title: "Diseño de carcasa", type: "patent", owner: "Acme S.L.", jurisdiction: "USPTO", registration_no: "US 18/987,654", disclosure_date: "2025-01-15", stage: "07_filing", benchmark_verdict: "clears", decision: "file", score_protect: 3, score_value: 3, key_deadline: addDays(-3), deadline_type: "office-action-response", notes: "Respuesta a acción oficial VENCIDA." },
  { id: "2026-002", title: "Manual de usuario ilustrado", type: "copyright", owner: "Acme S.L.", jurisdiction: "USCO", registration_no: "USCO TX0009123", disclosure_date: "2025-03-01", stage: "closed", benchmark_verdict: "n/a", decision: "file", score_protect: 3, score_value: 3, key_deadline: "", deadline_type: "", notes: "Registro concedido." },
];

const NAV = [
  { key: "panel",        label: "Panel",        icon: LayoutGrid },
  { key: "consulta",     label: "Consulta IA",  icon: Sparkles },
  { key: "pipeline",     label: "Pipeline",     icon: GitBranch },
  { key: "portafolio",   label: "Portafolio",   icon: ShieldCheck },
  { key: "rutas",        label: "Rutas",        icon: BookOpen },
  { key: "vencimientos", label: "Vencimientos", icon: Clock },
];
const TITLES = { panel: "Panel", consulta: "Consulta IA — Modo A", pipeline: "Pipeline — las 7 etapas", portafolio: "Portafolio protegido", rutas: "Rutas y principios", vencimientos: "Vencimientos" };
const DTYPES = ["", "us-grace-bar", "priority-12mo", "foreign-filing-30mo", "office-action-response", "copyright-timely-reg", "maintenance", "renewal", "other"];
const ROUTE_FILTERS = [["all", "Todas"], ["patent", "Patentes"], ["copyright", "Copyright"], ["trademark", "Marcas"], ["trade-secret", "Secretos"]];

/* ---------- small components ---------- */
function Kpi({ label, value, accent, valueCls }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 border-t-4 ${accent} px-5 py-4 shadow-sm`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${valueCls}`}>{value}</div>
    </div>
  );
}

function Stepper({ stage }) {
  const cur = sIdx(stage);
  return (
    <div className="flex items-center gap-1.5">
      {STAGES.slice(0, 7).map((s, i) => (
        <div key={s.key} title={s.short}
          className={`w-2.5 h-2.5 rounded-full ${i < cur ? "bg-emerald-500" : i === cur ? "bg-blue-600" : "bg-slate-200"}`} />
      ))}
    </div>
  );
}

function Chips({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {ROUTE_FILTERS.map(([k, l]) => (
        <button key={k} onClick={() => onChange(k)}
          className={`text-xs font-semibold px-3 py-1 rounded-full border ${value === k ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

function AssetCard({ a, onClick }) {
  const v = VEHICLES[a.type] || VEHICLES.mixed; const Icon = v.icon; const s = statusOf(a); const n = daysTo(a.key_deadline);
  return (
    <button onClick={onClick} className="text-left bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition w-full">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`${v.chip} text-white rounded-md p-1.5 inline-flex`}><Icon size={15} /></span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
        </div>
        <span className="text-xs text-slate-400 font-mono">{a.id}</span>
      </div>
      <div className="font-semibold text-slate-800 mt-2 leading-snug">{a.title}</div>
      <div className="text-xs text-slate-500 mt-1">{v.label} · {a.jurisdiction || "—"}</div>
      <div className="mt-3 pt-2 border-t border-slate-100 text-xs flex items-center justify-between">
        <span className="text-slate-400 font-mono truncate">{a.registration_no || "sin nº"}</span>
        {a.key_deadline
          ? <span className={n < 0 ? "text-rose-600 font-semibold" : n <= 90 ? "text-amber-600 font-semibold" : "text-slate-500"}>{n < 0 ? `venció hace ${-n}d` : `${n}d · ${a.deadline_type}`}</span>
          : <span className="text-slate-300">sin plazo</span>}
      </div>
    </button>
  );
}

function PipelineRow({ a, onClick }) {
  const v = VEHICLES[a.type] || VEHICLES.mixed; const Icon = v.icon;
  const cur = STAGES[sIdx(a.stage)]; const verd = VERDICTS[a.benchmark_verdict];
  return (
    <button onClick={onClick} className="w-full text-left bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`${v.chip} text-white rounded-md p-1.5 inline-flex shrink-0`}><Icon size={15} /></span>
          <div className="min-w-0">
            <div className="font-semibold text-slate-800 truncate">{a.title}</div>
            <div className="text-xs text-slate-500">{v.label} · {a.id}</div>
          </div>
        </div>
        {verd && a.benchmark_verdict !== "n/a" ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${verd.c}`}>{verd.l}</span> : null}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <Stepper stage={a.stage} />
        <span className="text-xs font-medium text-slate-500 shrink-0">{cur.short}</span>
      </div>
    </button>
  );
}

function Detail({ a, onClose }) {
  if (!a) return null;
  const v = VEHICLES[a.type] || VEHICLES.mixed; const Icon = v.icon; const s = statusOf(a); const n = daysTo(a.key_deadline);
  const verd = VERDICTS[a.benchmark_verdict];
  const bi = sIdx("04_benchmark"); const si = sIdx(a.stage);
  const reportState = si > bi ? "done" : si === bi ? "now" : "todo";
  const Row = ({ icon: I, k, val }) => (
    <div className="flex items-start gap-3 py-2 border-b border-slate-100">
      <I size={15} className="text-slate-400 mt-0.5 shrink-0" />
      <div className="text-xs text-slate-500 w-40 shrink-0">{k}</div>
      <div className="text-sm text-slate-800 font-medium">{val || "—"}</div>
    </div>
  );
  const Report = ({ t, d }) => (
    <div className="flex items-start gap-2 py-1.5 text-sm">
      {reportState === "done" ? <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" /> : <Circle size={16} className={`mt-0.5 shrink-0 ${reportState === "now" ? "text-blue-500" : "text-slate-300"}`} />}
      <div><span className="font-medium text-slate-700">{t}</span> <span className="text-slate-400">— {d}{reportState === "now" ? " (en curso)" : ""}</span></div>
    </div>
  );
  const analogue = { copyright: "Aquí el análogo es la verificación de similitud sustancial (clearance) y la distintividad.", trademark: "Aquí el análogo es la búsqueda de disponibilidad / registrabilidad de la marca.", "trade-secret": "No hay benchmark de patente: protección por secreto (control de acceso + NDAs)." };
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900 opacity-40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-xl overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className={`${v.chip} text-white rounded-md p-1.5 inline-flex`}><Icon size={16} /></span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
            {verd && a.benchmark_verdict !== "n/a" ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${verd.c}`}>{verd.l}</span> : null}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        <div className="px-6 py-5">
          <div className="text-xs text-slate-400 font-mono">{a.id}</div>
          <h2 className="text-xl font-bold text-slate-800 mt-1">{a.title}</h2>
          <div className="text-sm text-slate-500 mt-1">{v.label}</div>

          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Etapa</span>
              <span className="text-xs font-medium text-slate-600">{STAGES[si].short}</span>
            </div>
            <Stepper stage={a.stage} />
          </div>

          <div className="mt-5">
            <Row icon={MapPin} k="Oficina / jurisdicción" val={a.jurisdiction} />
            <Row icon={Hash} k="Nº registro / solicitud" val={a.registration_no} />
            <Row icon={Building2} k="Titular" val={a.owner} />
            <Row icon={Calendar} k="Divulgación" val={a.disclosure_date} />
            <Row icon={Scale} k="Puntuación P×V" val={(a.score_protect && a.score_value) ? `${a.score_protect} × ${a.score_value}` : ""} />
            <Row icon={Clock} k="Próximo vencimiento" val={a.key_deadline ? `${a.key_deadline} · ${a.deadline_type || "—"}${n !== null ? ` (${n < 0 ? "vencido" : n + " d"})` : ""}` : "sin plazo"} />
          </div>

          {a.type === "patent" ? (
            <div className="mt-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Benchmark (vía patente · 3 informes)</div>
              <Report t="Patentabilidad" d="novedad + no-obviedad vs todo el arte previo" />
              <Report t="FTO" d="reivindicaciones de terceros EN VIGOR en el mercado objetivo" />
              <Report t="Gap-analysis" d="espacio en blanco + veredicto" />
            </div>
          ) : (
            <div className="mt-5 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">{analogue[a.type] || ""}</div>
          )}

          {a.notes ? <div className="mt-5 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-slate-700">{a.notes}</div> : null}
          <div className="mt-5 text-xs text-slate-400">Cribado / información general, no asesoría legal. Las decisiones de alto valor las valida un abogado de PI.</div>
        </div>
      </div>
    </div>
  );
}

function NewAssetModal({ onClose, onAdd }) {
  const blank = { title: "", type: "patent", owner: "", jurisdiction: "", registration_no: "", key_deadline: "", deadline_type: "", stage: "01_disclosure", benchmark_verdict: "n/a", notes: "" };
  const [f, setF] = useState(blank);
  const set = (k, val) => setF((p) => ({ ...p, [k]: val }));
  const Field = ({ label, children }) => (<label className="block"><span className="text-xs font-semibold text-slate-500">{label}</span>{children}</label>);
  const inputCls = "mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-500";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900 opacity-40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-full overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-800">Nuevo candidato</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <Field label="Título"><input className={inputCls} value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="p. ej. Método de detección" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vía"><select className={inputCls} value={f.type} onChange={(e) => set("type", e.target.value)}>{Object.keys(VEHICLES).map((k) => <option key={k} value={k}>{VEHICLES[k].label}</option>)}</select></Field>
            <Field label="Etapa"><select className={inputCls} value={f.stage} onChange={(e) => set("stage", e.target.value)}>{STAGES.map((s) => <option key={s.key} value={s.key}>{s.short}</option>)}</select></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Veredicto benchmark"><select className={inputCls} value={f.benchmark_verdict} onChange={(e) => set("benchmark_verdict", e.target.value)}>{Object.keys(VERDICTS).map((k) => <option key={k} value={k}>{VERDICTS[k].l}</option>)}</select></Field>
            <Field label="Titular"><input className={inputCls} value={f.owner} onChange={(e) => set("owner", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Oficina / jurisdicción"><input className={inputCls} value={f.jurisdiction} onChange={(e) => set("jurisdiction", e.target.value)} placeholder="USPTO, EUIPO, OEPM…" /></Field>
            <Field label="Nº registro / solicitud"><input className={inputCls} value={f.registration_no} onChange={(e) => set("registration_no", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Próximo vencimiento"><input type="date" className={inputCls} value={f.key_deadline} onChange={(e) => set("key_deadline", e.target.value)} /></Field>
            <Field label="Tipo de plazo"><select className={inputCls} value={f.deadline_type} onChange={(e) => set("deadline_type", e.target.value)}>{DTYPES.map((d) => <option key={d} value={d}>{d || "—"}</option>)}</select></Field>
          </div>
          <Field label="Notas"><textarea className={inputCls} rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">Cancelar</button>
          <button onClick={() => { if (f.title.trim()) onAdd({ ...f, decision: (f.stage === "07_filing" || f.stage === "closed") ? "file" : "pending" }); }}
            className="px-4 py-2 text-sm font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800">Guardar</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- app ---------- */
export default function App({ session }) {
  const [assets, setAssets] = useState([]);
  const [section, setSection] = useState("panel");
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [routeFilter, setRouteFilter] = useState("all");
  const [cInput, setCInput] = useState("");
  const [cLoading, setCLoading] = useState(false);
  const [cResult, setCResult] = useState(null);
  const [cError, setCError] = useState("");

  const runConsulta = async () => {
    if (!cInput.trim()) return;
    setCLoading(true); setCError(""); setCResult(null);
    try {
      const resp = await fetch("/.netlify/functions/consulta-ia", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: cInput }),
      });
      const data = await resp.json();
      if (data && data.rutas) setCResult(data);
      else setCError(data.raw || data.error || "No se pudo interpretar la respuesta.");
    } catch (e) {
      setCError("Error de red: " + (e && e.message ? e.message : e));
    } finally { setCLoading(false); }
  };

  const load = async () => {
    const { data, error } = await supabase.from("assets").select("*");
    if (!error && data) setAssets(data);
  };
  useEffect(() => { load(); }, []);

  const addAsset = async (a) => {
    const year = new Date().getFullYear();
    const id = `${year}-${String(assets.length + 1).padStart(3, "0")}`;
    const { error } = await supabase.from("assets").insert([clean({ ...a, id })]);
    if (error) { alert("No se pudo guardar: " + error.message); return; }
    setShowNew(false); load();
  };

  const loadExamples = async () => {
    const { error } = await supabase.from("assets").upsert(SEED.map(clean));
    if (error) { alert("No se pudieron cargar los ejemplos: " + error.message); return; }
    load();
  };

  const counts = useMemo(() => {
    let expired = 0, soon = 0;
    assets.forEach((a) => { const n = daysTo(a.key_deadline); if (n !== null && n < 0) expired++; else if (n !== null && n <= 90) soon++; });
    return { total: assets.length, portfolio: assets.filter((a) => a.decision === "file").length, soon, expired };
  }, [assets]);

  const byRoute = (arr) => routeFilter === "all" ? arr : arr.filter((a) => a.type === routeFilter);
  const pipeline = useMemo(() => byRoute([...assets].sort((a, b) => sIdx(a.stage) - sIdx(b.stage))), [assets, routeFilter]);
  const portfolio = useMemo(() => byRoute(assets.filter((a) => a.decision === "file")), [assets, routeFilter]);
  const deadlines = useMemo(() => assets.filter((a) => a.key_deadline).sort((a, b) => daysTo(a.key_deadline) - daysTo(b.key_deadline)), [assets]);
  const byType = useMemo(() => Object.keys(VEHICLES).map((t) => ({ t, n: assets.filter((a) => a.type === t).length })).filter((x) => x.n > 0), [assets]);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <aside className="w-60 shrink-0 bg-slate-900 text-slate-300 flex flex-col">
        <div className="px-5 py-5 border-b border-slate-700">
          <div className="text-white font-bold text-lg leading-tight">IP&nbsp;Folio</div>
          <div className="text-slate-400 text-xs">Cartera de propiedad intelectual</div>
        </div>
        <nav className="px-3 py-4">
          <div className="px-2 text-xs uppercase tracking-wider text-slate-500 mb-2">Principal</div>
          <div className="space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon; const on = section === item.key;
              return (
                <button key={item.key} onClick={() => { setSection(item.key); setSelected(null); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${on ? "bg-slate-800 text-white font-semibold" : "hover:bg-slate-800"}`}>
                  <Icon size={17} /> {item.label}
                </button>
              );
            })}
          </div>
        </nav>
        <div className="mt-auto px-5 py-4 text-xs text-slate-500 border-t border-slate-700">App interna · datos en Supabase</div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="flex items-center justify-between px-8 py-5">
          <h1 className="text-2xl font-bold text-slate-800">{TITLES[section]}</h1>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowNew(true)} className="flex items-center gap-2 bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-800"><Plus size={16} /> Nuevo candidato</button>
            <div className="flex items-center gap-2 text-sm text-slate-500"><User size={16} /> {session && session.user ? session.user.email : ""}</div>
            <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700"><LogOut size={15} /> Salir</button>
          </div>
        </div>

        <div className="px-8 pb-12">
          {section === "consulta" && (
            <div className="max-w-2xl">
              <p className="text-sm text-slate-500 mb-3">Describe tu creación: la app clasifica la vía, avisa de los relojes y propone el siguiente paso, usando el kit de la metodología como prompt de sistema. Información general (cribado), no asesoría legal.</p>
              <textarea value={cInput} onChange={(e) => setCInput(e.target.value)} rows={4}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-500"
                placeholder="p. ej. He inventado un collar para perros con un sensor y un algoritmo propio que detecta deshidratación y avisa al móvil. Lo enseñé en una feria el 10 de marzo." />
              <button onClick={runConsulta} disabled={cLoading}
                className="mt-3 flex items-center gap-2 bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50">
                <Sparkles size={16} /> {cLoading ? "Analizando…" : "Consultar"}
              </button>

              {cError && <div className="mt-4 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">{cError}</div>}

              {cResult && (
                <div className="mt-5 space-y-4">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Vías sugeridas</div>
                    <div className="space-y-2">
                      {(cResult.rutas || []).map((r, i) => {
                        const v = VEHICLES[r.tipo] || VEHICLES.mixed; const Icon = v.icon;
                        return (
                          <div key={i} className="flex items-start gap-2">
                            <span className={`${v.chip} text-white rounded-md p-1 inline-flex shrink-0`}><Icon size={14} /></span>
                            <div className="text-sm"><span className="font-semibold text-slate-800">{v.label}</span><span className="text-slate-600"> — {r.motivo}</span></div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {cResult.relojes && <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-slate-700 flex gap-2"><AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" /><div><span className="font-semibold">Relojes / riesgos:</span> {cResult.relojes}</div></div>}
                  {cResult.siguiente_paso && <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-sm"><span className="font-semibold text-slate-800">Siguiente paso:</span> <span className="text-slate-700">{cResult.siguiente_paso}</span></div>}
                  {cResult.limite && <div className="text-xs text-slate-400">{cResult.limite}</div>}
                </div>
              )}
            </div>
          )}

          {section === "panel" && (
            <>
              {assets.length === 0 && (
                <div className="mb-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-sm text-slate-600 flex items-center justify-between gap-3">
                  <span>No hay activos todavía. Da de alta uno, o carga datos de ejemplo para ver la app poblada.</span>
                  <button onClick={loadExamples} className="shrink-0 bg-slate-900 text-white text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-800">Cargar ejemplos</button>
                </div>
              )}
              <div className="flex gap-3 mb-4">
                <span className="text-sm font-semibold px-3 py-1 rounded-full bg-rose-50 text-rose-700">● {counts.expired} caducados</span>
                <span className="text-sm font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-700">⏳ {counts.soon} vencen pronto</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Kpi label="Candidatos" value={counts.total} accent="border-blue-600" valueCls="text-slate-800" />
                <Kpi label="En cartera" value={counts.portfolio} accent="border-emerald-500" valueCls="text-emerald-600" />
                <Kpi label="Vencen pronto" value={counts.soon} accent="border-amber-500" valueCls="text-amber-600" />
                <Kpi label="Caducados" value={counts.expired} accent="border-rose-600" valueCls="text-rose-600" />
              </div>
              <div className="grid lg:grid-cols-2 gap-6 mt-8">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h2 className="font-bold text-slate-800 mb-3">Próximos vencimientos</h2>
                  <div className="space-y-1">
                    {deadlines.slice(0, 6).map((a) => {
                      const n = daysTo(a.key_deadline);
                      return (
                        <button key={a.id} onClick={() => setSelected(a)} className="w-full flex items-center justify-between text-left py-2 px-2 rounded-lg hover:bg-slate-50">
                          <div className="min-w-0"><div className="text-sm font-medium text-slate-800 truncate">{a.title}</div><div className="text-xs text-slate-400">{a.deadline_type} · {a.key_deadline}</div></div>
                          <span className={`text-sm font-semibold shrink-0 ml-3 ${n < 0 ? "text-rose-600" : n <= 30 ? "text-amber-600" : "text-slate-500"}`}>{n < 0 ? `${-n}d vencido` : `${n}d`}</span>
                        </button>
                      );
                    })}
                    {deadlines.length === 0 && <div className="text-sm text-slate-400 italic py-2">Sin vencimientos registrados.</div>}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h2 className="font-bold text-slate-800 mb-3">Cartera por vía</h2>
                  <div className="space-y-3">
                    {byType.map(({ t, n }) => {
                      const v = VEHICLES[t]; const pct = counts.total ? Math.round((n / counts.total) * 100) : 0;
                      return (<div key={t}><div className="flex justify-between text-sm mb-1"><span className="text-slate-600">{v.label}</span><span className="text-slate-400">{n}</span></div><div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full ${v.chip}`} style={{ width: pct + "%" }} /></div></div>);
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {section === "pipeline" && (
            <>
              <Chips value={routeFilter} onChange={setRouteFilter} />
              <div className="space-y-3">
                {pipeline.map((a) => <PipelineRow key={a.id} a={a} onClick={() => setSelected(a)} />)}
                {pipeline.length === 0 && <div className="text-sm text-slate-400 italic py-10 text-center">No hay candidatos en esta vista.</div>}
              </div>
            </>
          )}

          {section === "portafolio" && (
            <>
              <Chips value={routeFilter} onChange={setRouteFilter} />
              {portfolio.length ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{portfolio.map((a) => <AssetCard key={a.id} a={a} onClick={() => setSelected(a)} />)}</div>
              ) : <div className="text-sm text-slate-400 italic py-10 text-center">Aún no hay activos con decisión «file» en esta vista.</div>}
            </>
          )}

          {section === "rutas" && (
            <>
              <h2 className="font-bold text-slate-800 mb-3">3 principios que no se doblan</h2>
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                {PRINCIPLES.map((p, i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-blue-600 shadow-sm p-4">
                    <div className="font-semibold text-slate-800 text-sm">{p.t}</div>
                    <div className="text-xs text-slate-500 mt-1 leading-relaxed">{p.d}</div>
                  </div>
                ))}
              </div>
              <h2 className="font-bold text-slate-800 mb-3">Las 4 vías de protección</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {ROUTES.map((r) => {
                  const v = VEHICLES[r.type]; const Icon = v.icon;
                  return (
                    <div key={r.type} className="bg-white rounded-xl border border-slate-200 border-t-4 shadow-sm p-5" style={{ borderTopColor: "transparent" }}>
                      <div className="flex items-center gap-2 mb-3"><span className={`${v.chip} text-white rounded-md p-1.5 inline-flex`}><Icon size={16} /></span><span className="font-bold text-slate-800">{v.label}</span></div>
                      <dl className="space-y-2 text-sm">
                        <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Protege</dt><dd className="text-slate-700">{r.protege}</dd></div>
                        <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Requiere</dt><dd className="text-slate-700">{r.requiere}</dd></div>
                        <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cómo se obtiene</dt><dd className="text-slate-700">{r.obtiene}</dd></div>
                        <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cuánto dura</dt><dd className="text-slate-700">{r.dura}</dd></div>
                      </dl>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {section === "vencimientos" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Días</th><th className="text-left px-4 py-3">Fecha</th><th className="text-left px-4 py-3">Tipo</th><th className="text-left px-4 py-3">Activo</th><th className="text-left px-4 py-3">Titular</th>
                </tr></thead>
                <tbody>
                  {deadlines.map((a) => {
                    const n = daysTo(a.key_deadline);
                    return (
                      <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setSelected(a)}>
                        <td className={`px-4 py-3 font-semibold ${n < 0 ? "text-rose-600" : n <= 30 ? "text-amber-600" : "text-slate-500"}`}>{n < 0 ? `${-n} venc.` : n}</td>
                        <td className="px-4 py-3">{a.key_deadline}</td><td className="px-4 py-3 text-slate-500">{a.deadline_type}</td><td className="px-4 py-3 font-medium">{a.title}</td><td className="px-4 py-3 text-slate-500">{a.owner}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {selected && <Detail a={selected} onClose={() => setSelected(null)} />}
      {showNew && <NewAssetModal onClose={() => setShowNew(false)} onAdd={addAsset} />}
    </div>
  );
}
