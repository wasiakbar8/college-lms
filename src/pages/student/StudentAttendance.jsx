import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { BookOpen, UserCheck, GraduationCap, ChevronDown, ChevronUp, Calendar } from "lucide-react";

const STATUS_CONFIG = {
  P: { label: "Present", color: "#16a34a", bg: "#dcfce7" },
  A: { label: "Absent",  color: "#dc2626", bg: "#fee2e2" },
  L: { label: "Leave",   color: "#d97706", bg: "#fef3c7" },
};

const COURSE_COLORS = [
  { grad: "linear-gradient(135deg, #6366f1, #4338ca)", light: "#eef2ff", accent: "#6366f1" },
  { grad: "linear-gradient(135deg, #0ea5e9, #0369a1)", light: "#e0f2fe", accent: "#0ea5e9" },
  { grad: "linear-gradient(135deg, #10b981, #047857)", light: "#d1fae5", accent: "#10b981" },
  { grad: "linear-gradient(135deg, #f59e0b, #b45309)", light: "#fef3c7", accent: "#f59e0b" },
  { grad: "linear-gradient(135deg, #ef4444, #b91c1c)", light: "#fee2e2", accent: "#ef4444" },
  { grad: "linear-gradient(135deg, #8b5cf6, #6d28d9)", light: "#ede9fe", accent: "#8b5cf6" },
];

function sortLectures(records) {
  return [...records].sort((a, b) => {
    const numA = parseInt((a.lecture || "").replace(/\D/g, "")) || 0;
    const numB = parseInt((b.lecture || "").replace(/\D/g, "")) || 0;
    return numA - numB;
  });
}

function sortMonths(months) {
  return [...months].sort((a, b) => a.localeCompare(b));
}

function formatMonthLabel(monthValue) {
  // monthValue = "2025-01"
  if (!monthValue) return "";
  const [year, month] = monthValue.split("-");
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return d.toLocaleString("default", { month: "long", year: "numeric" });
}

// Short label: "Jan '25"
function shortMonthLabel(monthValue) {
  if (!monthValue) return "";
  const [year, month] = monthValue.split("-");
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return d.toLocaleString("default", { month: "short" }) + " '" + String(year).slice(2);
}

export default function StudentAttendance() {
  const { userData } = useAuth();
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [openCourse, setOpenCourse] = useState(null);
  // selectedMonth per course: { [courseKey]: monthValue }
  const [courseMonths, setCourseMonths] = useState({});

  useEffect(() => {
    if (!userData?.rollNo) return;
    const q = query(
      collection(db, "lectureAttendance"),
      where("rollNo", "==", userData.rollNo)
    );
    const unsub = onSnapshot(q, (snap) => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error("Firestore Error:", err);
      setLoading(false);
    });
    return () => unsub();
  }, [userData]);

  // Build course data grouped by course, then by month inside
  const courseData = useMemo(() => {
    const map = {};
    records.forEach(r => {
      const key = r.courseCode || r.courseTitle || "General";
      if (!map[key]) {
        map[key] = {
          title:    r.courseTitle || key,
          code:     r.courseCode  || key,
          teacher:  r.teacher,
          semester: r.semester,
          byMonth:  {},   // { "2025-01": [records...], ... }
          allRecords: [],
        };
      }
      map[key].allRecords.push(r);

      // Group by month field; fallback: no month field = "unknown"
      const mKey = r.month || "unknown";
      if (!map[key].byMonth[mKey]) map[key].byMonth[mKey] = [];
      map[key].byMonth[mKey].push(r);
    });

    return Object.values(map).map(c => {
      // Overall stats across all months
      const P     = c.allRecords.filter(r => r.status === "P").length;
      const A     = c.allRecords.filter(r => r.status === "A").length;
      const L     = c.allRecords.filter(r => r.status === "L").length;
      const total = P + A + L;

      // Per-month stats
      const monthKeys = sortMonths(Object.keys(c.byMonth));
      const monthStats = {};
      monthKeys.forEach(mk => {
        const recs = c.byMonth[mk];
        const mP = recs.filter(r => r.status === "P").length;
        const mA = recs.filter(r => r.status === "A").length;
        const mL = recs.filter(r => r.status === "L").length;
        const mTotal = mP + mA + mL;
        monthStats[mk] = { P: mP, A: mA, L: mL, total: mTotal, pct: mTotal > 0 ? Math.round((mP / mTotal) * 100) : 0, records: recs };
      });

      return {
        ...c,
        P, A, L, total,
        pct: total > 0 ? Math.round((P / total) * 100) : 0,
        monthKeys,
        monthStats,
      };
    });
  }, [records]);

  // Overall stats
  const overallStats = useMemo(() => {
    const total   = records.length;
    const present = records.filter(r => r.status === "P").length;
    const pct     = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, pct };
  }, [records]);

  // Get selected month for a course (default to latest month)
  const getSelectedMonth = (courseKey, monthKeys) => {
    if (courseMonths[courseKey]) return courseMonths[courseKey];
    if (monthKeys.length > 0) return monthKeys[monthKeys.length - 1]; // latest
    return null;
  };

  if (loading) return (
    <div style={{ padding: 100, textAlign: "center", color: "#6366f1", fontWeight: 600 }}>
      <div style={{ width: 40, height: 40, border: "4px solid #f3f3f3", borderTop: "4px solid #6366f1", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" }} />
      Syncing Attendance Data…
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ padding: "20px", maxWidth: "1100px", margin: "0 auto" }}>

      <style>{`
        .month-tab { transition: all 0.15s; }
        .month-tab:hover { opacity: 0.85; transform: translateY(-1px); }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 25 }}>
        <h2 style={{ margin: 0, fontWeight: 800 }}>Attendance Dashboard</h2>
        <p style={{ color: "#64748b", margin: "4px 0 0" }}>
          {userData.name} · {userData.rollNo}
        </p>
      </div>

      {/* Overall Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 30 }}>
        <div style={{ background: "linear-gradient(135deg, #6366f1, #4338ca)", padding: 24, borderRadius: 24, color: "#fff" }}>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8 }}>OVERALL ATTENDANCE</div>
          <div style={{ fontSize: 36, fontWeight: 900, marginTop: 8 }}>{overallStats.pct}%</div>
          <div style={{ marginTop: 12, height: 6, background: "rgba(255,255,255,0.25)", borderRadius: 99 }}>
            <div style={{ width: `${overallStats.pct}%`, height: "100%", background: "#fff", borderRadius: 99, transition: "width 0.6s" }} />
          </div>
          {overallStats.pct < 75 && (
            <div style={{ marginTop: 10, fontSize: 12, background: "rgba(255,255,255,0.15)", padding: "5px 10px", borderRadius: 8, fontWeight: 700 }}>
              ⚠️ Below 75% minimum
            </div>
          )}
        </div>
        <div style={{ background: "#fff", padding: 24, borderRadius: 24, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>TOTAL LECTURES</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{overallStats.total}</div>
          </div>
          <BookOpen color="#6366f1" />
        </div>
        <div style={{ background: "#fff", padding: 24, borderRadius: 24, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>LECTURES ATTENDED</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#16a34a", marginTop: 4 }}>{overallStats.present}</div>
          </div>
          <UserCheck color="#16a34a" />
        </div>
      </div>

      {/* Course Cards */}
      <h3 style={{ fontWeight: 700, marginBottom: 16, color: "#1e293b" }}>My Courses</h3>

      {courseData.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8", background: "#fff", borderRadius: 20, border: "1px solid #e2e8f0" }}>
          <BookOpen size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontWeight: 600 }}>No attendance records yet.</div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {courseData.map((course, i) => {
          const color    = COURSE_COLORS[i % COURSE_COLORS.length];
          const key      = course.code || course.title;
          const isOpen   = openCourse === key;
          const selMonth = getSelectedMonth(key, course.monthKeys);
          const mStats   = selMonth ? course.monthStats[selMonth] : null;
          const mRecords = mStats ? sortLectures(mStats.records) : [];

          return (
            <div key={key}
              style={{
                borderRadius: 20,
                border: `2px solid ${isOpen ? color.accent : "#e2e8f0"}`,
                overflow: "hidden",
                boxShadow: isOpen ? `0 4px 24px ${color.accent}33` : "none",
                transition: "all 0.25s",
                background: "#fff",
              }}>

              {/* Card Header */}
              <div onClick={() => setOpenCourse(isOpen ? null : key)}
                style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {/* Left gradient */}
                <div style={{ background: color.grad, padding: "20px 24px", display: "flex", alignItems: "center", gap: 14, minWidth: 260 }}>
                  <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 12, padding: 10 }}>
                    <GraduationCap size={20} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
                      {course.code} · {course.semester}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginTop: 2 }}>{course.title}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>{course.teacher}</div>
                  </div>
                </div>
                {/* Right stats (overall) */}
                <div style={{ flex: 1, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: color.light }}>
                  <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>OVERALL</div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: course.pct >= 75 ? "#16a34a" : "#dc2626" }}>
                        {course.pct}%
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 14 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#16a34a" }}>{course.P}</div>
                        <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>Present</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#dc2626" }}>{course.A}</div>
                        <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>Absent</div>
                      </div>
                      {course.L > 0 && (
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "#d97706" }}>{course.L}</div>
                          <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>Leave</div>
                        </div>
                      )}
                    </div>
                    {/* Month count badge */}
                    {course.monthKeys.length > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,0.06)", padding: "5px 10px", borderRadius: 8 }}>
                        <Calendar size={12} color="#64748b" />
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>{course.monthKeys.length} month{course.monthKeys.length > 1 ? "s" : ""}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: color.accent, fontWeight: 700, fontSize: 13 }}>
                    {isOpen ? "Close" : "View Details"}
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
              </div>

              {/* Expanded */}
              {isOpen && (
                <div style={{ borderTop: `2px solid ${color.accent}22` }}>

                  {/* ── MONTH TABS ── */}
                  {course.monthKeys.length > 0 && (
                    <div style={{ padding: "14px 24px 0", background: "#f8fafc", borderBottom: `1px solid #f1f5f9` }}>
                      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 10, letterSpacing: 0.5 }}>
                        SELECT MONTH
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingBottom: 14 }}>
                        {course.monthKeys.map(mk => {
                          const isActive = selMonth === mk;
                          const ms = course.monthStats[mk];
                          return (
                            <button
                              key={mk}
                              className="month-tab"
                              onClick={() => setCourseMonths(prev => ({ ...prev, [key]: mk }))}
                              style={{
                                padding: "8px 14px", borderRadius: 12, border: "none",
                                cursor: "pointer", fontSize: 12, fontWeight: 700,
                                background: isActive ? color.accent : "#fff",
                                color: isActive ? "#fff" : "#475569",
                                boxShadow: isActive ? `0 3px 10px ${color.accent}55` : "0 1px 3px rgba(0,0,0,0.08)",
                                display: "flex", alignItems: "center", gap: 6,
                              }}>
                              <Calendar size={11} />
                              {mk === "unknown" ? "Legacy Records" : shortMonthLabel(mk)}
                              {/* mini pct badge */}
                              <span style={{
                                background: isActive ? "rgba(255,255,255,0.25)" : (ms.pct >= 75 ? "#dcfce7" : "#fee2e2"),
                                color: isActive ? "#fff" : (ms.pct >= 75 ? "#16a34a" : "#dc2626"),
                                padding: "1px 6px", borderRadius: 6, fontSize: 10, fontWeight: 900,
                              }}>
                                {ms.pct}%
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── SELECTED MONTH STATS ── */}
                  {mStats && (
                    <div style={{ padding: "12px 24px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                      {/* Month title */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Calendar size={14} color={color.accent} />
                          <span style={{ fontWeight: 800, fontSize: 14, color: "#1e293b" }}>
                            {selMonth === "unknown" ? "Legacy Records" : formatMonthLabel(selMonth)}
                          </span>
                          <span style={{ fontSize: 12, color: "#64748b" }}>· {mStats.total} lectures</span>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          {[
                            { k: "P", v: mStats.P, label: "Present" },
                            { k: "A", v: mStats.A, label: "Absent" },
                            { k: "L", v: mStats.L, label: "Leave" },
                          ].filter(x => x.v > 0).map(x => (
                            <span key={x.k} style={{ background: STATUS_CONFIG[x.k].bg, color: STATUS_CONFIG[x.k].color, padding: "3px 10px", borderRadius: 7, fontSize: 12, fontWeight: 800 }}>
                              {x.v} {x.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Progress bar for this month */}
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>
                        <span>Monthly Attendance</span>
                        <span style={{ color: mStats.pct >= 75 ? "#16a34a" : "#dc2626" }}>{mStats.pct}%</span>
                      </div>
                      <div style={{ background: "#e2e8f0", borderRadius: 99, height: 8 }}>
                        <div style={{ width: `${mStats.pct}%`, height: "100%", background: color.grad, borderRadius: 99, transition: "width 0.5s" }} />
                      </div>
                      {mStats.pct < 75 && (
                        <div style={{ marginTop: 8, fontSize: 11, color: "#dc2626", fontWeight: 700 }}>
                          ⚠️ Need {Math.max(0, Math.ceil(0.75 * mStats.total) - mStats.P)} more present lectures to reach 75% this month
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── LECTURE BUBBLES for selected month ── */}
                  {mRecords.length > 0 ? (
                    <div style={{ padding: "20px 24px" }}>
                      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 14, letterSpacing: 0.5 }}>
                        LECTURE-WISE RECORD — {selMonth === "unknown" ? "Legacy" : formatMonthLabel(selMonth)}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {mRecords.map(rec => {
                          const st = STATUS_CONFIG[rec.status];
                          return (
                            <div key={rec.id}
                              title={`${rec.lecture} — ${st?.label}`}
                              style={{
                                width: 58, textAlign: "center",
                                padding: "10px 0 8px", borderRadius: 12,
                                background: st?.bg || "#f1f5f9",
                                border: `1.5px solid ${st?.color || "#e2e8f0"}55`,
                              }}>
                              <div style={{ fontSize: 10, color: st?.color || "#94a3b8", fontWeight: 700 }}>
                                {rec.lecture}
                              </div>
                              <div style={{ fontSize: 18, fontWeight: 900, color: st?.color || "#cbd5e1", marginTop: 3 }}>
                                {rec.status || "—"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: "30px 24px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                      No records for this month.
                    </div>
                  )}

                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}