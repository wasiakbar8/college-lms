import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function StudentDashboard() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ attendance: 0, courses: 0, cgpa: 0, feeDue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData) return;
    async function load() {
      try {
        const [attSnap, courseSnap, feeSnap, resultSnap] = await Promise.all([
          getDocs(query(collection(db, "attendance"), where("rollNo", "==", userData.rollNo))),
          getDocs(query(collection(db, "courses"), where("program", "==", userData.program))),
          getDocs(query(collection(db, "fees"), where("rollNo", "==", userData.rollNo))),
          getDocs(query(collection(db, "results"), where("rollNo", "==", userData.rollNo))),
        ]);
        const attData = attSnap.docs.map(d => d.data());
        const totalPresent = attData.reduce((a, b) => a + (b.present || 0), 0);
        const totalLectures = attData.reduce((a, b) => a + (b.lectures || 0), 0);
        const attPct = totalLectures > 0 ? Math.round((totalPresent / totalLectures) * 100) : 0;
        const feeDue = feeSnap.docs.filter(d => d.data().status === "Unpaid").length;
        const resultData = resultSnap.docs.map(d => d.data());
        let cgpa = 0;
        if (resultData.length > 0) {
          const sems = {};
          resultData.forEach(r => { if (!sems[r.semester]) sems[r.semester] = []; sems[r.semester].push(r); });
          const semGPAs = Object.values(sems).map(courses => {
            const totalQP = courses.reduce((a, c) => a + ((c.gradePoints || 0) * (c.creditHours || 0)), 0);
            const totalCH = courses.reduce((a, c) => a + (c.creditHours || 0), 0);
            return totalCH > 0 ? totalQP / totalCH : 0;
          });
          cgpa = semGPAs.length > 0 ? (semGPAs.reduce((a, b) => a + b, 0) / semGPAs.length).toFixed(2) : 0;
        }
        setStats({ attendance: attPct, courses: courseSnap.size, cgpa, feeDue });
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [userData]);

  const quickLinks = [
    { icon: "📊", title: "Results & CGPA", desc: "View semester results and CGPA", path: "/student/results", color: "#dbeafe", iconColor: "#1d4ed8" },
    { icon: "✅", title: "Attendance", desc: "Check subject-wise attendance", path: "/student/attendance", color: "#dcfce7", iconColor: "#16a34a" },
    { icon: "💰", title: "Fee Vouchers", desc: "View and download fee receipts", path: "/student/fee", color: "#fef3c7", iconColor: "#d97706" },
    { icon: "📋", title: "Transcript", desc: "Download official transcript", path: "/student/transcript", color: "#f3e8ff", iconColor: "#7c3aed" },
    { icon: "📚", title: "Courses", desc: "View enrolled courses", path: "/student/courses", color: "#fce7f3", iconColor: "#be185d" },
    { icon: "🗓️", title: "Timetable", desc: "Check class schedule", path: "/student/timetable", color: "#ecfdf5", iconColor: "#065f46" },
  ];

  const cgpaColor = stats.cgpa >= 3.5 ? "#16a34a" : stats.cgpa >= 2.5 ? "#d97706" : "#dc2626";
  const attColor = stats.attendance >= 75 ? "#16a34a" : stats.attendance >= 60 ? "#d97706" : "#dc2626";

  return (
    <div>
      {/* Welcome banner */}
      <div style={{ background: "linear-gradient(135deg, #1a3a5c, #2563a8)", borderRadius: 14, padding: "24px 28px", marginBottom: 28, color: "white" }}>
        <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>
          {new Date().toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          Welcome back, {userData?.name?.split(" ")[0] || "Student"} 👋
        </h2>
        <div style={{ fontSize: 13, opacity: 0.75 }}>
          {userData?.program} &nbsp;|&nbsp; Roll No: {userData?.rollNo} &nbsp;|&nbsp; {userData?.session}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        {[
          { icon: "📊", label: "CGPA", value: loading ? "—" : stats.cgpa || "N/A", color: "#f3e8ff", iconColor: "#7c3aed" },
          { icon: "✅", label: "Attendance", value: loading ? "—" : `${stats.attendance}%`, color: "#dcfce7", iconColor: attColor },
          { icon: "📚", label: "Courses", value: loading ? "—" : stats.courses, color: "#dbeafe", iconColor: "#1d4ed8" },
          { icon: "💰", label: "Fee Due", value: loading ? "—" : `${stats.feeDue} pending`, color: stats.feeDue > 0 ? "#fee2e2" : "#dcfce7", iconColor: stats.feeDue > 0 ? "#dc2626" : "#16a34a" },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{ background: s.color }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
            </div>
            <div>
              <div className="stat-value" style={{ fontSize: 20, color: s.iconColor }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <h3 style={{ fontFamily: "'Playfair Display', serif", color: "var(--primary)", marginBottom: 16, fontSize: 18 }}>Quick Access</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {quickLinks.map(q => (
          <button key={q.title} onClick={() => navigate(q.path)}
            style={{ display:"flex", alignItems:"center", gap:16, padding:"18px 20px", background:"white", borderRadius:12, border:"1px solid var(--border)", cursor:"pointer", textAlign:"left", transition:"all 0.2s", boxShadow:"var(--shadow)", fontFamily:"'Inter',sans-serif" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "var(--shadow)"; }}>
            <div style={{ width:44, height:44, borderRadius:10, background:q.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{q.icon}</div>
            <div>
              <div style={{ fontWeight:600, fontSize:14, color:"var(--primary)" }}>{q.title}</div>
              <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:2 }}>{q.desc}</div>
            </div>
            <span style={{ marginLeft:"auto", color:"var(--text-muted)", fontSize:16 }}>→</span>
          </button>
        ))}
      </div>
    </div>
  );
}
