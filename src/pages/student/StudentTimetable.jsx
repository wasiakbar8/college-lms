import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { Printer, Clock, MapPin, Calendar, User } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SEMESTERS = [
  "1st Semester", "2nd Semester", "3rd Semester", "4th Semester",
  "5th Semester", "6th Semester", "7th Semester", "8th Semester"
];

// ── Maps short dept IDs (stored in student profiles by AdminStudents.jsx)
//    → full names (stored in timetable by AdminTimetable.jsx)
// AdminStudents saves:  dept: "cs"              (activeDept.id)
// AdminTimetable saves: program: "Computer Science" (full name from DEPARTMENTS array)
const DEPT_MAP = {
  cs:   "Computer Science",
  ir:   "Information Relations",
  edu:  "Education",
  bus:  "Business Administration",
  eng:  "English",
  math: "Mathematics",
};

// ── Maps numeric semester (stored in student profiles) → full string (stored in timetable)
// AdminStudents saves:  sem: 1              (number — activeSem state)
// AdminTimetable saves: semester: "1st Semester" (full string from SEMESTERS array)
const SEM_MAP = {
  1: "1st Semester",
  2: "2nd Semester",
  3: "3rd Semester",
  4: "4th Semester",
  5: "5th Semester",
  6: "6th Semester",
  7: "7th Semester",
  8: "8th Semester",
};

// "cs" → "Computer Science"  |  "Computer Science" → "Computer Science" (passthrough)
function normalizeProgram(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  // Short key lookup (e.g. "cs")
  const byShortKey = DEPT_MAP[trimmed.toLowerCase()];
  if (byShortKey) return byShortKey;
  // Already a full name — case-insensitive match
  const lower = trimmed.toLowerCase();
  const match = Object.values(DEPT_MAP).find(v => v.toLowerCase() === lower);
  return match || trimmed;
}

// 1 or "1" or "1st semester" → "1st Semester"
function normalizeSemester(raw) {
  if (raw === null || raw === undefined) return "1st Semester";
  // Numeric path: covers number 1 and string "1"
  const numKey = Number(raw);
  if (!isNaN(numKey) && SEM_MAP[numKey]) return SEM_MAP[numKey];
  // String path: case-insensitive
  const strKey = String(raw).trim().toLowerCase();
  const semValues = Object.values(SEM_MAP);
  const match = semValues.find(v => v.toLowerCase() === strKey);
  return match || String(raw).trim();
}

export default function StudentTimetable() {
  const { userData } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pick whichever field the student doc uses
  const rawProgram = userData?.program || userData?.dept || userData?.department;
  const rawSem     = userData?.sem ?? userData?.semester;

  const studentProgram = normalizeProgram(rawProgram); // "cs"  → "Computer Science"
  const studentSem     = normalizeSemester(rawSem);     //  1   → "1st Semester"

  const [activeSem, setActiveSem] = useState(studentSem);

  // Re-sync if userData arrives after initial render (async auth)
  useEffect(() => {
    const normalized = normalizeSemester(userData?.sem ?? userData?.semester);
    if (normalized) setActiveSem(normalized);
  }, [userData?.sem, userData?.semester]);

  useEffect(() => {
    if (!studentProgram) {
      console.warn("[Timetable] No program/dept found in student profile.");
      setLoading(false);
      return;
    }

    console.log("[Timetable] Querying: program ==", studentProgram);
    console.log("[Timetable] Semester (normalized):", studentSem);

    const q = query(
      collection(db, "timetable"),
      where("program", "==", studentProgram)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      console.log(`[Timetable] ${data.length} slot(s) found for "${studentProgram}"`);
      setSlots(data);
      setLoading(false);
    }, (error) => {
      console.error("[Timetable] Firestore error:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [studentProgram]);

  // Filter by semester — normalize both sides so "1st Semester" === "1st Semester" always
  const semSlots = useMemo(() => {
    return slots.filter(s =>
      normalizeSemester(s.semester) === normalizeSemester(activeSem)
    );
  }, [slots, activeSem]);

  // Group by day
  const byDay = useMemo(() => {
    const g = {};
    DAYS.forEach(d => {
      g[d] = semSlots
        .filter(s => s.day === d)
        .sort((a, b) => (a.timeSlot || "").localeCompare(b.timeSlot || ""));
    });
    return g;
  }, [semSlots]);

  // ── Loading ──
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #6366f1", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // ── No dept on profile ──
  if (!studentProgram) return (
    <div style={{ textAlign: "center", padding: "80px 20px", background: "#fff", borderRadius: 24, border: "1px solid #e5e7eb", margin: 32 }}>
      <h3 style={{ color: "#ef4444" }}>Profile Incomplete</h3>
      <p style={{ color: "#64748b" }}>No department is assigned to your account. Please contact the admin.</p>
    </div>
  );

  return (
    <div style={{ background: "#f4f6fb", minHeight: "100vh", padding: "32px 20px", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", padding: "24px 28px", borderRadius: 20, border: "1px solid #e5e7eb", marginBottom: 25, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#1e293b" }}>{studentProgram} Timetable</h1>
              <span style={{ background: "#eef2ff", color: "#6366f1", padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                {activeSem}
              </span>
            </div>
            <p style={{ color: "#64748b", margin: 0, fontSize: 14 }}>Class schedule for your department</p>
          </div>
          <button
            onClick={() => window.print()}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: 13, color: "#475569" }}
          >
            <Printer size={16} /> Print PDF
          </button>
        </div>

        {/* Semester Tabs */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 25, scrollbarWidth: "none" }}>
          {SEMESTERS.map(sem => (
            <button
              key={sem}
              onClick={() => setActiveSem(sem)}
              style={{
                padding: "10px 20px", borderRadius: 14, border: "none", cursor: "pointer",
                background: activeSem === sem ? "#6366f1" : "#fff",
                color: activeSem === sem ? "#fff" : "#64748b",
                fontWeight: 700, fontSize: 13, whiteSpace: "nowrap",
                boxShadow: activeSem === sem ? "0 10px 15px -3px rgba(99,102,241,0.3)" : "none",
                transition: "all 0.2s ease",
              }}
            >
              {sem}
            </button>
          ))}
        </div>

        {/* Empty state */}
        {semSlots.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", background: "#fff", borderRadius: 24, border: "1px solid #e5e7eb" }}>
            <div style={{ background: "#f8fafc", width: 60, height: 60, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
              <Calendar size={28} color="#cbd5e1" />
            </div>
            <h3 style={{ margin: "0 0 8px", color: "#1e293b" }}>No Classes Found</h3>
            <p style={{ color: "#94a3b8", margin: 0 }}>
              No schedule set for <strong>{activeSem}</strong> · <strong>{studentProgram}</strong>.
            </p>
            <p style={{ color: "#cbd5e1", margin: "8px 0 0", fontSize: 12 }}>Ask admin to add timetable entries.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 24 }}>
            {DAYS.map(day => {
              const dayCls = byDay[day];
              if (!dayCls?.length) return null;
              return (
                <div key={day}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 15, paddingLeft: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1" }} />
                    <h4 style={{ color: "#1e293b", textTransform: "uppercase", fontSize: 12, letterSpacing: "0.1em", margin: 0, fontWeight: 800 }}>
                      {day}
                    </h4>
                  </div>
                  {dayCls.map(slot => (
                    <div key={slot.id} style={{ background: "#fff", padding: 20, borderRadius: 18, marginBottom: 15, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b", marginBottom: 12, lineHeight: 1.4 }}>
                        {slot.courseName}
                      </div>
                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ background: "#f1f5f9", padding: 6, borderRadius: 8 }}><Clock size={14} color="#6366f1" /></div>
                          <span style={{ fontWeight: 600 }}>{slot.timeSlot}</span>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 15 }}>
                          <div style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ background: "#f1f5f9", padding: 6, borderRadius: 8 }}><MapPin size={14} color="#6366f1" /></div>
                            <span>Room {slot.room}</span>
                          </div>
                          <div style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ background: "#f1f5f9", padding: 6, borderRadius: 8 }}><User size={14} color="#6366f1" /></div>
                            <span>{slot.teacher}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}