import React, { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, setDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { toast, Toaster } from "react-hot-toast";
import { X, ArrowLeft, PlusCircle } from "lucide-react";

const DEPARTMENTS = [
  { id: "cs", name: "Computer Science", icon: "💻", color: "#185FA5" },
  { id: "ir", name: "International Relations", icon: "🌍", color: "#0F6E56" },
  { id: "edu", name: "Education", icon: "📚", color: "#854F0B" },
  { id: "bus", name: "Business Administration", icon: "📊", color: "#993C1D" },
  { id: "eng", name: "English", icon: "✍️", color: "#534AB7" },
  { id: "math", name: "Mathematics", icon: "🔢", color: "#3B6D11" },
];

const SEMESTERS = ["1st Semester", "2nd Semester", "3rd Semester", "4th Semester", "5th Semester", "6th Semester", "7th Semester", "8th Semester"];

const STATUS = {
  P: { label: "Present", bg: "#dcfce7", text: "#16a34a" },
  A: { label: "Absent", bg: "#fee2e2", text: "#dc2626" },
  L: { label: "Leave", bg: "#fef3c7", text: "#d97706" },
};

export default function AdminAttendance() {
  const [view, setView] = useState("depts");
  const [activeDept, setActiveDept] = useState(null);
  const [activeSem, setActiveSem] = useState("1st Semester");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [markMode, setMarkMode] = useState("daily");

  const [entryForm, setEntryForm] = useState({
    courseTitle: "", courseCode: "", teacher: "", date: new Date().toISOString().split("T")[0],
    status: "P", totalLectures: "", present: "", leave: ""
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "students"), (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // --- Normalization Helper for Semester Mismatch ---
  const normalizeSem = (sem) => {
    if (!sem) return "";
    const s = String(sem).toLowerCase().trim();
    if (s === "1" || s.includes("1st")) return "1st Semester";
    if (s === "2" || s.includes("2nd")) return "2nd Semester";
    if (s === "3" || s.includes("3rd")) return "3rd Semester";
    if (s === "4" || s.includes("4th")) return "4th Semester";
    if (s === "5" || s.includes("5th")) return "5th Semester";
    if (s === "6" || s.includes("6th")) return "6th Semester";
    if (s === "7" || s.includes("7th")) return "7th Semester";
    if (s === "8" || s.includes("8th")) return "8th Semester";
    return s;
  };

  // --- CRITICAL FILTER UPDATE ---
  const filteredStudents = useMemo(() => {
    if (!activeDept) return [];
    return students.filter(s => {
      const deptMatch = s.dept === activeDept.id || s.department === activeDept.name;
      const semMatch = normalizeSem(s.semester || s.sem) === normalizeSem(activeSem);
      return deptMatch && semMatch;
    });
  }, [students, activeDept, activeSem]);

  const openAddAttendance = (student) => {
    setSelectedStudent(student);
    setEntryForm({
      courseTitle: "", courseCode: "", teacher: "", date: new Date().toISOString().split("T")[0],
      status: "P", totalLectures: "", present: "", leave: ""
    });
    setShowAddModal(true);
  };

  const handleSaveEntry = async () => {
    if (!entryForm.courseTitle || !entryForm.teacher) {
      toast.error("Course Title and Teacher are required");
      return;
    }
    try {
      const baseData = {
        courseTitle: entryForm.courseTitle,
        courseCode: entryForm.courseCode,
        teacher: entryForm.teacher,
        studentName: selectedStudent.name,
        rollNo: selectedStudent.rollNo,
        dept: activeDept.id,
        semester: activeSem,
        timestamp: new Date().toISOString(),
        markMode: markMode
      };

      if (markMode === "daily") {
        const docId = `${entryForm.date}_${selectedStudent.rollNo}_${entryForm.courseCode || 'gen'}`;
        await setDoc(doc(db, "dailyAttendance", docId), { ...baseData, date: entryForm.date, status: entryForm.status });
      } else {
        const total = Number(entryForm.totalLectures);
        const pres = Number(entryForm.present);
        const lve = Number(entryForm.leave || 0);
        if (pres + lve > total) return toast.error("Present + Leave cannot exceed Total");
        const docId = `summary_${Date.now()}_${selectedStudent.rollNo}`;
        await setDoc(doc(db, "dailyAttendance", docId), { ...baseData, date: new Date().toISOString().split("T")[0], totalLectures: total, present: pres, leave: lve, absent: total - (pres + lve), status: "Summary" });
      }
      toast.success("Attendance marked!");
      setShowAddModal(false);
    } catch (e) { toast.error(e.message); }
  };

  if (view === "depts") {
    return (
      <div style={{ padding: 32, background: "#f4f6fb", minHeight: "100vh" }}>
        <Toaster />
        <h2 style={{ fontWeight: 800 }}>Attendance System</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20, marginTop: 24 }}>
          {DEPARTMENTS.map(dept => (
            <div key={dept.id} onClick={() => { setActiveDept(dept); setView("marking"); }}
                 style={{ background: "#fff", padding: 24, borderRadius: 20, cursor: "pointer", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{dept.icon}</div>
              <h3>{dept.name}</h3>
              <div style={{ fontSize: 12, color: dept.color, fontWeight: 700, marginTop: 8 }}>Enter Department →</div>
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
          <h2 style={{ margin: 0 }}>{activeDept.icon} {activeDept.name}</h2>
          <select value={activeSem} onChange={e => setActiveSem(e.target.value)} style={{ padding: "10px 16px", borderRadius: 12, border: "1px solid #e2e8f0", fontWeight: 600 }}>
            {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "#f8fafc", color: "#64748b", fontSize: 12 }}>
              <th style={{ padding: 16 }}>STUDENT</th>
              <th style={{ padding: 16 }}>ROLL NO</th>
              <th style={{ padding: 16, textAlign: "right" }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(student => (
              <tr key={student.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: 16, fontWeight: 700 }}>{student.name}</td>
                <td style={{ padding: 16 }}>{student.rollNo}</td>
                <td style={{ padding: 16, textAlign: "right" }}>
                  <button onClick={() => openAddAttendance(student)} 
                    style={{ background: "#6366f1", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontWeight: 700 }}>
                    Mark Attendance
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredStudents.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No students found in {activeSem}</div>
        )}
      </div>

      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: "480px", borderRadius: 24, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Mark Attendance</h3>
              <X onClick={() => setShowAddModal(false)} style={{ cursor: "pointer" }} />
            </div>
            
            <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 12, padding: 4, marginBottom: 20 }}>
               <button onClick={() => setMarkMode("daily")} style={{ flex: 1, padding: "8px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, background: markMode === "daily" ? "#fff" : "transparent", color: markMode === "daily" ? "#6366f1" : "#64748b" }}>Daily</button>
               <button onClick={() => setMarkMode("lectures")} style={{ flex: 1, padding: "8px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, background: markMode === "lectures" ? "#fff" : "transparent", color: markMode === "lectures" ? "#6366f1" : "#64748b" }}>Bulk</button>
            </div>

            <div style={{ display: "grid", gap: 15 }}>
              <input style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }} placeholder="Course Title" value={entryForm.courseTitle} onChange={e => setEntryForm({...entryForm, courseTitle: e.target.value})} />
              <input style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }} placeholder="Teacher" value={entryForm.teacher} onChange={e => setEntryForm({...entryForm, teacher: e.target.value})} />
              
              {markMode === "daily" ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <input type="date" style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }} value={entryForm.date} onChange={e => setEntryForm({...entryForm, date: e.target.value})} />
                  <select style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }} value={entryForm.status} onChange={e => setEntryForm({...entryForm, status: e.target.value})}>
                    {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <input type="number" placeholder="Total" style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }} value={entryForm.totalLectures} onChange={e => setEntryForm({...entryForm, totalLectures: e.target.value})} />
                  <input type="number" placeholder="Pres" style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }} value={entryForm.present} onChange={e => setEntryForm({...entryForm, present: e.target.value})} />
                  <input type="number" placeholder="Leave" style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }} value={entryForm.leave} onChange={e => setEntryForm({...entryForm, leave: e.target.value})} />
                </div>
              )}
              <button onClick={handleSaveEntry} style={{ background: "#6366f1", color: "#fff", border: "none", padding: 14, borderRadius: 12, fontWeight: 800 }}>Save Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}