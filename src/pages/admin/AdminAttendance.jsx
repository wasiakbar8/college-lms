import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  collection, onSnapshot, setDoc, doc,
  getDocs, query, where,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { toast, Toaster } from "react-hot-toast";
import {
  ArrowLeft, Search, ChevronRight, CheckSquare,
  ChevronDown, Calendar, RefreshCw, Edit3,
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

const LECTURE_COUNT = 12;
const LECTURES = Array.from({ length: LECTURE_COUNT }, (_, i) => `L${i + 1}`);

const STATUS = {
  P: { label: "Present", bg: "#dcfce7", text: "#16a34a", dot: "#22c55e" },
  A: { label: "Absent",  bg: "#fee2e2", text: "#dc2626", dot: "#ef4444" },
  L: { label: "Leave",   bg: "#fef3c7", text: "#d97706", dot: "#f59e0b" },
};

// ── Generate month options ────────────────────────────────────────────────────
function generateMonthOptions() {
  const months = [];
  const now = new Date();
  for (let i = -24; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const label = d.toLocaleString("default", { month: "long", year: "numeric" });
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ label, value });
  }
  return months;
}

const MONTH_OPTIONS = generateMonthOptions();

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ── Cell Popover ──────────────────────────────────────────────────────────────
function CellPopover({ anchor, current, onPick, onClose }) {
  const ref = React.useRef();
  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  if (!anchor) return null;
  const left = Math.min(anchor.left + anchor.width / 2 - 70, window.innerWidth - 160);
  const top  = anchor.bottom + 6;
  return (
    <div ref={ref} style={{
      position: "fixed", left, top, zIndex: 9999,
      background: "#fff", borderRadius: 12, border: `1.5px solid ${c.border}`,
      boxShadow: "0 10px 30px rgba(0,0,0,0.15)", overflow: "hidden", minWidth: 140,
      animation: "popIn 0.12s ease",
    }}>
      {Object.entries(STATUS).map(([key, val]) => (
        <button key={key} onClick={() => onPick(key)}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "10px 14px", border: "none",
            background: current === key ? val.bg : "transparent",
            cursor: "pointer", fontSize: 13,
            fontWeight: current === key ? 800 : 600,
            color: current === key ? val.text : c.dark,
          }}
          onMouseEnter={e => { if (current !== key) e.currentTarget.style.background = "#f8fafc"; }}
          onMouseLeave={e => { if (current !== key) e.currentTarget.style.background = "transparent"; }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: val.dot, flexShrink: 0, display: "inline-block" }} />
          {val.label}
          {current === key && <span style={{ marginLeft: "auto", fontSize: 11 }}>✓</span>}
        </button>
      ))}
      {current && (
        <button onClick={() => onPick(null)}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: "9px 14px", border: "none", borderTop: `1px solid ${c.border}`,
            background: "transparent", cursor: "pointer", fontSize: 12, color: "#94a3b8", fontWeight: 600,
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          × Clear
        </button>
      )}
    </div>
  );
}

const c = {
  primary: "#4f46e5", primaryLight: "#eef2ff",
  sub: "#64748b", border: "#e2e8f0",
  bg: "#f8fafc", white: "#ffffff", dark: "#0f172a",
  surface: "#f1f5f9",
  edit: "#f59e0b", editLight: "#fef3c7",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
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

function studentStats(row) {
  const vals = Object.values(row);
  const P = vals.filter(v => v === "P").length;
  const A = vals.filter(v => v === "A").length;
  const L = vals.filter(v => v === "L").length;
  const total = P + A + L;
  return { P, A, L, total, pct: total > 0 ? Math.round((P / total) * 100) : null };
}

function monthLabel(value) {
  const found = MONTH_OPTIONS.find(m => m.value === value);
  return found ? found.label : value;
}

// ─────────────────────────────────────────────────────────────────────────────
//  ADMIN ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminAttendance() {
  const [view, setView]             = useState("depts");
  const [activeDept, setActiveDept] = useState(null);
  const [activeSem, setActiveSem]   = useState("1st Semester");
  const [students, setStudents]     = useState([]);
  const [courses,  setCourses]      = useState([]);
  const [loading,  setLoading]      = useState(true);
  const [search,   setSearch]       = useState("");

  // Month selector
  const [selectedMonth, setSelectedMonth]     = useState(currentMonthValue());
  const [monthDropOpen, setMonthDropOpen]     = useState(false);

  // Course selector
  const [selectedCourse,  setSelectedCourse]  = useState(null);
  const [courseDropOpen,  setCourseDropOpen]   = useState(false);

  // attendance[studentId][lecture] = status
  const [attendance, setAttendance]   = useState({});
  const [saving,     setSaving]       = useState(false);

  // ── NEW: edit mode state ──────────────────────────────────────────────────
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [isEditMode,      setIsEditMode]      = useState(false);
  // Track which cells were changed from the loaded value
  const [originalAttendance, setOriginalAttendance] = useState({});

  // Cell popover
  const [popover, setPopover] = useState(null);

  // Load students
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "students"), snap => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Load courses when dept/sem changes
  useEffect(() => {
    if (!activeDept || !activeSem) return;
    setCourses([]);
    setSelectedCourse(null);
    setAttendance({});
    setOriginalAttendance({});
    setIsEditMode(false);
    const q = query(
      collection(db, "courses"),
      where("program",  "==", activeDept.name),
      where("semester", "==", activeSem)
    );
    getDocs(q).then(snap => setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [activeDept, activeSem]);

  // ── NEW: Load existing attendance when course OR month changes ─────────────
  const loadExistingAttendance = useCallback(async (course, month, studentsToLoad) => {
    if (!course || !month || studentsToLoad.length === 0) {
      setAttendance({});
      setOriginalAttendance({});
      setIsEditMode(false);
      return;
    }

    setLoadingExisting(true);
    try {
      const q = query(
        collection(db, "lectureAttendance"),
        where("courseCode", "==", course.courseId),
        where("month",      "==", month)
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => d.data());

      if (docs.length === 0) {
        // No existing records — fresh entry
        setAttendance({});
        setOriginalAttendance({});
        setIsEditMode(false);
        setLoadingExisting(false);
        return;
      }

      // Build attendance map: { [studentId]: { L1: "P", L2: "A", ... } }
      const loaded = {};
      docs.forEach(record => {
        // Match record to student by rollNo
        const student = studentsToLoad.find(
          s => (s.rollNo || s.roll_no || s.id) === record.rollNo
        );
        if (!student) return;
        if (!loaded[student.id]) loaded[student.id] = {};
        if (record.lecture && record.status) {
          loaded[student.id][record.lecture] = record.status;
        }
      });

      setAttendance(loaded);
      // Deep clone for change tracking
      setOriginalAttendance(JSON.parse(JSON.stringify(loaded)));
      setIsEditMode(true);
    } catch (err) {
      console.error("Error loading existing attendance:", err);
      toast.error("Could not load existing records: " + err.message);
    }
    setLoadingExisting(false);
  }, []);

  // Trigger load whenever course or month changes (while in student view)
  useEffect(() => {
    if (view !== "students" || !selectedCourse || !selectedMonth) {
      setAttendance({});
      setOriginalAttendance({});
      setIsEditMode(false);
      return;
    }
    loadExistingAttendance(selectedCourse, selectedMonth, filteredStudents);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourse, selectedMonth]);

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

  // ── Track changed cells ───────────────────────────────────────────────────
  const changedCells = useMemo(() => {
    if (!isEditMode) return 0;
    let count = 0;
    filteredStudents.forEach(s => {
      const current  = attendance[s.id] || {};
      const original = originalAttendance[s.id] || {};
      LECTURES.forEach(lec => {
        if (current[lec] !== original[lec]) count++;
      });
    });
    return count;
  }, [attendance, originalAttendance, isEditMode, filteredStudents]);

  const openCellPopover = (studentId, lecture, e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover(prev =>
      prev?.studentId === studentId && prev?.lecture === lecture ? null : { studentId, lecture, rect }
    );
  };

  const pickCellStatus = (status) => {
    if (!popover) return;
    const { studentId, lecture } = popover;
    setAttendance(prev => {
      const row = { ...(prev[studentId] || {}) };
      if (status === null) delete row[lecture];
      else row[lecture] = status;
      return { ...prev, [studentId]: row };
    });
    setPopover(null);
  };

  const markColumn = (lecture, status) => {
    setAttendance(prev => {
      const next = { ...prev };
      filteredStudents.forEach(s => {
        const row = { ...(next[s.id] || {}) };
        if (status === null) delete row[lecture];
        else row[lecture] = status;
        next[s.id] = row;
      });
      return next;
    });
  };

  const markRow = (studentId, status) => {
    setAttendance(prev => {
      const row = {};
      if (status !== null) LECTURES.forEach(l => { row[l] = status; });
      return { ...prev, [studentId]: row };
    });
  };

  const totalMarked = useMemo(() => {
    let count = 0;
    Object.values(attendance).forEach(row => { count += Object.values(row).filter(Boolean).length; });
    return count;
  }, [attendance]);

  // ── Reset to loaded data ──────────────────────────────────────────────────
  const resetToOriginal = () => {
    setAttendance(JSON.parse(JSON.stringify(originalAttendance)));
    toast("Reset to previously saved attendance", { icon: "↩️" });
  };

  const handleSubmit = async () => {
    if (!selectedCourse)  { toast.error("Select a course first");  return; }
    if (!selectedMonth)   { toast.error("Select a month first");   return; }
    if (totalMarked === 0){ toast.error("Mark at least one cell"); return; }
    setSaving(true);
    try {
      const writes = [];
      filteredStudents.forEach(student => {
        const rollNo = student.rollNo || student.roll_no || student.id;
        const row    = attendance[student.id] || {};
        LECTURES.forEach(lecture => {
          const status = row[lecture];
          if (!status) return;
          const docId = `${selectedMonth}_${lecture}_${rollNo}_${selectedCourse.courseId}`;
          writes.push(setDoc(doc(db, "lectureAttendance", docId), {
            courseTitle:  selectedCourse.title,
            courseCode:   selectedCourse.courseId,
            teacher:      selectedCourse.teacher,
            studentName:  student.name,
            rollNo:       rollNo,
            dept:         activeDept.id,
            semester:     activeSem,
            lecture,
            month:        selectedMonth,
            monthLabel:   monthLabel(selectedMonth),
            status,
            timestamp:    new Date().toISOString(),
          }));
        });
      });
      if (writes.length === 0) { toast.error("Nothing to save"); setSaving(false); return; }
      await Promise.all(writes);

      const msg = isEditMode
        ? `✅ Updated ${writes.length} records for ${selectedCourse.title} — ${monthLabel(selectedMonth)}!`
        : `✅ Saved ${writes.length} records for ${selectedCourse.title} — ${monthLabel(selectedMonth)}!`;
      toast.success(msg);

      // After save, update original so change tracking resets
      setOriginalAttendance(JSON.parse(JSON.stringify(attendance)));
      setIsEditMode(true);
    } catch (e) {
      console.error("Submit error:", e);
      toast.error("Save failed: " + e.message);
    }
    setSaving(false);
  };

  // ── VIEW: Departments ─────────────────────────────────────────────────────
  if (view === "depts") return (
    <div style={{ minHeight: "100vh", background: c.bg, padding: "40px 24px" }}>
      <Toaster position="top-right" />
      <div style={{ maxWidth: 1050, margin: "0 auto" }}>
        <div style={{ marginBottom: 36 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: c.dark, margin: 0 }}>Attendance Management</h1>
          <p style={{ color: c.sub, marginTop: 6 }}>Select a department to mark attendance.</p>
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
                Mark Attendance <ChevronRight size={14} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── VIEW: Students + Lecture Grid ─────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: c.bg, padding: "24px 16px" }}>
      <Toaster position="top-right" />

      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: translateY(-5px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse {
          0%,100% { opacity:1; } 50% { opacity:0.6; }
        }
        .lec-cell { transition: all 0.12s; }
        .lec-cell:hover { filter: brightness(0.92); transform: scale(1.07); }
        .lec-cell:active { transform: scale(0.96); }
        .cell-changed { outline: 2px solid #f59e0b !important; outline-offset: 1px; }
      `}</style>

      {popover && (
        <CellPopover
          anchor={popover.rect}
          current={(attendance[popover.studentId] || {})[popover.lecture]}
          onPick={pickCellStatus}
          onClose={() => setPopover(null)}
        />
      )}

      <div style={{ maxWidth: 1400, margin: "0 auto" }}>

        {/* Back */}
        <button onClick={() => setView("depts")}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: c.primary, cursor: "pointer", fontWeight: 700, marginBottom: 18, fontSize: 14 }}>
          <ArrowLeft size={16} /> Back to Departments
        </button>

        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{activeDept.icon} {activeDept.name}</h1>
            <p style={{ color: c.sub, margin: "4px 0 0" }}>
              <strong>{activeSem}</strong> · {filteredStudents.length} students
            </p>
          </div>
          {/* Semester pills */}
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

        {/* ── MONTH SELECTOR ── */}
        <div style={{
          background: c.white, borderRadius: 16,
          border: `1.5px solid ${selectedMonth ? "#f59e0b66" : c.border}`,
          padding: "16px 22px", marginBottom: 14,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Calendar size={16} color="#f59e0b" />
              <span style={{ fontSize: 12, color: c.sub, fontWeight: 700, whiteSpace: "nowrap" }}>MONTH</span>
            </div>

            <div style={{ position: "relative", minWidth: 240 }}>
              <button onClick={() => setMonthDropOpen(o => !o)}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  border: `1.5px solid ${monthDropOpen ? "#f59e0b" : c.border}`,
                  background: "#fff", cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  fontSize: 14, fontWeight: selectedMonth ? 700 : 400,
                  color: selectedMonth ? c.dark : "#94a3b8",
                }}>
                <span>{selectedMonth ? monthLabel(selectedMonth) : "Select month…"}</span>
                <ChevronDown size={15} style={{ color: c.sub, transform: monthDropOpen ? "rotate(180deg)" : "none", transition: "0.2s" }} />
              </button>

              {monthDropOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 400,
                  background: "#fff", borderRadius: 12, border: `1.5px solid ${c.border}`,
                  boxShadow: "0 12px 32px rgba(0,0,0,0.12)", overflow: "hidden",
                  maxHeight: 280, overflowY: "auto",
                }}>
                  {MONTH_OPTIONS.map((opt, idx) => (
                    <button key={opt.value} onClick={() => { setSelectedMonth(opt.value); setMonthDropOpen(false); }}
                      style={{
                        width: "100%", padding: "11px 16px", border: "none",
                        background: selectedMonth === opt.value ? "#fef3c7" : "#fff",
                        cursor: "pointer", textAlign: "left",
                        borderBottom: idx < MONTH_OPTIONS.length - 1 ? `1px solid ${c.border}` : "none",
                        fontSize: 13, fontWeight: selectedMonth === opt.value ? 800 : 500,
                        color: selectedMonth === opt.value ? "#92400e" : c.dark,
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => { if (selectedMonth !== opt.value) e.currentTarget.style.background = "#f8fafc"; }}
                      onMouseLeave={e => { if (selectedMonth !== opt.value) e.currentTarget.style.background = "#fff"; }}>
                      {opt.label}
                      {selectedMonth === opt.value && <span style={{ float: "right", color: "#f59e0b" }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedMonth && (
              <span style={{ background: "#fef3c7", color: "#92400e", padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                📅 {monthLabel(selectedMonth)} · L1–L{LECTURE_COUNT}
              </span>
            )}
          </div>
        </div>

        {/* ── COURSE SELECTOR ── */}
        <div style={{ background: c.white, borderRadius: 16, border: `1.5px solid ${selectedCourse ? c.primary + "66" : c.border}`, padding: "16px 22px", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: c.sub, fontWeight: 700, whiteSpace: "nowrap" }}>COURSE</span>

            {courses.length === 0 ? (
              <div style={{ fontSize: 13, color: "#92400e", background: "#fffbeb", padding: "8px 14px", borderRadius: 10, border: "1px solid #fde68a" }}>
                ⚠️ No courses found for {activeDept?.name} — {activeSem}
              </div>
            ) : (
              <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
                <button onClick={() => setCourseDropOpen(o => !o)}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10,
                    border: `1.5px solid ${courseDropOpen ? c.primary : c.border}`,
                    background: "#fff", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
                    fontSize: 14, fontWeight: selectedCourse ? 700 : 400,
                    color: selectedCourse ? c.dark : "#94a3b8",
                  }}>
                  <span>
                    {selectedCourse ? `${selectedCourse.title}  ·  ${selectedCourse.courseId}` : "Choose a course…"}
                  </span>
                  <ChevronDown size={15} style={{ color: c.sub, transform: courseDropOpen ? "rotate(180deg)" : "none", transition: "0.2s" }} />
                </button>

                {courseDropOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 300,
                    background: "#fff", borderRadius: 12, border: `1.5px solid ${c.border}`,
                    boxShadow: "0 12px 32px rgba(0,0,0,0.12)", overflow: "hidden",
                  }}>
                    {courses.map((course, idx) => (
                      <button key={course.id} onClick={() => { setSelectedCourse(course); setCourseDropOpen(false); }}
                        style={{
                          width: "100%", padding: "12px 16px", border: "none",
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
                            {course.courseId} · {course.teacher} · {course.creditHours} Cr · {course.type}
                          </div>
                        </div>
                        {selectedCourse?.id === course.id && <span style={{ color: c.primary, fontWeight: 900 }}>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedCourse && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { label: "Teacher", val: selectedCourse.teacher },
                  { label: "Credits", val: `${selectedCourse.creditHours} hrs` },
                  { label: "Type",    val: selectedCourse.type },
                ].map(item => (
                  <span key={item.label} style={{ background: c.primaryLight, color: c.primary, padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                    {item.label}: {item.val}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── EDIT MODE BANNER ── */}
        {loadingExisting && (
          <div style={{
            background: "#f8fafc", border: `1.5px solid ${c.border}`,
            borderRadius: 14, padding: "14px 20px", marginBottom: 14,
            display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: c.sub,
          }}>
            <RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Loading existing attendance records…
          </div>
        )}

        {!loadingExisting && isEditMode && (
          <div style={{
            background: c.editLight,
            border: `1.5px solid ${c.edit}66`,
            borderRadius: 14, padding: "14px 20px", marginBottom: 14,
            display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Edit3 size={16} color={c.edit} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>
                Edit Mode — Attendance already saved for {monthLabel(selectedMonth)}
              </span>
              {changedCells > 0 && (
                <span style={{ background: c.edit, color: "#fff", padding: "2px 9px", borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                  {changedCells} change{changedCells !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <button onClick={resetToOriginal}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, border: `1.5px solid ${c.edit}`, background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#92400e" }}>
              <RefreshCw size={13} /> Reset to Saved
            </button>
          </div>
        )}

        {!loadingExisting && !isEditMode && selectedCourse && selectedMonth && (
          <div style={{
            background: "#f0fdf4", border: "1.5px solid #86efac",
            borderRadius: 14, padding: "12px 20px", marginBottom: 14,
            fontSize: 13, color: "#166534", fontWeight: 600,
          }}>
            ✨ New attendance — no records found for {selectedCourse?.title} in {monthLabel(selectedMonth)}.
          </div>
        )}

        {/* ── LEGEND + SEARCH ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: c.sub, fontWeight: 700 }}>Click cell to mark:</span>
            {Object.entries(STATUS).map(([k, v]) => (
              <span key={k} style={{ background: v.bg, color: v.text, padding: "3px 10px", borderRadius: 7, fontSize: 12, fontWeight: 800 }}>
                {v.label}
              </span>
            ))}
            {isEditMode && (
              <span style={{ background: "#fef3c7", color: "#92400e", padding: "3px 10px", borderRadius: 7, fontSize: 12, fontWeight: 800, border: "1.5px solid #f59e0b" }}>
                🟡 = edited cell
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: c.sub, fontWeight: 700 }}>{totalMarked} cells marked</span>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: 9, color: c.sub }} />
              <input placeholder="Search student…" value={search} onChange={e => setSearch(e.target.value)}
                style={{ width: 200, padding: "7px 12px 7px 30px", borderRadius: 10, border: `1px solid ${c.border}`, outline: "none", fontSize: 13 }} />
            </div>
          </div>
        </div>

        {/* ── GRID TABLE ── */}
        <div style={{ background: c.white, borderRadius: 18, border: `1px solid ${c.border}`, overflow: "auto", marginBottom: 20 }}>
          {filteredStudents.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>No students found.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: `2px solid ${c.border}` }}>
                  <th style={{ padding: "12px 18px", textAlign: "left", fontSize: 11, color: c.sub, fontWeight: 700, whiteSpace: "nowrap", position: "sticky", left: 0, background: "#f8fafc", zIndex: 10 }}>
                    STUDENT
                  </th>
                  {LECTURES.map(lec => (
                    <th key={lec} style={{ padding: "8px 4px", textAlign: "center", minWidth: 52 }}>
                      <div style={{ fontSize: 11, color: c.sub, fontWeight: 700, marginBottom: 5 }}>{lec}</div>
                      <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
                        {Object.entries(STATUS).map(([k, v]) => (
                          <button key={k} onClick={() => markColumn(lec, k)}
                            title={`Mark all ${v.label} for ${lec}`}
                            style={{ width: 14, height: 14, borderRadius: 3, border: "none", background: v.dot, cursor: "pointer", fontSize: 8, color: "#fff", fontWeight: 900, lineHeight: "14px", padding: 0 }}>
                            {k}
                          </button>
                        ))}
                      </div>
                    </th>
                  ))}
                  <th style={{ padding: "12px 14px", textAlign: "center", fontSize: 11, color: c.sub, fontWeight: 700, whiteSpace: "nowrap" }}>STATS</th>
                  <th style={{ padding: "12px 10px", textAlign: "center", fontSize: 11, color: c.sub, fontWeight: 700, whiteSpace: "nowrap" }}>QUICK</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, i) => {
                  const row   = attendance[student.id] || {};
                  const origRow = originalAttendance[student.id] || {};
                  const stats = studentStats(row);
                  return (
                    <tr key={student.id} style={{ borderBottom: `1px solid ${c.border}`, background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                      <td style={{ padding: "10px 18px", position: "sticky", left: 0, background: i % 2 === 0 ? "#fff" : "#fafbfc", zIndex: 5, whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: activeDept.bg, color: activeDept.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                            {student.name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: c.dark }}>{student.name}</div>
                            <div style={{ fontSize: 11, color: c.sub }}>{student.rollNo}</div>
                          </div>
                        </div>
                      </td>
                      {LECTURES.map(lec => {
                        const status  = row[lec];
                        const origSt  = origRow[lec];
                        const st      = STATUS[status] || null;
                        // A cell is "changed" if it differs from what was loaded
                        const isChanged = isEditMode && status !== origSt;
                        return (
                          <td key={lec} style={{ padding: "6px 4px", textAlign: "center" }}>
                            <button
                              className={`lec-cell${isChanged ? " cell-changed" : ""}`}
                              onClick={(e) => openCellPopover(student.id, lec, e)}
                              title={`${student.name} · ${lec}${isChanged ? ` (was: ${origSt || "—"})` : ""}`}
                              style={{
                                width: 44, height: 36, borderRadius: 9,
                                border: `1.5px solid ${isChanged ? "#f59e0b" : (st ? st.text + "66" : c.border)}`,
                                background: st ? st.bg : "#f8fafc",
                                cursor: "pointer", fontWeight: 900, fontSize: 13,
                                color: st ? st.text : "#cbd5e1",
                                display: "inline-flex", alignItems: "center", justifyContent: "center",
                                position: "relative",
                              }}>
                              {status || "·"}
                              {/* Small dot indicator on changed cells */}
                              {isChanged && (
                                <span style={{
                                  position: "absolute", top: 2, right: 2,
                                  width: 5, height: 5, borderRadius: "50%",
                                  background: "#f59e0b",
                                }} />
                              )}
                            </button>
                          </td>
                        );
                      })}
                      <td style={{ padding: "6px 14px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                          {stats.total > 0 ? (
                            <>
                              {stats.P > 0 && <span style={{ background: STATUS.P.bg, color: STATUS.P.text, padding: "2px 7px", borderRadius: 6, fontSize: 11, fontWeight: 800 }}>{stats.P}P</span>}
                              {stats.A > 0 && <span style={{ background: STATUS.A.bg, color: STATUS.A.text, padding: "2px 7px", borderRadius: 6, fontSize: 11, fontWeight: 800 }}>{stats.A}A</span>}
                              {stats.L > 0 && <span style={{ background: STATUS.L.bg, color: STATUS.L.text, padding: "2px 7px", borderRadius: 6, fontSize: 11, fontWeight: 800 }}>{stats.L}L</span>}
                              {stats.pct !== null && (
                                <span style={{ background: stats.pct >= 75 ? "#dcfce7" : "#fee2e2", color: stats.pct >= 75 ? "#16a34a" : "#dc2626", padding: "2px 7px", borderRadius: 6, fontSize: 11, fontWeight: 800 }}>
                                  {stats.pct}%
                                </span>
                              )}
                            </>
                          ) : <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>}
                        </div>
                      </td>
                      <td style={{ padding: "6px 10px" }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                          {Object.entries(STATUS).map(([k, v]) => (
                            <button key={k} onClick={() => markRow(student.id, k)}
                              style={{ padding: "3px 7px", borderRadius: 7, border: "none", background: v.bg, color: v.text, cursor: "pointer", fontSize: 11, fontWeight: 800 }}>
                              {k}
                            </button>
                          ))}
                          <button onClick={() => markRow(student.id, null)}
                            style={{ padding: "3px 7px", borderRadius: 7, border: "none", background: c.surface, color: c.sub, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 40 }}>
          <button onClick={() => setAttendance({})}
            style={{ padding: "12px 22px", borderRadius: 12, border: `1.5px solid ${c.border}`, background: "none", fontWeight: 700, cursor: "pointer", fontSize: 14, color: c.sub }}>
            Clear All
          </button>
          <button onClick={handleSubmit} disabled={saving || !selectedCourse || !selectedMonth}
            style={{
              background: (!selectedCourse || !selectedMonth || saving)
                ? "#a5b4fc"
                : isEditMode ? "#d97706" : c.primary,
              color: "#fff", border: "none", padding: "12px 28px", borderRadius: 12,
              fontSize: 14, fontWeight: 800,
              cursor: (!selectedCourse || !selectedMonth || saving) ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 8,
              boxShadow: (selectedCourse && selectedMonth && !saving)
                ? isEditMode
                  ? "0 4px 14px rgba(217,119,6,0.35)"
                  : "0 4px 14px rgba(79,70,229,0.35)"
                : "none",
              transition: "all 0.2s",
            }}>
            <CheckSquare size={16} />
            {saving
              ? "Saving…"
              : isEditMode
                ? `Update Attendance (${changedCells} change${changedCells !== 1 ? "s" : ""})`
                : `Submit Attendance (${totalMarked} cells)`}
          </button>
        </div>

      </div>
    </div>
  );
}