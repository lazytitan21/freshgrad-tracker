import React, { useMemo, useState, useEffect } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import { Workflow, Home, Users, BookOpen, ClipboardList, FilePlus, UploadCloud, GraduationCap, Download, UserPlus, Briefcase, User, Settings, Sun, Moon } from "lucide-react";
import { AuthProvider, useAuth } from "./providers/AuthProvider";
import { StoreProvider, useStore } from "./providers/StoreProvider";
import MentorsPage from "./pages/MentorsPage";

/* FreshGrad Training Tracker — Courses Catalog + Assignments + Corrections + Charts + Candidate PDF + Courses Exports */

// AuthProvider and StoreProvider extracted to `src/providers/*` for clarity.

import LoginPage from "./pages/LoginPage";
import CandidateDrawer from "./components/CandidateDrawer";
import program1 from "./assets/program-1.svg";
import program2 from "./assets/program-2.svg";
import program3 from "./assets/program-3.svg";
import dashboardMock from "./assets/dashboard-mock.svg";

const SPONSORS = [
  "MOE",
  "Mawaheb",
  "MBZUH"
];

const EMIRATES = ["Abu Dhabi","Dubai","Sharjah","Ajman","Umm Al Quwain","Ras Al Khaimah","Fujairah"];
const SUBJECTS = ["Mathematics","Science","Physics","Chemistry","Biology","Arabic","English","Computer Science"];

// TRACKS and trackNameById are provided by src/utils/helpers.js

// seedCourses and seedCandidates moved into StoreProvider for clarity

// StoreProvider, useStore and utility useLocalStorage were extracted to
// `src/providers/StoreProvider.jsx` to keep `App.jsx` focused. Import
// the hooks from there where needed.


// Utilities moved to src/utils/helpers.js
import { classNames, exportXLSX, subjectToTrackId, emailRe, mobileRe, requiredCoursesForTrack, computeFinalAverage, coursePassed, parseCSV, isRequiredForCandidate, statusToMainStageIndex, TRACKS, trackNameById } from "./utils/helpers";

function drawSimpleTimeline(doc, x, y, width, steps, currentIdx) {
  const n = steps.length;
  if (n < 2) return;
  const spacing = width / (n - 1);
  const lineY = y;
  const r = 5; // circle radius

  // Base line
  doc.setLineWidth(1);
  doc.setDrawColor(200, 205, 212);
  doc.line(x, lineY, x + width, lineY);

  // Progress line
  doc.setDrawColor(30, 41, 59);
  const progX = x + spacing * currentIdx;
  doc.line(x, lineY, progX, lineY);

  // Nodes + labels
  for (let i = 0; i < n; i++) {
    const px = x + i * spacing;
    const filled = i <= currentIdx;
    doc.setDrawColor(30, 41, 59);
    if (filled) { doc.setFillColor(30, 41, 59); doc.circle(px, lineY, r, "FD"); }
    else { doc.setFillColor(255, 255, 255); doc.circle(px, lineY, r, "S"); }
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(steps[i], px, lineY + 14, { align: "center" });
  }

  // You are here
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("YOU ARE HERE", x + spacing * currentIdx, lineY - 8, { align: "center" });
}

// Course type helper for the PDF tables is imported from ./utils/helpers.js


/* ---------- Candidate PDF helper ---------- */
function generateCandidatePDF(candidate, courses, userName){
  const jsPDF = window.jspdf?.jsPDF || window.jsPDF?.jsPDF;
  if (!jsPDF) { alert("PDF export requires jsPDF + AutoTable. Add the CDN scripts in index.html."); return; }
  const doc = new jsPDF("p","pt","a4");
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 36;
  const now = new Date().toLocaleString();

  // Header bar
  doc.setFillColor(15,23,42); // slate-900
  doc.rect(0,0,pageW,72,"F");
  doc.setTextColor(255,255,255);
  doc.setFontSize(16);
  doc.text("FreshGrad Training Tracker — Candidate Report", margin, 32);
  doc.setFontSize(10);
  doc.text(`Generated ${now} by ${userName || "User"}`, margin, 52);

  // 1) Candidate information
  let y = 96;
  doc.setTextColor(17,24,39); // slate-800
  doc.setFontSize(13);
  doc.text("Candidate Overview", margin, y);
  y += 10;

  const finalAvg = computeFinalAverage(candidate, courses);
  const kv = [
    ["Candidate Name", candidate.name],
    ["Candidate ID", candidate.id],
    ["Status", candidate.status],
    ["Track", trackNameById(candidate.trackId)],
    ["Subject", candidate.subject],
    ["Emirate", candidate.emirate],
    ["GPA", String(Number(candidate.gpa).toFixed(2))],
    ["Final Average", finalAvg == null ? "—" : String(finalAvg)],
    ["Email", candidate.email],
    ["Mobile", candidate.mobile],
    ["National ID", candidate.nationalId || "—"],
  ];
  // Training progress (% completed out of assigned) — show only if in training stage
  (function(){
    const s = String(candidate.status || "").toLowerCase();
    const inTraining = s.includes("train") || s.includes("progress") || s.includes("assign") || s.includes("enroll");
    const assigned = (candidate.enrollments || []).filter(e => String(e.status || "").toLowerCase() !== "withdrawn");
    const total = assigned.length;
    const completed = assigned.filter(e => String(e.status || "").toLowerCase() === "completed").length;
    if (inTraining && total > 0){
      const pct = Math.round((completed / total) * 100);
      kv.push(["Training Progress", `${pct}% (${completed} of ${total})`]);
    }
  })();


  // two-column grid
  doc.setFontSize(11);
  const midX = margin + 260;
  let yL = y + 10;
  let yR = y + 10;
  kv.forEach((pair, idx)=>{
    const [k,v] = pair;
    const x = idx%2===0 ? margin : midX;
    const yRef = idx%2===0 ? yL : yR;
    doc.setTextColor(100,116,139); doc.text(k, x, yRef);
    doc.setTextColor(15,23,42);    doc.text(String(v), x, yRef+14);
    if (idx%2===0) yL += 36; else yR += 36;
  });
  y = Math.max(yL, yR) + 8;

  // 2) Five-step timeline (right after National ID)
  const steps = ["Imported", "Assigned", "In Training", "Graduated", "Ready for Hiring"];
  const currentIdx = statusToMainStageIndex(candidate.status);
  drawSimpleTimeline(doc, margin, y + 8, pageW - margin * 2, steps, currentIdx);
  y += 48;

  // Small helper to use autotable via either API
  function runAutoTable(opts){
    if (doc.autoTable) { doc.autoTable(opts); return doc.lastAutoTable?.finalY || opts.startY; }
    if (window.jspdf?.autoTable) { window.jspdf.autoTable(doc, opts); return doc.lastAutoTable?.finalY || opts.startY; }
    return opts.startY;
  }

  // 3) Courses in progress
  doc.setTextColor(17,24,39);
  doc.setFontSize(12);
  doc.text("Courses in Progress", margin, y);
  y += 10;

  const inProg = (candidate.enrollments || [])
    .filter(e => (e.status || "Enrolled") !== "Completed" && (e.status || "") !== "Withdrawn")
    .map(e => {
      const c = (courses || []).find(k => k.code === e.code);
      const type =
        (e.isInternship || String(e.code).toUpperCase() === "INTERN" || /internship/i.test(e.title || "") || e.required || e.type === "Required")
          ? "Required"
          : isRequiredForCandidate(e.code, candidate, courses);
      return [
        e.code,
        e.title || c?.title || "",
        e.cohort || "—",
        e.startDate || "—",
        e.endDate || "—",
        e.status || "Enrolled",
        type
      ];
    });

  if (inProg.length) {
  y = runAutoTable({
      startY: y,
      head: [["Course ID","Title","Cohort","Start","End","Status","Type"]],
      body: inProg,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [15,23,42], textColor: 255 },
      margin: { left: margin, right: margin }
    }) + 30;
  } else {
    y += 10
    doc.setFontSize(10);
    doc.setTextColor(100,116,139);
    doc.text("No courses currently in progress.", margin, y);
    y += 25;
  }

  // 4) Courses completed
doc.setTextColor(17,24,39);
  doc.setFontSize(12);
  doc.text("Courses Completed", margin, y);
  y += 10;

  const completed = (candidate.courseResults || []).map(r => {
    // Try to find cohort from enrollment list (if any)
    const enr = (candidate.enrollments || []).find(e => e.code === r.code);
    const c = (courses || []).find(k => k.code === r.code);
    const type = (String(r.code).toUpperCase() === "INTERN") ? "Required" : isRequiredForCandidate(r.code, candidate, courses);
    return [
      r.code,
      r.title || c?.title || "",
      enr?.cohort || "—",
      (typeof r.score === "number" ? String(r.score) : "—"),
      r.pass ? "Yes" : "No",
      r.date || "—",
      type
    ];
  });

  if (completed.length) {
    y = runAutoTable({
      startY: y,
      head: [["Course ID","Title","Cohort","Score","Pass","Completion Date","Type"]],
      body: completed,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [15,23,42], textColor: 255 },
      margin: { left: margin, right: margin }
    }) + 18;
  } else {
    doc.setFontSize(10);
    doc.setTextColor(100,116,139);
    doc.text("No completed courses recorded.", margin, y);
    y += 18;
  }

  // Done
  // Mentor details (Internship) — placed right after "Courses Completed"
  (function(){
    const intern = (candidate.enrollments||[]).find(x => x?.isInternship || x?.code==="INTERN" || /internship/i.test(String(x?.title||"")));
    doc.setTextColor(17,24,39);
    doc.setFontSize(12);
    doc.text("Mentor details", margin, y);
    y += 10;
    if (!intern){
      doc.setFontSize(10);
      doc.setTextColor(100,116,139);
      doc.text("No internship assigned.", margin, y);
      y += 18;
      doc.setTextColor(17,24,39);
      return;
    }
    const rows = [
      ["Mentor name", String(intern.mentorName||"")],
      ["Mentor email", String(intern.mentorEmail||"")],
      ["Mentor contact", String(intern.mentorContact||"")],
      ["Assigned school", String(intern.schoolName||"")],
      ["School emirate", String(intern.schoolEmirate||"")]
    ];
  y = runAutoTable({
      startY: y,
      head: [["Field","Value"]],
      body: rows,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [15,23,42], textColor: 255 },
      margin: { left: margin, right: margin }
    }) + 18;
  })();

  const safeName = String(candidate.name || "").replace(/\s+/g, "_");
  doc.save(`${candidate.id}-${safeName}.pdf`);
}


// ------------------------------ Template helpers ------------------------------
function buildIntakeTemplateCSV(){
  const hdr=["Full Name","Subject","GPA","Emirate","Email","Mobile","National ID","Source Batch"];
  const sample=[
    ["Sara Ahmed","Mathematics","3.75","Dubai","sara.ahmed@example.ae","0501234567","784-XXXX-XXXXXXX-0","Batch A"],
    ["Omar Ali","Arabic","3.20","Sharjah","omar.ali@example.ae","0507654321","784-YYYY-YYYYYYY-1","Batch A"],
  ];
  const esc = s => `"${String(s).replace(/"/g,'""')}"`;
  return [hdr,...sample].map(r=>r.map(esc).join(",")).join("\n");
}
function DownloadTemplateButton({ filename, buildCSV }){
  const [href,setHref] = useState("");
  useEffect(()=>{
    try{
      const blob = new Blob(["\uFEFF"+buildCSV()],{type:"text/csv;charset=utf-8;"});
      const url = URL.createObjectURL(blob);
      setHref(url);
      return ()=>URL.revokeObjectURL(url);
    }catch(e){ void e; setHref("data:text/csv;charset=utf-8,"+encodeURIComponent("Full Name,Subject,GPA,Emirate,Email,Mobile,National ID,Source Batch\n")); }
  },[buildCSV]);
  return <a href={href} download={filename} className="rounded-xl border px-4 py-2 inline-flex items-center justify-center">Download Template</a>;
}

// ------------------------------ App chrome ------------------------------
const NAV = [

  { id:"dashboard",  label:"Dashboard" },
  { id:"candidates", label:"Candidates" },
  { id:"courses",    label:"Courses" },
  { id:"enrollment", label:"Course Enrollment" },
  { id:"import",     label:"Import Candidates" },
  { id:"results",    label:"Upload Results (ECAE)" },
  { id:"graduation", label:"Graduation Review" },
  { id:"exports",    label:"Exports" },
  { id:"applicants", label:"Applicants" },
  { id:"hiring",     label:"Hiring Tracker" },
  { id:"mentors",    label:"Mentors" },
  { id:"users",      label:"Platform Users" },
  { id:"settings",   label:"Settings" },

];
const ROLES = ["Admin","ECAE Manager","ECAE Trainer","Auditor","Teacher"];
const ROLE_PERMISSIONS = {
  Admin:["dashboard","candidates","courses","import","results","graduation","applicants","exports","settings","users","hiring","enrollment","mentors"],
  "ECAE Manager":["dashboard","candidates","courses","results","graduation","applicants","hiring","enrollment","mentors"],
  "ECAE Trainer":["candidates","courses","results","enrollment"],
  Auditor:["dashboard","candidates"],
};
// Hiring stages used in the Hiring Tracker
const HIRING_STAGES = [
  "Graduated",
  "Screening",
  "Interview",
  "Offer Made",
  "Offer Accepted",
  "Background Check",
  "Contract Signed",
  "Assigned School",
  "On Hold",
  "Rejected/Closed"
];

function TopBar(){
  const { user } = useAuth();
  const { notificationsFor, markRead, markAllReadFor, setUserName } = useStore();
  const [open,setOpen]=useState(false);
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('fg_theme') === 'dark'; } catch(err){ void err; return false; }
  });

  useEffect(()=>{
    try{ localStorage.setItem('fg_theme', dark ? 'dark' : 'light'); }catch(err){ void err; }
    if (dark) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
  },[dark]);

  // keep Store.userName in sync (used by PDF, notes, etc.)
  useEffect(()=>{ if(user){ setUserName(user.name || user.email); } },[user, setUserName]);

  const myNotifs = notificationsFor(user);
  const unread = myNotifs.filter(n=>!n.read).length;

  return (
  <div className="sticky top-0 z-40 bg-white/90 panel backdrop-blur border-b">
      <div className="px-4 md:px-8 py-3 flex items-center gap-3">
        <div/>
        <div className="font-semibold mr-auto flex items-center gap-2">
        </div>

        {/* Theme toggle as animated switch (div[role=switch] to avoid native button focus rectangle) */}
        <div>
          <div
            role="switch"
            tabIndex={0}
            aria-checked={dark}
            aria-label="Toggle theme"
            title={dark?"Switch to light":"Switch to dark"}
            onClick={()=>setDark(d=>!d)}
            onKeyDown={(e)=>{ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDark(d=>!d); } }}
            onMouseDown={(e)=>{ e.preventDefault(); document.documentElement.classList.add('suppress-focus'); }}
            onMouseUp={()=>{ document.documentElement.classList.remove('suppress-focus'); }}
            onMouseLeave={()=>{ document.documentElement.classList.remove('suppress-focus'); }}
            onTouchStart={(e)=>{ e.preventDefault(); document.documentElement.classList.add('suppress-focus'); }}
            onTouchEnd={()=>{ document.documentElement.classList.remove('suppress-focus'); }}
            className="mr-2 focus:outline-none focus-visible:ring-0 select-none theme-toggle"
          >
            <div className={classNames("w-14 h-8 rounded-full flex items-center p-1 cursor-pointer relative overflow-hidden", dark?"bg-slate-700":"bg-slate-100")}>
              <Motion.div
                animate={{ x: dark ? 24 : 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                className="absolute left-1 top-1 h-6 w-6 rounded-full shadow-md flex items-center justify-center bg-white"
                tabIndex={-1}
                style={{ willChange: 'transform', pointerEvents: 'none' }}
              >
                {dark ? <Moon className="h-4 w-4 text-slate-700"/> : <Sun className="h-4 w-4 text-amber-400"/>}
              </Motion.div>
            </div>
          </div>
        </div>

        {/* Bell */}
        <div className="relative">
          <button className="relative rounded-xl border px-3 py-1" onClick={()=>setOpen(v=>!v)} aria-label="Notifications">
            🔔
            {unread>0 && <span className="absolute -top-1 -right-1 text-[10px] bg-rose-600 text-white rounded-full px-1">{unread}</span>}
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-[360px] max-h-[320px] overflow-auto rounded-2xl border bg-white panel shadow-lg text-sm">
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <div className="font-medium">Notifications</div>
                <button className="text-xs underline" onClick={()=>{ markAllReadFor(user); }}>Mark all read</button>
              </div>
              <ul className="divide-y">
                {myNotifs.slice(0,20).map(n=>(
                  <li key={n.id} className="px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{n.title}</div>
                      {!n.read && <button className="text-xs underline" onClick={()=>markRead(n.id)}>Mark read</button>}
                    </div>
                    <div className="text-slate-600">{n.body}</div>
                    <div className="text-xs text-slate-400 mt-1">{new Date(n.ts).toLocaleString()}</div>
                  </li>
                ))}
                {!myNotifs.length && <li className="px-3 py-4 text-slate-500">No notifications.</li>}
              </ul>
            </div>
          )}
        </div>

        {/* User */}
        <div className="flex items-center gap-3">
              <div className="flex flex-col items-center">
            <div className="text-sm text-slate-600 dark:text-slate-200">{user?.name || user?.email}</div>
              <div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100"><b>{user?.role}</b></span>
              </div>
          </div>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}

function SignOutButton(){
  const { logout } = useAuth();
  return <button className="rounded-xl border px-3 py-1" onClick={logout}>Sign out</button>;
}


function AppShell({ page, setPage }) {
  const { user } = useAuth();
  const role = user?.role;
  const allowed = ROLE_PERMISSIONS[role] || [];
  // Sidebar is static now (always expanded)
  // Provide app-level selection for candidate drawer
  const { candidates, logEvent, notify } = useStore();
  const [selectedId, setSelectedId] = useState("");
  const [editCandidateId, setEditCandidateId] = useState("");
  const selected = React.useMemo(() => (Array.isArray(candidates) ? candidates.find(c => String(c.id) === String(selectedId)) : null), [candidates, selectedId]);
  const editCandidate = React.useMemo(() => (Array.isArray(candidates) ? candidates.find(c => String(c.id) === String(editCandidateId)) : null), [candidates, editCandidateId]);

  return (
    <div className="flex min-h-screen bg-slate-50">
    <aside className="hidden md:flex flex-col gap-3 border-r bg-white panel p-2 w-64" style={{ boxSizing: "border-box" }}>
        <div className="flex items-center gap-2 mb-2 px-2">
          <button onClick={()=>setPage('dashboard')} className="flex items-center gap-3 w-full text-left focus:outline-none">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 4h6v6H3z M15 4h6v6h-6z M15 14h6v6h-6z M9 7h6 M9 7v10 M15 7v7" />
                </svg>
              </div>
              <div className="flex flex-col">
                <div className="font-bold text-xl leading-tight text-slate-900 dark:text-white">Talent Tracker</div>
                <div className="text-sm text-slate-600">MOE - ECAE</div>
              </div>
            </div>
          </button>
        </div>

        <nav className="flex flex-col gap-1 px-1">
          {(() => {
            const ICONS = {
              dashboard: Home,
              candidates: Users,
              mentors: Users,
              courses: BookOpen,
              enrollment: ClipboardList,
              import: FilePlus,
              results: UploadCloud,
              graduation: GraduationCap,
              exports: Download,
              applicants: UserPlus,
              hiring: Briefcase,
              users: User,
              settings: Settings,
            };
            return NAV.filter(n => allowed.includes(n.id)).map(n => {
              const Icon = ICONS[n.id] || Home;
              return (
                <Motion.button
                  key={n.id}
                  onClick={() => setPage(n.id)}
                  title={n.label}
                  layout
                  whileHover={{ scale: 1.03 }}
                  className={classNames(
                    "relative flex items-center gap-3 rounded-xl px-2 py-2 font-medium hover:bg-slate-100"
                  )}
                >
                  {/* Active indicator: vertical accent bar */}
                  <span className={classNames("absolute left-0 top-1 bottom-1 w-1 rounded-r-md", page===n.id?"bg-emerald-500":"bg-transparent")} aria-hidden />
                  <div className={classNames("h-8 w-8 rounded-lg panel flex items-center justify-center text-sm font-semibold bg-slate-100 text-slate-700") }>
                    <Icon className="h-5 w-5 text-slate-700" />
                  </div>
                  <Motion.span key={n.id+"-label"} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} className="whitespace-nowrap">
                    {n.label}
                  </Motion.span>
                </Motion.button>
              );
            });
          })()}
        </nav>

        <div className="mt-auto text-xs text-slate-400 px-2"> 
          <div className="text-sm">Role: {role}</div>
        </div>
      </aside>
      <main className="flex-1">
        <TopBar />
        <div className="p-4 md:p-8">
          <AnimatePresence mode="wait">
            <Motion.div key={page} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
              {page==="dashboard"  && <Dashboard />}
              {page==="applicants"  && <ApplicantsPage />}
              {page==="candidates" && <CandidatesPage role={role} onOpenCandidate={(id)=>setSelectedId(id)} onEditCandidate={(id)=>setEditCandidateId(id)} />}
              {page==="enrollment" && <CourseEnrollmentPage />}
              {page==="courses"    && <CoursesPage role={role} />}
              {page==="import"     && <ImportPage />}
              {page==="results"    && <ResultsUploadPage />}
              {page==="graduation" && <GraduationReviewPage />}
              {page==="exports"    && <ExportsPage />}
              {page==="mentors"   && <MentorsPage />}
              {page==="settings"   && <SettingsPage />}
              {page==="users"      && <UsersPage />}
              {page==="hiring"     && <HiringTrackerPage />}
            </Motion.div>
          </AnimatePresence>

          {/* Global Drawer rendered at App level */}
          <CandidateDrawer
            open={Boolean(selected)}
            onClose={()=>setSelectedId("")}
            candidate={selected}
            role={role}
            generateCandidatePDF={generateCandidatePDF}
            logEvent={logEvent}
            notify={notify}
          />

          {/* Edit Candidate modal rendered at App level */}
          <EditCandidateModal open={Boolean(editCandidate)} candidate={editCandidate} onClose={()=>setEditCandidateId("")} />
        </div>
      </main>
    </div>
  );
}


/* ---------- Tiny chart helpers (pure SVG) ---------- */
// Use CSS variables for palette so colors can change with the theme
const palette = [
  "var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)",
  "var(--c6)", "var(--c7)", "var(--c8)", "var(--c9)", "var(--c10)", "var(--c11)", "var(--c12)"
];

function DonutChart({ data, size = 160, thickness = 24, centerLabel = "" }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = size / 2, ir = r - thickness;
  let a0 = -Math.PI / 2;
  const arcs = data.map((d, i) => {
    const a1 = a0 + (total ? (d.value / total) * 2 * Math.PI : 0);
    const large = (a1 - a0) > Math.PI ? 1 : 0;
    const [cx, cy] = [r, r];
    const x0 = cx + ir * Math.cos(a0), y0 = cy + ir * Math.sin(a0);
    const x1 = cx + ir * Math.cos(a1), y1 = cy + ir * Math.sin(a1);
    const X0 = cx + r  * Math.cos(a0), Y0 = cy + r  * Math.sin(a0);
    const X1 = cx + r  * Math.cos(a1), Y1 = cy + r  * Math.sin(a1);
    const path = `M ${x0} ${y0} A ${ir} ${ir} 0 ${large} 1 ${x1} ${y1} L ${X1} ${Y1} A ${r} ${r} 0 ${large} 0 ${X0} ${Y0} Z`;
    a0 = a1;
    return { path, fill: d.color || palette[i % palette.length], label: d.label, value: d.value };
  });
  return (
    <svg className="text-slate-900 dark:text-white chart" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((a, i) => <path key={i} d={a.path} fill={a.fill} stroke="currentColor" strokeWidth={0.6} strokeOpacity={0.06} />)}
      <text x={r} y={r} textAnchor="middle" dominantBaseline="middle" fontSize="14" fill="currentColor">
        {centerLabel || total}
      </text>
    </svg>
  );
}

function VBarChart({ data, height = 250, barWidth = 50, gap = 50, tickY = true, labelMax = 20 }) {
  const max = Math.max(1, ...data.map(d => d.value));
  const width = data.length * (barWidth + gap) + gap;
  const short = (s) => (String(s).length > labelMax ? String(s).slice(0, labelMax - 1) + "…" : s);
  return (
    <svg className="text-slate-900 dark:text-white chart" width={width} height={height}>
      {data.map((d, i) => {
        const h = Math.round((d.value / max) * (height - 50));
        const x = gap + i * (barWidth + gap);
        const y = height - h - 18;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={h} rx="4" fill={d.color || palette[i % palette.length]} stroke="currentColor" strokeWidth={0.6} strokeOpacity={0.06} />
            <text x={x + barWidth / 2} y={height - 4} textAnchor="middle" fontSize="10" fill="currentColor">{short(d.label)}</text>
            {tickY && <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" fontSize="10" fill="currentColor">{d.value}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function HBarChart({ data, width = 420, rowHeight = 22, gap = 8, labelWidth = 160 }) {
  const max = Math.max(1, ...data.map(d => d.value));
  const height = data.length * (rowHeight + gap) + gap;
  return (
    <svg className="text-slate-900 dark:text-white chart" width={width} height={height}>
      {data.map((d, i) => {
        const w = Math.round((d.value / max) * (width - labelWidth - 40));
        const y = gap + i * (rowHeight + gap);
        return (
          <g key={i}>
            <text x={0} y={y + rowHeight - 5} fontSize="12" fill="currentColor">{d.label}</text>
            <rect x={labelWidth} y={y} width={w} height={rowHeight} rx="4" fill={d.color || palette[i % palette.length]} stroke="currentColor" strokeWidth={0.6} strokeOpacity={0.06} />
            <text x={labelWidth + w + 6} y={y + rowHeight - 6} fontSize="12" fill="currentColor">{d.value}</text>
          </g>
        );
      })}
    </svg>
  );
}

function KpiCard({ label, value, hint }) {
  return (
    <Motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: "0 8px 20px rgba(2,6,23,0.08)" }}
      className="rounded-2xl border panel p-4 shadow-sm"
    >
      <div className="text-slate-500 text-xs">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </Motion.div>
  );
}
/* ---------- /chart helpers ---------- */


// ------------------------------ Dashboard ------------------------------
function Bar({ label, value, max }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-slate-600"><span>{label}</span><span>{value}</span></div>
      <div className="h-2 rounded bg-slate-200"><div className="h-2 rounded bg-slate-900" style={{ width: `${pct}%` }} title={`${pct}%`} /></div>
    </div>
  );
}
function Stat({ label, value, hint }) {
  return (
    <div className="rounded-2xl border panel p-4 shadow-sm">
      <div className="text-slate-500 text-xs">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
    </div>
  );
}
function Dashboard() {
  const { candidates, courses, corrections } = useStore();

  // ---- Aggregations
  const byStatus = {};
  const bySubject = {};
  const byEmirate = {};
  const perCourse = new Map(); // code -> Set(candidateId) to avoid double counting
  candidates.forEach(c => {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    bySubject[c.subject] = (bySubject[c.subject] || 0) + 1;
    byEmirate[c.emirate] = (byEmirate[c.emirate] || 0) + 1;
    (c.enrollments || []).forEach(e => {
      if (!perCourse.has(e.code)) perCourse.set(e.code, new Set());
      perCourse.get(e.code).add(c.id);
    });
    (c.courseResults || []).forEach(r => {
      if (!perCourse.has(r.code)) perCourse.set(r.code, new Set());
      perCourse.get(r.code).add(c.id);
    });
  });

  const totalCandidates = candidates.length;
  const totalCourses = courses.length;
  const totalSubjects = Object.keys(bySubject).length;

  // Top subjects & courses
  const topSubjects = Object.entries(bySubject).sort((a,b)=>b[1]-a[1]).slice(0,5)
    .map(([label, value], i) => ({ label, value, color: palette[i%palette.length] }));

  const topCourses = [...perCourse.entries()]
    .map(([code, set]) => ({ label: `${code} — ${courses.find(c=>c.code===code)?.title ?? ""}`.trim(), value: set.size }))
    .sort((a,b)=>b.value-a.value).slice(0,5);

  // Status donut data
  const statusOrder = ["Imported","Eligible","Assigned","In Training","Courses Completed","Assessed","Graduated","Ready for Hiring","Hired/Closed","On Hold","Withdrawn","Rejected"];
  const donut = statusOrder
    .filter(s => byStatus[s])
    .map((label, i) => ({ label, value: byStatus[label], color: palette[i%palette.length] }));

  // Pass rates per REQUIRED course
  const reqCourses = courses.filter(c => c.active !== false && c.isRequired);
  const passStats = reqCourses.map(rc => {
    let total = 0, pass = 0;
    candidates.forEach(c => {
      const r = (c.courseResults || []).find(k => k.code === rc.code);
      if (r && typeof r.score === "number") {
        total++;
        if (r.score >= (rc.passThreshold ?? 70)) pass++;
      }
    });
    const rate = total ? Math.round((pass/total)*100) : null;
    return { code: rc.code, title: rc.title, total, pass, rate, threshold: rc.passThreshold ?? 70 };
  }).filter(x => x.total > 0)
    .sort((a, b) => (a.rate ?? 101) - (b.rate ?? 101))
    .slice(0, 5);

  // Bottlenecks (heuristics)
  const waitingNoEnroll = candidates.filter(c => (c.status==="Assigned" || c.status==="In Training") && (!c.enrollments || c.enrollments.length===0)).length;

  const pendingTrainerClarifications = corrections.filter(x => x.forRole==="ECAE Trainer" && x.status==="Pending").length;

  function lastActivityTs(c){
    let t = 0;
    if (c.notesThread?.length) t = Math.max(t, Date.parse(c.notesThread[0].ts)||0);
    if (c.enrollments?.length) t = Math.max(t, ...c.enrollments.map(e => Date.parse(e.assignedTs)||0));
    if (c.courseResults?.length) t = Math.max(t, ...c.courseResults.map(r => Date.parse(r.date)||0));
    return t || null;
  }
  const STALE_DAYS = 21;
  const now = Date.now();
  const stale = candidates.filter(c => {
    const t = lastActivityTs(c);
    return !t || (now - t) > STALE_DAYS*24*3600*1000;
  }).length;

  // "At risk" = not meeting track requirements
  function trackReqsOk(c){
    const track = TRACKS.find(t => t.id === c.trackId);
    if (!track) return false;
    const req = courses.filter(co => co.active !== false && co.isRequired && co.tracks?.includes(c.trackId));
    const avg = computeFinalAverage(c, courses) ?? 0;
    const okAvg = avg >= track.minAverage;
    const okReq = req.every(course => {
      const r = (c.courseResults || []).find(k => k.code === course.code);
      return r && Number(r.score) >= (course.passThreshold ?? 70);
    });
    return okAvg && okReq;
  }
  const atRisk = candidates.filter(c => !trackReqsOk(c)).length;

  // Per emirate for a small HBar
  const emirateRows = Object.entries(byEmirate).sort((a,b)=>b[1]-a[1]).slice(0,8)
    .map(([label,value]) => ({ label, value }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      {/* KPIs */}
      <div className="xl:col-span-12 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
        <KpiCard label="Total Candidates" value={totalCandidates} />
        <KpiCard label="Graduated" value={byStatus["Graduated"] || 0} />
        <KpiCard label="Ready for Hiring" value={byStatus["Ready for Hiring"] || 0} />
        <KpiCard label="Courses (catalog)" value={totalCourses} />
        <KpiCard label="Subjects (active)" value={totalSubjects} />
        <KpiCard label="At Risk (needs attention)" value={atRisk} hint="Below avg or missing required passes" />
      </div>

      {/* Donut + Subject bars */}
      <Motion.div layout initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.45}} className="xl:col-span-5 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Pipeline by Status</div>
          <div className="text-xs text-slate-500">Total {totalCandidates}</div>
        </div>
        <div className="flex gap-4 items-center">
          <DonutChart data={donut} centerLabel={totalCandidates || "0"} />
          <div className="flex-1">
            <ul className="text-sm space-y-1">
              {donut.map((d,i)=>(
                <li key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-sm" style={{background:d.color}} />
                    <span>{d.label}</span>
                  </div>
                  <span className="text-slate-600">{d.value}</span>
                </li>
              ))}
              {!donut.length && <li className="text-sm text-slate-500">No data yet.</li>}
            </ul>
          </div>
        </div>
      </Motion.div>

      <Motion.div layout initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.45, delay:0.04}} className="xl:col-span-7 rounded-2xl border bg-white p-4 shadow-sm overflow-auto">
        <div className="font-semibold mb-2">Top Subjects</div>
        <VBarChart data={topSubjects} />
      </Motion.div>

      {/* Candidates per course + Emirates */}
      <Motion.div layout initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.45, delay:0.06}} className="xl:col-span-7 rounded-2xl border bg-white p-4 shadow-sm overflow-auto">
        <div className="font-semibold mb-2">Candidates per Course (enrolled or with results)</div>
        {topCourses.length ? <HBarChart data={topCourses} /> : <div className="text-sm text-slate-500">No course activity yet.</div>}
      </Motion.div>

      <Motion.div layout initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.45, delay:0.08}} className="xl:col-span-5 rounded-2xl border bg-white p-4 shadow-sm overflow-auto">
        <div className="font-semibold mb-2">Emirate Breakdown</div>
        {emirateRows.length ? <HBarChart data={emirateRows} width={380} /> : <div className="text-sm text-slate-500">No emirate data.</div>}
      </Motion.div>

      {/* Bottlenecks & risks */}
      <div className="xl:col-span-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Motion.div layout initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.45, delay:0.1}} className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="font-semibold mb-2">Potential Bottlenecks</div>
          <ul className="text-sm space-y-2">
            <li className="flex items-center justify-between">
              <span>Waiting for assignment / training (no enrollments)</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs dark:bg-amber-700 dark:text-amber-100">{waitingNoEnroll}</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Pending clarifications (trainer inbox)</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs dark:bg-amber-700 dark:text-amber-100">{pendingTrainerClarifications}</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Stale cases (no activity &gt; 21 days)</span>
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs dark:bg-rose-700 dark:text-rose-100">{stale}</span>
            </li>
            <li className="flex items-center justify-between">
              <span>At-risk candidates (avg/reqs not met)</span>
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs dark:bg-rose-700 dark:text-rose-100">{atRisk}</span>
            </li>
          </ul>
        </Motion.div>

        <Motion.div layout initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.45, delay:0.12}} className="rounded-2xl border bg-white p-4 shadow-sm md:col-span-1 xl:col-span-2 overflow-auto">
          <div className="font-semibold mb-2">Courses with Lowest Pass Rates (required only)</div>
          {!passStats.length ? (
            <div className="text-sm text-slate-500">No results yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left">
                    <th className="px-3 py-2">Course</th>
                    <th className="px-3 py-2">Pass&nbsp;Rate</th>
                    <th className="px-3 py-2">Pass&nbsp;/&nbsp;Total</th>
                    <th className="px-3 py-2">Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  {passStats.map((x, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2"><b>{x.code}</b> — {x.title}</td>
                      <td className="px-3 py-2">{x.rate ?? "—"}%</td>
                      <td className="px-3 py-2">{x.pass}/{x.total}</td>
                      <td className="px-3 py-2">≥ {x.threshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Motion.div>
      </div>
    </div>
  );
}


// ------------------------------ Courses Page (NEW) ------------------------------
function Th({ children }){ return <th className="px-4 py-3 text-slate-600 text-xs font-semibold uppercase tracking-wide">{children}</th>; }
function Td({ children, ...rest }){ return <td className="px-4 py-3 align-top" {...rest}>{children}</td>; }

function CoursesPage({ role }){
  const { courses, setCourses, logEvent, notify } = useStore();
  const [q,setQ]=useState("");
  const [filterTrack,setFilterTrack] = useState("");
  const [filterCode,setFilterCode] = useState("");
  const [showForm,setShowForm]=useState(false);
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState({ code:"", title:"", brief:"", weight:"0.3", passThreshold:"70", isRequired:true, tracks:[], modality:"", hours:"", active:true });
  const canEdit = role==="Admin" || role==="ECAE Manager" || role==="ECAE Trainer";

  const filtered = useMemo(()=>{
    const s=q.toLowerCase();
    return courses.filter(c=>{
      if(filterTrack && !(c.tracks||[]).includes(filterTrack)) return false;
      if(filterCode && !String(c.code||"").toLowerCase().includes(String(filterCode||"").toLowerCase())) return false;
      return (
        c.code.toLowerCase().includes(s) ||
        (c.title||"").toLowerCase().includes(s) ||
        (c.brief||"").toLowerCase().includes(s)
      );
    });
  },[q,courses,filterTrack,filterCode]);

  function openCreate(){
    setEditId(null);
    setForm({ code:"", title:"", brief:"", weight:"0.3", passThreshold:"70", isRequired:true, tracks:[], modality:"", hours:"", active:true });
    setShowForm(true);
  }
  function openEdit(id){
    const c = courses.find(x=>x.id===id);
    if(!c) return;
    setEditId(id);
    setForm({
      code:c.code, title:c.title, brief:c.brief||"", weight:String(c.weight??0.3),
      passThreshold:String(c.passThreshold??70), isRequired:!!c.isRequired,
      tracks:c.tracks||[], modality:c.modality||"", hours:String(c.hours||""),
      active: c.active !== false
    });
    setShowForm(true);
  }
  function saveCourse(){
    const code=form.code.trim();
    const title=form.title.trim();
    if(!code || !title){ alert("Code and Title are required."); return; }
    if(!/^[A-Za-z0-9-_.]+$/.test(code)){ alert("Code should be letters/digits/-_."); return; }
    const exists = courses.some(c => c.code.toLowerCase()===code.toLowerCase() && c.id!==editId);
    if(exists){ alert("Course code already exists."); return; }
    const obj = {
      id: editId || `COURSE-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      code,
      title,
      brief: form.brief.trim(),
      weight: Number(form.weight)||0.3,
      passThreshold: Number(form.passThreshold)||70,
      isRequired: !!form.isRequired,
      tracks: form.tracks,
      modality: form.modality.trim(),
      hours: Number(form.hours)||"",
      active: !!form.active
    };
    if(editId){
      setCourses(prev => prev.map(x => x.id===editId ? obj : x));
      logEvent("course_updated",{ code, ts: new Date().toISOString() });

      // ADD ↓↓↓ — notify Manager & Trainer about UPDATE
      notify({ role:"ECAE Manager" }, {
        type:"course_updated",
        title:`Course updated: ${code}`,
        body:title,
        targetRef:{ page:"courses", courseCode: code }
      });
      notify({ role:"ECAE Trainer" }, {
        type:"course_updated",
        title:`Course updated: ${code}`,
        body:title,
        targetRef:{ page:"courses", courseCode: code }
      });

    }else{
      setCourses(prev => [obj, ...prev]);
      logEvent("course_created",{ code, ts: new Date().toISOString() });

      // ADD ↓↓↓ — notify Manager & Trainer about NEW COURSE
      notify({ role:"ECAE Manager" }, {
        type:"course_created",
        title:`New course added: ${code}`,
        body:title,
        targetRef:{ page:"courses", courseCode: code }
      });
      notify({ role:"ECAE Trainer" }, {
        type:"course_created",
        title:`New course added: ${code}`,
        body:title,
        targetRef:{ page:"courses", courseCode: code }
      });
    }

    setShowForm(false);
  }

  function delCourse(id){
    if(!window.confirm("Delete this course?")) return;
    const c = courses.find(x=>x.id===id);
    setCourses(prev => prev.filter(x=>x.id!==id));
    logEvent("course_deleted",{ code:c?.code, ts: new Date().toISOString() });
  }
  function toggleTrack(tid){
    setForm(f => ({...f, tracks: f.tracks.includes(tid) ? f.tracks.filter(x=>x!==tid) : [...f.tracks, tid]}));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="flex gap-2 items-end">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by code, title, brief…" className="w-80 rounded-xl border px-3 py-2" />
          <select value={filterTrack} onChange={e=>setFilterTrack(e.target.value)} className="rounded-xl border px-3 py-2">
            <option value="">All tracks</option>
            {TRACKS.map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input value={filterCode} onChange={e=>setFilterCode(e.target.value)} placeholder="Filter code…" className="rounded-xl border px-3 py-2" />
          <button className="rounded-xl border px-3 py-2" onClick={()=>{ setQ(""); setFilterTrack(""); setFilterCode(""); }}>Clear</button>
        </div>
        <div className="flex gap-2">
          <button className="rounded-xl border px-3 py-2" onClick={()=>{
            const rows = filtered.map(c=>({ Code: c.code, Title: c.title, Brief: c.brief||"", Tracks: (c.tracks||[]).map(t=>trackNameById(t)).join(", "), Required: c.isRequired ? "Yes" : "No", Active: c.active !== false ? "Yes" : "No" }));
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(wb, ws, "Courses");
            XLSX.writeFile(wb, "Courses-Export.xlsx");
          }}>Export filtered</button>
          {canEdit && <button className="rounded-xl bg-slate-900 text-white px-4 py-2" onClick={openCreate}>Add Course</button>}
        </div>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left">
              <Th>Code</Th><Th>Title</Th><Th>Brief</Th><Th>Tracks</Th><Th>Weight</Th><Th>Pass ≥</Th><Th>Required</Th><Th>Active</Th><Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.map(c=>(
                <Motion.tr key={c.id} className="border-t" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} layout>
                  <Td><div className="font-medium">{c.code}</div></Td>
                  <Td>{c.title}</Td>
                  <Td className="max-w-[320px]"><div className="line-clamp-2">{c.brief}</div></Td>
                  <Td>{(c.tracks||[]).map(t=>trackNameById(t)).join(", ")||"—"}</Td>
                  <Td>{c.weight}</Td>
                  <Td>{c.passThreshold}</Td>
                  <Td>{c.isRequired ? "Yes" : "No"}</Td>
                  <Td>{c.active !== false ? "Yes" : "No"}</Td>
                  <Td>
                    <div className="flex gap-2">
                      <button className="rounded-xl border px-3 py-1" onClick={()=>openEdit(c.id)}>Edit</button>
                      {canEdit && <button className="rounded-xl border px-3 py-1 text-rose-700" onClick={()=>delCourse(c.id)}>Delete</button>}
                    </div>
                  </Td>
                </Motion.tr>
              ))}
              {!filtered.length && (
                <Motion.tr key="empty" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                  <Td colSpan={9}><div className="p-4 text-sm text-slate-500">No courses.</div></Td>
                </Motion.tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showForm && (
          <Motion.div className="fixed inset-0 z-50" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <div className="absolute inset-0 bg-black/30" onClick={()=>setShowForm(false)} />
            <Motion.div initial={{scale:0.98,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.98,opacity:0}} className="absolute inset-0 flex items-center justify-center p-4">
              <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-semibold">{editId ? "Edit Course" : "Add Course"}</div>
                  <button className="rounded-xl border px-3 py-1" onClick={()=>setShowForm(false)}>Close</button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <label>Code* <input className="w-full rounded border px-2 py-1" value={form.code} onChange={e=>setForm({...form,code:e.target.value})} /></label>
                  <label>Title* <input className="w-full rounded border px-2 py-1" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} /></label>
                  <label className="col-span-2">Brief <textarea rows={2} className="w-full rounded border px-2 py-1" value={form.brief} onChange={e=>setForm({...form,brief:e.target.value})} /></label>
                  <label>Weight <input type="number" step="0.01" className="w-full rounded border px-2 py-1" value={form.weight} onChange={e=>setForm({...form,weight:e.target.value})} /></label>
                  <label>Pass Threshold <input type="number" className="w-full rounded border px-2 py-1" value={form.passThreshold} onChange={e=>setForm({...form,passThreshold:e.target.value})} /></label>
                  <label>Modality <input className="w-full rounded border px-2 py-1" placeholder="Online / In-person / Hybrid" value={form.modality} onChange={e=>setForm({...form,modality:e.target.value})} /></label>
                  <label>Hours <input type="number" className="w-full rounded border px-2 py-1" value={form.hours} onChange={e=>setForm({...form,hours:e.target.value})} /></label>
                  <div className="col-span-2">
                    <div className="font-medium mb-1">Required for tracks</div>
                    <div className="flex flex-wrap gap-3">
                      {TRACKS.map(t=>(
                        <label key={t.id} className="inline-flex items-center gap-2">
                          <input type="checkbox" checked={form.tracks.includes(t.id)} onChange={()=>toggleTrack(t.id)} />
                          <span>{t.name}</span>
                        </label>
                      ))}
                    </div>
                    <label className="inline-flex items-center gap-2 mt-2">
                      <input type="checkbox" checked={form.isRequired} onChange={e=>setForm({...form,isRequired:e.target.checked})} />
                      <span>Mark as required (for selected tracks)</span>
                    </label>
                    <label className="inline-flex items-center gap-2 mt-2 ml-6">
                      <input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})} />
                      <span>Active</span>
                    </label>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="rounded-xl bg-slate-900 text-white px-4 py-2" onClick={saveCourse}>{editId ? "Save" : "Create"}</button>
                  <button className="rounded-xl border px-4 py-2" onClick={()=>setShowForm(false)}>Cancel</button>
                </div>
              </div>
            </Motion.div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import CandidatesPage from "./pages/CandidatesPage";

// Add Candidate Modal
function AddCandidateModal({ open, onClose, onAdded }){
  const { setCandidates, logEvent } = useStore();
  const [form,setForm]=useState({ name:"", email:"", mobile:"", emirate:"", subject:"", gpa:"", nationalId:"" });
  const [err,setErr]=useState("");
  useEffect(()=>{ if(!open){ setForm({ name:"", email:"", mobile:"", emirate:"", subject:"", gpa:"", nationalId:"" }); setErr(""); } },[open]);

  function submit(){
    setErr("");
    const name=form.name.trim(), email=form.email.trim(), mobile=form.mobile.trim(), emirate=form.emirate.trim(), subject=form.subject.trim();
    const nationalId=form.nationalId.trim(); const gpa=Number(String(form.gpa).replace(",",".")); 
    if(!name||!email||!mobile||!emirate||!subject||isNaN(gpa)){ setErr("Please fill all required fields correctly."); return; }
    if(!emailRe.test(email)){ setErr("Invalid email."); return; }
    if(!mobileRe.test(mobile.replace(/\s|-/g,""))){ setErr("Invalid UAE mobile (+9715… or 05XXXXXXXX)."); return; }
    const id=`C-${Date.now().toString().slice(-6)}`; const trackId=subjectToTrackId(subject);
    const newC={ id, name, nationalId, email, mobile, emirate, subject, gpa, trackId, status:"Imported", courseResults:[], enrollments:[], notesThread:[{ id:`N-${id}-0`, by:"System", role:"Admin", text:"Added manually.", ts:new Date().toISOString() }] };
    setCandidates(prev=>[...prev,newC]); logEvent("candidate_added_manual",{ id, subject, trackId, ts:new Date().toISOString() }); alert("Candidate added."); onAdded?.(id);
  }
  if(!open) return null;
  return (
    <AnimatePresence>
      <Motion.div className="fixed inset-0 z-50" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <Motion.div initial={{scale:0.98,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.98,opacity:0}} className="absolute inset-0 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-3"><div className="text-lg font-semibold">Add Candidate</div><button className="rounded-xl border px-3 py-1" onClick={onClose}>Close</button></div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label>Name* <input className="w-full rounded border px-2 py-1" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></label>
              <label>Email* <input className="w-full rounded border px-2 py-1" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></label>
              <label>Mobile* <input className="w-full rounded border px-2 py-1" value={form.mobile} onChange={e=>setForm({...form,mobile:e.target.value})} placeholder="05XXXXXXXX or +9715XXXXXXXX" /></label>
              <label>Emirate* <select className="w-full rounded border px-2 py-1" value={form.emirate} onChange={e=>setForm({...form,emirate:e.target.value})}>
                <option value="">Select…</option>{EMIRATES.map(x=><option key={x} value={x}>{x}</option>)}
              </select></label>
              <label>Subject* <select className="w-full rounded border px-2 py-1" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}>
                <option value="">Select…</option>{SUBJECTS.map(x=><option key={x} value={x}>{x}</option>)}
              </select></label>
              <label>GPA* <input type="number" step="0.01" className="w-full rounded border px-2 py-1" value={form.gpa} onChange={e=>setForm({...form,gpa:e.target.value})} /></label>
              <label className="col-span-2">National ID <input className="w-full rounded border px-2 py-1" value={form.nationalId} onChange={e=>setForm({...form,nationalId:e.target.value})} /></label>
            </div>
            {err && <div className="mt-2 text-sm text-rose-600">{err}</div>}
            <div className="mt-4 flex gap-2"><button className="rounded-xl bg-slate-900 text-white px-4 py-2" onClick={submit}>Create</button><button className="rounded-xl border px-4 py-2" onClick={onClose}>Cancel</button></div>
          </div>
        </Motion.div>
      </Motion.div>
    </AnimatePresence>
  );
}

function EditCandidateModal({ open, candidate, onClose }) {
  const { setCandidates, logEvent } = useStore();
  const [form, setForm] = useState({
    name: "", email: "", mobile: "", emirate: "", subject: "", gpa: "", nationalId: ""
  });
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open || !candidate) return;
    setForm({
      name: candidate.name || "",
      email: candidate.email || "",
      mobile: candidate.mobile || "",
      emirate: candidate.emirate || "",
      subject: candidate.subject || "",
      gpa: String(candidate.gpa ?? ""),
      nationalId: candidate.nationalId || ""
    });
    setErr("");
  }, [open, candidate]);

  function save() {
    if (!candidate) return;
    setErr("");
    const name = form.name.trim();
    const email = form.email.trim();
    const mobile = form.mobile.trim();
    const emirate = form.emirate.trim();
    const subject = form.subject.trim();
    const nationalId = form.nationalId.trim();
    const gpa = Number(String(form.gpa).replace(",", "."));

    if (!name || !email || !mobile || !emirate || !subject || isNaN(gpa)) {
      setErr("Please fill all required fields correctly.");
      return;
    }
    if (!emailRe.test(email)) { setErr("Invalid email."); return; }
    if (!mobileRe.test(mobile.replace(/\s|-/g, ""))) {
      setErr("Invalid UAE mobile (+9715… or 05XXXXXXXX)."); return;
    }

    const trackId = subjectToTrackId(subject);
    setCandidates(prev => prev.map(c =>
      c.id === candidate.id
        ? { ...c, name, email, mobile, emirate, subject, gpa, nationalId, trackId }
        : c
    ));
    logEvent("candidate_admin_updated", { id: candidate.id, ts: new Date().toISOString() });
    onClose?.();
  }

  if (!open || !candidate) return null;

  return (
    <AnimatePresence>
      <Motion.div className="fixed inset-0 z-50" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <Motion.div
          initial={{scale:0.98,opacity:0}}
          animate={{scale:1,opacity:1}}
          exit={{scale:0.98,opacity:0}}
          className="absolute inset-0 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Edit Candidate</div>
              <button className="rounded-xl border px-3 py-1" onClick={onClose}>Close</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <label>Name* <input className="w-full rounded border px-2 py-1" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></label>
              <label>Email* <input className="w-full rounded border px-2 py-1" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></label>
              <label>Mobile* <input className="w-full rounded border px-2 py-1" value={form.mobile} onChange={e=>setForm({...form,mobile:e.target.value})} placeholder="05XXXXXXXX or +9715XXXXXXXX" /></label>
              <label>Emirate* <select className="w-full rounded border px-2 py-1" value={form.emirate} onChange={e=>setForm({...form,emirate:e.target.value})}>
                <option value="">Select…</option>{EMIRATES.map(x=><option key={x} value={x}>{x}</option>)}
              </select></label>
              <label>Subject* <select className="w-full rounded border px-2 py-1" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}>
                <option value="">Select…</option>{SUBJECTS.map(x=><option key={x} value={x}>{x}</option>)}
              </select></label>
              <label>GPA* <input type="number" step="0.01" className="w-full rounded border px-2 py-1" value={form.gpa} onChange={e=>setForm({...form,gpa:e.target.value})} /></label>
              <label className="col-span-2">National ID <input className="w-full rounded border px-2 py-1" value={form.nationalId} onChange={e=>setForm({...form,nationalId:e.target.value})} /></label>
            </div>

            {err && <div className="mt-2 text-sm text-rose-600">{err}</div>}

            <div className="mt-4 flex gap-2">
              <button className="rounded-xl bg-slate-900 text-white px-4 py-2" onClick={save}>Save</button>
              <button className="rounded-xl border px-4 py-2" onClick={onClose}>Cancel</button>
            </div>
          </div>
        </Motion.div>
      </Motion.div>
    </AnimatePresence>
  );
}


// CandidateDrawer implementation moved to `src/components/CandidateDrawer.jsx`.
// The component is imported and rendered from AppShell to keep App.jsx smaller.

function AdminCorrectionsPanel({ items, onResolve, onReject }){
  const [rejectReason, setRejectReason] = useState("");
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border p-3">
        <div className="font-medium mb-2">Requests</div>
        {!items.length ? <div className="text-sm text-slate-500">No requests.</div> : (
          <ul className="text-sm space-y-2">
            {items.map(item=>(
              <li key={item.id} className="border rounded-xl p-2">
                <div className="flex items-center justify-between">
                  <div><b>{item.by}</b> • {item.role} • <span className="text-slate-500">{new Date(item.ts).toLocaleString()}</span>{item.forRole && <span className="ml-2 text-xs text-slate-500">→ For: {item.forRole}</span>}</div>
                  <div className={classNames("text-xs px-2 py-0.5 rounded-full",
                    item.status==="Pending" ? "bg-amber-100 text-amber-700" :
                    item.status==="Responded" ? "bg-sky-100 text-sky-700" :
                    item.status==="Resolved" ? "bg-emerald-100 text-emerald-700" :
                    "bg-rose-100 text-rose-700")}>
                    {item.status}
                  </div>
                </div>
                <div className="mt-1">{item.text}</div>
                {item.response && (
                  <div className="mt-2 border-t pt-2 text-xs">
                    <div className="text-slate-500">Response by {item.response.by} • {item.response.role} • {new Date(item.response.ts).toLocaleString()}</div>
                    <div>{item.response.text}</div>
                  </div>
                )}
                {item.status==="Pending" && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button className="rounded-xl border px-3 py-1" onClick={()=>onResolve(item.id)}>Mark Resolved</button>
                    <div className="flex items-center gap-2">
                      <input className="rounded border px-2 py-1 text-sm" placeholder="Reject reason" value={rejectReason} onChange={e=>setRejectReason(e.target.value)} />
                      <button className="rounded-xl border px-3 py-1 text-rose-700" onClick={()=>{ onReject(item.id, rejectReason); setRejectReason(""); }}>Reject</button>
                    </div>
                  </div>
                )}
                {item.status==="Resolved" && item.resolvedTs && <div className="mt-1 text-xs text-slate-500">Resolved {new Date(item.resolvedTs).toLocaleString()}</div>}
                {item.status==="Rejected" && item.rejectedTs && <div className="mt-1 text-xs text-rose-600">Rejected {new Date(item.rejectedTs).toLocaleString()}{item.rejectReason?` — ${item.rejectReason}`:""}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
function TrainerRespond({ onRespond }){
  const [val,setVal]=useState("");
  return (
    <div className="mt-2 flex gap-2">
      <input className="flex-1 rounded border px-2 py-1 text-sm" placeholder="Write your response…" value={val} onChange={e=>setVal(e.target.value)} />
      <button className="rounded-xl border px-3 py-1" onClick={()=>{ if(val.trim()){ onRespond(val.trim()); setVal(""); } }}>Send</button>
    </div>
  );
}
function NonAdminCorrectionsPanel({ role, userName, items, pendingForTrainer, onRespond, onSubmit, correctionText, setCorrectionText }){
  return (
    <div className="space-y-3">
      {role==="ECAE Trainer" && pendingForTrainer.length>0 && (
        <div className="rounded-2xl border p-3">
          <div className="font-medium mb-2">Clarifications Assigned to You</div>
          <ul className="space-y-2 text-sm">
            {pendingForTrainer.map(item=>(
              <li key={item.id} className="border rounded-xl p-2">
                <div className="flex items-center justify-between">
                  <div>From <b>{item.by}</b> • {item.role} • <span className="text-slate-500">{new Date(item.ts).toLocaleString()}</span></div>
                  <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 dark:bg-amber-700 dark:text-amber-100">{item.status}</span>
                </div>
                <div className="mt-1">{item.text}</div>
                <TrainerRespond id={item.id} onRespond={(text)=>onRespond(item.id, text)} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="rounded-2xl border p-3">
        <div className="font-medium mb-2">Your Requests</div>
        {items.filter(c=>c.by===(userName||role)).length===0 ? <div className="text-sm text-slate-500">No previous requests.</div> : (
          <ul className="space-y-2 text-sm">
            {items.filter(c=>c.by===(userName||role)).map(item=>(
              <li key={item.id} className="border rounded-xl p-2">
                <div className="flex items-center justify-between">
                  <div>{new Date(item.ts).toLocaleString()}</div>
                  <div className={classNames("text-xs px-2 py-0.5 rounded-full",
                    item.status==="Pending"?"bg-amber-100 text-amber-700":
                    item.status==="Responded"?"bg-sky-100 text-sky-700":
                    item.status==="Resolved"?"bg-emerald-100 text-emerald-700":"bg-rose-100 text-rose-700")}>
                    {item.status}
                  </div>
                </div>
                <div className="mt-1">{item.text}</div>
                {item.response && (
                  <div className="mt-2 border-t pt-2 text-xs">
                    <div className="text-slate-500">Response by {item.response.by} • {item.response.role} • {new Date(item.response.ts).toLocaleString()}</div>
                    <div>{item.response.text}</div>
                  </div>
                )}
                {item.status==="Rejected" && item.rejectReason && <div className="mt-1 text-xs text-rose-600">Reason: {item.rejectReason}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="space-y-2">
        <textarea className="w-full rounded-xl border p-3" rows={3} placeholder="Describe the data correction needed…" value={correctionText} onChange={e=>setCorrectionText(e.target.value)} />
        <div><button className="rounded-xl border px-4 py-2" onClick={onSubmit}>Request Data Correction</button></div>
      </div>
    </div>
  );
}

// ------------------------------ Import Page ------------------------------
function ImportPage(){
  const { candidates, setCandidates, logEvent } = useStore();
  const [file,setFile]=useState(null); const [step,setStep]=useState("upload");
  const [mapping,setMapping]=useState({}); const [headers,setHeaders]=useState([]); const [rawRows,setRawRows]=useState([]);
  const [errors,setErrors]=useState([]); const [warnings,setWarnings]=useState([]); const [preview,setPreview]=useState([]);
  const required=["name","subject","gpa","emirate","email","mobile"];

  function normalizeMobile(val){ const s=String(val||'').replace(/\s|-/g,''); return /^\+9715\d{8}$/.test(s) ? '05'+s.slice(5) : s; }

  function autoMapHeaders(headers){
    const map={}; const wanted={ name:["name","full name","candidate name"], subject:["subject","teaching subject"], gpa:["gpa","cgpa"], emirate:["emirate","city"], email:["email","e-mail"], mobile:["mobile","phone","mobile number"], nationalid:["national id","id","emirates id"], sourcebatch:["source batch","batch","cohort"] };
    const norm = h=>String(h||"").trim().toLowerCase().replace(/\s+/g," "); const normHeaders=headers.map(h=>({raw:h,norm:norm(h)}));
    Object.entries(wanted).forEach(([t,keys])=>{ const hit=normHeaders.find(h=>keys.includes(h.norm)); if(hit) map[t]=hit.raw; });
    return map;
  }
  function handleUpload(f){
    setFile(f||null); if(!f) return;
    const ext=(f.name.split('.').pop()||'').toLowerCase(); const reader=new FileReader();
    reader.onload=(e)=>{
      try{
        if(ext==='csv'){
          const rows=parseCSV(String(e.target.result)); const hdrs=rows.shift()||[]; const objs=rows.map(r=>Object.fromEntries(hdrs.map((h,i)=>[h,r[i]])));
          setHeaders(hdrs); setRawRows(objs); setMapping(autoMapHeaders(hdrs)); setStep("map");
        }else if(window.XLSX){
          const wb=window.XLSX.read(new Uint8Array(e.target.result),{type:'array'}); const ws=wb.Sheets[wb.SheetNames[0]];
          const arr=window.XLSX.utils.sheet_to_json(ws,{header:1}); const hdrs=arr.shift()||[]; const objs=arr.map(r=>Object.fromEntries(hdrs.map((h,i)=>[h,r[i]])));
          setHeaders(hdrs); setRawRows(objs); setMapping(autoMapHeaders(hdrs)); setStep("map");
        }else alert("XLSX not supported unless SheetJS is loaded. Please use CSV or include SheetJS.");
      }catch{ alert("Failed to parse file. Ensure it is a valid CSV/XLSX."); }
    };
    if(ext==='csv') reader.readAsText(f); else reader.readAsArrayBuffer(f);
  }
  function mapField(t,src){ setMapping(m=>({...m,[t]:src})); }

  function validateAndPreview(){
    const errs=[], warns=[];
    const rows=rawRows.map((r,idx)=>{
      const pick=k=>r[mapping[k]]??''; const obj={ name:String(pick('name')).trim(), subject:String(pick('subject')).trim(), gpa:Number(String(pick('gpa')).replace(',','.')), emirate:String(pick('emirate')).trim(), email:String(pick('email')).trim(), mobile:normalizeMobile(String(pick('mobile')).trim()), nationalId:String(pick('nationalid')||'').trim(), sourceBatch:String(pick('sourcebatch')||'').trim() };
      required.forEach(req=>{ if(!obj[req] && obj[req]!==0) errs.push({row:idx+2, field:req, msg:`${req} is required`}); });
      if(obj.email && !emailRe.test(obj.email)) errs.push({row:idx+2, field:'email', msg:'Invalid email'});
      if(obj.mobile && !mobileRe.test(obj.mobile)) errs.push({row:idx+2, field:'mobile', msg:'Invalid UAE mobile'});
      if(isNaN(obj.gpa)) errs.push({row:idx+2, field:'gpa', msg:'GPA must be numeric'}); else if(obj.gpa<0||obj.gpa>4.0) warns.push({row:idx+2, field:'gpa', msg:'GPA outside 0.0–4.0'});
      return obj;
    });
    const seenEmail=new Set(), seenNID=new Set();
    rows.forEach((r,i)=>{ if(r.email){ if(seenEmail.has(r.email)) errs.push({row:i+2, field:'email', msg:'Duplicate email in file'}); seenEmail.add(r.email); } if(r.nationalId){ if(seenNID.has(r.nationalId)) errs.push({row:i+2, field:'nationalId', msg:'Duplicate National ID in file'}); seenNID.add(r.nationalId); }});
    const existingEmails=new Set(candidates.map(c=>c.email)); rows.forEach((r,i)=>{ if(existingEmails.has(r.email)) warns.push({row:i+2, field:'email', msg:'Email already exists in system'}); });
    setErrors(errs); setWarnings(warns); setPreview(rows.slice(0,10)); setStep("preview");
  }
  function commitImport(){
    if(errors.length){ alert("Resolve errors before committing import."); return; }
    const rows=rawRows.map(r=>{
      const pick=k=>r[mapping[k]]??''; const subj=String(pick('subject')).trim(); const trackId=subjectToTrackId(subj); const mobile=String(pick('mobile')).replace(/\s|-/g,'').replace(/^\+9715/,'05');
      return { id:`IMP-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, name:String(pick('name')).trim(), nationalId:String(pick('nationalid')||'').trim(), email:String(pick('email')).trim(), mobile, emirate:String(pick('emirate')).trim(), subject:subj, gpa:Number(String(pick('gpa')).replace(',','.')), trackId, status:"Imported", courseResults:[], enrollments:[], notesThread:[] };
    });
    setCandidates(prev=>[...prev,...rows]); logEvent("import_committed",{ count:rows.length, ts:new Date().toISOString() });
    setFile(null); setHeaders([]); setRawRows([]); setMapping({}); setErrors([]); setWarnings([]); setPreview([]); setStep("upload");
    alert(`Imported ${rows.length} candidate(s).`);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div><div className="font-semibold text-lg">Intake Import ({file ? file.name : 'Excel/CSV'})</div><p className="text-sm text-slate-500">Upload list → Map columns → Validate → Commit.</p></div>
          <DownloadTemplateButton filename="IntakeTemplate.csv" buildCSV={buildIntakeTemplateCSV} />
        </div>
        {step==="upload" && (<div className="mt-4"><input type="file" accept=".csv,.xlsx,.xls" onChange={e=>handleUpload(e.target.files?.[0]||null)} /><div className="text-xs text-slate-500 mt-2">CSV works natively. For XLSX, include SheetJS via window.XLSX.</div></div>)}
        {step==="map" && (
          <div className="mt-4 space-y-3">
            <div className="text-sm">Map your columns to required fields:</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {["name","subject","gpa","emirate","email","mobile","nationalid","sourcebatch"].map(r=>(
                <div key={r} className="flex items-center gap-2">
                  <label className="w-48 text-sm">{r}</label>
                  <select className="flex-1 rounded-xl border px-3 py-2" value={mapping[r]||''} onChange={e=>mapField(r,e.target.value)}>
                    <option value="">Select column…</option>{headers.map(c=> <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4"><button className="rounded-xl border px-4 py-2" onClick={()=>setStep("upload")}>Back</button><button className="rounded-xl bg-slate-900 text-white px-4 py-2" onClick={validateAndPreview}>Validate</button></div>
          </div>
        )}
        {step==="preview" && (
          <div className="mt-4 space-y-4">
            <div className="text-sm text-slate-600">Validation summary</div>
            <ul className="list-disc pl-5 text-sm text-slate-700"><li><b>{rawRows.length}</b> rows detected</li><li><b>{errors.length}</b> errors, <b>{warnings.length}</b> warnings</li></ul>
            {(errors.length||warnings.length) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border p-3"><div className="font-semibold mb-2">Errors</div>{errors.length?<ul className="text-sm text-rose-700 space-y-1 max-h-48 overflow-auto">{errors.map((e,i)=><li key={i}>Row {e.row}: [{e.field}] {e.msg}</li>)}</ul>:<div className="text-sm text-slate-500">None</div>}</div>
                <div className="rounded-2xl border p-3"><div className="font-semibold mb-2">Warnings</div>{warnings.length?<ul className="text-sm text-amber-700 space-y-1 max-h-48 overflow-auto">{warnings.map((w,i)=><li key={i}>Row {w.row}: [{w.field}] {w.msg}</li>)}</ul>:<div className="text-sm text-slate-500">None</div>}</div>
              </div>
            )}
            <div className="rounded-2xl border overflow-hidden">
              <table className="w-full text-sm"><thead className="bg-slate-50"><tr className="text-left">{Object.keys(preview[0]||{ name:1,subject:1,gpa:1,emirate:1,email:1,mobile:1 }).map(h=><Th key={h}>{h}</Th>)}</tr></thead>
                    <tbody>
                      <AnimatePresence>
                        {preview.map((r,idx)=>(
                          <Motion.tr key={idx} className="border-t" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} layout>
                            {Object.keys(preview[0]||r).map(h=><Td key={h+idx}>{String(r[h]??'')}</Td>)}
                          </Motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
            </div>
            <div className="flex gap-2"><button className="rounded-xl border px-4 py-2" onClick={()=>setStep("map")}>Back</button><button className="rounded-xl bg-emerald-600 text-white px-4 py-2" onClick={commitImport} disabled={errors.length>0}>Commit Import</button></div>
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------ Results Upload ------------------------------
function ResultsUploadPage(){
  const { candidates, setCandidates } = useStore();
  const [rows,setRows]=useState([]); const [report,setReport]=useState({ ok:0, updated:0, errors:[] });

  function parseResultsCSV(text){
    const arr=parseCSV(text); const hdr=(arr.shift()||[]).map(h=>String(h).trim()); const idx=Object.fromEntries(hdr.map((h,i)=>[h.toLowerCase(),i]));
    const required=["candidateid","coursecode","score","pass","date"]; if(!required.every(k=>k in idx)) throw new Error("Missing required columns. Need: " + required.join(", "));
    return arr.map(r=>({ candidateId:String(r[idx["candidateid"]]||"").trim(), courseCode:String(r[idx["coursecode"]]||"").trim(), score:Number(r[idx["score"]]||0), pass:String(r[idx["pass"]]||"").trim().toLowerCase().startsWith("p") || String(r[idx["pass"]]||"").trim().toLowerCase()==="true", date:String(r[idx["date"]]||"").trim() }));
  }
  function handleFile(f){
    if(!f) return;
    const ext=(f.name.split(".").pop()||"").toLowerCase(); const reader=new FileReader();
    reader.onload=(e)=>{ try{
      if(ext==="csv"){ setRows(parseResultsCSV(String(e.target.result))); }
      else if(window.XLSX){ const wb=window.XLSX.read(new Uint8Array(e.target.result),{type:"array"}); const ws=wb.Sheets[wb.SheetNames[0]]; const arr=window.XLSX.utils.sheet_to_csv(ws); setRows(parseResultsCSV(arr)); }
      else alert("XLSX not supported unless SheetJS is loaded. Please use CSV or include SheetJS.");
    }catch(err){ alert("Failed to parse results: "+err.message); } };
    if(ext==="csv") reader.readAsText(f); else reader.readAsArrayBuffer(f);
  }
  function applyResults(){
    const errors=[]; let updated=0;
    const byId=new Map(candidates.map(c=>[c.id,c])); setCandidates(prev=>{
      const next=prev.map(c=>({...c, courseResults:[...(c.courseResults||[])]}));
      rows.forEach((r,i)=>{
        const c=byId.get(r.candidateId); if(!c){ errors.push(`Row ${i+2}: Unknown CandidateID ${r.candidateId}`); return; }
        const target=next.find(x=>x.id===c.id);
        const existing=target.courseResults.find(cr=>cr.code===r.courseCode);
        const entry={ code:r.courseCode, title:r.courseCode, score:r.score, pass:!!r.pass, date:r.date };
        if(existing) Object.assign(existing,entry); else target.courseResults.push(entry);
        updated++;
      });
      return next;
    });
    setReport({ ok:rows.length, updated, errors }); alert(`Processed ${rows.length} rows • Updated ${updated} candidates${errors.length?` • ${errors.length} issue(s)`:``}.`);
  }

  const templateCSV="CandidateID,CourseCode,Score,Pass,Date\nC-1000,T101,85,Pass,2025-08-01\nC-1001,T201,72,Fail,2025-08-05\n";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="font-semibold text-lg">Upload Training Results (ECAE)</div>
        <p className="text-sm text-slate-500">Template: CandidateID, CourseCode, Score, Pass, Date.</p>
        <div className="mt-4 flex items-center gap-3">
          <input type="file" accept=".xlsx,.csv" onChange={e=>handleFile(e.target.files?.[0]||null)} />
          <a href={"data:text/csv;charset=utf-8,"+encodeURIComponent("\uFEFF"+templateCSV)} download="TrainingResultsTemplate.csv" className="rounded-xl border px-4 py-2">Download Template</a>
          <button className="rounded-xl bg-slate-900 text-white px-4 py-2" onClick={applyResults} disabled={!rows.length}>Validate & Upload</button>
        </div>

        <div className="mt-4 rounded-2xl border p-3 bg-slate-50 text-sm">
          <div className="font-medium">Preview</div>
          {!rows.length ? <div className="text-slate-600">(First 10 rows preview here.)</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm"><thead className="bg-slate-100"><tr><Th>CandidateID</Th><Th>CourseCode</Th><Th>Score</Th><Th>Pass</Th><Th>Date</Th></tr></thead>
                <tbody>
                  <AnimatePresence>
                    {rows.slice(0,10).map((r,i)=>(
                      <Motion.tr key={i} className="border-t" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} layout>
                        <Td>{r.candidateId}</Td><Td>{r.courseCode}</Td><Td>{r.score}</Td><Td>{String(r.pass)}</Td><Td>{r.date}</Td>
                      </Motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!!(report.ok||report.errors.length) && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border p-3">Rows read: <b>{report.ok}</b></div>
            <div className="rounded-2xl border p-3">Candidates updated: <b>{report.updated}</b></div>
            <div className="rounded-2xl border p-3">Issues: <b>{report.errors.length}</b>{!!report.errors.length && (<ul className="mt-2 text-rose-700 text-sm list-disc pl-5 max-h-28 overflow-auto">{report.errors.map((e,i)=><li key={i}>{e}</li>)}</ul>)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------ Bulk Course Import (CSV) ------------------------------
function BulkCourseImportCard(){
  const { candidates, setCandidates, courses } = useStore();
  const [logs, setLogs] = React.useState([]);
  const [busy, setBusy] = React.useState(false);

  const todayISO = () => new Date().toISOString().slice(0,10);
  const truthy = v => /^(1|true|yes|y|pass|passed)$/i.test(String(v||"").trim());

  function downloadTemplate(){
    const csv = [
      "candidate_email,course_code,cohort,start_date,end_date,passed,score",
      "jane.doe@example.com,MATH101,AY24-25-A,2025-09-01,,Yes,88",
      "ahmed@example.com,SCI201,AY24-25-A,2025-09-03,2025-12-11,No,72",
    ].join("\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "bulk_course_import_template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function processRows(rows){
    let added=0, updated=0, completed=0, notFound=0, unknownCourse=0;
    const lf = [];

    // Build fast lookups
    const byEmail = Object.create(null);
    for (const c of candidates || []) if (c.email) byEmail[c.email.toLowerCase()] = c;

    const byCode = Object.create(null);
    for (const k of courses || []) if (k.code) byCode[String(k.code).toUpperCase()] = k;

    const next = (candidates || []).map(c => ({ ...c, enrollments: (c.enrollments||[]).map(e=>({ ...e })), courseResults: (c.courseResults||[]).map(r=>({ ...r })) }));

    for (const raw of rows){
      // Read tolerant columns
      const email = (raw.candidate_email || raw.email || raw.candidate || "").trim().toLowerCase();
      const code  = String(raw.course_code || raw.code || "").trim().toUpperCase();
      if (!email || !code){ lf.push(`SKIP: missing email/code -> ${JSON.stringify(raw)}`); continue; }

      const cohort    = String(raw.cohort||"").trim();
      const startDate = String(raw.start_date||raw.startDate||"").trim() || todayISO();
      const endDate   = String(raw.end_date||raw.endDate||"").trim();
      const passed    = truthy(raw.passed);
      const scoreVal  = raw.score==null || raw.score==="" ? undefined : Number(raw.score);

      const candIdx = next.findIndex(c => (c.email||"").toLowerCase()===email);
      if (candIdx === -1){ notFound++; lf.push(`NOT FOUND: ${email}`); continue; }
      const cand = next[candIdx];

      const course = byCode[code];
      if (!course){ unknownCourse++; lf.push(`UNKNOWN COURSE: ${code} for ${email}`); continue; }

      // Upsert enrollment
      let enr = (cand.enrollments||[]).find(e => String(e.code).toUpperCase()===code);
      if (!enr){
        enr = {
          id: `ENR-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          code,
          title: course.title || code,
          required: !!course.isRequired,                  // base on catalog flag
          type: (course.isRequired ? "Required" : "Optional"),
          cohort,
          startDate,
          endDate: endDate || "",
          status: passed ? "Completed" : "Enrolled",
          assignedBy: "Bulk Import",
          assignedTs: new Date().toISOString(),
        };
        cand.enrollments = [enr, ...(cand.enrollments||[])];
        added++;
      }else{
        // Update existing enrollment
        enr.cohort = cohort || enr.cohort || "";
        enr.startDate = startDate || enr.startDate || "";
        if (endDate) enr.endDate = endDate;
        if (passed){
          enr.status = "Completed";
          enr.endDate = enr.endDate || endDate || todayISO();
        }
        updated++;
      }

      // If passed => mark as Completed and write courseResults
      if (passed){
        const existingRes = (cand.courseResults||[]).find(r => String(r.code).toUpperCase()===code);
        const resultRow = {
          code,
          title: course.title || enr.title || code,
          pass: true,
          score: typeof scoreVal==="number" && !Number.isNaN(scoreVal) ? scoreVal : null,
          date: endDate || enr.endDate || todayISO(),
        };
        if (existingRes){
          Object.assign(existingRes, resultRow);
        }else{
          cand.courseResults = [resultRow, ...(cand.courseResults||[])];
        }
        // Ensure enrollment also marked as completed
        enr.status = "Completed";
        enr.endDate = resultRow.date;
        completed++;
      }
    }

    setCandidates(next);
    setLogs([
      `Imported ${rows.length} rows.`,
      `Added enrollments: ${added}`,
      `Updated enrollments: ${updated}`,
      `Marked completed (passed): ${completed}`,
      `Unknown candidates: ${notFound}`,
      `Unknown courses: ${unknownCourse}`,
      ...lf
    ]);
  }

  function onFile(e){
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      try{
        // Use your existing CSV parser if present; fallback simple parser
        let rows;
        if (typeof parseCSV === "function"){
          rows = parseCSV(String(reader.result||""));
        }else{
          const txt = String(reader.result||"");
          const lines = txt.trim().split(/\r?\n/);
          const headers = lines.shift().split(",").map(h=>h.trim());
          rows = lines.map(line=>{
            const cols = line.split(","); const obj = {};
            headers.forEach((h,i)=> obj[h] = (cols[i]||"").trim());
            return obj;
          });
        }
        processRows(rows);
      }catch(err){
        alert("Failed to parse CSV: " + (err?.message||err));
      }finally{
        setBusy(false);
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Bulk Enroll / Results Import</div>
          <div className="text-sm text-slate-500">Upload a CSV to enroll candidates into courses. Rows with <b>passed=Yes</b> will be marked <b>Completed</b> and added to results.</div>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadTemplate} className="rounded-xl border px-3 py-2">Download template</button>
          <label className={`rounded-xl ${busy ? "bg-slate-200" : "bg-slate-900 hover:opacity-90"} text-white px-3 py-2 cursor-pointer`}>
            {busy ? "Processing…" : "Upload CSV"}
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} disabled={busy} />
          </label>
        </div>
      </div>

      {logs.length>0 && (
        <div className="rounded-xl bg-slate-50 border p-3 text-xs text-slate-700 max-h-56 overflow-auto">
          {logs.map((l,i)=><div key={i}>• {l}</div>)}
        </div>
      )}

      <div className="text-[11px] text-slate-400">
        Columns: <code>candidate_email</code>, <code>course_code</code>, <code>cohort</code>, <code>start_date</code>, <code>end_date</code>, <code>passed</code> (Yes/No), <code>score</code>.
      </div>
    </div>
  );
}


// ------------------------------ Graduation Review (uses course catalog) ------------------------------
function GraduationReviewPage(){
  const { candidates, setCandidates, setCorrections, logEvent, courses, notify } = useStore();

  const withDerived = candidates.map(c=>({
    ...c,
    finalAvg: computeFinalAverage(c, courses),
    trackName: trackNameById(c.trackId),
  }));

  const exceptions = withDerived.filter(c=>{
    const track = TRACKS.find(t=>t.id===c.trackId);
    if(!track) return true;
    const req = requiredCoursesForTrack(courses, c.trackId);
    const meetsAvg = (c.finalAvg??0) >= track.minAverage;
    const hasAll = req.every(course => coursePassed(c, course));
    return !(meetsAvg && hasAll);
  });

  function forceApprove(id){
    setCandidates(prev=>prev.map(c=>c.id===id?{...c,status:"Graduated"}:c));
    logEvent("graduation_force_approved",{ id, ts:new Date().toISOString() });
    alert("Candidate marked as Graduated.");
  }
  function requestClarification(id){
    setCorrections(prev=>[
      { id:`CR-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, candidateId:id, by:"Graduation Review", role:"Admin", forRole:"ECAE Trainer", text:"Graduation Review: Please clarify/confirm required details for this candidate.", status:"Pending", ts:new Date().toISOString() },
      ...prev
    ]);
    logEvent("graduation_clarification_requested",{ id, to:"ECAE Trainer", ts:new Date().toISOString() });
    notify({ role:"ECAE Trainer" }, {
      type: "clarification_requested",
      title: `Graduation clarification for ${id}`,
      body: "Please clarify/confirm required details for this candidate.",
      targetRef: { page: "candidates", candidateId: id }
    });
    alert("Clarification sent to ECAE Trainer.");
  }
  function approveAllValid(){
    setCandidates(prev=>prev.map(c=>{
      const track=TRACKS.find(t=>t.id===c.trackId); const req=requiredCoursesForTrack(courses, c.trackId);
      const finalAvg=computeFinalAverage(c, courses)??0;
      const valid = track && finalAvg>=track.minAverage && req.every(course=>coursePassed(c, course));
      return (valid && c.status!=="Graduated") ? { ...c, status:"Graduated" } : c;
    }));
    logEvent("graduation_approve_all_valid",{ ts:new Date().toISOString() });
  }
  function markReadyForHiring(){
    setCandidates(prev=>prev.map(c=> (c.status==="Graduated" ? { ...c, status:"Ready for Hiring" } : c)));
    logEvent("graduation_mark_ready_for_hiring",{ ts:new Date().toISOString() });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="font-semibold text-lg">Graduation Review</div>
        <p className="text-sm text-slate-500">Exceptions first. Approve in bulk or individually.</p>
        <div className="mt-4 rounded-2xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr className="text-left"><Th>Candidate</Th><Th>Track</Th><Th>Final Avg</Th><Th>Missing/Failing Courses</Th><Th>Action</Th></tr></thead>
            <tbody>
              <AnimatePresence>
                {exceptions.map(c=>{
                  const req=requiredCoursesForTrack(courses, c.trackId);
                  const missing=req.filter(course=>!coursePassed(c, course)).map(x=>`${x.code}(≥${x.passThreshold})`).join(", ") || "—";
                  return (
                    <Motion.tr key={c.id} className="border-t" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} layout>
                      <Td>{c.name} <span className="text-slate-400">({c.id})</span></Td>
                      <Td>{c.trackName}</Td>
                      <Td>{c.finalAvg ?? "—"}</Td>
                      <Td>{missing}</Td>
                      <Td><div className="flex gap-2"><button className="rounded-xl border px-3 py-1" onClick={()=>requestClarification(c.id)}>Request Clarification</button><button className="rounded-xl bg-emerald-600 text-white px-3 py-1" onClick={()=>forceApprove(c.id)}>Force-Approve</button></div></Td>
                    </Motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex gap-2">
          <button className="rounded-xl border px-4 py-2" onClick={approveAllValid}>Approve All Valid</button>
          <button className="rounded-xl bg-slate-900 text-white px-4 py-2" onClick={markReadyForHiring}>Mark Ready for Hiring</button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------ Exports ------------------------------
function ExportsPage(){
  const { candidates, audit, courses } = useStore();

  function downloadHiringReady(){
    const ready=candidates.filter(c=>c.status==="Ready for Hiring");
    const rows=ready.map(c=>({ ID:c.id, Name:c.name, Subject:c.subject, Emirate:c.emirate, Email:c.email, Mobile:c.mobile, FinalAverage:computeFinalAverage(c, courses)??"", Status:c.status, Notes:c.notesThread?.[0]?.text||"" }));
    const headers=[{key:"ID"},{key:"Name"},{key:"Subject"},{key:"Emirate"},{key:"Email"},{key:"Mobile"},{key:"FinalAverage",label:"Final Average"},{key:"Status"},{key:"Notes"}];
    exportXLSX("Hiring-Ready.xlsx", rows, headers, "Hiring Ready");
  }
  function downloadAuditSnapshot(){
    const rows=candidates.map(c=>({ ID:c.id, Name:c.name, Emirate:c.emirate, Subject:c.subject, GPA:c.gpa, Track:c.trackId, Status:c.status, Email:c.email, Mobile:c.mobile, FinalAverage:computeFinalAverage(c, courses)??"", LastNoteBy:c.notesThread?.[0]?.by||"", LastNoteAt:c.notesThread?.[0]?.ts||"", LastNote:c.notesThread?.[0]?.text||"" }));
    const headers=[{key:"ID"},{key:"Name"},{key:"Emirate"},{key:"Subject"},{key:"GPA"},{key:"Track"},{key:"Status"},{key:"Email"},{key:"Mobile"},{key:"FinalAverage",label:"Final Average"},{key:"LastNoteBy"},{key:"LastNoteAt"},{key:"LastNote"}];
    exportXLSX("AuditSnapshot.xlsx", rows, headers, "Audit");
  }
  function downloadAuditLog(){
    const rows=audit.map(e=>({ ID:e.id, Type:e.type, Timestamp:e.ts, Payload:JSON.stringify(e.payload||{}) }));
    const headers=[{key:"ID"},{key:"Type"},{key:"Timestamp"},{key:"Payload"}];
    exportXLSX("AuditLog.xlsx", rows, headers, "AuditLog");
  }

  // NEW: Courses Catalog Export (all fields)
  function downloadCoursesCatalog(){
    const rows = (courses||[]).map(c=>({
      Code:c.code, Title:c.title, Brief:c.brief||"", Tracks:(c.tracks||[]).map(trackNameById).join(", "),
      Weight:c.weight??"", PassThreshold:c.passThreshold??"", Required:c.isRequired?"Yes":"No",
      Modality:c.modality||"", Hours:c.hours??"", Active:c.active!==false?"Yes":"No"
    }));
    const headers = [
      {key:"Code"},{key:"Title"},{key:"Brief"},{key:"Tracks"},
      {key:"Weight",label:"Weight"}, {key:"PassThreshold",label:"Pass ≥"}, {key:"Required"},
      {key:"Modality"},{key:"Hours"},{key:"Active"}
    ];
    exportXLSX("Courses-Catalog.xlsx", rows, headers, "Courses");
  }

  // NEW: Courses Statistics Export (usage + outcomes)
  function downloadCoursesStats(){
    // Build stats per course
    const byCode = new Map();
    courses.forEach(c=>{
      byCode.set(c.code, {
        Code:c.code, Title:c.title, Tracks:(c.tracks||[]).map(trackNameById).join(", "),
        Required:c.isRequired?"Yes":"No", PassThreshold:c.passThreshold??"", Weight:c.weight??"",
        Modality:c.modality||"", Hours:c.hours??"", Active:c.active!==false?"Yes":"No",
        Enrolled:0, WithResults:0, Passes:0, Fails:0, UniqueCandidates:new Set()
      });
    });

    candidates.forEach(c=>{
      // enrollments
      (c.enrollments||[]).forEach(e=>{
        const s = byCode.get(e.code); if(!s) return;
        s.Enrolled += 1; s.UniqueCandidates.add(c.id);
      });
      // results
      (c.courseResults||[]).forEach(r=>{
        const s = byCode.get(r.code); if(!s) return;
        s.WithResults += 1;
        if (Number(r.score) >= (courses.find(k=>k.code===r.code)?.passThreshold ?? 70)) s.Passes += 1; else s.Fails += 1;
        s.UniqueCandidates.add(c.id);
      });
    });

    const rows = [...byCode.values()].map(s => ({
      ...s,
      UniqueCandidates: s.UniqueCandidates.size,
      PassRate: (s.WithResults ? Math.round((s.Passes/s.WithResults)*100) : "")
    }));

    const headers = [
      {key:"Code"},{key:"Title"},{key:"Tracks"},{key:"Required"},{key:"PassThreshold",label:"Pass ≥"},{key:"Weight"},
      {key:"Modality"},{key:"Hours"},{key:"Active"},
      {key:"Enrolled"},{key:"WithResults",label:"With Results"},{key:"Passes"},{key:"Fails"},{key:"PassRate",label:"Pass Rate %"},
      {key:"UniqueCandidates",label:"Unique Candidates"}
    ];

    exportXLSX("Courses-Stats.xlsx", rows, headers, "Course Stats");
  }

  const readyCount=candidates.filter(c=>c.status==="Ready for Hiring").length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="font-semibold text-lg">Hiring-Ready.xlsx</div>
        <p className="text-sm text-slate-500">Minimal PII + last note.</p>
        <div className="mt-3 flex items-center gap-2"><button className="rounded-xl bg-slate-900 text-white px-4 py-2" onClick={downloadHiringReady}>Download</button><span className="text-sm text-slate-600">{readyCount} candidate(s)</span></div>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="font-semibold text-lg">Audit Exports</div>
        <p className="text-sm text-slate-500">Snapshot of candidates & append-only audit.</p>
        <div className="mt-3 flex items-center gap-2"><button className="rounded-xl border px-4 py-2" onClick={downloadAuditSnapshot}>Download Snapshot</button><button className="rounded-xl border px-4 py-2" onClick={downloadAuditLog}>Download AuditLog</button></div>
      </div>

      {/* NEW: Courses exports */}
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="font-semibold text-lg">Courses Catalog</div>
        <p className="text-sm text-slate-500">All course fields (code, title, required, tracks, thresholds, etc.).</p>
        <div className="mt-3"><button className="rounded-xl border px-4 py-2" onClick={downloadCoursesCatalog}>Download Courses-Catalog.xlsx</button></div>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="font-semibold text-lg">Courses Statistics</div>
        <p className="text-sm text-slate-500">Enrollments, results, pass/fail, pass rates, unique candidates.</p>
        <div className="mt-3"><button className="rounded-xl border px-4 py-2" onClick={downloadCoursesStats}>Download Courses-Stats.xlsx</button></div>
      </div>
    </div>
  );
}



// ------------------------------ Platform Users ------------------------------
function UsersPage(){
  const { users, adminUpdateUser, adminResetPassword, adminDeleteUser, adminCreateUser, user } = useAuth();

  const [showAdd, setShowAdd] = useState(false);
  const [newU, setNewU] = useState({ name: "", email: "", role: "Teacher", password: "" });

  function createUser() {
    try {
      const { tempPassword } = adminCreateUser(newU);
      alert(`User created.\nEmail: ${newU.email}\nTemporary password: ${tempPassword}`);
      setNewU({ name: "", email: "", role: "Teacher", password: "" });
      setShowAdd(false);
    } catch (e) {
      alert(e.message || "Failed to create user");
    }
  }

  const [q, setQ] = useState("");
  const filtered = useMemo(()=>{
    const s = q.toLowerCase();
    return (users||[]).filter(u =>
      (u.name||"").toLowerCase().includes(s) ||
      (u.email||"").toLowerCase().includes(s) ||
      (u.role||"").toLowerCase().includes(s)
    );
  },[q,users]);

  function changeRole(email, role){ adminUpdateUser(email, { role }); }
  function resetPwd(email){
    try{ const temp = adminResetPassword(email); alert(`Temporary password for ${email}: ${temp}`); }
    catch(e){ alert(e.message||"Failed to reset"); }
  }
  function del(email){
    if ((user?.email||"").toLowerCase() === String(email||"").toLowerCase()){
      alert("You cannot delete the account that is currently signed in."); return;
    }
    if (!window.confirm(`Delete user ${email}? This cannot be undone.`)) return;
    try{ adminDeleteUser(email); }catch(e){ alert(e.message||"Failed to delete"); }
  }
  function exportUsers(){
    const headers = [
      { key:"name", label:"Name" },
      { key:"email", label:"Email" },
      { key:"role", label:"Role" },
      { key:"createdAt", label:"Created" },
    ];
    const rows = (users||[]).map(u => ({
      name: u.name||"", email: u.email||"", role: u.role||"", createdAt: u.createdAt ? new Date(u.createdAt).toLocaleString() : ""
    }));
    exportXLSX("Platform_Users.xlsx", rows, headers, "Users");
  }

  const roleOptions = ["Admin","ECAE Manager","ECAE Trainer","Auditor","Teacher"];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-6 shadow-sm flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Platform Users</div>
          <div className="text-sm text-slate-500">Manage roles, reset passwords, delete, and export</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input className="rounded-xl border px-3 py-2" placeholder="Search users…" value={q} onChange={e=>setQ(e.target.value)} />
          <button className="rounded-xl border px-3 py-2" onClick={exportUsers}>Export XLSX</button>
          <button className="rounded-xl bg-slate-900 text-white px-3 py-2" onClick={()=>setShowAdd(s=>!s)}>{showAdd ? "Close" : "Add user"}</button>
        </div>
      </div>

      {showAdd && (
        <div className="rounded-2xl border bg-white p-4 shadow-sm mt-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input className="rounded-xl border px-3 py-2" placeholder="Full name" value={newU.name} onChange={e=>setNewU({...newU, name:e.target.value})} />
            <input type="email" className="rounded-xl border px-3 py-2" placeholder="Email" value={newU.email} onChange={e=>setNewU({...newU, email:e.target.value})} />
            <select className="rounded-xl border px-3 py-2" value={newU.role} onChange={e=>setNewU({...newU, role:e.target.value})}>
              {["Admin","ECAE Manager","ECAE Trainer","Auditor","Teacher"].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <input className="rounded-xl border px-3 py-2" placeholder="Password (optional)" value={newU.password} onChange={e=>setNewU({...newU, password:e.target.value})} />
            <div className="md:col-span-4 flex justify-end">
              <button className="rounded-xl bg-slate-900 text-white px-4 py-2" onClick={createUser}>Create user</button>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">If password is empty, a temporary one will be auto-generated.</div>
        </div>
      )}


      <div className="rounded-2xl border bg-white p-6 shadow-sm overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.map(u => (
                <Motion.tr key={u.email} className="border-t" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} layout>
                  <td className="px-3 py-2">{u.name||"—"}</td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">
                    <select className="rounded-lg border px-2 py-1" value={u.role||"Teacher"} onChange={e=>changeRole(u.email, e.target.value)}>
                      {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 space-x-2">
                    <button className="rounded-lg border px-3 py-1" onClick={()=>resetPwd(u.email)}>Reset</button>
                    <button className="rounded-lg border px-3 py-1 text-rose-700" onClick={()=>del(u.email)}>Delete</button>
                  </td>
                </Motion.tr>
              ))}
              {filtered.length===0 && (
                <Motion.tr key="no-users" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-500">No users found.</td>
                </Motion.tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}


// ------------------------------ Hiring Tracker ------------------------------
function HiringTrackerPage(){
  const { candidates, setCandidates } = useStore();
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState("ALL");

  const STAGES = HIRING_STAGES;

  useEffect(() => {
    setCandidates(prev => prev.map(c => {
      if ((c.status==="Graduated" || c.status==="Ready for Hiring") && !c.hiring) {
        return { ...c, hiring: { stage: "Graduated", updatedAt: new Date().toISOString(), notes: "" } };
      }
      return c;
    }));
  }, [setCandidates]);

  const rows = useMemo(() => {
    const list = (candidates||[]).filter(c => c.hiring);
    const s = q.toLowerCase();
    const filteredBySearch = list.filter(c =>
      (c.name||"").toLowerCase().includes(s) ||
      (c.email||"").toLowerCase().includes(s) ||
      (c.emirate||"").toLowerCase().includes(s) ||
      (c.subject||"").toLowerCase().includes(s) ||
      (c.id||"").toLowerCase().includes(s)
    );
    return stageFilter==="ALL" ? filteredBySearch : filteredBySearch.filter(c => (c.hiring?.stage||"")===stageFilter);
  }, [candidates, q, stageFilter]);

  const kpis = useMemo(() => {
    const list = (candidates||[]).filter(c => c.hiring);
    const total = list.length;
    const byStage = STAGES.reduce((acc,s)=>{ acc[s]=0; return acc; }, {});
    list.forEach(c => { byStage[c.hiring?.stage || "Graduated"] = (byStage[c.hiring?.stage || "Graduated"]||0)+1; });
    const assigned = list.filter(c => c.hiring?.stage==="Assigned School").length;
    const onHold = list.filter(c => c.hiring?.stage==="On Hold").length;
    const rejected = list.filter(c => c.hiring?.stage==="Rejected/Closed").length;
    return { total, byStage, assigned, onHold, rejected };
  }, [candidates, STAGES]);

  function setStage(id, stage){
    setCandidates(prev => prev.map(c => c.id===id ? { ...c, hiring: { ...(c.hiring||{}), stage, updatedAt: new Date().toISOString() } } : c));
  }

  
  function setNotes(id, notes){
    setCandidates(prev => prev.map(c => c.id===id ? { ...c, hiring: { ...(c.hiring||{}), notes, updatedAt: new Date().toISOString() } } : c));
  }

  function exportHiring(){
    const headers = [
      { key:"id", label:"Candidate ID" },
      { key:"name", label:"Name" },
      { key:"email", label:"Email" },
      { key:"emirate", label:"Emirate" },
      { key:"subject", label:"Subject" },
      { key:"status", label:"Training Status" },
      { key:"hiringStage", label:"Hiring Stage" },
      { key:"notes", label:"Notes" },
      { key:"updatedAt", label:"Updated" },
    ];

    const rows = (candidates||[]).filter(c => c.hiring).map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      emirate: c.emirate,
      subject: c.subject,
      status: c.status,
      hiringStage: c.hiring?.stage || "",
      notes: c.hiring?.notes || "",
      updatedAt: c.hiring?.updatedAt ? new Date(c.hiring.updatedAt).toLocaleString() : ""
    }));
    exportXLSX("Hiring_Tracker.xlsx", rows, headers, "Hiring");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-6 shadow-sm flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Hiring Tracker</div>
          <div className="text-sm text-slate-500">Graduates progressing to school assignment</div>
        </div>
        <div className="flex items-center gap-2">
          <input className="rounded-xl border px-3 py-2" placeholder="Search name, email, ID, emirate…" value={q} onChange={e=>setQ(e.target.value)} />
          <select className="rounded-xl border px-3 py-2" value={stageFilter} onChange={e=>setStageFilter(e.target.value)}>
            <option value="ALL">All stages</option>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="rounded-xl border px-3 py-2" onClick={exportHiring}>Export XLSX</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">In pipeline</div>
          <div className="text-2xl font-semibold">{kpis.total}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Assigned school</div>
          <div className="text-2xl font-semibold">{kpis.assigned}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">On hold</div>
          <div className="text-2xl font-semibold">{kpis.onHold}</div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Rejected/Closed</div>
          <div className="text-2xl font-semibold">{kpis.rejected}</div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left">
              <th className="px-3 py-2">Candidate</th>
              <th className="px-3 py-2">Contact</th>
              <th className="px-3 py-2">Training</th>
              <th className="px-3 py-2">Hiring Stage</th>
              <th className="px-3 py-2">Notes</th>
            </tr>
          </thead>
            <tbody>
              <AnimatePresence>
                {rows.map(c => (
                  <Motion.tr key={c.id} className="border-t align-top" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} layout>
                    <td className="px-3 py-2">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.id}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div>{c.email}</div>
                      <div className="text-xs text-slate-500">{c.emirate}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div>{c.subject}</div>
                      <div className="text-xs">{c.status}</div>
                    </td>
                    <td className="px-3 py-2">
                      <select className="rounded-lg border px-2 py-1" value={c.hiring?.stage || "Graduated"} onChange={e=>setStage(c.id, e.target.value)}>
                        {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <div className="text-[11px] text-slate-400 mt-1">Last update: {c.hiring?.updatedAt ? new Date(c.hiring.updatedAt).toLocaleString() : "—"}</div>
                    </td>
                    <td className="px-3 py-2">
                      <textarea rows={2} className="w-full rounded-lg border px-2 py-1" placeholder="Notes…" value={c.hiring?.notes || ""} onChange={e=>setNotes(c.id, e.target.value)} />
                    </td>
                  </Motion.tr>
                ))}
                {rows.length===0 && (
                  <Motion.tr key="no-graduates" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
                    <td className="px-3 py-6 text-center text-slate-500" colSpan={6}>No graduated candidates yet.</td>
                  </Motion.tr>
                )}
              </AnimatePresence>
            </tbody>
        </table>
      </div>
    </div>
  );
}
// ------------------------------ Settings ------------------------------
function SettingsPage(){
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const { publicNews, setPublicNews } = useStore();

  // local inputs for new post
  const [title, setTitle] = React.useState("");
  const [body, setBody]   = React.useState("");
  const [editingId, setEditingId] = React.useState("");

  function addUpdate(){
    if (!isAdmin) return;
    const t = title.trim(), b = body.trim();
    if (!t || !b) { alert("Title and body are required."); return; }
    if (editingId) {
      updateUpdate(editingId, { title: t, body: b });
      setEditingId("");
    } else {
      const item = { id:`NEWS-${Date.now()}`, ts:new Date().toISOString(), title:t, body:b };
      setPublicNews(prev => [item, ...prev]);
    }
    setTitle(""); setBody("");
  }
  function removeUpdate(id){
    if (!isAdmin) return;
    if (!window.confirm("Delete this update?")) return;
    setPublicNews(prev => prev.filter(n => n.id !== id));
  }
  function updateUpdate(id, patch){
    if (!isAdmin) return;
    setPublicNews(prev => prev.map(n => n.id===id ? { ...n, ...patch } : n));
  }

  return (
    <div className="space-y-4">
      {/* ...your existing settings cards... */}

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">Landing Page Updates</div>
            <div className="text-sm text-slate-500">These appear on the public landing page.</div>
          </div>
        </div>

        {!isAdmin && (
          <div className="mt-4 text-sm text-slate-500">
            Only <b>Admin</b> can post or edit landing updates.
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor column */}
          <div className="lg:col-span-1">
            <div className="text-sm text-slate-600 mb-2">Create a new update</div>
            <input className="w-full rounded-xl border px-3 py-2 mb-2" placeholder="Title"
                   value={title} onChange={e=>setTitle(e.target.value)} />
            <textarea className="w-full rounded-xl border px-3 py-2 mb-2 h-28 resize-none" placeholder="Body"
                   value={body} onChange={e=>setBody(e.target.value)} />
            <div className="flex gap-2">
              <button onClick={addUpdate} className="rounded-xl bg-indigo-600 text-white px-4 py-2">
                Publish
              </button>
              <button onClick={()=>{ setTitle(''); setBody(''); }} className="rounded-xl border px-4 py-2">
                Clear
              </button>
            </div>
            <div className="text-[11px] text-slate-400 mt-3">(Prototype) Updates are stored locally in this browser via localStorage.</div>
          </div>

          {/* Preview + list column */}
          <div className="lg:col-span-2 space-y-3">
            <div className="text-sm text-slate-600 mb-1">Live preview</div>
            <div className="rounded-xl panel border p-4">
              {title ? <div className="text-lg font-semibold">{title}</div> : <div className="text-lg text-slate-400">Title preview</div>}
              <div className="text-sm text-slate-600 mt-2">{body || <span className="text-slate-400">Body preview</span>}</div>
              <div className="text-xs text-slate-400 mt-3">{new Date().toLocaleString()}</div>
            </div>

            <div className="grid gap-3">
              {publicNews.length === 0 && <div className="text-slate-500">No updates yet.</div>}
              {publicNews.map(n => (
                <div key={n.id} className="rounded-xl border panel p-3 flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold">{n.title}</div>
                    <div className="text-sm text-slate-600 mt-1">{n.body}</div>
                    <div className="text-xs text-slate-400 mt-2">{new Date(n.ts).toLocaleString()}</div>
                  </div>
                  {isAdmin && (
                    <div className="flex flex-col gap-2">
                      <button className="rounded-lg border px-3 py-1 text-sm" onClick={()=>{ setEditingId(n.id); setTitle(n.title); setBody(n.body); }}>
                        Edit
                      </button>
                      <button className="rounded-lg border px-3 py-1 text-sm text-rose-700" onClick={()=>removeUpdate(n.id)}>Delete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ------------------------------ Root ------------------------------
export default function App(){
  const [page,setPage]=useState("dashboard");
  return (
    <AuthProvider>
      <StoreProvider>
        <Gate>
          <AppShell page={page} setPage={setPage} />
          <footer className="p-6 text-center text-xs text-slate-500">© 2025 PD Sector — MVP UI Demo</footer>
        </Gate>
      </StoreProvider>
    </AuthProvider>
  );
}


/* ------------------------------ Public Landing + Auth (Teacher) ------------------------------ */
function LandingPage({ onSignIn, onSignUp }){
  const { user } = useAuth();
  const { publicNews, setPublicNews } = useStore();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [updatesFilter, setUpdatesFilter] = useState('all');

  function addUpdate(){
    const t = title.trim(), b = body.trim();
    if (!t || !b) { alert("Please fill a title and body."); return; }
    const item = { id:`NEWS-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, ts:new Date().toISOString(), title:t, body:b };
    setPublicNews(prev => [item, ...prev]);
    setTitle(""); setBody("");
    setManageOpen(false);
  }

  const news = Array.isArray(publicNews) ? publicNews.slice() : [];
  const filteredNews = updatesFilter === 'all' ? news : news.filter(n => String(n.category || '').toLowerCase() === String(updatesFilter || '').toLowerCase());
  const visibleNews = showAll ? filteredNews : filteredNews.slice(0, 5);

  // Rotating hero images (manifest-based); fallback to hard-coded list
  // Keep this list in sync with public/hero-manifest.json so edits there reflect immediately.
  const defaultCandidates = React.useMemo(() => [
    "/Heros/hero.JPG",
    "/Heros/Hero2.JPG",
    "/Heros/Hero3.JPG",
    "/Heros/Hero4.JPG",
    "/Heros/Hero5.JPG",
  ], []);
  const [heroCandidates, setHeroCandidates] = React.useState(defaultCandidates);
  const [heroIndex, setHeroIndex] = React.useState(0);
  const [heroLoaded, setHeroLoaded] = React.useState(true);
  const [paused, setPaused] = React.useState(false);

  // Try server endpoint first (/api/heros), then manifest, then defaults
  React.useEffect(() => {
    let didCancel = false;
    async function load() {
      try {
        // attempt server endpoint
        const r1 = await fetch('/api/heros');
        if (r1.ok) {
          const list = await r1.json();
          if (!didCancel && Array.isArray(list) && list.length) { setHeroCandidates(list); return; }
        }
  } catch { /* ignore */ }
      try {
        const r2 = await fetch('/hero-manifest.json');
        if (r2.ok) {
          const list2 = await r2.json();
          if (!didCancel && Array.isArray(list2) && list2.length) { setHeroCandidates(list2); return; }
        }
  } catch { /* ignore */ }
      // fallback: keep defaults
    }
    load();
    return () => { didCancel = true; };
  }, []);

  // simple interval to advance heroIndex every 5s; pauses when `paused` is true
  React.useEffect(() => {
    const list = (heroCandidates && heroCandidates.length) ? heroCandidates : ['/hero.jpg'];
    if (paused) return undefined;
    const id = setInterval(() => {
      setHeroIndex(i => (i + 1) % list.length);
    }, 5000);
    return () => clearInterval(id);
  }, [heroCandidates, paused]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-100 via-white to-white">
      {/* Top Nav */}
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-indigo-600 shadow-sm flex items-center justify-center">
            <Workflow className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold tracking-tight">MOE - ECAE</div>
            <div className="text-xs text-slate-500">Talent Tracking System</div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
          <a href="#updates" className="hover:text-slate-900 dark:hover:text-white">Updates</a>
          <a href="#about" className="hover:text-slate-900 dark:hover:text-white">About</a>
          <a href="#faq" className="hover:text-slate-900 dark:hover:text-white">FAQ</a>
        </nav>
        <div className="flex gap-2">
          <button onClick={onSignIn} className="rounded-xl border px-4 py-2 hover:bg-white">Sign in</button>
          <button onClick={onSignUp} className="rounded-xl bg-slate-900 text-white px-4 py-2 hover:opacity-90">Sign up</button>
        </div>
      </header>

      {/* Hero */}
          <section className="relative overflow-hidden">
            <div className="max-w-6xl mx-auto px-6 pt-6 pb-6">
              {/* Heading + CTA removed per request */}

              {/* Hero image strip (moved to top) */}
              <div
                className="mb-6 max-w-[1110px] mx-auto w-full h-auto object-contain rounded-3xl shadow-lg overflow-hidden relative"
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
              >
                <div className="w-full h-full overflow-hidden">
                  {(() => {
                    const n = heroCandidates && heroCandidates.length ? heroCandidates.length : 1;
                    return (
                      <div
                        className="flex h-full transition-transform duration-700"
                        style={{ width: `${n * 100}%`, transform: `translateX(-${heroIndex * (100 / n)}%)` }}
                      >
                        {heroCandidates.map((src, idx) => (
                          <div key={src + idx} className="flex-shrink-0 w-full flex items-center justify-center bg-[rgba(255,255,255,0.02)]" style={{ width: `${100 / n}%` }}>
                            <img
                              src={src}
                              alt={`hero-${idx}`}
                              onLoad={() => setHeroLoaded(true)}
                              onError={() => setHeroIndex(i => (i + 1) % (heroCandidates.length || 1))}
                              style={{ width: '100%', height: 'auto' }}
                              className={`object-contain transition-opacity duration-500 ${heroLoaded ? 'opacity-100' : 'opacity-0'}`}
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Prev / Next buttons */}
                <button
                  aria-label="Previous slide"
                  onClick={() => setHeroIndex(i => {
                    const m = heroCandidates && heroCandidates.length ? heroCandidates.length : 1;
                    return (i - 1 + m) % m;
                  })}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 rounded-full p-2 bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 shadow-none focus:outline-none focus:ring"
                >
                  <svg className="h-5 w-5 text-black/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                </button>

                <button
                  aria-label="Next slide"
                  onClick={() => setHeroIndex(i => {
                    const m = heroCandidates && heroCandidates.length ? heroCandidates.length : 1;
                    return (i + 1) % m;
                  })}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 rounded-full p-2 bg-white/20 dark:bg-black/20 hover:bg-white/30 dark:hover:bg-black/30 shadow-none focus:outline-none focus:ring"
                >
                  <svg className="h-5 w-5 text-black/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
                </button>

                {/* Pager dots */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-3 flex items-center gap-2">
                  {heroCandidates.map((_, idx) => (
                    <button
                      key={"dot-" + idx}
                      onClick={() => { setHeroIndex(idx); setHeroLoaded(false); setTimeout(()=>setHeroLoaded(true), 50); }}
                      className={classNames(
                        "h-3 w-3 md:h-3 md:w-3 rounded-full transition-all duration-220 transform",
                        heroIndex === idx
                          ? "bg-indigo-600/90 border-indigo-700/90 shadow-md scale-105"
                          : "bg-slate-300/85 border-slate-400/90 hover:scale-105"
                      )}
                      aria-label={`Show slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
                {/* Two-column row: left = Title/Subtitle/CTAs, right = Updates card (scrollable) */}
                <div className="max-w-6xl mx-auto px-6">
                  <div className="grid md:grid-cols-2 gap-8 items-start">
                    <div className="flex items-center">
                      <div className="text-justify">
                        <h2 className="text-3xl md:text-4xl font-semibold text-slate-900">Launch your teaching journey with the <span className="text-indigo-600">MOE</span></h2>
                        <div className="mt-2 text-slate-500 italic">Empowering educators through world-class training and professional development pathways.</div>
                        <p className="mt-3 text-slate-600 text-base md:text-lg max-w-lg">Build your educator profile, unlock tailored learning opportunities, and track your achievements with ease. From onboarding to advanced training, the platform connects you with the Ministry of Education’s initiatives, empowering you to grow, excel, and shape the future of education.</p>
                        <div className="mt-6 flex flex-wrap gap-3 justify-start">
                          <button onClick={onSignUp} className="rounded-xl bg-indigo-600 text-white px-5 py-3 text-sm md:text-base shadow hover:opacity-90 inline-flex items-center gap-2">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20" /></svg>
                            Get started
                          </button>
                          <button onClick={onSignIn} className="rounded-xl border px-5 py-3 text-sm md:text-base inline-flex items-center gap-2">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            I already have an account
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="rounded-3xl border bg-white p-5 shadow-lg" id="updates">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <svg className="h-5 w-5 text-indigo-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.664 5.126H19l-4.332 3.147L16.332 16 12 12.853 7.668 16l1.664-4.727L5 8.126h5.336L12 3z"/></svg>
                            <div className="font-medium">Latest updates</div>
                          </div>
                          <div className="text-xs text-slate-500">{news.length} total</div>
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="text-sm text-slate-500">Filter:</div>
                          <div className="flex gap-2">
                            <button onClick={()=>setUpdatesFilter('all')} className={classNames('text-xs px-2 py-1 rounded', updatesFilter==='all'?'bg-indigo-600 text-white':'border text-slate-600')}>All</button>
                            <button onClick={()=>setUpdatesFilter('training')} className={classNames('text-xs px-2 py-1 rounded', updatesFilter==='training'?'bg-indigo-600 text-white':'border text-slate-600')}>Training</button>
                            <button onClick={()=>setUpdatesFilter('moe')} className={classNames('text-xs px-2 py-1 rounded', updatesFilter==='moe'?'bg-indigo-600 text-white':'border text-slate-600')}>MOE</button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                          {visibleNews.length === 0 && <div className="text-slate-500">No updates yet.</div>}
                          {visibleNews.map(n => (
                            <div key={n.id} className="rounded-lg border p-3 bg-white">
                              <div className="font-medium text-sm mb-1">{n.title}</div>
                              <div className="text-slate-600 text-sm mb-2">{n.body}</div>
                              <div className="text-xs text-slate-400">{new Date(n.ts).toLocaleDateString()} — <span className="text-slate-500 text-[11px]">{n.category || 'General'}</span></div>
                            </div>
                          ))}
                        </div>

                        {news.length > visibleNews.length && (
                          <div className="pt-3 text-right">
                            <button onClick={()=>setShowAll(s=>!s)} className="text-xs text-indigo-700 hover:underline">
                              {showAll ? "Show less" : `Show all (${news.length})`}
                            </button>
                          </div>
                        )}

                        {user?.role === "Admin" && (
                          <div className="mt-4">
                            <button onClick={()=>setManageOpen(o=>!o)} className="text-xs text-slate-500 underline">
                              {manageOpen ? "Hide manage updates" : "Post an update (local)"}
                            </button>
                            {manageOpen && (
                              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                                <input className="rounded-xl border px-3 py-2" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
                                <input className="md:col-span-2 rounded-xl border px-3 py-2" placeholder="Body" value={body} onChange={e=>setBody(e.target.value)} />
                                <button onClick={addUpdate} className="md:col-span-3 rounded-xl bg-slate-900 text-white px-4 py-2">Publish</button>
                                <div className="md:col-span-3 text-[11px] text-slate-400">Updates are visible to all visitors and saved to this browser only.</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
            </div>
      </section>

      {/* About / Features */}
      <section id="about" className="max-w-6xl mx-auto px-6 py-12">
        {/* Program highlights + features */}
        <div className="mb-6 grid md:grid-cols-3 gap-4 items-start">
          <div className="md:col-span-3 grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl border bg-white p-6 shadow-sm flex flex-col items-center text-center">
              <img src={program1} alt="Program 1" className="h-16 w-16 mb-3" />
              <div className="font-medium">In-Service PGDE</div>
              <div className="text-sm text-slate-600 mt-1">Accredited postgraduate diploma pathway for practicing teachers.</div>
            </div>
            <div className="rounded-2xl border bg-white p-6 shadow-sm flex flex-col items-center text-center">
              <img src={program2} alt="Program 2" className="h-16 w-16 mb-3" />
              <div className="font-medium">AI in Education</div>
              <div className="text-sm text-slate-600 mt-1">Short courses exploring AI tools for classroom practice.</div>
            </div>
            <div className="rounded-2xl border bg-white p-6 shadow-sm flex flex-col items-center text-center">
              <img src={program3} alt="Program 3" className="h-16 w-16 mb-3" />
              <div className="font-medium">Leadership Pathways</div>
              <div className="text-sm text-slate-600 mt-1">Programs for aspiring school leaders and mentors.</div>
            </div>
          </div>
          
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { title: "Secure profile", desc: "Create your account and manage your personal details in one place.", icon: "M12 2a10 10 0 100 20 10 10 0 000-20zm1 11.73V18h-2v-4.27a2 2 0 112 0zM11 7h2v2h-2z" },
            { title: "Track progress", desc: "Follow your training assignments and results step by step.", icon: "M5 14h3v6H5Z M11 10h3v10h-3Z M17 6h3v14h-3Z" },
            { title: "Stay informed", desc: "See official news and updates curated for candidates.", icon: "M4 4h16v6H4zM4 14h10v6H4z" }
          ].map((f,i)=>(
            <div key={i} className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center mb-3">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d={f.icon}/></svg>
              </div>
              <div className="font-medium">{f.title}</div>
              <div className="text-sm text-slate-600 mt-1">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-6xl mx-auto px-6 pb-14">
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="font-semibold text-lg mb-4">Frequently asked</div>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-slate-700">
            <div>
              <div className="font-medium">Is Sign up only for teachers?</div>
              <p className="mt-1">Yes, new users register as teachers. Admin and partner roles use provisioned accounts.</p>
            </div>
            <div>
              <div className="font-medium">Can I edit my email later?</div>
              <p className="mt-1">Your email is the account identifier and can’t be changed after sign up.</p>
            </div>
            <div>
              <div className="font-medium">How do I express interest?</div>
              <p className="mt-1">After signing in, open <b>My Profile</b> and click <i>I'm interested</i>.</p>
            </div>
            <div>
              <div className="font-medium">Where are updates stored?</div>
              <p className="mt-1">Updates are saved to your browser’s storage for prototype use.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-6 py-6 text-xs text-slate-500 flex items-center justify-between">
          <div>© {new Date().getFullYear()} Ministry of Education (Prototype)</div>
          <div className="flex items-center gap-4">
            <a className="hover:text-slate-800" href="#updates">Updates</a>
            <a className="hover:text-slate-800" href="#about">About</a>
            <a className="hover:text-slate-800" href="#faq">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SignInPublic({ onBack, onForgot }){
  const { login } = useAuth();
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [err,setErr] = useState("");

  function submit(e){ e.preventDefault(); setErr(""); try{ login(email.trim(), password); }catch(ex){ setErr(ex.message || "Login failed"); } }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50">
      <form onSubmit={submit} className="w-[380px] rounded-2xl border bg-white p-6 shadow-sm space-y-3">
        <div className="text-lg font-semibold">Sign in</div>
        <label className="text-sm block">Email<input className="mt-1 w-full rounded-xl border px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@domain" /></label>
        <label className="text-sm block">Password<input type="password" className="mt-1 w-full rounded-xl border px-3 py-2" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••" /></label>
        {err && <div className="text-sm text-rose-600">{err}</div>}
        <button className="w-full rounded-xl bg-slate-900 text-white px-4 py-2">Sign in</button>
        <div className="flex justify-between text-xs text-slate-500">
          <button type="button" className="underline" onClick={onBack}>← Back</button>
          <button type="button" className="underline" onClick={onForgot}>Forgot password?</button>
        </div>
      </form>
    </div>
  );
}

function SignUpTeacher({ onBack, onSuccess }){
  const { register, requestEmailVerification, confirmEmailVerification, login } = useAuth();
  const [form, setForm] = useState({ name:"", email:"", password:"", confirm:"" });
  const [err,setErr] = useState("");
  const [step,setStep] = useState("form");
  const [sentCode,setSentCode] = useState("");

  function submit(e){
    e.preventDefault(); setErr("");
    try{
      if (form.password !== form.confirm) { setErr("Passwords do not match"); return; }
      register({ name: form.name, email: form.email, password: form.password });
      const code = requestEmailVerification(form.email);
      setSentCode(code);
      setStep("verify");
    }catch(ex){ setErr(ex.message || "Registration failed"); }
  }

  // emailExists removed; keep err handling inline when needed

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50">
      {step==="form" && (
        <form onSubmit={submit} className="w-[520px] rounded-2xl border bg-white p-6 shadow-sm space-y-3">
          <div className="text-lg font-semibold">Sign up — Teacher</div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Full name
              <input className="mt-1 w-full rounded-xl border px-3 py-2" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
            </label>
            <label className="text-sm">Email
              <input className="mt-1 w-full rounded-xl border px-3 py-2" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="email@domain" />
            </label>
            <label className="text-sm">Password
              <input type="password" className="mt-1 w-full rounded-xl border px-3 py-2" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="min 4 chars" />
            </label>
            <label className="text-sm">Confirm password
              <input type="password" className="mt-1 w-full rounded-xl border px-3 py-2" value={form.confirm} onChange={e=>setForm({...form,confirm:e.target.value})} />
            </label>
          </div>
          {err && <div className="text-sm text-red-600">{err}</div>}
          <div className="flex items-center justify-between">
            <button type="button" onClick={onBack} className="rounded-xl border px-3 py-1">Back</button>
            <div className="space-x-2">
              <button type="submit" className="rounded-xl bg-indigo-600 text-white px-4 py-1.5">Sign up</button>
            </div>
          </div>
        </form>
      )}
      {step==="verify" && (
        <form onSubmit={(e)=>{e.preventDefault(); setErr(""); try{ confirmEmailVerification(form.email, form.code); login(form.email, form.password); onSuccess?.(); }catch(ex){ setErr(ex.message||"Verification failed"); }}} className="w-[520px] rounded-2xl border bg-white p-6 shadow-sm space-y-3">
          <div className="text-lg font-semibold">Verify your email</div>
          <div className="text-sm text-slate-600">We sent a 6-digit code to <b>{form.email}</b>. Enter it below to continue.</div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm col-span-2">Verification code
              <input className="mt-1 w-full rounded-xl border px-3 py-2" value={form.code||""} onChange={e=>setForm({...form, code:e.target.value})} />
            </label>
            <div className="text-xs text-slate-500 col-span-2">Demo: code is <b>{sentCode}</b></div>
          </div>
          {err && <div className="text-sm text-red-600">{err}</div>}
          <div className="flex items-center justify-between">
            <button type="button" onClick={()=>setStep("form")} className="rounded-xl border px-3 py-1">Back</button>
            <button type="submit" className="rounded-xl bg-emerald-600 text-white px-4 py-1.5">Verify & Continue</button>
          </div>
        </form>
      )}
    </div>
  );
}

function ForgotPassword({ onBack, onSuccess, prefillEmail = "" }){
  const { requestPasswordReset, confirmPasswordReset } = useAuth();
  const [step, setStep] = useState("start"); // "start" | "verify"
  const [email, setEmail] = useState(prefillEmail);
  const [issuedCode, setIssuedCode] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function sendCode(e){
    e?.preventDefault();
    setErr(""); setMsg("");
    try {
      const c = requestPasswordReset(email);
      setIssuedCode(String(c));
      setStep("verify");
      setMsg("We sent a reset code to your email. (Demo code shown below.)");
    } catch (ex){
      setErr(ex.message || "Could not send reset code");
    }
  }

  function resetNow(e){
    e?.preventDefault();
    setErr(""); setMsg("");
    if (newPassword !== confirmPassword){
      setErr("Passwords do not match");
      return;
    }
    try {
      confirmPasswordReset(email, code, newPassword);
      alert("Password updated! Please sign in with your new password.");
      onSuccess?.();
    } catch (ex){
      setErr(ex.message || "Could not reset password");
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50">
      {step === "start" && (
        <form onSubmit={sendCode} className="w-[420px] rounded-2xl border bg-white p-6 shadow-sm space-y-3">
          <div className="text-lg font-semibold">Reset password</div>
          <label className="text-sm block">Email<input className="mt-1 w-full rounded-xl border px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@domain" /></label>
          {err && <div className="text-sm text-rose-600">{err}</div>}
          {msg && <div className="text-sm text-emerald-700">{msg}</div>}
          <button className="w-full rounded-xl bg-slate-900 text-white px-4 py-2">Send reset code</button>
          <div className="flex justify-between text-xs text-slate-500">
            <button type="button" className="underline" onClick={onBack}>← Back</button>
          </div>
        </form>
      )}
      {step === "verify" && (
        <form onSubmit={resetNow} className="w-[420px] rounded-2xl border bg-white p-6 shadow-sm space-y-3">
          <div className="text-lg font-semibold">Enter code & new password</div>
          <div className="text-xs text-slate-600">We emailed a 6‑digit code to <b>{email}</b>. For demo purposes your code is shown here:</div>
          <div className="text-sm font-mono px-2 py-1 rounded bg-slate-100 inline-block">{issuedCode}</div>
          <label className="text-sm block">Reset code<input className="mt-1 w-full rounded-xl border px-3 py-2" value={code} onChange={e=>setCode(e.target.value)} placeholder="123456" /></label>
          <label className="text-sm block">New password<input type="password" className="mt-1 w-full rounded-xl border px-3 py-2" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="••••" /></label>
          <label className="text-sm block">Confirm password<input type="password" className="mt-1 w-full rounded-xl border px-3 py-2" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="••••" /></label>
          {err && <div className="text-sm text-rose-600">{err}</div>}
          <button className="w-full rounded-xl bg-slate-900 text-white px-4 py-2">Reset password</button>
          <div className="flex justify-between text-xs text-slate-500">
            <button type="button" className="underline" onClick={onBack}>← Back</button>
          </div>
        </form>
      )}
    </div>
  );
}



function TeacherProfile(){
  const { user, updateProfile, logout } = useAuth();
  const { candidates, courses, notify } = useStore();

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    dob: user?.dob || "",
    gender: user?.gender || "",
    preferredSubject: user?.preferredSubject || "",
    emirate: user?.emirate || "",
    contactNumber: user?.contactNumber || "",
    yearsExperience: user?.yearsExperience || "",
    currentJob: user?.currentJob || "",
    emiratesIdNumber: user?.emiratesIdNumber || "",
    otherNotes: user?.otherNotes || "",
    docs: user?.docs || {}
  });

  // Required field + format validators
  const UAE_MOBILE_RE = /^\+9715\d{8}$/;          // e.g. +9715XXXXXXXX
  const EID_RE        = /^784-\d{4}-\d{7}-\d{1}$/; // 784-YYYY-XXXXXXX-X

  function isProfileValid(f = {}) {
    return Boolean(
      (f.name || "").trim() &&
      (f.dob || "").trim() &&
      (f.gender || "").trim() &&
      (f.preferredSubject || "").trim() &&
      (f.emirate || "").trim() &&
      UAE_MOBILE_RE.test(f.contactNumber || "") &&
      EID_RE.test(f.emiratesIdNumber || "")
    );
  }

  const valid = isProfileValid(form);

  useEffect(()=>{
    // keep form name synced when user name updates
    setForm(f => ({ ...f, name: user?.name || f.name }));
  }, [user?.name]);

  const isAccepted = user?.applicantStatus === "Accepted";
  const isPending  = user?.interested && user?.applicantStatus !== "Accepted";

  function _saveProfile(){
    updateProfile({ ...form });
    alert("Profile saved.");
  }

  function expressInterest(){
    updateProfile({ interested:true, applicantStatus:"Pending" });
    try {
      notify({ role:"Admin" }, { type:"teacher_interest", title:"New teacher interest", body:`${user?.name||user?.email} wants to join MOE`, targetRef:{ page:"applicants" } });
  } catch (e) { void e; }
    alert("Your interest has been sent. An admin will review your profile.");
  }

  // If accepted, find my candidate record and compute progress
  const myCandidate = useMemo(()=> (candidates||[]).find(c => (c.email||"").toLowerCase()===(user?.email||"").toLowerCase()) || null, [candidates, user?.email]);
  const assignedEnrolls = useMemo(()=> (myCandidate?.enrollments||[]).filter(Boolean), [myCandidate]);
  const completedEnrolls = useMemo(()=> assignedEnrolls.filter(e => String(e.status||"").toLowerCase()==="completed"), [assignedEnrolls]);
  const progressPct = assignedEnrolls.length ? Math.round(100*completedEnrolls.length/assignedEnrolls.length) : 0;

  function downloadMyPDF(){
    if(!myCandidate){ alert("No candidate record yet."); return; }
    const name = user?.name || user?.email || "User";
    generateCandidatePDF(myCandidate, courses, name);
  }

  function handleFile(key, file){
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, docs: { ...(f.docs||{}), [key]: { name: file.name, data: String(reader.result) } } }));
    reader.readAsDataURL(file);
  }

  return (
    
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="font-semibold">My Profile</div>
          <div className="flex items-center gap-3">
            <button className="rounded-xl border px-3 py-1" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">
              Hello{user?.name ? "," : ""} {user?.name || "there"}
              {isAccepted && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-700 dark:text-emerald-100">
                  {user?.applicantStatus}
                </span>
              )}
              <div className="mt-1 text-sm text-slate-600">
                {isAccepted ? (
  <div className="tracking-wider">
    <div>Candidate ID: {user.candidateId}</div>
    <div className="text-slate-500">
      Sponsor: {myCandidate?.sponsor || "—"}
    </div>
  </div>
) : user?.applicantStatus === "Rejected" ? (
  <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500 dark:bg-red-700 dark:text-red-100">Rejected</span>
) : (
  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 dark:bg-gray-700 dark:text-gray-100">New user</span>
)}

              </div>
            </div>

  {!isAccepted && (
    <div className="flex items-center gap-2">
      <button
        className={
          "rounded-xl border px-4 py-1.5 " +
          (isPending ? "opacity-60 pointer-events-none" : "")
        }
        disabled={isPending}
        onClick={expressInterest}
      >
        {isPending && user?.applicantStatus !== "Rejected"
          ? "Pending review"
          : user?.applicantStatus == "Rejected"
          ? "Sorry .. Application Rejected"
          : "I want to join MOE as a teacher"}
      </button>
    </div>
  )}
</div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="font-medium mb-3">Personal & Professional Details</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label>Name <span className="text-rose-600">*</span><input required className="mt-1 w-full rounded-xl border px-3 py-2" value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})} /></label>
            <label>Email<input disabled className="mt-1 w-full rounded-xl border px-3 py-2 bg-slate-100 text-slate-500" value={user?.email} readOnly /></label>
            <label>Date of birth <span className="text-rose-600">*</span><input required type="date" className="mt-1 w-full rounded-xl border px-3 py-2" value={form.dob||""} onChange={e=>setForm({...form,dob:e.target.value})} /></label>
            <label>Gender <span className="text-rose-600">*</span><select required className="mt-1 w-full rounded-xl border px-3 py-2" value={form.gender||""} onChange={e=>setForm({...form,gender:e.target.value})}><option value="" disabled>Select gender</option><option>Female</option><option>Male</option></select></label>
            <label>Preferred teaching subject <span className="text-rose-600">*</span><select required className="mt-1 w-full rounded-xl border px-3 py-2" value={form.preferredSubject||""} onChange={e=>setForm({...form,preferredSubject:e.target.value})}><option value="" disabled>Select a subject</option>{SUBJECTS.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
            <label>Emirate <span className="text-rose-600">*</span><select required className="mt-1 w-full rounded-xl border px-3 py-2" value={form.emirate||""} onChange={e=>setForm({...form,emirate:e.target.value})}><option value="" disabled>Select an emirate</option>{EMIRATES.map(em=><option key={em} value={em}>{em}</option>)}</select></label>
            <label>Mobile number <span className="text-rose-600">*</span><input required type="tel" inputMode="tel" className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="+9715XXXXXXXX" pattern="^\+9715\d{8}$" title="Enter a UAE mobile number like +9715XXXXXXXX" value={form.contactNumber||""} onChange={e=>setForm({...form,contactNumber:e.target.value})} /></label>
            <label>Emirates ID number <span className="text-rose-600">*</span><input required type="text" className="mt-1 w-full rounded-xl border px-3 py-2" placeholder="784-XXXX-XXXXXXX-X" pattern="^784-\d{4}-\d{7}-\d{1}$" title="Format: 784-YYYY-XXXXXXX-X" value={form.emiratesIdNumber||""} onChange={e=>setForm({...form,emiratesIdNumber:e.target.value})} /></label>
            <label>Current job title<input className="mt-1 w-full rounded-xl border px-3 py-2" value={form.currentJob} onChange={e=>setForm({...form,currentJob:e.target.value})} /></label>
            <label>Years of teaching experience<input type="number" className="mt-1 w-full rounded-xl border px-3 py-2" value={form.yearsExperience} onChange={e=>setForm({...form,yearsExperience:e.target.value})} /></label>
            <label className="col-span-2">Other notes<textarea rows={2} className="mt-1 w-full rounded-xl border px-3 py-2" value={form.otherNotes} onChange={e=>setForm({...form,otherNotes:e.target.value})} /></label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mt-4">
            <label>Upload Emirates ID<input type="file" className="mt-1 w-full rounded-xl border px-3 py-2" onChange={e=>handleFile("emiratesId", e.target.files?.[0])} />{form.docs?.emiratesId?.name && <div className="text-xs text-slate-500 mt-1">Uploaded: {form.docs.emiratesId.name}</div>}</label>
            <label>Upload CV<input type="file" className="mt-1 w-full rounded-xl border px-3 py-2" onChange={e=>handleFile("cv", e.target.files?.[0])} />{form.docs?.cv?.name && <div className="text-xs text-slate-500 mt-1">Uploaded: {form.docs.cv.name}</div>}</label>
            <label>Upload Teaching License<input type="file" className="mt-1 w-full rounded-xl border px-3 py-2" onChange={e=>handleFile("teachingLicense", e.target.files?.[0])} />{form.docs?.teachingLicense?.name && <div className="text-xs text-slate-500 mt-1">Uploaded: {form.docs.teachingLicense.name}</div>}</label>
          </div>

          <div className="mt-4"><button  className={`rounded-xl px-4 py-2 text-white ${valid ? "bg-slate-900" : "bg-slate-400 cursor-not-allowed"}`} disabled={!valid} onClick={() => valid && updateProfile(form)}>Save changes</button></div>
        </div>

        {isAccepted && (
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="font-medium">My Training</div>
              <button className="rounded-xl border px-3 py-1" onClick={downloadMyPDF}>Download my PDF</button>
            </div>
            <div className="mt-3">
              <div className="text-sm">Overall progress</div>
              <div className="h-2 rounded bg-slate-200 mt-1">
                <div className="h-2 rounded bg-slate-900" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="text-xs text-slate-600 mt-1">{progressPct}% complete ({completedEnrolls.length} of {assignedEnrolls.length} courses)</div>
            </div>
            <div className="mt-3 rounded-2xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50"><tr className="text-left"><th className="px-3 py-2">Course</th><th className="px-3 py-2">Cohort</th><th className="px-3 py-2">Dates</th><th className="px-3 py-2">Status</th></tr></thead>
                <tbody>
                  {assignedEnrolls.length===0 ? <tr><td className="px-3 py-3 text-slate-500" colSpan={4}>No enrollments yet.</td></tr> : assignedEnrolls.map((e,i)=>{
                    const c = (courses||[]).find(cc=>cc.code===e.code);
                    return (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2"><div className="font-medium">{e.code}</div><div className="text-xs text-slate-500">{e.title || c?.title || ""}</div></td>
                        <td className="px-3 py-2">{e.cohort || "—"}</td>
                        <td className="px-3 py-2">{e.startDate || "—"} → {e.endDate || "—"}</td>
                        <td className="px-3 py-2">{e.status || "Enrolled"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function PublicPages({ page, setPage }){
  const [resetEmail] = useState("");
  if (page === "signin") return <SignInPublic onBack={()=>setPage("landing")} onForgot={()=>setPage("forgot")} />;
  if (page === "signup") return <SignUpTeacher onBack={()=>setPage("landing")} onSuccess={()=>setPage("signin")} />;
  if (page === "forgot") return <ForgotPassword prefillEmail={resetEmail} onBack={()=>setPage("landing")} onSuccess={()=>setPage("signin")} />;
  return <LandingPage onSignIn={()=>setPage("signin")} onSignUp={()=>setPage("signup")} />;
}


/* Gate shows Login until authenticated */
/* Gate shows Login until authenticated */
function Gate({ children }){
  const { user } = useAuth();
  const [publicPage, setPublicPage] = useState("landing");
  if (!user) return <PublicPages page={publicPage} setPage={setPublicPage} />;
  if (user.role === "Teacher") return <TeacherProfile />;
  return children;
}


// ------------------------------ Dev tests ------------------------------
function runDevTests(){
  console.assert(typeof parseCSV("A,B\n1,2\n3,4")!=="undefined","CSV parses");
}
if(typeof window!=="undefined"){ try{ runDevTests(); }catch(e){ console.error("DEV TESTS FAILED:",e); } }


function ApplicantsPage(){
  const { users, adminUpdateUser } = useAuth();
  const { notify, setCandidates } = useStore();

  const applicants = users.filter(u => u.role==="Teacher" && u.interested);
  const [open, setOpen] = React.useState(null); // email of selected applicant
  const selected = React.useMemo(
    () => applicants.find(x => x.email === open) || null,
    [open, applicants]
  );

  function accept(email){
    const u = users.find(x => x.email.toLowerCase() === String(email).toLowerCase());
    if (!u) return;
    const id = `C-${Date.now().toString().slice(-6)}`;
    const trackId = subjectToTrackId(u.preferredSubject || "");
    const newC = {
      id,
      name: u.name || "",
      nationalId: u.emiratesIdNumber || "",
      email: u.email,
      mobile: u.contactNumber || "",
      emirate: u.emirate || "",
      subject: u.preferredSubject || "",
      gpa: "",
      trackId,
      status: "Ready",
      sponsor: "",
      courseResults: [],
      enrollments: [],
      notesThread: [{ id:`N-${id}`, who:"Admin", text:"Accepted from applicants.", ts:new Date().toISOString() }]
    };
    setCandidates(prev => [...prev, newC]);
    adminUpdateUser(email, { applicantStatus: "Accepted", candidateId: id });
    notify({ role:"Admin" }, { type:"applicant_accepted", title:"Applicant accepted", body:`${u.name} moved to Candidates`, target:{ page:"candidates", candidateId:id } });
    alert("Applicant accepted and added to Candidates.");
  }

  function reject(email){
    const u = users.find(x => x.email.toLowerCase() === String(email).toLowerCase());
    if (!u) return;
    adminUpdateUser(email, { applicantStatus:"Rejected" });
    notify({ role:"Admin" }, { type:"applicant_rejected", title:"Applicant rejected", body:`${u.name} rejected.` });
    alert("Applicant rejected.");
  }

  function exportApplicants(){
  // Build clean rows with user-friendly column names
  const rows = applicants.map(u => ({
    Name: u.name || "",
    Email: u.email || "",
    Emirate: u.emirate || "",
    Subject: u.preferredSubject || "",
    Contact: u.contactNumber || "",
    "Years Exp": u.yearsExperience || "",
    "Current Job": u.currentJob || "",
    "Emirates ID": u.emiratesIdNumber || "",
    Status: u.applicantStatus || "Pending",
  }));

  // Use XLSX directly
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Applicants");
  XLSX.writeFile(wb, "Applicants.xlsx");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-6 shadow-sm flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Teacher Applicants</div>
          <div className="text-sm text-slate-500">Interested teachers pending review</div>
        </div>
        <button className="rounded-xl border px-3 py-1" onClick={exportApplicants}>Export XLSX</button>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Emirate</th>
              <th className="px-3 py-2">Subject</th>
              <th className="px-3 py-2">Years Exp</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applicants.map(u => (
              <tr key={u.email} className="border-t">
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.emirate||"—"}</td>
                <td className="px-3 py-2">{u.preferredSubject||"—"}</td>
                <td className="px-3 py-2">{u.yearsExperience||"—"}</td>
                <td className="px-3 py-2">{u.applicantStatus||"Pending"}</td>
                <td className="px-3 py-2 space-x-2">
                  <button className="rounded-lg border px-3 py-1" onClick={()=>setOpen(u.email)}>View</button>
                  <button className="rounded-lg border px-3 py-1" onClick={()=>accept(u.email)}>Accept</button>
                  <button className="rounded-lg border px-3 py-1" onClick={()=>reject(u.email)}>Reject</button>
                </td>
              </tr>
            ))}
            {applicants.length===0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">No applicants yet.</td>
              </tr>
            )}
          </tbody>
        </table>

        {selected && (
          <div className="mt-6 rounded-xl border p-4 bg-slate-50">
            <div className="font-semibold mb-2">Profile preview</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><b>Name:</b> {selected.name}</div>
              <div><b>Email:</b> {selected.email}</div>
              <div><b>DOB:</b> {selected.dob||"—"}</div>
              <div><b>Gender:</b> {selected.gender||"—"}</div>
              <div><b>Subject:</b> {selected.preferredSubject||"—"}</div>
              <div><b>Emirate:</b> {selected.emirate||"—"}</div>
              <div><b>Contact:</b> {selected.contactNumber||"—"}</div>
              <div><b>Years Exp:</b> {selected.yearsExperience||"—"}</div>
              <div><b>Current job:</b> {selected.currentJob||"—"}</div>
              <div><b>Emirates ID #:</b> {selected.emiratesIdNumber||"—"}</div>
              <div className="col-span-2"><b>Notes:</b> {selected.otherNotes||"—"}</div>
              <div className="col-span-2 flex gap-6 mt-2">
                {selected.docs?.emiratesId?.data && (
                  <a download={selected.docs.emiratesId.name||"emirates-id"} href={selected.docs.emiratesId.data} className="underline">
                    Download Emirates ID
                  </a>
                )}
                {selected.docs?.cv?.data && (
                  <a download={selected.docs.cv.name||"cv"} href={selected.docs.cv.data} className="underline">
                    Download CV
                  </a>
                )}
                {selected.docs?.teachingLicense?.data && (
                  <a download={selected.docs.teachingLicense.name||"teaching-license"} href={selected.docs.teachingLicense.data} className="underline">
                    Download Teaching License
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



/* ========================= Course Enrollment (Manual + Bulk) — FINAL ========================= */
function CourseEnrollmentPage(){
  const { user } = useAuth();
  const canManage = ["Admin","ECAE Manager","ECAE Trainer"].includes(user?.role);
  const [tab, setTab] = React.useState("manual");
  if(!canManage) return <div className="p-6">You do not have access to Course Enrollment.</div>;
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-semibold">Course Enrollment</div>
        <div className="text-sm text-slate-500">Assign candidates manually or via CSV (enroll-only)</div>
      </div>

      <div className="flex gap-2">
        <button className={`px-3 py-2 rounded-xl border ${tab==="manual"?"bg-slate-900 text-white":"bg-white"}`} onClick={()=>setTab("manual")}>Manual Assign</button>
        <button className={`px-3 py-2 rounded-xl border ${tab==="bulk"?"bg-slate-900 text-white":"bg-white"}`} onClick={()=>setTab("bulk")}>Bulk Enroll (CSV)</button>
      </div>

      {tab==="manual"  && <ManualEnrollCard />}
      {tab==="bulk"    && <BulkEnrollOnlyCard />}
    </div>
  );
}




function ManualEnrollCard(){
  const { candidates, setCandidates, courses, notify } = useStore();
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState("");
  const [courseCode, setCourseCode] = React.useState("");
  const [cohort, setCohort] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  const list = useMemo(()=> Array.isArray(candidates) ? candidates : [], [candidates]);
  const courseList = useMemo(()=> Array.isArray(courses) ? courses : [], [courses]);

  const selected = React.useMemo(()=> list.find(c=>String(c.id)===String(selectedId)) || null, [list, selectedId]);

  const filtered = React.useMemo(()=>{
    const q = query.trim().toLowerCase();
    if (!q) return list.slice(0,50);
    return list.filter(c =>
      (c.name||"").toLowerCase().includes(q) ||
      (c.email||"").toLowerCase().includes(q) ||
      String(c.id||"").toLowerCase().includes(q)
    ).slice(0,50);
  },[query, list]);

  function assign(){
    if (!selectedId || !courseCode) { alert("Select a candidate and a course."); return; }
    const code = String(courseCode).trim().toUpperCase();
    const next = list.map(c => ({...c, enrollments: (c.enrollments||[]).map(e=>({ ...e }))}));
    const idx = next.findIndex(c => String(c.id)===String(selectedId));
    if (idx === -1) { alert("Candidate not found."); return; }
    const cand = next[idx];
    const exists = (cand.enrollments||[]).find(e => String(e.code).toUpperCase()===code);
    if (exists){
      exists.cohort = cohort || exists.cohort || "";
      exists.startDate = startDate || exists.startDate || "";
      if (endDate) exists.endDate = endDate;
      if (!exists.status) exists.status = "Enrolled";
    } else {
      const kc = courseList.find(k=>String(k.code).toUpperCase()===code);
      cand.enrollments = [{
        id: `ENR-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
        code,
        title: kc?.title || code,
        required: !!kc?.isRequired,
        type: (kc?.isRequired ? "Required" : "Optional"),
        cohort: cohort || "",
        startDate: startDate || "",
        endDate: endDate || "",
        status: "Enrolled",
        assignedBy: "Manual",
        assignedTs: new Date().toISOString(),
      }, ...(cand.enrollments||[])];
    }
    setCandidates(next);
    notify?.("Enrollment", `Assigned ${cand.name||cand.email} → ${courseCode}`);
    setQuery(""); setCourseCode(""); setCohort(""); setStartDate(""); setEndDate("");
  }

  function removeEnrollment(code){
    const ccode = String(code||"").toUpperCase();
    if (!selectedId || !ccode) { alert("Select a candidate and a course to remove."); return; }
    if (!confirm("Remove this candidate from the selected course?")) return;
    const next = list.map(c => ({...c, enrollments: (c.enrollments||[]).map(e=>({ ...e }))}));
    const idx = next.findIndex(c => String(c.id)===String(selectedId));
    if (idx === -1) { alert("Candidate not found."); return; }
    const cand = next[idx];
    const before = cand.enrollments?.length || 0;
    cand.enrollments = (cand.enrollments||[]).filter(e => String(e.code).toUpperCase() !== ccode);
    const after = cand.enrollments.length;
    setCandidates(next);
    notify?.("Enrollment", `Removed ${cand.name||cand.email} from ${ccode}`);
    if (before === after) alert("Candidate was not enrolled in that course.");
  }

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="text-sm mb-1">Find candidate by name / email / ID</div>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Type to search…" className="w-full rounded-xl border px-3 py-2"/>
          <div className="max-h-48 overflow-auto border rounded-xl mt-2">
            {filtered.map(c=>(
              <button key={c.id}
                onClick={()=>{setSelectedId(c.id)}}
                className={`w-full text-left px-3 py-2 border-b hover:bg-slate-50 ${selectedId===c.id?"bg-slate-100":""}`}>
                <div className="font-medium">{c.name} <span className="text-slate-500">({c.email})</span></div>
                <div className="text-xs text-slate-500">ID: {c.id}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="font-medium">Assign to course</div>
          <div>
            <div className="text-sm mb-1">Course</div>
            <select value={courseCode} onChange={e=>setCourseCode(e.target.value)} className="w-full rounded-xl border px-3 py-2">
              <option value="">Select a course…</option>
              {courseList.map(k=><option key={k.code} value={k.code}>{k.code} — {k.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-sm mb-1">Cohort</div>
              <input value={cohort} onChange={e=>setCohort(e.target.value)} placeholder="e.g., AY24-25-A" className="w-full rounded-xl border px-3 py-2"/>
            </div>
            <div>
              <div className="text-sm mb-1">Start date</div>
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="w-full rounded-xl border px-3 py-2"/>
            </div>
          </div>
          <div>
            <div className="text-sm mb-1">End date (optional)</div>
            <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="w-full rounded-xl border px-3 py-2"/>
          </div>
          <div className="flex gap-2">
            <button onClick={assign} className="rounded-xl bg-slate-900 text-white px-4 py-2">Assign</button>
            
          </div>
        </div>
      </div>

      {selected && (
        <div className="mt-6">
          <div className="text-sm font-semibold mb-2">Current enrollments for {selected.name || selected.email}</div>
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-2">Code</th>
                  <th className="text-left p-2">Title</th>
                  <th className="text-left p-2">Cohort</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Start</th>
                  <th className="text-left p-2">End</th>
                  <th className="text-left p-2"></th>
                </tr>
              </thead>
              <tbody>
                {(selected.enrollments||[]).map(e=>(
                  <tr key={e.id} className="border-t">
                    <td className="p-2">{e.code}</td>
                    <td className="p-2">{e.title}</td>
                    <td className="p-2">{e.cohort}</td>
                    <td className="p-2">{e.status}</td>
                    <td className="p-2">{e.startDate}</td>
                    <td className="p-2">{e.endDate}</td>
                    <td className="p-2 text-right">
                      <button onClick={()=>removeEnrollment(e.code)} className="text-red-600 hover:underline">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}





function BulkEnrollOnlyCard(){
  const { candidates, setCandidates, courses } = useStore();
  const [logs, setLogs] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  const [preview, setPreview] = React.useState(null); // { rows, stats, logLines }
  const [applyReady, setApplyReady] = React.useState([]); // normalized rows ready to apply

  function normalizeCSV(input){
    if (Array.isArray(input)) {
      if (input.length === 0) return [];
      if (typeof input[0] === "object" && !Array.isArray(input[0])) {
        return input;
      }
      if (Array.isArray(input[0])) {
        const header = input[0].map(x => String(x || "").trim());
        const rows = input.slice(1).map(arr => {
          const obj = {};
          header.forEach((h,i)=> obj[h] = (arr[i] ?? "").toString().trim());
          return obj;
        });
        return rows;
      }
    }
    const raw = String(input || "").replace(/^\uFEFF/, "");
    const firstLine = raw.split(/\r?\n/)[0] || "";
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount  = (firstLine.match(/;/g) || []).length;
    const delim = semiCount > commaCount ? ";" : ",";
    const lines = raw.trim().split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const headers = lines.shift().split(delim).map(h => h.trim());
    return lines.map(line => {
      const cols = line.split(delim).map(c => c.trim());
      const obj = {};
      headers.forEach((h,i)=> obj[h] = cols[i] ?? "");
      return obj;
    });
  }

  function canonicalize(row){
    const out = {};
    for (const [k,v] of Object.entries(row)){
      const kk = String(k).toLowerCase().trim();
      if (kk==="candidate_id" || kk==="id") out.candidate_id = v;
      else if (kk==="candidate_email" || kk==="email" || kk==="candidate") out.candidate_email = v;
      else if (kk==="course_code" || kk==="code") out.course_code = v;
      else if (kk==="cohort") out.cohort = v;
      else if (kk==="start_date" || kk==="startdate") out.start_date = v;
      else if (kk==="end_date" || kk==="enddate") out.end_date = v;
    }
    return out;
  }

  function downloadTemplate(){
    const csv = [
      "candidate_id,candidate_email,course_code,cohort,start_date,end_date",
      "C-799513,email@domain.com,SCI201,AY24-25-A,2025-09-03,2025-12-11",
    ].join("\\n");
    const blob = new Blob([csv], {type:"text/csv"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "bulk_enroll_template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function analyzeRows(rowsInput){
    const rows = normalizeCSV(rowsInput).map(canonicalize);
    let added=0, updated=0, notFound=0, unknownCourse=0;
    const lf = [];

    const byCode = Object.create(null);
    for (const k of courses||[]) if (k.code) byCode[String(k.code).toUpperCase()] = k;

    // Build candidate indexes
    const byEmail = Object.create(null);
    const byId = Object.create(null);
    for (const c of candidates||[]){
      if (c.email) byEmail[String(c.email).toLowerCase()] = c;
      if (c.id != null) byId[String(c.id)] = c;
    }

    // Evaluate actions without applying
    const actions = rows.map(raw => {
      const id = String(raw.candidate_id||"").trim();
      const email = String(raw.candidate_email||"").trim().toLowerCase();
      const code = String(raw.course_code||"").trim().toUpperCase();
      if (!code || (!id && !email)){ lf.push(`SKIP: missing identifier/code -> ${JSON.stringify(raw)}`); return { raw, action:"skip", reason:"missing identifier/code" }; }

      const cohort    = String(raw.cohort||"").trim();
      const startDate = String(raw.start_date||"").trim();
      const endDate   = String(raw.end_date||"").trim();

      const cand = id ? byId[id] : (email ? byEmail[email] : null);
      if (!cand){ notFound++; lf.push(`NOT FOUND: id=${id||"-"} email=${email||"-"}`); return { raw, action:"error", reason:"unknown candidate" }; }

      const course = byCode[code];
      if (!course){ unknownCourse++; lf.push(`UNKNOWN COURSE: ${code} for ${email||id}`); return { raw, action:"error", reason:"unknown course" }; }

      const exists = (cand.enrollments||[]).find(e => String(e.code).toUpperCase()===code);
      if (!exists){ added++; return { raw, action:"add", candidateId: cand.id, code, cohort, startDate, endDate, title: course.title||code, required: !!course.isRequired }; }
      updated++; return { raw, action:"update", candidateId: cand.id, code, cohort, startDate, endDate };
    });

    const stats = { rows: rows.length, willAdd: added, willUpdate: updated, unknownCandidates: notFound, unknownCourses: unknownCourse };
    return { actions, stats, logLines: lf };
  }

  function applyActions(actions){
    const next = (candidates||[]).map(c=>({ ...c, enrollments: (c.enrollments||[]).map(e=>({ ...e })) }));
    for (const act of actions){
      if (act.action!=="add" && act.action!=="update") continue;
      const idx = next.findIndex(c => String(c.id)===String(act.candidateId));
      if (idx === -1) continue;
      const cand = next[idx];
      let enr = (cand.enrollments||[]).find(e => String(e.code).toUpperCase()===act.code);
      if (!enr){
        enr = {
          id: `ENR-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          code: act.code,
          title: act.title,
          required: !!act.required,
          type: act.required ? "Required" : "Optional",
          cohort: act.cohort || "",
          startDate: act.startDate || "",
          endDate: act.endDate || "",
          status: "Enrolled",
          assignedBy: "Bulk Enroll",
          assignedTs: new Date().toISOString(),
        };
        cand.enrollments = [enr, ...(cand.enrollments||[])];
      }else{
        enr.cohort = act.cohort || enr.cohort || "";
        enr.startDate = act.startDate || enr.startDate || "";
        if (act.endDate) enr.endDate = act.endDate;
        if (!enr.status) enr.status = "Enrolled";
      }
    }
    setCandidates(next);
  }

  function onFile(e){
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const content = reader.result;
        const parsed = typeof parseCSV === "function" ? parseCSV(String(content||"")) : String(content||"");
        const { actions, stats, logLines } = analyzeRows(parsed);
        setPreview({ rows: actions, stats, logLines });
        setApplyReady(actions.filter(a => a.action==="add" || a.action==="update"));
        setLogs([
          `Rows: ${stats.rows}`,
          `Will add: ${stats.willAdd}`,
          `Will update: ${stats.willUpdate}`,
          `Unknown candidates: ${stats.unknownCandidates}`,
          `Unknown courses: ${stats.unknownCourses}`,
          ...logLines,
        ]);
      }catch(err){
        alert("Failed to parse CSV: " + (err?.message||err));
      }finally{
        setBusy(false);
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  function commitApply(){
    if (!preview) return;
    applyActions(applyReady);
    setPreview(null);
    setApplyReady([]);
    setLogs(l => [`Applied ${l.find(x=>x.startsWith("Will add"))||"Will add: 0"}, ${l.find(x=>x.startsWith("Will update"))||"Will update: 0"}`, ...l]);
  }

  function clearPreview(){
    setPreview(null);
    setApplyReady([]);
  }

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Bulk Enroll (Enroll-Only)</div>
          <div className="text-sm text-slate-500">
            Upload a CSV to preview the changes before applying them. No grades are processed here.
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadTemplate} className="rounded-xl border px-3 py-2">Download template</button>
          <label className={`rounded-xl ${busy ? "bg-slate-200" : "bg-slate-900 hover:opacity-90"} text-white px-3 py-2 cursor-pointer`}>
            {busy ? "Processing…" : "Upload CSV (Dry-run)"}
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} disabled={busy} />
          </label>
        </div>
      </div>

      {preview && (
        <div className="rounded-xl border bg-slate-50 p-3 space-y-3">
          <div className="text-sm font-semibold">Dry-run preview</div>
          <div className="text-xs text-slate-600">
            Rows: {preview.stats.rows} • Will add: {preview.stats.willAdd} • Will update: {preview.stats.willUpdate} • Unknown candidates: {preview.stats.unknownCandidates} • Unknown courses: {preview.stats.unknownCourses}
          </div>
          <div className="overflow-auto max-h-64 border rounded-lg bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-2">Action</th>
                  <th className="text-left p-2">Candidate</th>
                  <th className="text-left p-2">Course</th>
                  <th className="text-left p-2">Cohort</th>
                  <th className="text-left p-2">Start</th>
                  <th className="text-left p-2">End</th>
                  <th className="text-left p-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r, i)=> (
                  <tr key={i} className="border-t">
                    <td className="p-2">{r.action}</td>
                    <td className="p-2">{r.raw?.candidate_id || r.raw?.candidate_email}</td>
                    <td className="p-2">{r.raw?.course_code}</td>
                    <td className="p-2">{r.raw?.cohort}</td>
                    <td className="p-2">{r.raw?.start_date}</td>
                    <td className="p-2">{r.raw?.end_date}</td>
                    <td className="p-2">{r.reason || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button onClick={commitApply} disabled={!applyReady.length} className="rounded-xl bg-green-600 text-white px-3 py-2 disabled:opacity-50">Apply changes</button>
            <button onClick={clearPreview} className="rounded-xl border px-3 py-2 bg-white">Clear</button>
          </div>
        </div>
      )}

      {logs.length>0 && (
        <div className="rounded-xl bg-slate-50 border p-3 text-xs text-slate-700 max-h-56 overflow-auto">
          {logs.map((l,i)=><div key={i}>• {l}</div>)}
        </div>
      )}
    </div>
  );
}

