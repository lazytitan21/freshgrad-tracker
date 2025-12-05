import * as XLSX from "xlsx";

export const classNames = (...a) => a.filter(Boolean).join(" ");

export function exportXLSX(filename, rows, headers, sheetName = "Sheet1") {
  const hdr = headers.map(h => h.label ?? h.key);
  const aoa = [hdr, ...rows.map(r => headers.map(h => r[h.key] ?? ""))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}

export function subjectToTrackId(subj){ return (subj==="Arabic"||subj==="English") ? "t2" : (subj==="Computer Science"?"t3":"t1"); }
export const emailRe  = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
export const mobileRe = /^(?:\+9715\d{8}|05\d{8})$/;

export function requiredCoursesForTrack(courses, trackId){
  return (courses||[]).filter(c => c.active !== false && c.isRequired && c.tracks?.includes(trackId));
}
export function courseByCode(courses, code){ return (courses||[]).find(c => c.code === code); }

// Basic track list mirrored from App.jsx to provide track name lookup in shared helpers
export const TRACKS = [
  { id: "t1", name: "STEM Core",  minAverage: 70 },
  { id: "t2", name: "Languages",  minAverage: 75 },
  { id: "t3", name: "ICT",        minAverage: 70 },
];
export function trackNameById(id){ return TRACKS.find(t=>t.id===id)?.name || "—"; }

export function computeFinalAverage(candidate, courses){
  if (!candidate) return null;
  const req = requiredCoursesForTrack(courses, candidate.trackId);
  if (!req.length) return null;
  let sum=0, wsum=0;
  req.forEach(course=>{
    const w = typeof course.weight==="number" && course.weight>0 ? course.weight : 1;
    const cr = (candidate.courseResults||[]).find(x => x.code === course.code);
    if (cr && typeof cr.score==="number") { sum += cr.score * w; wsum += w; }
  });
  return wsum>0 ? Math.round((sum/wsum)*10)/10 : null;
}

export function coursePassed(candidate, course){
  const cr = (candidate.courseResults||[]).find(x => x.code===course.code);
  if (!cr) return false;
  const th = typeof course.passThreshold==="number" ? course.passThreshold : 70;
  return Number(cr.score) >= th;
}

export function statusBadgeColor(status){
  const map = {
    Imported: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
    Eligible: "bg-sky-100 text-sky-800 dark:bg-sky-700 dark:text-sky-100",
    Assigned: "bg-indigo-100 text-indigo-800 dark:bg-indigo-700 dark:text-indigo-100",
    "In Training": "bg-amber-100 text-amber-800 dark:bg-amber-700 dark:text-amber-100",
    "Courses Completed": "bg-emerald-100 text-emerald-800 dark:bg-emerald-700 dark:text-emerald-100",
    Assessed: "bg-teal-100 text-teal-800 dark:bg-teal-700 dark:text-teal-100",
    Graduated: "bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100",
    "Ready for Hiring": "bg-lime-100 text-lime-800 dark:bg-lime-700 dark:text-lime-100",
    "Hired/Closed": "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100",
    "On Hold": "bg-orange-100 text-orange-800 dark:bg-orange-700 dark:text-orange-100",
    Withdrawn: "bg-rose-100 text-rose-800 dark:bg-rose-700 dark:text-rose-100",
    Rejected: "bg-red-100 text-red-800 dark:bg-red-700 dark:text-red-100",
  };
  return map[status] || "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100";
}

export function parseCSV(text){
  const rows = []; let cur="", row=[], inQuotes=false;
  for (let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'){ if(inQuotes && text[i+1]==='"'){ cur+='"'; i++; } else inQuotes=!inQuotes; }
    else if(ch===',' && !inQuotes){ row.push(cur); cur=''; }
    else {
      const code=ch.charCodeAt(0);
      if(!inQuotes && (code===10||code===13)){ row.push(cur); rows.push(row.slice()); cur=''; row.length=0; if(code===13&&text.charCodeAt(i+1)===10) i++; }
      else cur+=ch;
    }
  }
  if(cur!==' '||row.length){ row.push(cur); rows.push(row); }
  return rows.filter(r=>r.length && r.some(x=>x!==''));
}

export function isRequiredForCandidate(code, candidate, courses) {
  if (String(code).toUpperCase() === "INTERN") return "Required";
  const c = (courses || []).find(k => k.code === code);
  if (!c) return "Optional";
  const req = !!c.isRequired && (c.tracks || []).includes(candidate.trackId);
  return req ? "Required" : "Optional";
}

export function statusToMainStageIndex(status) {
  const map = {
    "Imported": 0, "Eligible": 0,
    "Assigned": 1, "On Hold": 1,
    "In Training": 2, "Courses Completed": 2, "Assessed": 2,
    "Graduated": 3,
    "Ready for Hiring": 4, "Hired/Closed": 4,
    "Withdrawn": 0, "Rejected": 0
  };
  return (status in map) ? map[status] : 0;
}
