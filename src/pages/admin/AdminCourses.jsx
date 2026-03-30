import React, { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";

const SEMESTERS = ["1st Semester","2nd Semester","3rd Semester","4th Semester","5th Semester","6th Semester","7th Semester","8th Semester"];
const EMPTY = { courseId:"", title:"", teacher:"", program:"", semester:"1st Semester", creditHours:"3", type:"Theory" };

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
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
    const snap = await getDocs(collection(db,"courses"));
    setCourses(snap.docs.map(d=>({id:d.id,...d.data()})));
    setLoading(false);
  }

  function openAdd() { setForm(EMPTY); setEditing(null); setShowModal(true); }
  function openEdit(c) { setForm(c); setEditing(c.id); setShowModal(true); }

  async function handleSave() {
    if (!form.title || !form.program) { alert("Title and Program are required."); return; }
    setSaving(true);
    try {
      const { id, ...data } = form;
      if (editing) await updateDoc(doc(db,"courses",editing), data);
      else await addDoc(collection(db,"courses"), data);
      setShowModal(false); load();
    } catch(e) { alert("Error: "+e.message); }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this course?")) return;
    await deleteDoc(doc(db,"courses",id)); load();
  }

  const filtered = courses.filter(c => {
    const matchSearch = c.title?.toLowerCase().includes(search.toLowerCase()) || c.courseId?.toLowerCase().includes(search.toLowerCase()) || c.program?.toLowerCase().includes(search.toLowerCase());
    const matchSem = filterSem === "All" || c.semester === filterSem;
    return matchSearch && matchSem;
  });

  return (
    <div>
      <div className="page-header">
        <div><h2>Course Management</h2><div className="page-header-sub">Manage courses for all programs and semesters</div></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Course</button>
      </div>

      <div style={{ display:"flex", gap:12, marginBottom:18, flexWrap:"wrap" }}>
        <input className="form-control" style={{ maxWidth:360 }} placeholder="🔍 Search courses..."
          value={search} onChange={e=>setSearch(e.target.value)} />
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
                <tr><th>#</th><th>Course ID</th><th>Title</th><th>Program</th><th>Semester</th><th>Teacher</th><th>CH</th><th>Type</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((c,i)=>(
                  <tr key={c.id}>
                    <td>{i+1}</td>
                    <td><span className="badge badge-primary">{c.courseId}</span></td>
                    <td style={{ fontWeight:500 }}>{c.title}</td>
                    <td style={{ fontSize:12,color:"var(--text-muted)",maxWidth:200 }}>{c.program}</td>
                    <td><span className="badge badge-gray">{c.semester}</span></td>
                    <td style={{ fontSize:12 }}>{c.teacher}</td>
                    <td style={{ textAlign:"center" }}>{c.creditHours}</td>
                    <td><span className={`badge ${c.type==="Theory"?"badge-primary":c.type==="Practical"?"badge-success":"badge-warning"}`}>{c.type}</span></td>
                    <td>
                      <div style={{ display:"flex",gap:8 }}>
                        <button className="btn btn-outline btn-sm" onClick={()=>openEdit(c)}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(c.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length===0 && <tr><td colSpan={9}><div className="empty-state"><p>No courses found</p></div></td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editing?"Edit Course":"Add New Course"}</h3>
              <button className="btn btn-ghost btn-icon" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Course ID</label><input className="form-control" placeholder="e.g. IRS-728" value={form.courseId} onChange={e=>setForm({...form,courseId:e.target.value})} /></div>
              <div className="form-group"><label>Credit Hours</label><input className="form-control" type="number" min="1" max="6" value={form.creditHours} onChange={e=>setForm({...form,creditHours:e.target.value})} /></div>
              <div className="form-group full-width"><label>Course Title *</label><input className="form-control" placeholder="Full course title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} /></div>
              <div className="form-group full-width"><label>Program *</label><input className="form-control" placeholder="Must exactly match student's program title" value={form.program} onChange={e=>setForm({...form,program:e.target.value})} /></div>
              <div className="form-group"><label>Teacher</label><input className="form-control" placeholder="Teacher name" value={form.teacher} onChange={e=>setForm({...form,teacher:e.target.value})} /></div>
              <div className="form-group">
                <label>Semester</label>
                <select className="form-control" value={form.semester} onChange={e=>setForm({...form,semester:e.target.value})}>
                  {SEMESTERS.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Type</label>
                <select className="form-control" value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
                  <option>Theory</option><option>Practical</option><option>Seminar</option><option>Lab</option>
                </select>
              </div>
            </div>
            <div className="alert alert-info" style={{ fontSize:12 }}>⚠️ Program must exactly match the student's active program title for courses to appear in their portal.</div>
            <div style={{ display:"flex",gap:10,justifyContent:"flex-end",marginTop:16 }}>
              <button className="btn btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?"Saving...":"💾 Save Course"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
