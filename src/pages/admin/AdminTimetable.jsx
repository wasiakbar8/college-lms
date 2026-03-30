import React, { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";

const SEMESTERS = ["1st Semester","2nd Semester","3rd Semester","4th Semester","5th Semester","6th Semester","7th Semester","8th Semester"];
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const EMPTY = { program:"", semester:"1st Semester", day:"Monday", timeSlot:"", courseName:"", teacher:"", room:"" };

export default function AdminTimetable() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterSem, setFilterSem] = useState("All");
  const [filterDay, setFilterDay] = useState("All");

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const snap = await getDocs(collection(db,"timetable"));
    setSlots(snap.docs.map(d=>({id:d.id,...d.data()})));
    setLoading(false);
  }

  function openAdd() { setForm(EMPTY); setEditing(null); setShowModal(true); }
  function openEdit(s) { setForm(s); setEditing(s.id); setShowModal(true); }

  async function handleSave() {
    if (!form.program || !form.courseName) { alert("Program and Course Name are required."); return; }
    setSaving(true);
    try {
      const { id, ...data } = form;
      if (editing) await updateDoc(doc(db,"timetable",editing), data);
      else await addDoc(collection(db,"timetable"), data);
      setShowModal(false); load();
    } catch(e) { alert("Error: "+e.message); }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this slot?")) return;
    await deleteDoc(doc(db,"timetable",id)); load();
  }

  const filtered = slots.filter(s => {
    const ms = s.program?.toLowerCase().includes(search.toLowerCase()) || s.courseName?.toLowerCase().includes(search.toLowerCase());
    const msem = filterSem==="All"||s.semester===filterSem;
    const mday = filterDay==="All"||s.day===filterDay;
    return ms && msem && mday;
  });

  return (
    <div>
      <div className="page-header">
        <div><h2>Timetable</h2><div className="page-header-sub">Set class schedules for all programs and semesters</div></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Slot</button>
      </div>

      <div style={{ display:"flex",gap:12,marginBottom:18,flexWrap:"wrap" }}>
        <input className="form-control" style={{ maxWidth:300 }} placeholder="🔍 Search program or course..." value={search} onChange={e=>setSearch(e.target.value)} />
        <select className="form-control" style={{ width:180 }} value={filterSem} onChange={e=>setFilterSem(e.target.value)}>
          <option value="All">All Semesters</option>
          {SEMESTERS.map(s=><option key={s}>{s}</option>)}
        </select>
        <select className="form-control" style={{ width:150 }} value={filterDay} onChange={e=>setFilterDay(e.target.value)}>
          <option value="All">All Days</option>
          {DAYS.map(d=><option key={d}>{d}</option>)}
        </select>
      </div>

      <div className="card" style={{ padding:0 }}>
        <div className="table-wrap">
          {loading ? <div className="empty-state"><p>Loading...</p></div> : (
            <table>
              <thead>
                <tr><th>#</th><th>Program</th><th>Semester</th><th>Day</th><th>Time Slot</th><th>Course</th><th>Teacher</th><th>Room</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((s,i)=>(
                  <tr key={s.id}>
                    <td>{i+1}</td>
                    <td style={{ fontSize:12,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.program}</td>
                    <td style={{ fontSize:12 }}>{s.semester}</td>
                    <td><span className="badge badge-primary">{s.day}</span></td>
                    <td style={{ fontWeight:500,whiteSpace:"nowrap" }}>{s.timeSlot}</td>
                    <td style={{ fontWeight:500 }}>{s.courseName}</td>
                    <td style={{ fontSize:12,color:"var(--text-muted)" }}>{s.teacher}</td>
                    <td style={{ fontSize:12 }}>{s.room}</td>
                    <td>
                      <div style={{ display:"flex",gap:8 }}>
                        <button className="btn btn-outline btn-sm" onClick={()=>openEdit(s)}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(s.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length===0&&<tr><td colSpan={9}><div className="empty-state"><p>No timetable entries found</p></div></td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editing?"Edit Timetable Slot":"Add Timetable Slot"}</h3>
              <button className="btn btn-ghost btn-icon" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group full-width"><label>Program *</label><input className="form-control" placeholder="Must exactly match student's program title" value={form.program} onChange={e=>setForm({...form,program:e.target.value})} /></div>
              <div className="form-group">
                <label>Semester</label>
                <select className="form-control" value={form.semester} onChange={e=>setForm({...form,semester:e.target.value})}>
                  {SEMESTERS.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Day</label>
                <select className="form-control" value={form.day} onChange={e=>setForm({...form,day:e.target.value})}>
                  {DAYS.map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Time Slot</label><input className="form-control" placeholder="e.g. 8:00 - 9:30 AM" value={form.timeSlot} onChange={e=>setForm({...form,timeSlot:e.target.value})} /></div>
              <div className="form-group full-width"><label>Course Name *</label><input className="form-control" placeholder="Subject name" value={form.courseName} onChange={e=>setForm({...form,courseName:e.target.value})} /></div>
              <div className="form-group"><label>Teacher</label><input className="form-control" value={form.teacher} onChange={e=>setForm({...form,teacher:e.target.value})} /></div>
              <div className="form-group"><label>Room / Venue</label><input className="form-control" placeholder="e.g. Room 101" value={form.room} onChange={e=>setForm({...form,room:e.target.value})} /></div>
            </div>
            <div className="alert alert-info" style={{ fontSize:12 }}>⚠️ Program must exactly match the student's active program for the timetable to appear in their portal.</div>
            <div style={{ display:"flex",gap:10,justifyContent:"flex-end",marginTop:16 }}>
              <button className="btn btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?"Saving...":"💾 Save Slot"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
