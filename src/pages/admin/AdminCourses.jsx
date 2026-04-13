import React, { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { toast, Toaster } from "react-hot-toast";
import { ArrowLeft, BookOpen, Plus, Edit3, Trash2, X } from "lucide-react";

const DEPARTMENTS = [
  { id: "cs", name: "Computer Science", icon: "💻", color: "#185FA5" },
  { id: "ir", name: "International Relations", icon: "🌍", color: "#0F6E56" },
  { id: "edu", name: "Education", icon: "📚", color: "#854F0B" },
  { id: "bus", name: "Business Administration", icon: "📊", color: "#993C1D" },
  { id: "eng", name: "English", icon: "✍️", color: "#534AB7" },
  { id: "math", name: "Mathematics", icon: "🔢", color: "#3B6D11" },
];

const SEMESTERS = ["1st Semester", "2nd Semester", "3rd Semester", "4th Semester", "5th Semester", "6th Semester", "7th Semester", "8th Semester"];
const EMPTY = { courseId: "", title: "", teacher: "", creditHours: "3", type: "Theory" };

export default function AdminCourses() {
  const [view, setView] = useState("depts"); // "depts" | "courses"
  const [activeDept, setActiveDept] = useState(null);
  const [activeSem, setActiveSem] = useState("1st Semester");
  
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "courses"), (snap) => {
      setAllCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredCourses = useMemo(() => {
    return allCourses.filter(c => c.program === activeDept?.name && c.semester === activeSem);
  }, [allCourses, activeDept, activeSem]);

  const handleSave = async () => {
    if (!form.title || !form.courseId) { toast.error("Title and ID are required"); return; }
    setSaving(true);
    try {
      const data = { ...form, program: activeDept.name, semester: activeSem };
      if (editingId) await updateDoc(doc(db, "courses", editingId), data);
      else await addDoc(collection(db, "courses"), data);
      setShowModal(false);
      setForm(EMPTY);
      toast.success("Course saved!");
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  };

  if (view === "depts") {
    return (
      <div style={{ padding: 32, background: "#f4f6fb", minHeight: "100vh" }}>
        <h2 style={{ fontWeight: 800, marginBottom: 24 }}>Course Management</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {DEPARTMENTS.map(dept => (
            <div key={dept.id} onClick={() => { setActiveDept(dept); setView("courses"); }}
                 style={{ background: "#fff", padding: 24, borderRadius: 20, cursor: "pointer", border: "1px solid #e2e8f0", transition: "0.2s" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{dept.icon}</div>
              <h3 style={{ margin: 0 }}>{dept.name}</h3>
              <p style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>Manage syllabus and teachers</p>
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
          <button onClick={() => { setForm(EMPTY); setEditingId(null); setShowModal(true); }}
            style={{ background: "#6366f1", color: "#fff", border: "none", padding: "12px 24px", borderRadius: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <Plus size={18} /> Add New Course
          </button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "#f8fafc", color: "#64748b", fontSize: 12 }}>
              <th style={{ padding: 16 }}>COURSE ID & TITLE</th>
              <th style={{ padding: 16 }}>TEACHER</th>
              <th style={{ padding: 16 }}>CH</th>
              <th style={{ padding: 16 }}>TYPE</th>
              <th style={{ padding: 16, textAlign: "right" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredCourses.map(c => (
              <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: 16 }}>
                  <div style={{ fontWeight: 700 }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.courseId}</div>
                </td>
                <td style={{ padding: 16, fontSize: 14 }}>{c.teacher}</td>
                <td style={{ padding: 16 }}>{c.creditHours}</td>
                <td style={{ padding: 16 }}><span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "#eef2ff", color: "#6366f1" }}>{c.type}</span></td>
                <td style={{ padding: 16, textAlign: "right" }}>
                  <button onClick={() => { setForm(c); setEditingId(c.id); setShowModal(true); }} style={{ marginRight: 10, border: "none", background: "none", cursor: "pointer" }}><Edit3 size={16} color="#64748b"/></button>
                  <button onClick={() => deleteDoc(doc(db, "courses", c.id))} style={{ border: "none", background: "none", cursor: "pointer" }}><Trash2 size={16} color="#ef4444"/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: "450px", borderRadius: 24, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>{editingId ? "Edit Course" : "Add Course"}</h3>
              <X onClick={() => setShowModal(false)} style={{ cursor: "pointer" }} />
            </div>
            <div style={{ display: "grid", gap: 15 }}>
              <input style={{ padding: 12, borderRadius: 12, border: "1px solid #e2e8f0" }} placeholder="Course ID (e.g. CS-101)" value={form.courseId} onChange={e => setForm({...form, courseId: e.target.value})} />
              <input style={{ padding: 12, borderRadius: 12, border: "1px solid #e2e8f0" }} placeholder="Course Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              <input style={{ padding: 12, borderRadius: 12, border: "1px solid #e2e8f0" }} placeholder="Teacher Name" value={form.teacher} onChange={e => setForm({...form, teacher: e.target.value})} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <input type="number" style={{ padding: 12, borderRadius: 12, border: "1px solid #e2e8f0" }} placeholder="Credit Hours" value={form.creditHours} onChange={e => setForm({...form, creditHours: e.target.value})} />
                <select style={{ padding: 12, borderRadius: 12, border: "1px solid #e2e8f0" }} value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                  <option>Theory</option>
                  <option>Practical</option>
                  <option>Lab</option>
                </select>
              </div>
              <button onClick={handleSave} style={{ background: "#6366f1", color: "#fff", border: "none", padding: 14, borderRadius: 12, fontWeight: 800, cursor: "pointer", marginTop: 10 }}>
                {saving ? "Saving..." : "Save Course"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}