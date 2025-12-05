import React, { useCallback, useEffect, useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../providers/AuthProvider";
import { useStore } from "../providers/StoreProvider";
import { requiredCoursesForTrack, courseByCode, computeFinalAverage, coursePassed, trackNameById } from "../utils/helpers";

function MentorSelect({ intern, onChange }){
  const { mentors } = useStore();
  const selectedId = intern.mentorId || '';
  function handle(id){
    const m = (mentors||[]).find(x => x.id === id);
    if (!m) return onChange({ mentorId:'', mentorName:'', mentorEmail:'', mentorContact:'', schoolName:'', schoolEmirate:'' });
    onChange({ mentorId: m.id, mentorName: m.name, mentorEmail: m.email, mentorContact: m.contact, schoolName: m.school, schoolEmirate: m.emirate });
  }
  return (
    <div>
      <label className="text-sm">Assigned mentor
        <select className="mt-1 w-full rounded-xl border px-3 py-2" value={selectedId} onChange={e=>handle(e.target.value)}>
          <option value="">Select mentor…</option>
          {(mentors||[]).map(m => (
            <option key={m.id} value={m.id}>{m.name} — {m.school} ({m.emirate})</option>
          ))}
        </select>
      </label>
      {intern.schoolName && <div className="text-xs text-slate-500 mt-2">Assigned school: {intern.schoolName} • {intern.schoolEmirate}</div>}
    </div>
  );
}

function Info({ label, value }){ return (<div className="rounded-2xl border p-3 panel"><div className="text-xs uppercase text-slate-500 tracking-wide">{label}</div><div className="font-medium">{value}</div></div>); }
function Section({ title, children }){ return (<div className="mt-6"><div className="font-semibold mb-2">{title}</div>{children}</div>); }

function CandidateDrawer({ open, onClose, candidate, role, generateCandidatePDF, logEvent, notify }){
  const { user } = useAuth();
  const currentName = user?.name || user?.email || "User";
  const { candidates: _candidates, setCandidates, updateCandidate: updateCandidateAPI, syncCandidate, corrections, setCorrections, courses } = useStore();

  const updateCandidate = useCallback(async (patch) => {
    // Update local state immediately for responsiveness
    setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, ...patch } : c));
    
    // Sync to server
    try {
      const updated = { ...candidate, ...patch };
      await syncCandidate(updated);
    } catch (error) {
      console.error('Failed to sync candidate update:', error);
    }
  }, [setCandidates, syncCandidate, candidate]);

  function isTrainingStatus(s){
    const st = String(s || "").toLowerCase();
    return st.includes("assign") || st.includes("in training") || st.includes("enroll") || st.includes("progress");
  }
  const ensureInternship = useCallback(()=>{
    if (!candidate || !isTrainingStatus(candidate.status)) return;
    const list = Array.isArray(candidate.enrollments) ? candidate.enrollments.slice() : [];
    const hasIntern = list.some(x => x?.isInternship || x?.code === "INTERN" || /^internship$/i.test(String(x?.title||"")));
    if (hasIntern) return;
    const today = new Date().toISOString().slice(0,10);
    const internship = {
      id: `ENR-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      code: "INTERN",
      title: "INTERNSHIP",
      cohort: "",
      startDate: today,
      endDate: "",
      status: "In Progress",
      assignedBy: "System",
      assignedTs: new Date().toISOString(),
      isInternship: true,
      required: true,
      type: "Required",
      mentorName: "",
      mentorEmail: "",
      mentorContact: "",
      schoolName: "",
      schoolEmirate: "",
      passState: "Not Started",
    };
    updateCandidate({ enrollments: [internship, ...list] });
    try { logEvent?.("internship_assigned",{ candidateId:candidate.id, ts:new Date().toISOString() }); } catch (e) { void e; }
    try { notify?.({ to:{ role:"Admin" }, type:"internship_assigned", title:"INTERNSHIP auto-assigned", body:`Internship created for ${candidate.name||candidate.email}`, target:{ page:"candidates", candidateId:candidate.id } }); } catch (e) { void e; }
  }, [candidate, updateCandidate, logEvent, notify]);
  useEffect(()=>{ try { ensureInternship(); } catch (e) { void e; } }, [ensureInternship]);

  const finalAvg = candidate ? computeFinalAverage(candidate, courses) : null;

  const [_adminEdit, _setAdminEdit] = useState({ name:"", email:"", emirate:"", subject:"", gpa:0, mobile:"" });
  const [noteText,setNoteText]=useState(""); const [correctionText,setCorrectionText]=useState(""); const [_rejectReason,setRejectReason]=useState("");
  const [enr,setEnr]=useState({ code:"", cohort:"", startDate:"", endDate:"" });

  useEffect(()=>{ if(!candidate) return;
    _setAdminEdit({ name:candidate.name||"", email:candidate.email||"", emirate:candidate.emirate||"", subject:candidate.subject||"", gpa:candidate.gpa||0, mobile:candidate.mobile||"" });
    setNoteText(""); setCorrectionText(""); setRejectReason(""); setEnr({ code:"", cohort:"", startDate:"", endDate:"" });
  },[candidate]);

  if(!candidate) return null;

  const trackCoursesRequired = requiredCoursesForTrack(courses, candidate.trackId);
  const otherCourses = (courses||[]).filter(c => c.active!==false && (!c.tracks?.includes(candidate.trackId) || !c.isRequired));

  function doPDF(){
    generateCandidatePDF(candidate, courses, currentName);
    try { logEvent?.("candidate_pdf_generated",{ id:candidate.id, ts:new Date().toISOString() }); } catch (e) { void e; }
  }

  function addNote(){
    const text=noteText.trim(); if(!text) return;
    const entry={ id:`N-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, by:currentName, role, text, ts:new Date().toISOString() };
    const thread=Array.isArray(candidate.notesThread)?candidate.notesThread.slice():[]; thread.unshift(entry);
    updateCandidate({ notesThread:thread }); setNoteText(""); logEvent?.("note_added",{ candidateId:candidate.id, by:currentName, role, ts:entry.ts });
  }
  function changeStatus(s){ updateCandidate({ status:s }); try { logEvent?.("candidate_status_changed",{ id:candidate.id, status:s, ts:new Date().toISOString() }); } catch (e) { void e; } }

  function addEnrollment(){
    if(!enr.code){ alert("Select a course."); return; }
    const course = courseByCode(courses, enr.code);
    const newItem={ id:`ENR-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, code:enr.code, title:course?.title||enr.code, cohort:(enr.cohort||"").trim(), startDate:enr.startDate||"", endDate:enr.endDate||"", status:"Enrolled", assignedBy:currentName, assignedTs:new Date().toISOString() };
    const list=Array.isArray(candidate.enrollments)?candidate.enrollments.slice():[];
    if(list.some(x=>x.code===newItem.code && x.status!=="Withdrawn")){
      if(!window.confirm("This course is already assigned (or active). Add another anyway?")) return;
    }
    list.unshift(newItem);
    const nextStatus = (candidate.status==="Imported"||candidate.status==="Eligible") ? "Assigned" : candidate.status;
    updateCandidate({ enrollments:list, status:nextStatus });
    setEnr({ code:"", cohort:"", startDate:"", endDate:"" });
    try { logEvent?.("enrollment_added",{ candidateId:candidate.id, code:newItem.code, ts:newItem.assignedTs }); } catch (e) { void e; }
  }
  function updateEnrollment(id, patch){ const list=(candidate.enrollments||[]).map(x=>x.id===id?{...x,...patch}:x); updateCandidate({ enrollments:list }); try { logEvent?.("enrollment_updated",{ candidateId:candidate.id, id, ts:new Date().toISOString() }); } catch (e) { void e; } }
  function removeEnrollment(id){ if(!window.confirm("Remove this enrollment?")) return; const list=(candidate.enrollments||[]).filter(x=>x.id!==id); updateCandidate({ enrollments:list }); try { logEvent?.("enrollment_removed",{ candidateId:candidate.id, id, ts:new Date().toISOString() }); } catch (e) { void e; } }

  const _candidateCorrections = corrections.filter(c=>c.candidateId===candidate.id);
  const _pendingForTrainer = _candidateCorrections.filter(c=>c.forRole==="ECAE Trainer" && c.status==="Pending");

  function _submitCorrection(){
    const text=correctionText.trim(); if(!text) return;
    const item={ id:`CR-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, candidateId:candidate.id, by:currentName, role, forRole:"Admin", text, status:"Pending", ts:new Date().toISOString() };
    setCorrections(prev=>[item,...prev]); setCorrectionText(""); try { logEvent?.("correction_submitted",{ candidateId:candidate.id, by:item.by, role:item.role, ts:item.ts }); } catch (e) { void e; }
    try { notify?.({ role:"Admin" }, { type:"correction_requested", title:`Data correction: ${candidate.id}`, body: text, targetRef:{ page:"candidates", candidateId: candidate.id } }); } catch (e) { void e; }
    alert("Correction submitted (Pending).");
  }
  function _resolveCorrection(id){ setCorrections(prev=>prev.map(x=>x.id===id?{...x,status:"Resolved",resolvedTs:new Date().toISOString()}:x)); try { logEvent?.("correction_resolved",{ id, candidateId:candidate.id, ts:new Date().toISOString() }); } catch (e) { void e; }
    try { notify?.({ role:"ECAE Trainer" }, { type:"correction_resolved", title:`Request resolved: ${candidate.id}`, body:"Admin marked your request as Resolved.", targetRef:{ page:"candidates", candidateId: candidate.id } }); } catch (e) { void e; }
 }
  function _rejectCorrection(id, reason){ setCorrections(prev=>prev.map(x=>x.id===id?{...x,status:"Rejected",rejectedTs:new Date().toISOString(),rejectReason:reason||""}:x)); try { logEvent?.("correction_rejected",{ id, candidateId:candidate.id, reason, ts:new Date().toISOString() }); } catch (e) { void e; }
    try { notify?.({ role:"ECAE Trainer" }, { type:"correction_rejected", title:`Request rejected: ${candidate.id}`, body: reason || "Your correction request was rejected.", targetRef:{ page:"candidates", candidateId: candidate.id } }); } catch (e) { void e; }
 }
  function _respondToClarification(id, responseText){ setCorrections(prev=>prev.map(x=>x.id===id?{...x,status:"Responded",response:{by:currentName,role,text:responseText,ts:new Date().toISOString()}}:x));
    try { notify?.({ role:"Admin" }, { type:"clarification_responded", title:`Trainer responded: ${candidate.id}`, body: responseText, targetRef:{ page:"candidates", candidateId: candidate.id } }); } catch (e) { void e; }
}

  return (
    <AnimatePresence>
      {open && (
        <Motion.div className="fixed inset-0 z-50" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
          <div className="absolute inset-0 bg-black/30" onClick={onClose} />
          <Motion.aside initial={{x:480}} animate={{x:0}} exit={{x:480}} className="absolute right-0 top-0 h-full w-full max-w-xl panel shadow-xl p-6 overflow-y-auto">
            <div className="flex items-start justify-between">
              <div><h2 className="text-xl font-semibold">{candidate.name} <span className="text-slate-400 text-sm">({candidate.id})</span></h2><div className="text-slate-500 text-sm">{candidate.email} • {candidate.mobile}</div></div>
              <button onClick={onClose} className="rounded-xl border px-3 py-1">Close</button>
            </div>

            <Section title="Actions">
              <div className="flex gap-2">
                <button className="rounded-xl border px-3 py-1" onClick={doPDF}>Download PDF</button>
              </div>
            </Section>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Info label="National ID" value={candidate.nationalId} />
              <Info label="Emirate"     value={candidate.emirate} />
              <Info label="Subject"     value={candidate.subject} />
              <Info label="GPA"         value={Number(candidate.gpa).toFixed(2)} />
              <Info label="Track"       value={trackNameById(candidate.trackId)} />
              <Info label="Status" value={(
                <select className="rounded-lg border px-3 py-2 w-48 text-sm" value={candidate.status} onChange={e=>changeStatus(e.target.value)}>
                  {["Imported","Eligible","Assigned","In Training","Courses Completed","Assessed","Graduated","Ready for Hiring","Hired/Closed","On Hold","Withdrawn","Rejected"].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              )} />
              <Info label="Final Average" value={finalAvg ?? "—"} />
              <Info label="Sponsor" value={(<select className="rounded-lg border px-3 py-2 w-48 text-sm" value={candidate.sponsor || ""} onChange={e => updateCandidate({ sponsor: e.target.value })}><option value="">Select sponsor…</option>{["MOE","Mawaheb","MBZUH"].map(s => (<option key={s} value={s}>{s}</option>))}</select>)} />
            </div>

            <Section title="Training Assignments">
              <div className="text-sm text-slate-600 mb-2">Required for {trackNameById(candidate.trackId)}: {trackCoursesRequired.length ? trackCoursesRequired.map(x=>x.code).join(", ") : "—"}</div>

              <div className="rounded-2xl border p-3 mb-3">
                <div className="font-medium mb-2">Add Enrollment</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <label>Course
                    <select className="w-full rounded border px-2 py-1" value={enr.code} onChange={e=>setEnr({...enr,code:e.target.value})}>
                      <option value="">Select…</option>
                      {trackCoursesRequired.length>0 && <optgroup label="Required">{trackCoursesRequired.map(c=><option key={c.code} value={c.code}>{c.code} — {c.title}</option>)}</optgroup>}
                      {otherCourses.length>0 && <optgroup label="Other">{otherCourses.map(c=><option key={c.code} value={c.code}>{c.code} — {c.title}</option>)}</optgroup>}
                    </select>
                  </label>
                  <label>Cohort <input className="w-full rounded border px-2 py-1" placeholder="e.g., Cohort A" value={enr.cohort} onChange={e=>setEnr({...enr,cohort:e.target.value})} /></label>
                  <label>Start date <input type="date" className="w-full rounded border px-2 py-1" value={enr.startDate} onChange={e=>setEnr({...enr,startDate:e.target.value})} /></label>
                  <label>End date <input type="date" className="w-full rounded border px-2 py-1" value={enr.endDate} onChange={e=>setEnr({...enr,endDate:e.target.value})} /></label>
                </div>
                <div className="mt-2">
                  <button className="rounded-xl bg-slate-900 text-white px-4 py-2" onClick={addEnrollment}>Assign to Training</button>
                  <div className="text-xs text-slate-500 mt-2">Assigning updates status to <b>Assigned</b> if earlier stage.</div>
                </div>
              </div>

              <div className="rounded-2xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50"><tr className="text-left"><th className="px-4 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wide">Course</th><th className="px-4 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wide">Cohort</th><th className="px-4 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wide">Dates</th><th className="px-4 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wide">Status</th><th className="px-4 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wide">Actions</th></tr></thead>
                  <tbody>
                    {(candidate.enrollments||[]).length===0 ? (
                      <tr><td colSpan={5}><div className="p-3 text-slate-500">No enrollments yet.</div></td></tr>
                    ) : (
                      (candidate.enrollments||[]).map(item=>{
                        const course = courseByCode(courses, item.code);
                        const passed = course ? coursePassed(candidate, course) : false;
                        return (
                          <tr key={item.id} className="border-t">
                            <td>
                              <div className="font-medium">{item.code}</div>
                              <div className="text-xs text-slate-500">{item.title}</div>
                              {passed && <div className="text-xs text-emerald-700 mt-1">Passed (≥ {course?.passThreshold ?? 70})</div>}
                            </td>
                            <td>{item.cohort || "—"}</td>
                            <td>
                              <div>{item.startDate || "—"} → {item.endDate || "—"}</div>
                              <div className="text-xs text-slate-500">Assigned by {item.assignedBy} • {new Date(item.assignedTs).toLocaleString()}</div>
                            </td>
                            <td>
                              <select className="rounded border px-2 py-1" value={item.status} onChange={e=>updateEnrollment(item.id,{ status:e.target.value })}>
                                {["Enrolled","In Progress","Completed","Withdrawn"].map(s=><option key={s} value={s}>{s}</option>)}
                              </select>
                            </td>
                            <td><div className="flex gap-2"><button className="rounded-xl border px-3 py-1" onClick={()=>removeEnrollment(item.id)}>Remove</button></div></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Internship (Mandatory)">
              {(() => {
                const intern = (candidate.enrollments||[]).find(x => x?.isInternship || x?.code==="INTERN" || /^internship$/i.test(String(x?.title||"")));
                if (!intern) {
                  return <div className="text-sm text-slate-600">Internship will be auto-assigned when the candidate enters training (Assigned / In Training / Enrolled / In Progress).</div>;
                }
                function onChange(patch){ updateEnrollment(intern.id, patch); }
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Mentor selection: use mentors from global store */}
                        <MentorSelect intern={intern} onChange={onChange} />
                    <label className="text-sm">Passing state
                      <select className="mt-1 w-full rounded-xl border px-3 py-2" value={intern.passState||"Not Started"} onChange={e=>onChange({ passState:e.target.value })}>
                        <option>Not Started</option>
                        <option>In Progress</option>
                        <option>Passed</option>
                        <option>Failed</option>
                      </select>
                    </label>
                    <label className="text-sm">Start date
                      <input type="date" className="mt-1 w-full rounded-xl border px-3 py-2" value={intern.startDate||""} onChange={e=>onChange({ startDate:e.target.value })} />
                    </label>
                    <label className="text-sm">End date
                      <input type="date" className="mt-1 w-full rounded-xl border px-3 py-2" value={intern.endDate||""} onChange={e=>onChange({ endDate:e.target.value })} />
                    </label>
                  </div>
                );
              })()}
            </Section>

            <Section title="Courses (Results from ECAE)">
              <div className="rounded-2xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50"><tr className="text-left"><th className="px-4 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wide">Code</th><th className="px-4 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wide">Title</th><th className="px-4 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wide">Score</th><th className="px-4 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wide">Pass</th><th className="px-4 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wide">Date</th></tr></thead>
                  <tbody>
                    {(candidate.courseResults||[]).map((cr,idx)=>(
                      <tr key={idx} className="border-t"><td>{cr.code}</td><td>{cr.title}</td><td>{cr.score}</td><td>{cr.pass ? "Yes":"No"}</td><td>{cr.date}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Notes (timeline)">
              <div className="rounded-xl border p-3 space-y-3">
                <div className="space-y-2">
                  {(candidate.notesThread||[]).length===0 ? <div className="text-sm text-slate-500">No notes yet.</div> : (
                    <ul className="space-y-2">
                      {candidate.notesThread.map(n=>(
                        <li key={n.id} className="border rounded-lg p-2">
                          <div className="text-xs text-slate-500">{n.by} • {n.role} • {new Date(n.ts).toLocaleString()}</div>
                          <div className="text-sm mt-1">{n.text}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="space-y-2">
                  <textarea className="w-full rounded-xl border p-3" rows={3} value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Add a note… (your name and time will be recorded)"></textarea>
                  <button className="rounded-xl bg-slate-900 text-white px-4 py-2" onClick={addNote}>Add Note</button>
                </div>
              </div>
            </Section>

            <Section title="Data Corrections / Clarifications">
              {role==="Admin" ? (
                <div className="space-y-3"><div className="rounded-2xl border p-3"><div className="font-medium mb-2">Requests</div><div className="text-sm text-slate-500">(moved to parent)</div></div></div>
              ) : (
                <div className="space-y-3"><div className="rounded-2xl border p-3"> <div className="font-medium mb-2">Clarifications</div><div className="text-sm text-slate-500">(moved to parent)</div></div></div>
              )}
            </Section>
          </Motion.aside>
        </Motion.div>
      )}
    </AnimatePresence>
  );
}

export default CandidateDrawer;
