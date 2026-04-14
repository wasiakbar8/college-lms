import React, { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { toast, Toaster } from "react-hot-toast";
import { ArrowLeft, Plus, Edit3, Trash2, X, Clock, MapPin, User, Calendar } from "lucide-react";

const DEPARTMENTS = [
  { id: "cs", name: "Computer Science", icon: "💻" },
  { id: "ir", name: "Information Relations", icon: "🌍" },
  { id: "edu", name: "Education", icon: "📚" },
  { id: "bus", name: "Business Administration", icon: "📊" },
  { id: "eng", name: "English", icon: "✍️" },
  { id: "math", name: "Mathematics", icon: "🔢" },
];

const SEMESTERS = ["1st Semester", "2nd Semester", "3rd Semester", "4th Semester", "5th Semester", "6th Semester", "7th Semester", "8th Semester"];
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const EMPTY_FORM = { day: "Monday", date: "", timeSlot: "", courseName: "", teacher: "", room: "" };

export default function AdminTimetable() {
  const [view, setView] = useState("depts"); // "depts" | "schedule"
  const [activeDept, setActiveDept] = useState(null);
  const [activeSem, setActiveSem] = useState("1st Semester");
  
  const [allSlots, setAllSlots] = useState([]); // All slots across ALL depts for conflict checking
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "timetable"), snap => {
      setAllSlots(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Filter for UI display
  const displaySlots = useMemo(() => {
    return allSlots.filter(s => s.program === activeDept?.name && s.semester === activeSem);
  }, [allSlots, activeDept, activeSem]);

  const checkConflict = () => {
    const normalize = (str) => str?.toLowerCase().replace(/\s+/g, '').trim();
    const newTime = normalize(form.timeSlot);
    const newRoom = normalize(form.room);
    const newTeacher = normalize(form.teacher);

    const conflict = allSlots.find(s => {
      if (s.id === editingId) return false;
      
      const isSameTime = normalize(s.timeSlot) === newTime;
      const isSameDay = s.day === form.day;
      const isSameDate = s.date === form.date;

      if (isSameDate && isSameDay && isSameTime) {
        // GLOBAL ROOM CHECK (Across all departments)
        if (normalize(s.room) === newRoom) {
          toast.error(`Conflict: Room ${form.room} is already occupied by ${s.program} (${s.semester})`);
          return true;
        }
        // TEACHER BUSY CHECK
        if (normalize(s.teacher) === newTeacher) {
          toast.error(`Conflict: Teacher ${form.teacher} is already taking a class in ${s.program}`);
          return true;
        }
        // CLASS BUSY CHECK (Same Dept + Same Sem)
        if (s.program === activeDept.name && s.semester === activeSem) {
          toast.error(`This class (${activeSem}) already has a lecture scheduled at this time.`);
          return true;
        }
      }
      return false;
    });
    return !!conflict;
  };

  const handleSave = async () => {
    if (!form.courseName || !form.timeSlot || !form.room || !form.date) {
      toast.error("Please fill all required fields.");
      return;
    }
    if (checkConflict()) return;

    setSaving(true);
    try {
      const data = { 
        ...form, 
        program: activeDept.name, 
        semester: activeSem, 
        room: form.room.toUpperCase(), 
        updatedAt: new Date().toISOString() 
      };
      
      if (editingId) await updateDoc(doc(db, "timetable", editingId), data);
      else await addDoc(collection(db, "timetable"), data);
      
      setShowModal(false);
      toast.success("Schedule Saved!");
    } catch (e) {
      toast.error("Database Error");
    } finally {
      setSaving(false);
    }
  };

  if (view === "depts") {
    return (
      <div style={{ padding: 32, background: "#f4f6fb", minHeight: "100vh" }}>
        <h2 style={{ fontWeight: 800, marginBottom: 24 }}>Timetable Management</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {DEPARTMENTS.map(dept => (
            <div key={dept.id} onClick={() => { setActiveDept(dept); setView("schedule"); }}
                 style={{ background: "#fff", padding: 24, borderRadius: 20, cursor: "pointer", border: "1px solid #e2e8f0", transition: "0.2s" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{dept.icon}</div>
              <h3 style={{ margin: 0 }}>{dept.name}</h3>
              <p style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>View & Manage Schedule →</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 32, background: "#f4f6fb", minHeight: "100vh" }}>
      <Toaster />
      <button onClick={() => setView("depts")} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontWeight: 700, marginBottom: 20 }}>
        <ArrowLeft size={18} /> Back to Departments
      </button>

      <div style={{ background: "#fff", borderRadius: 24, padding: 24, border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0 }}>{activeDept.icon} {activeDept.name}</h2>
            <select value={activeSem} onChange={e => setActiveSem(e.target.value)} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e2e8f0", marginTop: 10 }}>
              {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowModal(true); }}
            style={{ background: "#6366f1", color: "#fff", border: "none", padding: "12px 24px", borderRadius: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <Plus size={18} /> Add Slot
          </button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "#f8fafc", color: "#64748b", fontSize: 12 }}>
              <th style={{ padding: 16 }}>DATE & DAY</th>
              <th style={{ padding: 16 }}>TIME</th>
              <th style={{ padding: 16 }}>COURSE & TEACHER</th>
              <th style={{ padding: 16 }}>ROOM</th>
              <th style={{ padding: 16, textAlign: "right" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {displaySlots.map(s => (
              <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: 16 }}>
                    <div style={{ fontWeight: 700 }}>{s.date}</div>
                    <div style={{ fontSize: 11, color: "#6366f1" }}>{s.day}</div>
                </td>
                <td style={{ padding: 16, fontSize: 14 }}>{s.timeSlot}</td>
                <td style={{ padding: 16 }}>
                    <div style={{ fontWeight: 600 }}>{s.courseName}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>{s.teacher}</div>
                </td>
                <td style={{ padding: 16 }}><span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, background: "#f1f5f9" }}>{s.room}</span></td>
                <td style={{ padding: 16, textAlign: "right" }}>
                  <button onClick={() => { setForm(s); setEditingId(s.id); setShowModal(true); }} style={{ marginRight: 10, border: "none", background: "none", cursor: "pointer" }}><Edit3 size={16} color="#64748b"/></button>
                  <button onClick={() => deleteDoc(doc(db, "timetable", s.id))} style={{ border: "none", background: "none", cursor: "pointer" }}><Trash2 size={16} color="#ef4444"/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: "450px", borderRadius: 24, padding: 24 }}>
            <h3 style={{ marginTop: 0 }}>{editingId ? "Edit Slot" : "Add Schedule Slot"}</h3>
            <div style={{ display: "grid", gap: 15 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={{ fontSize: 11, fontWeight: 700 }}>DATE</label><input type="date" style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }} value={form.date} onChange={e => setForm({...form, date: e.target.value})} /></div>
                <div><label style={{ fontSize: 11, fontWeight: 700 }}>DAY</label>
                  <select style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }} value={form.day} onChange={e => setForm({...form, day: e.target.value})}>
                    {DAYS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <input style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd" }} placeholder="Time Slot (e.g. 09:00 - 10:30 AM)" value={form.timeSlot} onChange={e => setForm({...form, timeSlot: e.target.value})} />
              <input style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd" }} placeholder="Course Name" value={form.courseName} onChange={e => setForm({...form, courseName: e.target.value})} />
              <input style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd" }} placeholder="Teacher Name" value={form.teacher} onChange={e => setForm({...form, teacher: e.target.value})} />
              <input style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd" }} placeholder="Room Number" value={form.room} onChange={e => setForm({...form, room: e.target.value})} />
              
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: 12, borderRadius: 10, border: "none", background: "#6366f1", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                  {saving ? "Saving..." : "Save Schedule"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}