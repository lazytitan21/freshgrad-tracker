import React, { useState, useMemo } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { useStore } from "../providers/StoreProvider";
import { classNames, computeFinalAverage, statusBadgeColor } from "../utils/helpers";

export default function CandidatesPage({ role, onOpenCandidate, onEditCandidate }){
  const { candidates, setCandidates, logEvent, courses } = useStore();
  const [q,setQ]=useState(""); const [statusFilter,setStatusFilter]=useState("");

  const rows = useMemo(()=> candidates.filter(c=>{
    const s=q.toLowerCase();
    const hit = String(c.id).toLowerCase().includes(s) || String(c.name).toLowerCase().includes(s) || String(c.email).toLowerCase().includes(s) || String(c.subject).toLowerCase().includes(s) || String(c.emirate).toLowerCase().includes(s);
    const ok = !statusFilter || c.status===statusFilter; return hit && ok;
  }),[q,statusFilter,candidates]);

  // selected is managed by parent App.jsx

  function deleteCandidate(id){
    if(!window.confirm("Delete this candidate? This cannot be undone.")) return;
    setCandidates(prev=>prev.filter(c=>c.id!==id));
    logEvent("candidate_deleted",{ id, ts:new Date().toISOString() });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search ID, name, email, subject, emirate" className="w-80 rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-200" />
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="rounded-xl border px-3 py-2">
            <option value="">All statuses</option>
            { ["Imported","Eligible","Assigned","In Training","Courses Completed","Assessed","Graduated","Ready for Hiring","Hired/Closed","On Hold","Withdrawn","Rejected"].map(s=><option key={s} value={s}>{s}</option>) }
          </select>
        </div>
        <div className="flex gap-2">
          {/* Parent controls Add Candidate modal */}
        </div>
      </div>

  <div className="rounded-2xl border panel shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-auto">
            <thead className="bg-slate-50 sticky top-0">
              <tr className="text-center">
                <th className="px-4 py-3 text-center">ID</th>
                <th className="px-4 py-3 text-center">Name</th>
                <th className="px-4 py-3 text-center">Subject</th>
                <th className="px-4 py-3 text-center">Emirate</th>
                <th className="px-4 py-3 text-center">GPA</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Final Avg</th>
                <th className="px-4 py-3 text-center">Sponsor</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {rows.map((c, idx) => (
                  <Motion.tr key={c.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.16,delay: idx*0.01}} className={classNames("border-t hover:bg-slate-50 transform-gpu transition",
                    idx%2===0 ? "bg-white" : "bg-slate-50/50")}
                  >
                    <td className="px-4 py-3 text-center">{c.id}</td>
                    <td className="px-4 py-3 text-center">{c.name}</td>
                    <td className="px-4 py-3 text-center">{c.subject}</td>
                    <td className="px-4 py-3 text-center">{c.emirate}</td>
                    <td className="px-4 py-3 text-center">{Number(c.gpa).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center"><span className={classNames("px-2 py-1 rounded-full text-xs inline-block", statusBadgeColor(c.status))}>{c.status}</span></td>
                    <td className="px-4 py-3 text-center">{computeFinalAverage(c, courses) ?? "—"}</td>
                    <td className="px-4 py-3 text-center">{c.sponsor || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button onClick={()=>onOpenCandidate?.(c.id)} className="text-indigo-600 hover:underline">Open</button>
                        {role==="Admin" && (
                          <>
                            <button onClick={()=>onEditCandidate?.(c.id)} className="text-slate-700 hover:underline">Edit</button>
                            <button onClick={()=>deleteCandidate(c.id)} className="text-rose-600 hover:underline">Delete</button>
                          </>
                        )}
                      </div>
                    </td>
                  </Motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer and modals are rendered by App.jsx */}
    </div>
  );
}
