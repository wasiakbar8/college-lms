import React, { useEffect, useState, useMemo } from "react";
import { collection, setDoc, doc, onSnapshot, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../firebase/config";
import { toast, Toaster } from "react-hot-toast";
import { X, Calendar, ArrowLeft, BookOpen, PlusCircle, User, Hash, ListOrdered } from "lucide-react";

const DEPARTMENTS = [
  { id: "cs", name: "Computer Science", icon: "💻", bg: "#E6F1FB", color: "#185FA5" },
  { id: "ir", name: "International Relations", icon: "🌍", bg: "#E1F5EE", color: "#0F6E56" },
  { id: "edu", name: "Education", icon: "📚", bg: "#FAEEDA", color: "#854F0B" },
  { id: "bus", name: "Business Administration", icon: "📊", bg: "#FAECE7", color: "#993C1D" },
  { id: "eng", name: "English", icon: "✍️", bg: "#EEEDFE", color: "#534AB7" },
  { id: "math", name: "Mathematics", icon: "🔢", bg: "#EAF3DE", color: "#3B6D11" },
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

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [markMode, setMarkMode] = useState("daily"); // "daily" or "lectures"

  // Form State
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

  const filteredStudents = useMemo(() => {
    if (!activeDept) return [];
    return students.filter(s => s.dept === activeDept.id);
  }, [students, activeDept]);

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
        await setDoc(doc(doc(db, "dailyAttendance", docId)), {
          ...baseData,
          date: entryForm.date,
          status: entryForm.status
        });
      } else {
        // Lecture Mode Logic
        const total = Number(entryForm.totalLectures);
        const pres = Number(entryForm.present);
        const lve = Number(entryForm.leave || 0);
        const abs = total - (pres + lve);

        if (pres + lve > total) {
          toast.error("Present + Leave cannot exceed Total Lectures");
          return;
        }

        const docId = `summary_${Date.now()}_${selectedStudent.rollNo}`;
        await setDoc(doc(db, "dailyAttendance", docId), {
          ...baseData,
          date: new Date().toISOString().split("T")[0], // Summary uses current date as ref
          totalLectures: total,
          present: pres,
          leave: lve,
          absent: abs,
          status: "Summary" // Custom status for summaries
        });
      }

      toast.success("Attendance marked successfully!");
      setShowAddModal(false);
    } catch (e) { toast.error("Save failed: " + e.message); }
  };

  if (view === "depts") {
    return (
      <div style={{ padding: 32, background: "#f4f6fb", minHeight: "100vh" }}>
        <Toaster />
        <h2 style={{ fontWeight: 800 }}>Attendance System</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20, marginTop: 24 }}>
          {DEPARTMENTS.map(dept => (
            <div key={dept.id} onClick={() => { setActiveDept(dept); setView("marking"); }}
                 className="card" style={{ background: "#fff", padding: 24, borderRadius: 20, cursor: "pointer", border: "1px solid #e2e8f0" }}>
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
        <ArrowLeft size={18} /> Back
      </button>

      <div style={{ background: "#fff", borderRadius: 24, padding: 24, border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0 }}>{activeDept.icon} {activeDept.name}</h2>
          <select value={activeSem} onChange={e => setActiveSem(e.target.value)} style={{ padding: "10px 16px", borderRadius: 12, border: "1px solid #e2e8f0", fontWeight: 600 }}>
            {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f8fafc", color: "#64748b" }}>
            <tr>
              <th style={{ padding: 16, textAlign: "left" }}>STUDENT INFO</th>
              <th style={{ padding: 16, textAlign: "right" }}>MARK ATTENDANCE</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(student => (
              <tr key={student.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: 16 }}>
                  <div style={{ fontWeight: 700, color: "#1e293b" }}>{student.name}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>Roll No: {student.rollNo}</div>
                </td>
                <td style={{ padding: 16, textAlign: "right" }}>
                  <button onClick={() => openAddAttendance(student)} 
                    style={{ background: "#6366f1", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
                    <PlusCircle size={16} /> Mark
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── MODAL: MARKING ── */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: "480px", borderRadius: 24, overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ background: "#1e293b", padding: "20px 24px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>Mark Attendance</h3>
              <X onClick={() => setShowAddModal(false)} style={{ cursor: "pointer" }} />
            </div>

            {/* Mode Switcher */}
            <div style={{ display: "flex", background: "#f1f5f9", margin: "20px 24px 0", borderRadius: 12, padding: 4 }}>
               <button onClick={() => setMarkMode("daily")} style={{ flex: 1, padding: "8px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, background: markMode === "daily" ? "#fff" : "transparent", boxShadow: markMode === "daily" ? "0 2px 4px rgba(0,0,0,0.05)" : "none", color: markMode === "daily" ? "#6366f1" : "#64748b" }}>Daily (Single)</button>
               <button onClick={() => setMarkMode("lectures")} style={{ flex: 1, padding: "8px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, background: markMode === "lectures" ? "#fff" : "transparent", boxShadow: markMode === "lectures" ? "0 2px 4px rgba(0,0,0,0.05)" : "none", color: markMode === "lectures" ? "#6366f1" : "#64748b" }}>Lectures (Bulk)</button>
            </div>

            <div style={{ padding: "20px 24px 24px" }}>
               <div style={{ marginBottom: 15, background: "#f8fafc", padding: 12, borderRadius: 14, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{selectedStudent?.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{selectedStudent?.rollNo} • {activeSem}</div>
               </div>

               <div style={{ display: "grid", gap: 12 }}>
                  <input style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1px solid #e2e8f0" }} placeholder="Course Title" value={entryForm.courseTitle} onChange={e => setEntryForm({...entryForm, courseTitle: e.target.value})} />
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <input style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1px solid #e2e8f0" }} placeholder="Course Code" value={entryForm.courseCode} onChange={e => setEntryForm({...entryForm, courseCode: e.target.value})} />
                    <input style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1px solid #e2e8f0" }} placeholder="Teacher" value={entryForm.teacher} onChange={e => setEntryForm({...entryForm, teacher: e.target.value})} />
                  </div>

                  {markMode === "daily" ? (
                    /* DAILY MODE FIELDS */
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <input type="date" style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1px solid #e2e8f0" }} value={entryForm.date} onChange={e => setEntryForm({...entryForm, date: e.target.value})} />
                      <select style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1px solid #e2e8f0" }} value={entryForm.status} onChange={e => setEntryForm({...entryForm, status: e.target.value})}>
                        {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                  ) : (
                    /* LECTURE MODE FIELDS */
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8" }}>TOTAL</label>
                        <input type="number" style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1px solid #e2e8f0" }} placeholder="10" value={entryForm.totalLectures} onChange={e => setEntryForm({...entryForm, totalLectures: e.target.value})} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8" }}>PRESENT</label>
                        <input type="number" style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1px solid #e2e8f0" }} placeholder="8" value={entryForm.present} onChange={e => setEntryForm({...entryForm, present: e.target.value})} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8" }}>LEAVE</label>
                        <input type="number" style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1px solid #e2e8f0" }} placeholder="1" value={entryForm.leave} onChange={e => setEntryForm({...entryForm, leave: e.target.value})} />
                      </div>
                    </div>
                  )}
               </div>

               <button onClick={handleSaveEntry} style={{ width: "100%", background: "#6366f1", color: "#fff", border: "none", padding: 14, borderRadius: 12, marginTop: 20, fontWeight: 800, cursor: "pointer" }}>
                  Save Record
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}