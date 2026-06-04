import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "./supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  const inputCls = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-slate-500";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-slate-900 text-white rounded-md p-1.5 inline-flex"><ShieldCheck size={18} /></span>
          <span className="font-bold text-lg text-slate-800">IP&nbsp;Folio</span>
        </div>
        <p className="text-sm text-slate-500 mb-5">Cartera de propiedad intelectual · acceso interno</p>
        <div className="space-y-3">
          <label className="block"><span className="text-xs font-semibold text-slate-500">Email</span>
            <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="block"><span className="text-xs font-semibold text-slate-500">Contraseña</span>
            <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") signIn(); }} /></label>
          {error && <div className="text-sm text-rose-600">{error}</div>}
          <button onClick={signIn} disabled={loading}
            className="w-full bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50">
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-4">Los usuarios se crean desde el panel de Supabase (Authentication → Users).</p>
      </div>
    </div>
  );
}
