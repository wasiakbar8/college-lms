import React, { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { toast, Toaster } from "react-hot-toast";
import { ArrowLeft, Plus, Edit3, Trash2, X, Search, Calendar, Clock, MapPin } from "lucide-react";

// ── Configuration (Matched with Dashboard Theme) ──
const DEPARTMENTS = [
  { id: "cs",   name: "Computer Science",         icon: "💻", bg: "#E6F1FB", color: "#185FA5" },
  { id: "ir",   name: "International Relations", icon: "🌍", bg: "#E1F5EE", color: "#0F6E56" },
  { id: "edu",  name: "Education",                 icon: "📚", bg: "#FAEEDA", color: "#854F0B" },
  { id: "bus",  name: "Business Administration", icon: "📊", bg: "#FAECE7", color: "#993C1D" },
  { id: "eng",  name: "English",                 icon: "✍️", bg: "#EEEDFE", color: "#534AB7" },
  { id: "math", name: "Mathematics",             icon: "🔢", bg: "#EAF3DE", color: "#3B6D11" },
];

const SEMESTERS = [
  "1st Semester", "2nd Semester", "3rd Semester", "4th Semester",
  "5th Semester", "6th Semester", "7th Semester", "8th Semester",
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const EMPTY_FORM = { day: "Monday", date: "", timeSlot: "", courseName: "", teacher: "", room: "" };

const c = { 
  primary: "#6366f1", 
  sub: "#6b7280", 
  border: "#e5e7eb", 
  bg: "#f4f6fb", 
  white: "#ffffff",
  dark: "#1e293b"
};

const lbl = { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6, letterSpacing: "0.05em" };
const inp = { width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${c.border}`, fontSize: 14, outline: "none", boxSizing: "border-box" };

export default function AdminTimetable() {
  const [view, setView] = useState("depts");
  const [activeDept, setActiveDept] = useState(null);
  const [activeSem, setActiveSem] = useState("1st Semester");
  const [search, setSearch] = useState("");
  
  const [allSlots, setAllSlots] = useState([]);
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

  const displaySlots = useMemo(() => {
    return allSlots.filter(s => {
        const deptMatch = s.program === activeDept?.name;
        const semMatch = s.semester === activeSem;
        const searchMatch = s.courseName?.toLowerCase().includes(search.toLowerCase()) || 
                          s.teacher?.toLowerCase().includes(search.toLowerCase());
        return deptMatch && semMatch && searchMatch;
    });
  }, [allSlots, activeDept, activeSem, search]);

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
        if (normalize(s.room) === newRoom) {
          toast.error(`Conflict: Room ${form.room} occupied by ${s.program}`);
          return true;
        }
        if (normalize(s.teacher) === newTeacher) {
          toast.error(`Conflict: Teacher ${form.teacher} is busy elsewhere`);
          return true;
        }
      }
      return false;
    });
    return !!conflict;
  };

  const handleSave = async () => {
    if (!form.courseName || !form.timeSlot || !form.room || !form.date) {
      toast.error("Please fill required fields.");
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
      toast.success("Schedule Updated!");
    } catch (e) { toast.error("Database Error"); }
    finally { setSaving(false); }
  };

  // ── View 1: Department Cards ──
  if (view === "depts") {
    return (
      <div style={{ padding: 40, background: c.bg, minHeight: "100vh" }}>
        <Toaster />
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2 style={{ fontWeight: 800, color: c.dark }}>Timetable Management</h2>
          <p style={{ color: c.sub, marginBottom: 30 }}>Select a department to manage lecture timings and room allocations.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {DEPARTMENTS.map(dept => (
              <div key={dept.id} onClick={() => { setActiveDept(dept); setView("schedule"); }}
                   style={{ background: "#fff", padding: 30, borderRadius: 20, cursor: "pointer", border: `1px solid ${c.border}`, transition: "0.2s" }}>
                <div style={{ fontSize: 40, marginBottom: 15 }}>{dept.icon}</div>
                <h3 style={{ margin: 0, color: c.dark }}>{dept.name}</h3>
                <div style={{ marginTop: 15, fontSize: 12, color: dept.color, fontWeight: 700 }}>Manage Schedule →</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── View 2: Schedule View with Semester Filter ──
  return (
    <div style={{ padding: "30px 20px", background: c.bg, minHeight: "100vh" }}>
      <Toaster />
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        
        <button onClick={() => setView("depts")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: c.primary, cursor: "pointer", fontWeight: 700, marginBottom: 20 }}>
          <ArrowLeft size={18} /> Back to Departments
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 30 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>{activeDept.icon} {activeDept.name}</h1>
            <p style={{ color: c.sub }}>Weekly Schedule: <strong>{activeSem}</strong></p>
          </div>
          
          {/* Semester Pill Filter */}
          <div style={{ display: "flex", gap: 6, background: "#fff", padding: 6, borderRadius: 14, border: `1px solid ${c.border}` }}>
            {SEMESTERS.map(sem => (
              <button key={sem} onClick={() => setActiveSem(sem)}
                style={{
                  padding: "8px 14px", borderRadius: 10, fontSize: 11, cursor: "pointer", border: "none",
                  background: activeSem === sem ? activeDept.color : "transparent",
                  color: activeSem === sem ? "#fff" : c.sub, fontWeight: 700, transition: "0.2s"
                }}>
                {sem.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 24, border: `1px solid ${c.border}`, overflow: "hidden" }}>
          <div style={{ padding: 20, borderBottom: `1px solid ${c.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 15 }}>
            <div style={{ position: "relative" }}>
               <Search size={16} style={{ position: "absolute", left: 12, top: 10, color: c.sub }} />
               <input placeholder="Search course or teacher..." value={search} onChange={e => setSearch(e.target.value)}
                      style={{ ...inp, paddingLeft: 35, width: 280, height: 36 }} />
            </div>

            <button onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowModal(true); }}
              style={{ background: c.primary, color: "#fff", border: "none", padding: "10px 20px", borderRadius: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <Plus size={18} /> Add New Slot
            </button>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr style={{ textAlign: "left", color: c.sub, fontSize: 11, textTransform: "uppercase" }}>
                <th style={{ padding: 16 }}>Date & Day</th>
                <th style={{ padding: 16 }}>Timing</th>
                <th style={{ padding: 16 }}>Course & Teacher</th>
                <th style={{ padding: 16 }}>Room</th>
                <th style={{ padding: 16, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displaySlots.map(s => (
                <tr key={s.id} style={{ borderBottom: `1px solid ${c.border}` }}>
                  <td style={{ padding: 16 }}>
                    <div style={{ fontWeight: 700, color: c.dark }}>{s.date}</div>
                    <div style={{ fontSize: 11, color: c.primary, fontWeight: 600 }}>{s.day}</div>
                  </td>
                  <td style={{ padding: 16, fontSize: 14 }}>{s.timeSlot}</td>
                  <td style={{ padding: 16 }}>
                    <div style={{ fontWeight: 600, color: c.dark }}>{s.courseName}</div>
                    <div style={{ fontSize: 12, color: c.sub }}>{s.teacher}</div>
                  </td>
                  <td style={{ padding: 16 }}>
                    <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, background: "#f1f5f9", color: c.dark }}>
                        {s.room}
                    </span>
                  </td>
                  <td style={{ padding: 16, textAlign: "right" }}>
                    <button onClick={() => { setForm(s); setEditingId(s.id); setShowModal(true); }} style={{ marginRight: 12, border: "none", background: "none", cursor: "pointer" }}><Edit3 size={18} color={c.sub}/></button>
                    <button onClick={() => deleteDoc(doc(db, "timetable", s.id))} style={{ border: "none", background: "none", cursor: "pointer" }}><Trash2 size={18} color="#ef4444"/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {displaySlots.length === 0 && (
            <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>
                <Calendar size={40} style={{ marginBottom: 10, opacity: 0.2 }} />
                <p>No lectures scheduled for {activeSem}.</p>
            </div>
          )}
        </div>
      </div>

      {/* Timetable Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: "450px", borderRadius: 24, overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ background: c.dark, padding: "20px 24px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>{editingId ? "Edit Schedule" : "Add Schedule"}</h3>
              <X onClick={() => setShowModal(false)} style={{ cursor: "pointer" }} />
            </div>
            
            <div style={{ padding: 24 }}>
              <div style={{ background: "#f1f5f9", padding: 12, borderRadius: 12, marginBottom: 20, fontSize: 13, fontWeight: 600, color: c.sub }}>
                Schedule for: {activeDept.name} • {activeSem}
              </div>

              <div style={{ display: "grid", gap: 15 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={lbl}>Date</label>
                    <input type="date" style={inp} value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  </div>
                  <div>
                    <label style={lbl}>Day</label>
                    <select style={inp} value={form.day} onChange={e => setForm({...form, day: e.target.value})}>
                      {DAYS.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                    <label style={lbl}>Time Slot</label>
                    <input style={inp} placeholder="e.g. 09:00 - 10:30 AM" value={form.timeSlot} onChange={e => setForm({...form, timeSlot: e.target.value})} />
                </div>
                
                <div>
                    <label style={lbl}>Course Name</label>
                    <input style={inp} placeholder="Course Name" value={form.courseName} onChange={e => setForm({...form, courseName: e.target.value})} />
                </div>

                <div>
                    <label style={lbl}>Teacher Name</label>
                    <input style={inp} placeholder="Instructor Name" value={form.teacher} onChange={e => setForm({...form, teacher: e.target.value})} />
                </div>

                <div>
                    <label style={lbl}>Room / Venue</label>
                    <input style={inp} placeholder="e.g. Room 01 or Lab A" value={form.room} onChange={e => setForm({...form, room: e.target.value})} />
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                  <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${c.border}`, background: "none", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleSave} disabled={saving} style={{ flex: 2, background: c.primary, color: "#fff", border: "none", padding: 12, borderRadius: 12, fontWeight: 800, cursor: "pointer" }}>
                    {saving ? "Saving..." : "Save Slot"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}