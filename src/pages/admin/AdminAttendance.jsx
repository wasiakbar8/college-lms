import React, { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";

const SEMESTERS = ["1st Semester","2nd Semester","3rd Semester","4th Semester","5th Semester","6th Semester","7th Semester","8th Semester"];
const EMPTY = { rollNo:"", courseId:"", subjectTitle:"", teacher:"", semester:"1st Semester", lectures:0, present:0, leave:0, absent:0 };

export default function AdminAttendance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterSem, setFilterSem] = useState("All");

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const snap = await getDocs(collection(db,"attendance"));
    setRecords(snap.docs.map(d=>({id:d.id,...d.data()})));
    setLoading(false);
  }

  function openAdd() { setForm(EMPTY); setEditing(null); setShowModal(true); }
  function openEdit(r) { setForm(r); setEditing(r.id); setShowModal(true); }

  async function handleSave() {
    if (!form.rollNo || !form.subjectTitle) { alert("Roll No and Subject Title are required."); return; }
    setSaving(true);
    try {
      const { id, ...data } = form;
      const numData = { ...data, lectures:Number(data.lectures)||0, present:Number(data.present)||0, leave:Number(data.leave)||0, absent:Number(data.absent)||0 };
      if (editing) await updateDoc(doc(db,"attendance",editing), numData);
      else await addDoc(collection(db,"attendance"), numData);
      setShowModal(false); load();
    } catch(e) { alert("Error: "+e.message); }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this record?")) return;
    await deleteDoc(doc(db,"attendance",id)); load();
  }

  const filtered = records.filter(r => {
    const ms = r.rollNo?.toLowerCase().includes(search.toLowerCase()) || r.subjectTitle?.toLowerCase().includes(search.toLowerCase());
    const msem = filterSem==="All" || r.semester===filterSem;
    return ms && msem;
  });

  function getPct(r) { return r.lectures>0?Math.round((r.present/r.lectures)*100):0; }

  return (
    <div>
      <div className="page-header">
        <div><h2>Attendance Management</h2><div className="page-header-sub">Record and update student attendance</div></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Record</button>
      </div>

      <div style={{ display:"flex",gap:12,marginBottom:18,flexWrap:"wrap" }}>
        <input className="form-control" style={{ maxWidth:340 }} placeholder="🔍 Search by roll no or subject..." value={search} onChange={e=>setSearch(e.target.value)} />
        <select className="form-control" style={{ width:180 }} value={filterSem} onChange={e=>setFilterSem(e.target.value)}>
          <option value="All">All Semesters</option>
          {SEMESTERS.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding:0 }}>
        <div className="table-wrap">
          {loading ? <div className="empty-state"><p>Loading...</p></div> : (
            <table>
              <thead>
                <tr><th>#</th><th>Roll No</th><th>Subject</th><th>Semester</th><th>Total</th><th>Present</th><th>Leave</th><th>Absent</th><th>%</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((r,i)=>{
                  const pct = getPct(r);
                  const color = pct>=75?"var(--success)":pct>=60?"var(--warning)":"var(--danger)";
                  return (
                    <tr key={r.id}>
                      <td>{i+1}</td>
                      <td><span className="badge badge-primary">{r.rollNo}</span></td>
                      <td>
                        <div style={{ fontWeight:500 }}>{r.subjectTitle}</div>
                        <div style={{ fontSize:11,color:"var(--text-muted)" }}>{r.courseId}</div>
                      </td>
                      <td style={{ fontSize:12 }}>{r.semester}</td>
                      <td style={{ textAlign:"center" }}>{r.lectures}</td>
                      <td style={{ textAlign:"center",color:"var(--success)",fontWeight:600 }}>{r.present}</td>
                      <td style={{ textAlign:"center",color:"var(--warning)" }}>{r.leave}</td>
                      <td style={{ textAlign:"center",color:"var(--danger)" }}>{r.absent}</td>
                      <td style={{ minWidth:100 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                          <div className="progress-bar" style={{ flex:1 }}><div className="progress-fill" style={{ width:`${pct}%`,background:color }} /></div>
                          <span style={{ fontSize:12,fontWeight:700,color,minWidth:32 }}>{pct}%</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display:"flex",gap:8 }}>
                          <button className="btn btn-outline btn-sm" onClick={()=>openEdit(r)}>✏️</button>
                          <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(r.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length===0&&<tr><td colSpan={10}><div className="empty-state"><p>No records found</p></div></td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editing?"Edit Attendance":"Add Attendance Record"}</h3>
              <button className="btn btn-ghost btn-icon" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Roll No *</label><input className="form-control" placeholder="Student roll number" value={form.rollNo} onChange={e=>setForm({...form,rollNo:e.target.value})} /></div>
              <div className="form-group"><label>Course ID</label><input className="form-control" placeholder="e.g. IRS-728" value={form.courseId} onChange={e=>setForm({...form,courseId:e.target.value})} /></div>
              <div className="form-group full-width"><label>Subject Title *</label><input className="form-control" placeholder="Full subject name" value={form.subjectTitle} onChange={e=>setForm({...form,subjectTitle:e.target.value})} /></div>
              <div className="form-group"><label>Teacher</label><input className="form-control" value={form.teacher} onChange={e=>setForm({...form,teacher:e.target.value})} /></div>
              <div className="form-group">
                <label>Semester</label>
                <select className="form-control" value={form.semester} onChange={e=>setForm({...form,semester:e.target.value})}>
                  {SEMESTERS.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Total Lectures</label><input className="form-control" type="number" min="0" value={form.lectures} onChange={e=>setForm({...form,lectures:e.target.value})} /></div>
              <div className="form-group"><label>Present</label><input className="form-control" type="number" min="0" value={form.present} onChange={e=>setForm({...form,present:e.target.value})} /></div>
              <div className="form-group"><label>Leave</label><input className="form-control" type="number" min="0" value={form.leave} onChange={e=>setForm({...form,leave:e.target.value})} /></div>
              <div className="form-group"><label>Absent</label><input className="form-control" type="number" min="0" value={form.absent} onChange={e=>setForm({...form,absent:e.target.value})} /></div>
            </div>
            <div style={{ display:"flex",gap:10,justifyContent:"flex-end",marginTop:16 }}>
              <button className="btn btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?"Saving...":"💾 Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
