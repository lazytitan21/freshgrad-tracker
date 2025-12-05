import React, { useState } from "react";
import { motion as Motion } from "framer-motion";
import { useAuth } from "../providers/AuthProvider";

export default function LoginPage(){
  const { login } = useAuth();
  const [email,setEmail] = useState(""); const [password,setPassword] = useState(""); const [err,setErr]=useState("");
  function submit(e){ e.preventDefault(); setErr(""); try{ login(email.trim(), password); }catch(ex){ setErr(ex.message||"Login failed"); } }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-center px-4">
        <Motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="hidden md:flex flex-col justify-center gap-6 p-8 rounded-2xl bg-gradient-to-br from-indigo-700 to-indigo-500 text-white shadow-lg">
          <div>
            <h1 className="text-3xl font-bold">FreshGrad Tracker</h1>
            <p className="mt-2 text-slate-100/90">A modern candidate training tracker — manage intake, courses, and progression in one place.</p>
          </div>
          <div className="mt-2 text-sm bg-white/10 p-3 rounded-lg panel">
            <div className="font-semibold">Quick demo</div>
            <ul className="mt-2 text-sm list-disc pl-5">
              <li>Open candidate profiles</li>
              <li>Download PDF reports</li>
              <li>Import & export course data</li>
            </ul>
          </div>
        </Motion.div>

  <Motion.form onSubmit={submit} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="w-full rounded-2xl border panel p-8 shadow-sm space-y-4">
          <div className="text-2xl font-semibold">Sign in</div>
          <p className="text-sm text-slate-500">Use a demo account to explore — pre-seeded users available.</p>

          <label className="text-sm block">Email
            <input aria-label="email" className="mt-2 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@domain" />
          </label>

          <label className="text-sm block">Password
            <input aria-label="password" type="password" className="mt-2 w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••" />
          </label>

          {err && <div className="text-sm text-rose-600">{err}</div>}

          <button className="w-full rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2">Sign in</button>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Demo accounts are pre-seeded.</span>
            <a className="text-indigo-700 hover:underline" href="#/help">Need help?</a>
          </div>
        </Motion.form>
      </div>
    </div>
  );
}
