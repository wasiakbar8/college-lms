import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  collection, onSnapshot, setDoc, doc,
  getDocs, query, where,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { toast, Toaster } from "react-hot-toast";
import {
  ArrowLeft, Search, ChevronRight, Calendar,
  CheckSquare, BookOpen, Clock, ChevronDown, X,
} from "lucide-react";

// ── Config ────────────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  { id: "cs",   name: "Computer Science",        icon: "💻", bg: "#E6F1FB", color: "#185FA5" },
  { id: "ir",   name: "International Relations", icon: "🌍", bg: "#E1F5EE", color: "#0F6E56" },
  { id: "edu",  name: "Education",               icon: "📚", bg: "#FAEEDA", color: "#854F0B" },
  { id: "bus",  name: "Business Administration", icon: "📊", bg: "#FAECE7", color: "#993C1D" },
  { id: "eng",  name: "English",                 icon: "✍️", bg: "#EEEDFE", color: "#534AB7" },
  { id: "math", name: "Mathematics",             icon: "🔢", bg: "#EAF3DE", color: "#3B6D11" },
];

const SEMESTERS = [
  "1st Semester","2nd Semester","3rd Semester","4th Semester",
  "5th Semester","6th Semester","7th Semester","8th Semester",
];

const STATUS = {
  P: { label: "Present", bg: "#dcfce7", text: "#16a34a", dot: "#22c55e" },
  A: { label: "Absent",  bg: "#fee2e2", text: "#dc2626", dot: "#ef4444" },
  L: { label: "Leave",   bg: "#fef3c7", text: "#d97706", dot: "#f59e0b" },
};

const c = {
  primary: "#4f46e5", primaryLight: "#eef2ff",
  sub: "#64748b", border: "#e2e8f0",
  bg: "#f8fafc", white: "#ffffff", dark: "#0f172a",
  surface: "#f1f5f9",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getLastNDays(n = 30) {
  const days = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function fmtDate(str) {
  const d = new Date(str + "T00:00:00");
  return {
    day:     d.getDate(),
    month:   d.toLocaleString("default", { month: "short" }),
    weekday: d.toLocaleString("default", { weekday: "short" }),
  };
}

function normalizeSem(sem) {
  if (!sem) return "";
  const s = String(sem).toLowerCase().trim();
  const map = {
    "1": "1st Semester", "2": "2nd Semester", "3": "3rd Semester",
    "4": "4th Semester", "5": "5th Semester", "6": "6th Semester",
    "7": "7th Semester", "8": "8th Semester",
  };
  for (const [k, v] of Object.entries(map)) {
    const suffix = k === "1" ? "st" : k === "2" ? "nd" : k === "3" ? "rd" : "th";
    if (s === k || s.includes(k + suffix)) return v;
  }
  return s;
}

// ─────────────────────────────────────────────────────────────────────────────
//  STATUS POPOVER  — appears when admin clicks a date cell
// ─────────────────────────────────────────────────────────────────────────────
function StatusPopover({ anchorRect, current, onPick, onClose }) {
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  if (!anchorRect) return null;

  const left = Math.min(anchorRect.left + anchorRect.width / 2 - 80, window.innerWidth - 185);
  const top  = anchorRect.bottom + 8;

  return (
    <div ref={ref} style={{
      position: "fixed", left, top,
      background: "#fff", borderRadius: 14, border: `1.5px solid ${c.border}`,
      boxShadow: "0 12px 32px rgba(0,0,0,0.15)", zIndex: 9999,
      overflow: "hidden", minWidth: 165, animation: "popIn 0.13s ease",
    }}>
      <div style={{ padding: "10px 14px 6px", fontSize: 10, color: c.sub, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase" }}>
        Mark as
      </div>
      {Object.entries(STATUS).map(([key, val]) => (
        <button key={key} onClick={() => onPick(key)}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "11px 16px", border: "none",
            background: current === key ? val.bg : "transparent",
            cursor: "pointer", fontSize: 14,
            fontWeight: current === key ? 800 : 600,
            color: current === key ? val.text : c.dark,
            transition: "background 0.1s",
          }}
          onMouseEnter={e => { if (current !== key) e.currentTarget.style.background = "#f8fafc"; }}
          onMouseLeave={e => { if (current !== key) e.currentTarget.style.background = "transparent"; }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: val.dot, flexShrink: 0, display: "inline-block" }} />
          {val.label}
          {current === key && <span style={{ marginLeft: "auto", fontSize: 12 }}>✓</span>}
        </button>
      ))}
      {current && (
        <button onClick={() => onPick(null)}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "10px 16px", border: "none", borderTop: `1px solid ${c.border}`,
            background: "transparent", cursor: "pointer", fontSize: 12, color: "#94a3b8", fontWeight: 600,
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          <X size={11} /> Clear this date
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN ATTENDANCE (default export)
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminAttendance() {
  const [view, setView]             = useState("depts");
  const [activeDept, setActiveDept] = useState(null);
  const [activeSem, setActiveSem]   = useState("1st Semester");
  const [students, setStudents]     = useState([]);
  const [courses,  setCourses]      = useState([]);
  const [loading,  setLoading]      = useState(true);
  const [search,   setSearch]       = useState("");

  // Sheet state
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedCourse,  setSelectedCourse]  = useState(null);
  const [courseDropOpen,  setCourseDropOpen]   = useState(false);
  const [dateRange,       setDateRange]        = useState(14);
  const [attendance,      setAttendance]       = useState({});
  const [existingRec,     setExistingRec]      = useState({});
  const [saving,          setSaving]           = useState(false);

  // Popover
  const [popover, setPopover] = useState(null); // { date, rect }

  // Load students
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "students"), snap => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Load courses whenever dept or semester changes
  useEffect(() => {
    if (!activeDept || !activeSem) return;
    setCourses([]);
    setSelectedCourse(null);
    const q = query(
      collection(db, "courses"),
      where("program",  "==", activeDept.name),
      where("semester", "==", activeSem)
    );
    getDocs(q).then(snap => setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [activeDept, activeSem]);

  const filteredStudents = useMemo(() => {
    if (!activeDept) return [];
    return students.filter(s => {
      const deptMatch   = s.dept === activeDept.id || s.department === activeDept.name;
      const semMatch    = normalizeSem(s.semester || s.sem) === normalizeSem(activeSem);
      const searchMatch = s.name?.toLowerCase().includes(search.toLowerCase()) ||
                          s.rollNo?.toLowerCase().includes(search.toLowerCase());
      return deptMatch && semMatch && searchMatch;
    });
  }, [students, activeDept, activeSem, search]);

  // Load already-saved records for student + course
  const loadExisting = async (student, course) => {
    if (!student || !course) return;
    const q = query(
      collection(db, "dailyAttendance"),
      where("rollNo",     "==", student.rollNo),
      where("courseCode", "==", course.courseId)
    );
    const snap = await getDocs(q);
    const map  = {};
    snap.docs.forEach(d => { const r = d.data(); if (r.date) map[r.date] = r.status; });
    setExistingRec(map);
    setAttendance(map);
  };

  const openSheet = student => {
    setSelectedStudent(student);
    setSelectedCourse(null);
    setAttendance({});
    setExistingRec({});
    setView("sheet");
  };

  const pickCourse = course => {
    setSelectedCourse(course);
    setCourseDropOpen(false);
    setAttendance({});
    setExistingRec({});
    loadExisting(selectedStudent, course);
  };

  const dates = useMemo(() => getLastNDays(dateRange), [dateRange]);

  const stats = useMemo(() => {
    const cnt = { P: 0, A: 0, L: 0 };
    dates.forEach(d => { const s = attendance[d]; if (s) cnt[s]++; });
    const total = cnt.P + cnt.A + cnt.L;
    return { ...cnt, total, pct: total > 0 ? Math.round((cnt.P / total) * 100) : null };
  }, [attendance, dates]);

  const handleDateClick = (date, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover(prev => prev?.date === date ? null : { date, rect });
  };

  const pickStatus = (status) => {
    if (!popover) return;
    setAttendance(prev => {
      const next = { ...prev };
      if (status === null) delete next[popover.date];
      else next[popover.date] = status;
      return next;
    });
    setPopover(null);
  };

  const markAll = status => {
    const obj = {};
    dates.forEach(d => { obj[d] = status; });
    setAttendance(obj);
  };

  const handleSubmit = async () => {
    if (!selectedCourse) { toast.error("Please select a course first"); return; }
    const marked = dates.filter(d => attendance[d]);
    if (!marked.length)  { toast.error("Mark at least one date before submitting"); return; }
    setSaving(true);
    try {
      await Promise.all(marked.map(date => {
        const docId = `${date}_${selectedStudent.rollNo}_${selectedCourse.courseId}`;
        return setDoc(doc(db, "dailyAttendance", docId), {
          courseTitle: selectedCourse.title,
          courseCode:  selectedCourse.courseId,
          teacher:     selectedCourse.teacher,
          studentName: selectedStudent.name,
          rollNo:      selectedStudent.rollNo,
          dept:        activeDept.id,
          semester:    activeSem,
          date,
          status:      attendance[date],
          timestamp:   new Date().toISOString(),
        });
      }));
      toast.success(`✅ Saved ${marked.length} records for ${selectedCourse.title}!`);
      setExistingRec(prev => ({
        ...prev,
        ...Object.fromEntries(marked.map(d => [d, attendance[d]])),
      }));
    } catch (e) { toast.error(e.message); }
    setSaving(false);
  };

  // ── VIEW: Departments ─────────────────────────────────────────────────────
  if (view === "depts") return (
    <div style={{ minHeight: "100vh", background: c.bg, padding: "40px 24px" }}>
      <Toaster position="top-right" />
      <div style={{ maxWidth: 1050, margin: "0 auto" }}>
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: c.dark, margin: 0 }}>Attendance Management</h1>
          <p style={{ color: c.sub, marginTop: 6 }}>Select a department to manage student attendance records.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 18 }}>
          {DEPARTMENTS.map(dept => (
            <div key={dept.id}
              onClick={() => { setActiveDept(dept); setView("students"); }}
              style={{ padding: "28px 24px", cursor: "pointer", background: c.white, borderRadius: 18,
                       border: `1.5px solid ${c.border}`, transition: "all 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>{dept.icon}</div>
              <h3 style={{ margin: 0, color: c.dark, fontWeight: 700 }}>{dept.name}</h3>
              <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: dept.color, fontWeight: 700 }}>
                Manage Attendance <ChevronRight size={14} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── VIEW: Students ────────────────────────────────────────────────────────
  if (view === "students") return (
    <div style={{ minHeight: "100vh", background: c.bg, padding: "30px 20px" }}>
      <Toaster position="top-right" />
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <button onClick={() => setView("depts")}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: c.primary, cursor: "pointer", fontWeight: 700, marginBottom: 20, fontSize: 14 }}>
          <ArrowLeft size={16} /> Back to Departments
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>{activeDept.icon} {activeDept.name}</h1>
            <p style={{ color: c.sub, margin: "4px 0 0" }}>Semester: <strong>{activeSem}</strong> · {filteredStudents.length} students</p>
          </div>
          <div style={{ display: "flex", gap: 5, background: "#fff", padding: 5, borderRadius: 14, border: `1px solid ${c.border}`, flexWrap: "wrap" }}>
            {SEMESTERS.map(sem => (
              <button key={sem} onClick={() => setActiveSem(sem)}
                style={{ padding: "7px 13px", borderRadius: 10, fontSize: 11, cursor: "pointer", border: "none",
                         background: activeSem === sem ? activeDept.color : "transparent",
                         color: activeSem === sem ? "#fff" : c.sub, fontWeight: 700, transition: "0.15s" }}>
                {sem.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 18, border: `1px solid ${c.border}`, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: `1px solid ${c.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ margin: 0, fontSize: 15 }}>Students — {activeSem}</h4>
            <div style={{ position: "relative" }}>
              <Search size={15} style={{ position: "absolute", left: 11, top: 10, color: c.sub }} />
              <input placeholder="Search by name or roll no…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: 240, padding: "8px 12px 8px 34px", borderRadius: 10, border: `1px solid ${c.border}`, outline: "none", fontSize: 13 }} />
            </div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                {["STUDENT","ROLL NO","EMAIL","ACTION"].map((h, i) => (
                  <th key={h} style={{ padding: "13px 18px", textAlign: i === 3 ? "right" : "left", fontSize: 11, color: c.sub, fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, i) => (
                <tr key={student.id} style={{ borderBottom: `1px solid ${c.border}`, background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                  <td style={{ padding: "14px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: activeDept.bg, color: activeDept.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 }}>
                        {student.name?.[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 700, color: c.dark }}>{student.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 18px" }}>
                    <span style={{ background: activeDept.bg, color: activeDept.color, padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>{student.rollNo}</span>
                  </td>
                  <td style={{ padding: "14px 18px", fontSize: 13, color: c.sub }}>{student.email || "—"}</td>
                  <td style={{ padding: "14px 18px", textAlign: "right" }}>
                    <button onClick={() => openSheet(student)}
                      style={{ background: c.primary, color: "#fff", border: "none", padding: "8px 18px", borderRadius: 10, fontSize: 12, cursor: "pointer", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Calendar size={13} /> Mark Attendance
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div style={{ padding: 60, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>No students found in this semester.</div>
          )}
        </div>
      </div>
    </div>
  );

  // ── VIEW: Attendance Sheet ────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: c.bg, padding: "30px 20px" }}>
      <Toaster position="top-right" />

      {/* Global animations */}
      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)  scale(1);    }
        }
      `}</style>

      {/* Status popover (portal-like, fixed) */}
      {popover && (
        <StatusPopover
          anchorRect={popover.rect}
          current={attendance[popover.date]}
          onPick={pickStatus}
          onClose={() => setPopover(null)}
        />
      )}

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* Back */}
        <button onClick={() => setView("students")}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: c.primary, cursor: "pointer", fontWeight: 700, marginBottom: 20, fontSize: 14 }}>
          <ArrowLeft size={16} /> Back to Students
        </button>

        {/* Student banner + live stats */}
        <div style={{ background: c.white, borderRadius: 16, border: `1px solid ${c.border}`, padding: "18px 24px", marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: activeDept.bg, color: activeDept.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 20 }}>
              {selectedStudent?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: c.dark }}>{selectedStudent?.name}</div>
              <div style={{ fontSize: 12, color: c.sub }}>{selectedStudent?.rollNo} · {activeDept.name} · {activeSem}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[{ k:"P", label:"Present" },{ k:"A", label:"Absent" },{ k:"L", label:"Leave" }].map(s => (
              <div key={s.k} style={{ background: STATUS[s.k].bg, color: STATUS[s.k].text, padding: "6px 14px", borderRadius: 10, fontWeight: 800, fontSize: 13 }}>
                {stats[s.k]} {s.label}
              </div>
            ))}
            {stats.pct !== null && (
              <div style={{ background: stats.pct >= 75 ? "#dcfce7" : "#fee2e2", color: stats.pct >= 75 ? "#16a34a" : "#dc2626", padding: "6px 14px", borderRadius: 10, fontWeight: 800, fontSize: 13 }}>
                {stats.pct}% Attendance
              </div>
            )}
          </div>
        </div>

        {/* ── COURSE SELECTOR ── */}
        <div style={{ background: c.white, borderRadius: 16, border: `1.5px solid ${selectedCourse ? c.primary + "66" : c.border}`, padding: "18px 24px", marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: c.sub, fontWeight: 700, letterSpacing: 0.8, marginBottom: 10, textTransform: "uppercase" }}>
            Step 1 — Select Course
          </div>

          {courses.length === 0 ? (
            <div style={{ padding: "14px 16px", background: "#fffbeb", borderRadius: 10, border: "1px solid #fde68a", fontSize: 13, color: "#92400e" }}>
              ⚠️ No courses found for <strong>{activeDept?.name} — {activeSem}</strong>.
              Please add courses in Course Management first.
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <button onClick={() => setCourseDropOpen(o => !o)}
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: 12,
                  border: `1.5px solid ${courseDropOpen ? c.primary : c.border}`,
                  background: "#fff", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                  fontSize: 14, fontWeight: selectedCourse ? 700 : 400,
                  color: selectedCourse ? c.dark : "#94a3b8", transition: "border-color 0.15s",
                }}>
                <span>
                  {selectedCourse
                    ? `${selectedCourse.title}  ·  ${selectedCourse.courseId}`
                    : "Choose a subject for this session…"}
                </span>
                <ChevronDown size={16} style={{ color: c.sub, transform: courseDropOpen ? "rotate(180deg)" : "rotate(0)", transition: "0.2s", flexShrink: 0 }} />
              </button>

              {courseDropOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 300,
                  background: "#fff", borderRadius: 14, border: `1.5px solid ${c.border}`,
                  boxShadow: "0 12px 32px rgba(0,0,0,0.12)", overflow: "hidden",
                }}>
                  {courses.map((course, idx) => (
                    <button key={course.id} onClick={() => pickCourse(course)}
                      style={{
                        width: "100%", padding: "13px 18px", border: "none",
                        background: selectedCourse?.id === course.id ? c.primaryLight : "#fff",
                        cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                        borderBottom: idx < courses.length - 1 ? `1px solid ${c.border}` : "none",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => { if (selectedCourse?.id !== course.id) e.currentTarget.style.background = "#f8fafc"; }}
                      onMouseLeave={e => { if (selectedCourse?.id !== course.id) e.currentTarget.style.background = "#fff"; }}>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: c.dark }}>{course.title}</div>
                        <div style={{ fontSize: 11, color: c.sub, marginTop: 2 }}>
                          {course.courseId} · {course.teacher} · {course.creditHours} Cr Hrs · {course.type}
                        </div>
                      </div>
                      {selectedCourse?.id === course.id && (
                        <span style={{ color: c.primary, fontWeight: 800, fontSize: 14, marginLeft: 12 }}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Course chips */}
          {selectedCourse && (
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { label: "Code",    val: selectedCourse.courseId },
                { label: "Teacher", val: selectedCourse.teacher },
                { label: "Type",    val: selectedCourse.type },
                { label: "Credits", val: `${selectedCourse.creditHours} hrs` },
              ].map(item => (
                <span key={item.label} style={{ background: c.primaryLight, color: c.primary, padding: "4px 11px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                  {item.label}: {item.val}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── DATE RANGE + QUICK MARK ── */}
        <div style={{ background: c.white, borderRadius: 16, border: `1px solid ${c.border}`, padding: "14px 20px", marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: c.sub, fontWeight: 700 }}>Show last:</span>
            {[7, 14, 30, 60].map(n => (
              <button key={n} onClick={() => setDateRange(n)}
                style={{ padding: "6px 13px", borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: "pointer",
                         border: `1.5px solid ${dateRange === n ? c.primary : c.border}`,
                         background: dateRange === n ? c.primaryLight : "transparent",
                         color: dateRange === n ? c.primary : c.sub, transition: "0.15s" }}>
                {n} days
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: c.sub, fontWeight: 700 }}>Quick mark all:</span>
            {Object.entries(STATUS).map(([k, v]) => (
              <button key={k} onClick={() => markAll(k)}
                style={{ background: v.bg, color: v.text, border: "none", padding: "6px 13px", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                All {v.label}
              </button>
            ))}
            <button onClick={() => setAttendance({})}
              style={{ background: c.surface, color: c.sub, border: "none", padding: "6px 13px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              Clear All
            </button>
          </div>
        </div>

        {/* ── DATE GRID ── */}
        <div style={{ background: c.white, borderRadius: 16, border: `1px solid ${c.border}`, padding: "20px 24px", marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                Step 2 — Mark Dates
              </h4>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: c.sub }}>
                Click any date → choose Present / Absent / Leave from the popup
              </p>
            </div>
            <div style={{ fontSize: 12, color: c.sub, background: c.surface, padding: "6px 12px", borderRadius: 8 }}>
              {Object.values(attendance).filter(Boolean).length} / {dates.length} marked
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {dates.map(date => {
              const status     = attendance[date] || "";
              const st         = STATUS[status] || null;
              const wasExisting = !!existingRec[date];
              const { day, month, weekday } = fmtDate(date);
              const isWeekend  = weekday === "Sat" || weekday === "Sun";
              const isOpen     = popover?.date === date;

              return (
                <div key={date} onClick={e => handleDateClick(date, e)}
                  style={{
                    width: 70, flexShrink: 0, padding: "10px 0 8px", borderRadius: 12,
                    cursor: "pointer", textAlign: "center", userSelect: "none",
                    background: st ? st.bg : isWeekend ? "#fafafa" : "#f8fafc",
                    border: `2px solid ${isOpen ? c.primary : st ? st.text + "55" : isWeekend ? "#e2e8f0" : c.border}`,
                    transition: "all 0.15s",
                    opacity: isWeekend && !status ? 0.5 : 1,
                    position: "relative",
                    transform: isOpen ? "translateY(-3px)" : "translateY(0)",
                    boxShadow: isOpen ? `0 6px 18px rgba(79,70,229,0.25)` : "none",
                  }}
                  onMouseEnter={e => { if (!isOpen) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.09)"; } }}
                  onMouseLeave={e => { if (!isOpen) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; } }}>

                  {/* Previously saved dot */}
                  {wasExisting && (
                    <div style={{ position: "absolute", top: 5, right: 5, width: 6, height: 6, borderRadius: "50%", background: "#a78bfa" }} />
                  )}

                  <div style={{ fontSize: 10, color: st ? st.text : isWeekend ? "#94a3b8" : c.sub, fontWeight: 600, letterSpacing: 0.3 }}>
                    {weekday}
                  </div>
                  <div style={{ fontSize: 23, fontWeight: 900, color: st ? st.text : isWeekend ? "#94a3b8" : c.dark, lineHeight: 1.1, margin: "3px 0 2px" }}>
                    {day}
                  </div>
                  <div style={{ fontSize: 10, color: st ? st.text : c.sub, fontWeight: 600 }}>
                    {month}
                  </div>
                  {status && (
                    <div style={{ marginTop: 5, fontSize: 10, fontWeight: 900, color: st.text,
                                  background: "rgba(255,255,255,0.65)", borderRadius: 5,
                                  padding: "1px 5px", display: "inline-block", letterSpacing: 0.5 }}>
                      {status}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${c.border}`, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            {Object.entries(STATUS).map(([k, v]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <div style={{ width: 12, height: 12, borderRadius: 4, background: v.bg, border: `1.5px solid ${v.text}55` }} />
                <span style={{ color: c.sub }}>{v.label}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#a78bfa" }} />
              <span style={{ color: c.sub }}>Previously saved</span>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={() => setView("students")}
            style={{ padding: "12px 22px", borderRadius: 12, border: `1.5px solid ${c.border}`, background: "none", fontWeight: 700, cursor: "pointer", fontSize: 14, color: c.sub }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving || !selectedCourse}
            style={{
              background: (!selectedCourse || saving) ? "#a5b4fc" : c.primary,
              color: "#fff", border: "none", padding: "12px 28px", borderRadius: 12,
              fontSize: 14, fontWeight: 800,
              cursor: (!selectedCourse || saving) ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 8,
              boxShadow: selectedCourse && !saving ? "0 4px 14px rgba(79,70,229,0.35)" : "none",
              transition: "all 0.2s",
            }}>
            <CheckSquare size={16} />
            {saving
              ? "Saving…"
              : `Submit Attendance (${Object.values(attendance).filter(Boolean).length} days)`}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  STUDENT ATTENDANCE VIEW  (named export)
//  Usage: <StudentAttendance rollNo={currentUser.rollNo} />
// ─────────────────────────────────────────────────────────────────────────────
export function StudentAttendance({ rollNo }) {
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selectedCourse, setSC] = useState(null);
  const [search, setSearch]     = useState("");

  useEffect(() => {
    if (!rollNo) return;
    const q = query(collection(db, "dailyAttendance"), where("rollNo", "==", rollNo));
    const unsub = onSnapshot(q, snap => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [rollNo]);

  const courseMap = useMemo(() => {
    const map = {};
    records.forEach(r => {
      const key = r.courseCode || r.courseTitle;
      if (!map[key]) map[key] = { courseTitle: r.courseTitle, courseCode: r.courseCode, teacher: r.teacher, semester: r.semester, records: [] };
      map[key].records.push(r);
    });
    return map;
  }, [records]);

  const cStats = recs => {
    const P = recs.filter(r => r.status === "P").length;
    const A = recs.filter(r => r.status === "A").length;
    const L = recs.filter(r => r.status === "L").length;
    const total = P + A + L;
    return { P, A, L, total, pct: total > 0 ? Math.round((P / total) * 100) : 0 };
  };

  const filteredCourses = useMemo(() =>
    Object.entries(courseMap).filter(([, v]) =>
      v.courseTitle?.toLowerCase().includes(search.toLowerCase()) ||
      v.courseCode?.toLowerCase().includes(search.toLowerCase())
    ), [courseMap, search]);

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: c.sub }}>Loading attendance…</div>;

  // ── Course Detail ──
  if (selectedCourse) {
    const course = courseMap[selectedCourse];
    const s = cStats(course.records);
    const sorted = [...course.records].sort((a, b) => a.date?.localeCompare(b.date));
    return (
      <div style={{ padding: "24px 20px", maxWidth: 900, margin: "0 auto" }}>
        <button onClick={() => setSC(null)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: c.primary, cursor: "pointer", fontWeight: 700, marginBottom: 20, fontSize: 14 }}>
          <ArrowLeft size={16} /> All Courses
        </button>
        <div style={{ background: c.white, borderRadius: 18, border: `1px solid ${c.border}`, overflow: "hidden", marginBottom: 20 }}>
          <div style={{ background: c.dark, padding: "20px 24px", color: "#fff" }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{course.courseTitle}</h2>
            <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>{course.courseCode} · {course.teacher} · {course.semester}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
            {[
              { label: "Total Classes", val: s.total, bg: "#f8fafc", col: c.dark },
              { label: "Present",       val: s.P,     bg: "#f0fdf4", col: "#16a34a" },
              { label: "Absent",        val: s.A,     bg: "#fef2f2", col: "#dc2626" },
              { label: "Leave",         val: s.L,     bg: "#fffbeb", col: "#d97706" },
            ].map((st, i) => (
              <div key={i} style={{ padding: "18px 20px", background: st.bg, borderRight: i < 3 ? `1px solid ${c.border}` : "none" }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: st.col }}>{st.val}</div>
                <div style={{ fontSize: 12, color: c.sub, fontWeight: 600, marginTop: 2 }}>{st.label}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "12px 24px", borderTop: `1px solid ${c.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: c.sub, marginBottom: 6 }}>
              <span>Attendance Rate</span>
              <span style={{ fontWeight: 800, color: s.pct >= 75 ? "#16a34a" : "#dc2626" }}>{s.pct}%</span>
            </div>
            <div style={{ height: 8, background: "#f1f5f9", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${s.pct}%`, background: s.pct >= 75 ? "#22c55e" : "#ef4444", borderRadius: 8, transition: "width 0.6s" }} />
            </div>
            {s.pct < 75 && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 5, fontWeight: 600 }}>⚠️ Below 75% — attendance shortage</div>}
          </div>
        </div>
        <div style={{ background: c.white, borderRadius: 18, border: `1px solid ${c.border}`, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${c.border}` }}>
            <h4 style={{ margin: 0, fontSize: 14 }}>Detailed Records ({sorted.length})</h4>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                {["DATE","DAY","STATUS"].map(h => (
                  <th key={h} style={{ padding: "12px 18px", textAlign: "left", fontSize: 11, color: c.sub, fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((rec, i) => {
                const st = STATUS[rec.status];
                const { weekday } = fmtDate(rec.date);
                return (
                  <tr key={rec.id} style={{ borderBottom: `1px solid ${c.border}`, background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                    <td style={{ padding: "13px 18px", fontWeight: 700, fontSize: 14 }}>{rec.date}</td>
                    <td style={{ padding: "13px 18px", color: c.sub, fontSize: 13 }}>{weekday}</td>
                    <td style={{ padding: "13px 18px" }}>
                      {st
                        ? <span style={{ background: st.bg, color: st.text, padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>{st.label}</span>
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ── Course Cards ──
  return (
    <div style={{ padding: "24px 20px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: c.dark }}>My Attendance</h1>
          <p style={{ color: c.sub, margin: "4px 0 0", fontSize: 13 }}>{Object.keys(courseMap).length} courses enrolled</p>
        </div>
        <div style={{ position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: 11, top: 10, color: c.sub }} />
          <input placeholder="Search course…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: "9px 12px 9px 34px", borderRadius: 10, border: `1px solid ${c.border}`, outline: "none", fontSize: 13, width: 210 }} />
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
          <BookOpen size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div>No attendance records found.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 16 }}>
          {filteredCourses.map(([key, course]) => {
            const s = cStats(course.records);
            const lastDate = [...course.records].sort((a, b) => b.date?.localeCompare(a.date))[0]?.date;
            return (
              <div key={key} onClick={() => setSC(key)}
                style={{ background: c.white, borderRadius: 18, border: `1.5px solid ${c.border}`, overflow: "hidden", cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}>
                <div style={{ height: 5, background: s.pct >= 75 ? "#22c55e" : s.pct >= 50 ? "#f59e0b" : "#ef4444" }} />
                <div style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: c.dark }}>{course.courseTitle}</h3>
                      <div style={{ fontSize: 12, color: c.sub, marginTop: 2 }}>{course.courseCode} · {course.teacher}</div>
                    </div>
                    <div style={{ fontWeight: 900, fontSize: 22, color: s.pct >= 75 ? "#16a34a" : "#dc2626" }}>{s.pct}%</div>
                  </div>
                  <div style={{ height: 6, background: "#f1f5f9", borderRadius: 6, overflow: "hidden", marginBottom: 12 }}>
                    <div style={{ height: "100%", width: `${s.pct}%`, background: s.pct >= 75 ? "#22c55e" : s.pct >= 50 ? "#f59e0b" : "#ef4444", borderRadius: 6 }} />
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[{k:"P",v:s.P},{k:"A",v:s.A},{k:"L",v:s.L}].map(item => (
                      <span key={item.k} style={{ background: STATUS[item.k].bg, color: STATUS[item.k].text, padding: "3px 9px", borderRadius: 7, fontSize: 11, fontWeight: 800 }}>
                        {item.v} {item.k}
                      </span>
                    ))}
                    <span style={{ background: "#f1f5f9", color: c.sub, padding: "3px 9px", borderRadius: 7, fontSize: 11 }}>{s.total} total</span>
                  </div>
                  {lastDate && (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: c.sub }}>
                      <Clock size={11} /> Last updated: {lastDate}
                    </div>
                  )}
                  {s.pct < 75 && (
                    <div style={{ marginTop: 10, padding: "6px 10px", background: "#fef2f2", borderRadius: 8, fontSize: 11, color: "#dc2626", fontWeight: 700 }}>
                      ⚠️ Below required 75% attendance
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}