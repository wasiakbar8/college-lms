import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { toast, Toaster } from "react-hot-toast";
import { ArrowLeft, Plus, Edit3, Trash2, X, Search } from "lucide-react";

// ── Configuration (Matched with Results & Attendance Theme) ──
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

const EMPTY = { courseId: "", title: "", teacher: "", creditHours: "3", type: "Theory" };

const c = { 
  primary: "#6366f1", 
  sub: "#6b7280", 
  border: "#e5e7eb", 
  bg: "#f4f6fb", 
  white: "#ffffff",
  dark: "#1e293b"
};

export default function AdminCourses() {
  const [view, setView] = useState("depts");
  const [activeDept, setActiveDept] = useState(null);
  const [activeSem, setActiveSem] = useState("1st Semester");
  const [search, setSearch] = useState("");
  
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
    return allCourses.filter(course => {
        const deptMatch = course.program === activeDept?.name;
        const semMatch = course.semester === activeSem;
        const searchMatch = course.title?.toLowerCase().includes(search.toLowerCase()) || 
                          course.courseId?.toLowerCase().includes(search.toLowerCase());
        return deptMatch && semMatch && searchMatch;
    });
  }, [allCourses, activeDept, activeSem, search]);

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

  const handleDelete = async (id) => {
    if(window.confirm("Are you sure you want to delete this course?")) {
        await deleteDoc(doc(db, "courses", id));
        toast.success("Course removed");
    }
  };

  if (view === "depts") {
    return (
      <div style={{ padding: 40, background: c.bg, minHeight: "100vh" }}>
        <Toaster />
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2 style={{ fontWeight: 800, color: c.dark }}>Course Management</h2>
          <p style={{ color: c.sub, marginBottom: 30 }}>Select a department to manage syllabus, credit hours, and instructors.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {DEPARTMENTS.map(dept => (
              <div key={dept.id} onClick={() => { setActiveDept(dept); setView("courses"); }}
                   style={{ background: "#fff", padding: 30, borderRadius: 20, cursor: "pointer", border: `1px solid ${c.border}`, transition: "0.2s" }}>
                <div style={{ fontSize: 40, marginBottom: 15 }}>{dept.icon}</div>
                <h3 style={{ margin: 0, color: c.dark }}>{dept.name}</h3>
                <div style={{ marginTop: 15, fontSize: 12, color: dept.color, fontWeight: 700 }}>Manage Courses →</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
            <p style={{ color: c.sub }}>Academic Syllabus: <strong>{activeSem}</strong></p>
          </div>
          
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
               <input placeholder="Search course or ID..." value={search} onChange={e => setSearch(e.target.value)}
                      style={{ width: 280, padding: "8px 12px 8px 35px", borderRadius: 10, border: `1px solid ${c.border}`, outline: "none", fontSize: 14 }} />
            </div>

            <button onClick={() => { setForm(EMPTY); setEditingId(null); setShowModal(true); }}
              style={{ background: c.primary, color: "#fff", border: "none", padding: "10px 20px", borderRadius: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <Plus size={18} /> Add New Course
            </button>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr style={{ textAlign: "left", color: c.sub, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <th style={{ padding: 16 }}>Course ID & Title</th>
                <th style={{ padding: 16 }}>Instructor</th>
                <th style={{ padding: 16 }}>Cr. Hours</th>
                <th style={{ padding: 16 }}>Type</th>
                <th style={{ padding: 16, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.map(course => (
                <tr key={course.id} style={{ borderBottom: `1px solid ${c.border}` }}>
                  <td style={{ padding: 16 }}>
                    <div style={{ fontWeight: 700, color: c.dark }}>{course.title}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{course.courseId}</div>
                  </td>
                  <td style={{ padding: 16, fontSize: 14, color: c.dark }}>{course.teacher}</td>
                  <td style={{ padding: 16, fontWeight: 600 }}>{course.creditHours}</td>
                  <td style={{ padding: 16 }}>
                    <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "#eef2ff", color: c.primary }}>
                        {course.type}
                    </span>
                  </td>
                  <td style={{ padding: 16, textAlign: "right" }}>
                    <button onClick={() => { setForm(course); setEditingId(course.id); setShowModal(true); }} style={{ marginRight: 12, border: "none", background: "none", cursor: "pointer" }}><Edit3 size={18} color={c.sub}/></button>
                    <button onClick={() => handleDelete(course.id)} style={{ border: "none", background: "none", cursor: "pointer" }}><Trash2 size={18} color="#ef4444"/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCourses.length === 0 && (
            <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>📖</div>
                No courses found for {activeSem}.
            </div>
          )}
        </div>
      </div>

      {/* Course Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: "450px", borderRadius: 24, overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ background: c.dark, padding: "20px 24px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>{editingId ? "Edit Course" : "Add Course"}</h3>
              <X onClick={() => setShowModal(false)} style={{ cursor: "pointer" }} />
            </div>
            
            <div style={{ padding: 24 }}>
              <div style={{ background: "#f1f5f9", padding: 12, borderRadius: 12, marginBottom: 20, fontSize: 13, fontWeight: 600, color: c.sub }}>
                Assigning to: {activeDept.name} • {activeSem}
              </div>

              <div style={{ display: "grid", gap: 15 }}>
                <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: c.sub, display: "block", marginBottom: 5 }}>COURSE CODE</label>
                    <input style={{ width: "100%", padding: 12, borderRadius: 12, border: `1px solid ${c.border}`, boxSizing: "border-box" }} placeholder="e.g. CS-101" value={form.courseId} onChange={e => setForm({...form, courseId: e.target.value})} />
                </div>
                <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: c.sub, display: "block", marginBottom: 5 }}>COURSE TITLE</label>
                    <input style={{ width: "100%", padding: 12, borderRadius: 12, border: `1px solid ${c.border}`, boxSizing: "border-box" }} placeholder="e.g. Introduction to Programming" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                </div>
                <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: c.sub, display: "block", marginBottom: 5 }}>INSTRUCTOR</label>
                    <input style={{ width: "100%", padding: 12, borderRadius: 12, border: `1px solid ${c.border}`, boxSizing: "border-box" }} placeholder="Full Name" value={form.teacher} onChange={e => setForm({...form, teacher: e.target.value})} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: c.sub, display: "block", marginBottom: 5 }}>CREDIT HOURS</label>
                    <input type="number" style={{ width: "100%", padding: 12, borderRadius: 12, border: `1px solid ${c.border}`, boxSizing: "border-box" }} value={form.creditHours} onChange={e => setForm({...form, creditHours: e.target.value})} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: c.sub, display: "block", marginBottom: 5 }}>TYPE</label>
                    <select style={{ width: "100%", padding: 12, borderRadius: 12, border: `1px solid ${c.border}`, background: "#fff" }} value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                      <option>Theory</option>
                      <option>Practical</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                  <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${c.border}`, background: "none", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleSave} disabled={saving} style={{ flex: 2, background: c.primary, color: "#fff", border: "none", padding: 12, borderRadius: 12, fontWeight: 800, cursor: "pointer" }}>
                    {saving ? "Saving..." : "Save Course"}
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