import React, { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";

const SEMESTERS = ["1st Semester","2nd Semester","3rd Semester","4th Semester","5th Semester","6th Semester","7th Semester","8th Semester"];
const GRADES = ["A+","A","A-","B+","B","B-","C+","C","C-","D+","D","F"];
const GRADE_POINTS = {"A+":4.0,"A":4.0,"A-":3.7,"B+":3.3,"B":3.0,"B-":2.7,"C+":2.3,"C":2.0,"C-":1.7,"D+":1.3,"D":1.0,"F":0.0};
const EMPTY = { rollNo:"", courseId:"", subjectTitle:"", creditHours:3, semester:"1st Semester", marksObtained:"", totalMarks:100, grade:"", gradePoints:0 };

export default function AdminResults() {
  const [results, setResults] = useState([]);
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
    const snap = await getDocs(collection(db,"results"));
    setResults(snap.docs.map(d=>({id:d.id,...d.data()})));
    setLoading(false);
  }

  function openAdd() { setForm(EMPTY); setEditing(null); setShowModal(true); }
  function openEdit(r) { setForm(r); setEditing(r.id); setShowModal(true); }

  function handleGradeChange(grade) {
    setForm(f => ({ ...f, grade, gradePoints: GRADE_POINTS[grade] ?? 0 }));
  }

  async function handleSave() {
    if (!form.rollNo || !form.subjectTitle) { alert("Roll No and Subject Title are required."); return; }
    setSaving(true);
    try {
      const { id, ...data } = form;
      const clean = { ...data, creditHours:Number(data.creditHours)||0, marksObtained:Number(data.marksObtained)||0, totalMarks:Number(data.totalMarks)||100, gradePoints:GRADE_POINTS[data.grade]??0 };
      if (editing) await updateDoc(doc(db,"results",editing), clean);
      else await addDoc(collection(db,"results"), clean);
      setShowModal(false); load();
    } catch(e) { alert("Error: "+e.message); }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this result?")) return;
    await deleteDoc(doc(db,"results",id)); load();
  }

  const filtered = results.filter(r => {
    const ms = r.rollNo?.toLowerCase().includes(search.toLowerCase()) || r.subjectTitle?.toLowerCase().includes(search.toLowerCase());
    const msem = filterSem==="All" || r.semester===filterSem;
    return ms && msem;
  });

  function gradeColor(g) { return GRADE_POINTS[g]>=3.5?"#16a34a":GRADE_POINTS[g]>=2?"#d97706":GRADE_POINTS[g]>0?"#ea580c":"#dc2626"; }

  return (
    <div>
      <div className="page-header">
        <div><h2>Results & Grades</h2><div className="page-header-sub">Enter and manage semester results for all students</div></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Result</button>
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
                <tr><th>#</th><th>Roll No</th><th>Subject</th><th>Semester</th><th>CH</th><th>Marks</th><th>Grade</th><th>GP</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((r,i)=>(
                  <tr key={r.id}>
                    <td>{i+1}</td>
                    <td><span className="badge badge-primary">{r.rollNo}</span></td>
                    <td>
                      <div style={{ fontWeight:500 }}>{r.subjectTitle}</div>
                      <div style={{ fontSize:11,color:"var(--text-muted)" }}>{r.courseId}</div>
                    </td>
                    <td style={{ fontSize:12 }}>{r.semester}</td>
                    <td style={{ textAlign:"center" }}>{r.creditHours}</td>
                    <td style={{ textAlign:"center" }}>{r.marksObtained}/{r.totalMarks}</td>
                    <td>
                      <div className="grade-chip" style={{ background:gradeColor(r.grade)+"20",color:gradeColor(r.grade) }}>{r.grade||"—"}</div>
                    </td>
                    <td style={{ textAlign:"center",fontWeight:600 }}>{GRADE_POINTS[r.grade]??0}</td>
                    <td><span className={`badge ${r.grade==="F"?"badge-danger":r.grade?"badge-success":"badge-gray"}`}>{r.grade==="F"?"Fail":r.grade?"Pass":"Pending"}</span></td>
                    <td>
                      <div style={{ display:"flex",gap:8 }}>
                        <button className="btn btn-outline btn-sm" onClick={()=>openEdit(r)}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(r.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length===0&&<tr><td colSpan={10}><div className="empty-state"><p>No results found</p></div></td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editing?"Edit Result":"Add Result"}</h3>
              <button className="btn btn-ghost btn-icon" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Roll No *</label><input className="form-control" placeholder="Student roll number" value={form.rollNo} onChange={e=>setForm({...form,rollNo:e.target.value})} /></div>
              <div className="form-group"><label>Course ID</label><input className="form-control" placeholder="e.g. IRS-728" value={form.courseId} onChange={e=>setForm({...form,courseId:e.target.value})} /></div>
              <div className="form-group full-width"><label>Subject Title *</label><input className="form-control" placeholder="Full subject name" value={form.subjectTitle} onChange={e=>setForm({...form,subjectTitle:e.target.value})} /></div>
              <div className="form-group">
                <label>Semester</label>
                <select className="form-control" value={form.semester} onChange={e=>setForm({...form,semester:e.target.value})}>
                  {SEMESTERS.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Credit Hours</label><input className="form-control" type="number" min="1" max="6" value={form.creditHours} onChange={e=>setForm({...form,creditHours:e.target.value})} /></div>
              <div className="form-group"><label>Marks Obtained</label><input className="form-control" type="number" min="0" value={form.marksObtained} onChange={e=>setForm({...form,marksObtained:e.target.value})} /></div>
              <div className="form-group"><label>Total Marks</label><input className="form-control" type="number" min="1" value={form.totalMarks} onChange={e=>setForm({...form,totalMarks:e.target.value})} /></div>
              <div className="form-group">
                <label>Grade</label>
                <select className="form-control" value={form.grade} onChange={e=>handleGradeChange(e.target.value)}>
                  <option value="">-- Select Grade --</option>
                  {GRADES.map(g=><option key={g}>{g}</option>)}
                </select>
              </div>
              {form.grade && (
                <div className="form-group">
                  <label>Grade Points</label>
                  <input className="form-control" value={GRADE_POINTS[form.grade]??0} readOnly style={{ background:"#f8fafc" }} />
                </div>
              )}
            </div>
            <div className="alert alert-info" style={{ fontSize:12 }}>Grade points are calculated automatically from the selected grade.</div>
            <div style={{ display:"flex",gap:10,justifyContent:"flex-end",marginTop:16 }}>
              <button className="btn btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?"Saving...":"💾 Save Result"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
