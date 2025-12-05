import React, { useState } from 'react';
import { useStore } from '../providers/StoreProvider';

export default function MentorsPage(){
  const { mentors, addMentor, updateMentor, deleteMentor } = useStore();
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:'', subject:'', email:'', contact:'', school:'', emirate:'' });

  function openNew(){ setForm({ name:'', subject:'', email:'', contact:'', school:'', emirate:'' }); setEditing(null); setShowForm(true); }
  function openEdit(m){ setForm({ name:m.name||'', subject:m.subject||'', email:m.email||'', contact:m.contact||'', school:m.school||'', emirate:m.emirate||'' }); setEditing(m.id); setShowForm(true); }
  function save(){
    if(editing){ updateMentor(editing, form); setEditing(null); }
    else { addMentor(form); }
  setForm({ name:'', subject:'', email:'', contact:'', school:'', emirate:'' });
    setShowForm(false);
  }

  const [q, setQ] = useState('');
  const [filterSchool, setFilterSchool] = useState('');
  const [filterEmirate, setFilterEmirate] = useState('');
  const [filterSubject, setFilterSubject] = useState('');

  const schools = Array.from(new Set((mentors || []).map(m => (m.school || '').trim()).filter(Boolean))).sort();
  const emirates = Array.from(new Set((mentors || []).map(m => (m.emirate || '').trim()).filter(Boolean))).sort();
  const subjects = Array.from(new Set((mentors || []).map(m => (m.subject || '').trim()).filter(Boolean))).sort();

  const filtered = (mentors || []).filter(m => {
    const s = q.trim().toLowerCase();
    if (filterSchool && String(m.school || '').trim() !== filterSchool) return false;
    if (filterEmirate && String(m.emirate || '').trim() !== filterEmirate) return false;
    if (filterSubject && String(m.subject || '').trim() !== filterSubject) return false;
    if (!s) return true;
    return (m.name || '').toLowerCase().includes(s) || (m.email || '').toLowerCase().includes(s) || (m.school || '').toLowerCase().includes(s) || (m.subject || '').toLowerCase().includes(s);
  });

  function exportCSV(){
    const headers = ['Name','Subject','Email','Contact','School','Emirate'];
    const rows = filtered.map(m => [m.name||'', m.subject||'', m.email||'', m.contact||'', m.school||'', m.emirate||'']);
    const escape = (v='') => (`"${String(v).replace(/"/g,'""')}"`);
    const csv = [headers.map(escape).join(','), ...rows.map(r=>r.map(escape).join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mentors-export-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-6 shadow-sm flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold">Mentors</div>
          <div className="text-sm text-slate-500">Manage mentor list and contact details.</div>
        </div>
        <div className="flex items-center gap-2">
          <input placeholder="Search mentors…" value={q} onChange={e=>setQ(e.target.value)} className="rounded-xl border px-3 py-2" />
          <select className="rounded-xl border px-3 py-2 text-sm" value={filterSchool} onChange={e=>setFilterSchool(e.target.value)}>
            <option value="">All schools</option>
            {schools.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="rounded-xl border px-3 py-2 text-sm" value={filterEmirate} onChange={e=>setFilterEmirate(e.target.value)}>
            <option value="">All emirates</option>
            {emirates.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="rounded-xl border px-3 py-2 text-sm" value={filterSubject} onChange={e=>setFilterSubject(e.target.value)}>
            <option value="">All subjects</option>
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="rounded-xl border px-3 py-2" onClick={exportCSV}>Export</button>
          <button className="rounded-xl border px-3 py-2" onClick={openNew}>New mentor</button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-center">Name</th>
              <th className="px-3 py-2 text-center">Subject</th>
              <th className="px-3 py-2 text-center">Email</th>
              <th className="px-3 py-2 text-center">Contact</th>
              <th className="px-3 py-2 text-center">School</th>
              <th className="px-3 py-2 text-center">Emirate</th>
              <th className="px-3 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.id} className="border-t">
                <td className="px-3 py-2 font-medium text-center">{m.name}</td>
                <td className="px-3 py-2 text-center">{m.subject || '—'}</td>
                <td className="px-3 py-2 text-center">{m.email}</td>
                <td className="px-3 py-2 text-center">{m.contact}</td>
                <td className="px-3 py-2 text-center">{m.school}</td>
                <td className="px-3 py-2 text-center">{m.emirate}</td>
                <td className="px-3 py-2 text-center">
                  <div className="flex gap-2">
                    <button className="rounded-lg border px-3 py-1" onClick={()=>openEdit(m)}>Edit</button>
                    <button className="rounded-lg border px-3 py-1 text-rose-600" onClick={()=>{ if(window.confirm('Delete mentor?')) deleteMentor(m.id); }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length===0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">No mentors match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center">
          <div className="absolute inset-0 bg-black/30" onClick={()=>setShowForm(false)} />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white border p-6 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">{editing ? 'Edit mentor' : 'Add mentor'}</div>
              <button className="rounded-xl border px-3 py-1" onClick={()=>setShowForm(false)}>Close</button>
            </div>
            <div className="space-y-2 text-sm">
              <label>Name <input className="w-full rounded-xl border px-3 py-2" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></label>
              <label>Subject <input className="w-full rounded-xl border px-3 py-2" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} /></label>
              <label>Email <input className="w-full rounded-xl border px-3 py-2" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></label>
              <label>Contact <input className="w-full rounded-xl border px-3 py-2" value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} /></label>
              <label>School <input className="w-full rounded-xl border px-3 py-2" value={form.school} onChange={e=>setForm({...form,school:e.target.value})} /></label>
              <label>Emirate <input className="w-full rounded-xl border px-3 py-2" value={form.emirate} onChange={e=>setForm({...form,emirate:e.target.value})} /></label>
              <div className="flex justify-end gap-2 mt-2">
                <button className="rounded-xl border px-3 py-2" onClick={()=>{ setForm({ name:'', subject:'', email:'', contact:'', school:'', emirate:'' }); setEditing(null); setShowForm(false); }}>Cancel</button>
                <button className="rounded-xl bg-indigo-600 text-white px-3 py-2" onClick={save}>{editing? 'Save' : 'Create'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
