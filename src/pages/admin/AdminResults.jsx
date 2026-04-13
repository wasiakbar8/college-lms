import React, { useEffect, useState, useMemo } from "react";
import {
  collection, query, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, orderBy, getDocs
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { toast, Toaster } from "react-hot-toast";
import { Trash2, Edit3, Plus, Search, X, ArrowLeft, BookOpen } from "lucide-react";

// ── Configuration ──
const DEPARTMENTS = [
  { id: "cs",   name: "Computer Science",         icon: "💻", bg: "#E6F1FB", color: "#185FA5" },
  { id: "ir",   name: "International Relations", icon: "🌍", bg: "#E1F5EE", color: "#0F6E56" },
  { id: "edu",  name: "Education",               icon: "📚", bg: "#FAEEDA", color: "#854F0B" },
  { id: "bus",  name: "Business Administration", icon: "📊", bg: "#FAECE7", color: "#993C1D" },
  { id: "eng",  name: "English",                 icon: "✍️", bg: "#EEEDFE", color: "#534AB7" },
  { id: "math", name: "Mathematics",             icon: "🔢", bg: "#EAF3DE", color: "#3B6D11" },
];

const SEMESTERS = [
  "1st Semester", "2nd Semester", "3rd Semester", "4th Semester",
  "5th Semester", "6th Semester", "7th Semester", "8th Semester",
];

const GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"];
const GRADE_POINTS = { "A+":4.0, "A":4.0, "A-":3.7, "B+":3.3, "B":3.0, "B-":2.7, "C+":2.3, "C":2.0, "C-":1.7, "D+":1.3, "D":1.0, "F":0.0 };

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

export default function AdminResults() {
  const [view, setView] = useState("depts"); 
  const [activeDept, setActiveDept] = useState(null);
  const [activeSem, setActiveSem] = useState("1st Semester");
  const [loading, setLoading] = useState(true);
  
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  // 1. Real-time Results
  useEffect(() => {
    const q = query(collection(db, "results"), orderBy("updatedAt", "desc"));
    return onSnapshot(q, snap => {
      setResults(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  // 2. Real-time Students
  useEffect(() => {
    const q = query(collection(db, "students"));
    return onSnapshot(q, snap => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // ── Filters ──
  const semNum = (str) => SEMESTERS.indexOf(str) + 1;

  const filteredStudents = useMemo(() => {
    if (!activeDept) return [];
    return students.filter(s => 
      s.dept === activeDept.id && 
      Number(s.sem) === semNum(activeSem) &&
      (s.name?.toLowerCase().includes(search.toLowerCase()) || s.rollNo?.toLowerCase().includes(search.toLowerCase()))
    );
  }, [students, activeDept, activeSem, search]);

  // ── Handlers ──
  const openAddForResult = (student) => {
    setForm({
      rollNo: student.rollNo,
      studentName: student.name,
      dept: student.dept,
      semester: activeSem,
      subjectTitle: "",
      courseId: "",
      creditHours: 3,
      marksObtained: "",
      totalMarks: 100,
      grade: "",
    });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (result) => {
    setForm(result);
    setEditingId(result.id);
    setShowModal(true);
  };

  async function handleSave() {
    if (!form.subjectTitle || !form.courseId || !form.grade) { 
      toast.error("Please fill required fields"); 
      return; 
    }
    setSaving(true);
    try {
      const data = { 
        ...form, 
        creditHours: Number(form.creditHours),
        marksObtained: Number(form.marksObtained),
        totalMarks: Number(form.totalMarks),
        gradePoints: GRADE_POINTS[form.grade] || 0,
        updatedAt: new Date().toISOString() 
      };

      if (editingId) await updateDoc(doc(db, "results", editingId), data);
      else await addDoc(collection(db, "results"), data);
      
      toast.success(editingId ? "Updated!" : "Result Added!");
      setShowModal(false);
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  // ── View 1: Department Cards ──
  if (view === "depts") {
    return (
      <div style={{ minHeight: "100vh", background: c.bg, padding: 40 }}>
        <Toaster />
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2 style={{ fontWeight: 800, color: c.dark }}>Grading & Examination</h2>
          <p style={{ color: c.sub, marginBottom: 30 }}>Select a department to view student lists and enter grades.</p>
          
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {DEPARTMENTS.map(dept => {
              const count = students.filter(s => s.dept === dept.id).length;
              return (
                <div key={dept.id} onClick={() => { setActiveDept(dept); setView("results"); }}
                     className="card" style={{ padding: 30, cursor: "pointer", background: "#fff", borderRadius: 20, border: `1px solid ${c.border}`, transition: "0.2s" }}>
                  <div style={{ fontSize: 40, marginBottom: 15 }}>{dept.icon}</div>
                  <h3 style={{ margin: 0, color: c.dark }}>{dept.name}</h3>
                  <p style={{ fontSize: 13, color: c.sub }}>{count} Students Registered</p>
                  <div style={{ marginTop: 15, fontSize: 12, color: dept.color, fontWeight: 700 }}>Enter Department →</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── View 2: Student List & Grading ──
  return (
    <div style={{ minHeight: "100vh", background: c.bg, padding: "30px 20px" }}>
      <Toaster />
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        
        <button onClick={() => setView("depts")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: c.primary, cursor: "pointer", fontWeight: 700, marginBottom: 20 }}>
          <ArrowLeft size={18} /> Back to Departments
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 30 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>{activeDept.icon} {activeDept.name}</h1>
            <p style={{ color: c.sub }}>Current View: <strong>{activeSem}</strong></p>
          </div>
          <div style={{ display: "flex", gap: 8, background: "#fff", padding: 6, borderRadius: 14, border: `1px solid ${c.border}` }}>
            {SEMESTERS.map(sem => (
              <button key={sem} onClick={() => setActiveSem(sem)}
                style={{
                  padding: "6px 12px", borderRadius: 10, fontSize: 11, cursor: "pointer", border: "none",
                  background: activeSem === sem ? activeDept.color : "transparent",
                  color: activeSem === sem ? "#fff" : c.sub, fontWeight: 700
                }}>
                {sem.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, border: `1px solid ${c.border}`, overflow: "hidden" }}>
          <div style={{ padding: 20, borderBottom: `1px solid ${c.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ margin: 0 }}>Students in {activeSem}</h4>
            <div style={{ position: "relative" }}>
               <Search size={16} style={{ position: "absolute", left: 12, top: 10, color: c.sub }} />
               <input placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)}
                      style={{ ...inp, paddingLeft: 35, width: 250, height: 36 }} />
            </div>
          </div>
          
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                <th style={{ padding: 15, textAlign: "left", fontSize: 11, color: c.sub }}>STUDENT DETAILS</th>
                <th style={{ padding: 15, textAlign: "left", fontSize: 11, color: c.sub }}>ROLL NO</th>
                <th style={{ padding: 15, textAlign: "left", fontSize: 11, color: c.sub }}>ENTERED SUBJECTS</th>
                <th style={{ padding: 15, textAlign: "right", fontSize: 11, color: c.sub }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => {
                const studentResults = results.filter(r => r.rollNo === student.rollNo && r.semester === activeSem);
                return (
                  <tr key={student.id} style={{ borderBottom: `1px solid ${c.border}` }}>
                    <td style={{ padding: 15 }}>
                      <div style={{ fontWeight: 700, color: c.dark }}>{student.name}</div>
                      <div style={{ fontSize: 11, color: c.sub }}>{student.email}</div>
                    </td>
                    <td style={{ padding: 15 }}><span style={{ background: activeDept.bg, color: activeDept.color, padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>{student.rollNo}</span></td>
                    <td style={{ padding: 15 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {studentResults.map(r => (
                          <span key={r.id} onClick={() => openEdit(r)}
                                style={{ fontSize: 10, background: "#f1f5f9", padding: "4px 8px", borderRadius: 6, cursor: "pointer", border: "1px solid #e2e8f0", fontWeight: 600 }}>
                            {r.courseId}: {r.grade}
                          </span>
                        ))}
                        {studentResults.length === 0 && <span style={{ fontSize: 11, color: "#cbd5e1" }}>No records</span>}
                      </div>
                    </td>
                    <td style={{ padding: 15, textAlign: "right" }}>
                      <button onClick={() => openAddForResult(student)}
                        style={{ background: c.primary, color: "#fff", border: "none", padding: "8px 16px", borderRadius: 10, fontSize: 12, cursor: "pointer", fontWeight: 700 }}>
                        + Add Grade
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Result Entry Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 500, borderRadius: 24, overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ background: c.dark, padding: "20px 24px", color: "#fff", display: "flex", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>{editingId ? "Edit Result" : "Add Result"}</h3>
              <X onClick={() => setShowModal(false)} style={{ cursor: "pointer" }} />
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ background: "#f1f5f9", padding: 15, borderRadius: 15, marginBottom: 20 }}>
                <div style={{ fontWeight: 800 }}>{form.studentName}</div>
                <div style={{ fontSize: 12, color: c.sub }}>Roll No: {form.rollNo} &nbsp;•&nbsp; {activeSem}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15 }}>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Course Title *</label>
                  <input style={inp} value={form.subjectTitle} onChange={e => setForm({...form, subjectTitle: e.target.value})} placeholder="e.g. Data Structures" />
                </div>
                <div>
                  <label style={lbl}>Course Code *</label>
                  <input style={inp} value={form.courseId} onChange={e => setForm({...form, courseId: e.target.value})} placeholder="CS-301" />
                </div>
                <div>
                  <label style={lbl}>Credit Hours</label>
                  <input style={inp} type="number" value={form.creditHours} onChange={e => setForm({...form, creditHours: e.target.value})} />
                </div>
                <div>
                  <label style={lbl}>Total Marks</label>
                  <input style={inp} type="number" value={form.totalMarks} onChange={e => setForm({...form, totalMarks: e.target.value})} />
                </div>
                <div>
                  <label style={lbl}>Obtained Marks</label>
                  <input style={inp} type="number" value={form.marksObtained} onChange={e => setForm({...form, marksObtained: e.target.value})} />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Grade *</label>
                  <select style={inp} value={form.grade} onChange={e => setForm({...form, grade: e.target.value})}>
                    <option value="">Select Grade</option>
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 25 }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${c.border}`, background: "none", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: 12, borderRadius: 12, border: "none", background: c.primary, color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                  {saving ? "Saving..." : "Save Result"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}