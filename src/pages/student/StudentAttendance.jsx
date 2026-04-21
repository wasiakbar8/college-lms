import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { Calendar, User, BookOpen, UserCheck, GraduationCap, ChevronDown, ChevronUp } from "lucide-react";

const STATUS_CONFIG = {
  P: { label: "Present", color: "#16a34a", bg: "#dcfce7" },
  A: { label: "Absent", color: "#dc2626", bg: "#fee2e2" },
  L: { label: "Leave", color: "#d97706", bg: "#fef3c7" },
};

const COURSE_COLORS = [
  { grad: "linear-gradient(135deg, #6366f1, #4338ca)", light: "#eef2ff", accent: "#6366f1" },
  { grad: "linear-gradient(135deg, #0ea5e9, #0369a1)", light: "#e0f2fe", accent: "#0ea5e9" },
  { grad: "linear-gradient(135deg, #10b981, #047857)", light: "#d1fae5", accent: "#10b981" },
  { grad: "linear-gradient(135deg, #f59e0b, #b45309)", light: "#fef3c7", accent: "#f59e0b" },
  { grad: "linear-gradient(135deg, #ef4444, #b91c1c)", light: "#fee2e2", accent: "#ef4444" },
  { grad: "linear-gradient(135deg, #8b5cf6, #6d28d9)", light: "#ede9fe", accent: "#8b5cf6" },
];

export default function StudentAttendance() {
  const { userData } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCourse, setOpenCourse] = useState(null);

  useEffect(() => {
    if (!userData?.rollNo) return;

    const q = query(
      collection(db, "dailyAttendance"),
      where("rollNo", "==", userData.rollNo)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecords(sorted);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [userData]);

  const overallStats = useMemo(() => {
    const total = records.length;
    const present = records.filter(r => r.status === "P").length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, percentage };
  }, [records]);

  const courseData = useMemo(() => {
    const map = {};
    records.forEach(r => {
      const course = r.courseTitle || "General Class";
      if (!map[course]) map[course] = { total: 0, present: 0, absent: 0, leave: 0, records: [] };
      map[course].total++;
      if (r.status === "P") map[course].present++;
      if (r.status === "A") map[course].absent++;
      if (r.status === "L") map[course].leave++;
      map[course].records.push(r);
    });
    return Object.entries(map).map(([title, s]) => ({
      title,
      ...s,
      percentage: Math.round((s.present / s.total) * 100),
    }));
  }, [records]);

  if (loading) return (
    <div style={{ padding: 100, textAlign: "center", color: "#6366f1", fontWeight: 600 }}>
      <div style={{ width: 40, height: 40, border: "4px solid #f3f3f3", borderTop: "4px solid #6366f1", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" }}></div>
      Syncing Attendance Data...
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ padding: "20px", maxWidth: "1100px", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 25 }}>
        <h2 style={{ margin: 0, fontWeight: 800 }}>Attendance Dashboard</h2>
        <p style={{ color: "#64748b", margin: "4px 0 0" }}>Logged in as: {userData.name} ({userData.rollNo})</p>
      </div>

      {/* Overall Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 30 }}>
        <div style={{ background: "linear-gradient(135deg, #6366f1, #4338ca)", padding: 24, borderRadius: 24, color: "#fff" }}>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8 }}>OVERALL ATTENDANCE</div>
          <div style={{ fontSize: 36, fontWeight: 900, marginTop: 8 }}>{overallStats.percentage}%</div>
        </div>
        <div style={{ background: "#fff", padding: 24, borderRadius: 24, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>TOTAL CLASSES</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{overallStats.total}</div>
          </div>
          <BookOpen color="#6366f1" />
        </div>
        <div style={{ background: "#fff", padding: 24, borderRadius: 24, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>PRESENT DAYS</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#16a34a", marginTop: 4 }}>{overallStats.present}</div>
          </div>
          <UserCheck color="#16a34a" />
        </div>
      </div>

      {/* Course Cards */}
      <h3 style={{ fontWeight: 700, marginBottom: 16, color: "#1e293b" }}>My Courses</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {courseData.map((course, i) => {
          const color = COURSE_COLORS[i % COURSE_COLORS.length];
          const isOpen = openCourse === course.title;

          return (
            <div
              key={course.title}
              style={{
                borderRadius: 20,
                border: `2px solid ${isOpen ? color.accent : "#e2e8f0"}`,
                overflow: "hidden",
                boxShadow: isOpen ? `0 4px 24px ${color.accent}33` : "none",
                transition: "all 0.25s",
                background: "#fff",
              }}
            >
              {/* Card Header — always visible, click to toggle */}
              <div
                onClick={() => setOpenCourse(isOpen ? null : course.title)}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0",
                }}
              >
                {/* Left: gradient section */}
                <div style={{ background: color.grad, padding: "20px 24px", display: "flex", alignItems: "center", gap: 14, minWidth: 260 }}>
                  <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 12, padding: 10 }}>
                    <GraduationCap size={20} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>COURSE</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginTop: 2 }}>{course.title}</div>
                  </div>
                </div>

                {/* Right: stats */}
                <div style={{ flex: 1, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: color.light }}>
                  <div style={{ display: "flex", gap: 32 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>ATTENDANCE</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: "#1e293b" }}>{course.percentage}%</div>
                    </div>
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#16a34a" }}>{course.present}</div>
                        <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>Present</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#dc2626" }}>{course.absent}</div>
                        <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>Absent</div>
                      </div>
                      {course.leave > 0 && (
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "#d97706" }}>{course.leave}</div>
                          <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>Leave</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: color.accent, fontWeight: 700, fontSize: 13 }}>
                    {isOpen ? "Close" : "View Details"}
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
              </div>

              {/* Expanded: date-wise records */}
              {isOpen && (
                <div style={{ borderTop: `2px solid ${color.accent}22` }}>
                  {/* Progress bar */}
                  <div style={{ padding: "12px 24px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>
                      <span>Attendance Progress</span>
                      <span>{course.present}/{course.total} classes</span>
                    </div>
                    <div style={{ background: "#e2e8f0", borderRadius: 99, height: 8 }}>
                      <div style={{ width: `${course.percentage}%`, height: "100%", background: color.grad, borderRadius: 99, transition: "width 0.5s" }} />
                    </div>
                  </div>

                  {/* Date rows */}
                  {course.records.map((record, idx) => (
                    <div
                      key={record.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 24px",
                        borderTop: idx === 0 ? "none" : "1px solid #f1f5f9",
                        background: idx % 2 === 0 ? "#fff" : "#fafafa",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ background: color.light, padding: 8, borderRadius: 10 }}>
                          <Calendar size={16} color={color.accent} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{record.date}</div>
                          <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                            <User size={11} /> {record.teacher}
                          </div>
                        </div>
                      </div>
                      <span style={{
                        padding: "5px 16px",
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 800,
                        background: STATUS_CONFIG[record.status]?.bg,
                        color: STATUS_CONFIG[record.status]?.color,
                      }}>
                        {STATUS_CONFIG[record.status]?.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}