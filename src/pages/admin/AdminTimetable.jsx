import React, { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query } from "firebase/firestore";
import { db } from "../../firebase/config";
import { toast, Toaster } from "react-hot-toast";
import { Trash2, Edit3, Plus, X, Search, Calendar, Clock, MapPin } from "lucide-react";

const DEPARTMENTS = ["Computer Science", "Information Relations", "Education", "Business Administration", "English", "Mathematics"];
const SEMESTERS = ["1st Semester", "2nd Semester", "3rd Semester", "4th Semester", "5th Semester", "6th Semester", "7th Semester", "8th Semester"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const EMPTY_FORM = { program: "Computer Science", semester: "1st Semester", day: "Monday", date: "", timeSlot: "", courseName: "", teacher: "", room: "" };

export default function AdminTimetable() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(collection(db, "timetable"));
    return onSnapshot(q, snap => {
      setSlots(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const checkConflict = () => {
    const normalize = (str) => str?.toLowerCase().replace(/\s+/g, '').trim();
    return slots.find(s => {
      if (s.id === editingId) return false;
      const sameTime = normalize(s.timeSlot) === normalize(form.timeSlot);
      const sameDay = s.day === form.day;
      const sameDate = s.date === form.date;

      if (sameDay && sameTime && sameDate) {
        if (normalize(s.room) === normalize(form.room)) { toast.error(`Room ${form.room} is occupied!`); return true; }
        if (normalize(s.teacher) === normalize(form.teacher)) { toast.error(`Teacher is busy!`); return true; }
        if (normalize(s.program) === normalize(form.program) && normalize(s.semester) === normalize(form.semester)) { toast.error(`This class already has a lecture!`); return true; }
      }
      return false;
    });
  };

  const handleSave = async () => {
    if (!form.courseName || !form.timeSlot || !form.room || !form.date) {
      toast.error("Please fill all fields including Date.");
      return;
    }
    if (checkConflict()) return;
    setSaving(true);
    try {
      const data = { ...form, room: form.room.toUpperCase(), updatedAt: new Date().toISOString() };
      if (editingId) await updateDoc(doc(db, "timetable", editingId), data);
      else await addDoc(collection(db, "timetable"), data);
      setShowModal(false); toast.success("Saved!");
    } catch (e) { toast.error("Error saving"); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ padding: 30, background: "#f4f6fb", minHeight: "100vh" }}>
      <Toaster />
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <h2>Timetable Manager</h2>
          <button onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowModal(true); }} style={{ background: "#6366f1", color: "#fff", padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700 }}>+ Add Slot</button>
        </div>

        <div className="card" style={{ background: "#fff", borderRadius: 15, overflow: "hidden", border: "1px solid #e5e7eb" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f9fafb" }}>
              <tr>
                <th style={{ padding: 15, textAlign: "left" }}>Class Info</th>
                <th style={{ padding: 15, textAlign: "left" }}>Date & Time</th>
                <th style={{ padding: 15, textAlign: "left" }}>Course</th>
                <th style={{ padding: 15, textAlign: "left" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {slots.map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 15 }}><strong>{s.program}</strong><br/><small>{s.semester}</small></td>
                  <td style={{ padding: 15 }}>{s.date}<br/>{s.timeSlot}</td>
                  <td style={{ padding: 15 }}>{s.courseName} <br/><small>{s.teacher} | {s.room}</small></td>
                  <td style={{ padding: 15 }}>
                    <button onClick={() => { setForm(s); setEditingId(s.id); setShowModal(true); }} style={{ border: "none", background: "none", cursor: "pointer", marginRight: 10 }}><Edit3 size={16}/></button>
                    <button onClick={() => deleteDoc(doc(db, "timetable", s.id))} style={{ border: "none", background: "none", cursor: "pointer", color: "red" }}><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", width: 450, borderRadius: 20, overflow: "hidden" }}>
            <div style={{ background: "#1e293b", color: "#fff", padding: "15px 20px", display: "flex", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>Set Timetable</h3>
              <X onClick={() => setShowModal(false)} style={{ cursor: "pointer" }} />
            </div>
            <div style={{ padding: 25 }}>
              <label style={{ fontSize: 11, fontWeight: 700 }}>DEPARTMENT</label>
              <select style={{ width: "100%", padding: 10, marginBottom: 15, borderRadius: 8, border: "1px solid #ddd" }} value={form.program} onChange={e => setForm({...form, program: e.target.value})}>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700 }}>SEMESTER</label>
                  <select style={{ width: "100%", padding: 10, marginBottom: 15, borderRadius: 8, border: "1px solid #ddd" }} value={form.semester} onChange={e => setForm({...form, semester: e.target.value})}>
                    {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                   <label style={{ fontSize: 11, fontWeight: 700 }}>DATE</label>
                   <input type="date" style={{ width: "100%", padding: 8, marginBottom: 15, borderRadius: 8, border: "1px solid #ddd" }} value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                </div>
              </div>

              <label style={{ fontSize: 11, fontWeight: 700 }}>TIME SLOT</label>
              <input style={{ width: "100%", padding: 10, marginBottom: 15, borderRadius: 8, border: "1px solid #ddd" }} placeholder="09:00 AM - 10:30 AM" value={form.timeSlot} onChange={e => setForm({...form, timeSlot: e.target.value})} />

              <label style={{ fontSize: 11, fontWeight: 700 }}>COURSE NAME</label>
              <input style={{ width: "100%", padding: 10, marginBottom: 15, borderRadius: 8, border: "1px solid #ddd" }} value={form.courseName} onChange={e => setForm({...form, courseName: e.target.value})} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                <div><label style={{ fontSize: 11, fontWeight: 700 }}>TEACHER</label><input style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }} value={form.teacher} onChange={e => setForm({...form, teacher: e.target.value})} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 700 }}>ROOM</label><input style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ddd" }} value={form.room} onChange={e => setForm({...form, room: e.target.value})} /></div>
              </div>

              <button onClick={handleSave} disabled={saving} style={{ width: "100%", padding: 12, background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
                {saving ? "Saving..." : "Save Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}