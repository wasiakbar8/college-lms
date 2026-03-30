import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ students:0, courses:0, feePaid:0, feePending:0, results:0, attendance:0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [students, courses, fees, results, attendance] = await Promise.all([
          getDocs(collection(db,"students")), getDocs(collection(db,"courses")),
          getDocs(collection(db,"fees")), getDocs(collection(db,"results")),
          getDocs(collection(db,"attendance")),
        ]);
        const feeData = fees.docs.map(d=>d.data());
        setStats({
          students: students.size, courses: courses.size, results: results.size, attendance: attendance.size,
          feePaid: feeData.filter(f=>f.status==="Paid").reduce((a,f)=>a+Number(f.paidAmt||0),0),
          feePending: feeData.filter(f=>f.status!=="Paid").length,
        });
      } catch(e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, []);

  const statCards = [
    { icon:"👨‍🎓", label:"Total Students", value:stats.students, color:"#dbeafe", tc:"#1d4ed8", path:"/admin/students" },
    { icon:"📚", label:"Total Courses", value:stats.courses, color:"#dcfce7", tc:"#16a34a", path:"/admin/courses" },
    { icon:"💰", label:"Fee Collected", value:`Rs. ${stats.feePaid.toLocaleString()}`, color:"#fef3c7", tc:"#d97706", path:"/admin/fee" },
    { icon:"⚠️", label:"Pending Fees", value:stats.feePending, color:"#fee2e2", tc:"#dc2626", path:"/admin/fee" },
    { icon:"📊", label:"Result Entries", value:stats.results, color:"#f3e8ff", tc:"#7c3aed", path:"/admin/results" },
    { icon:"✅", label:"Attendance Records", value:stats.attendance, color:"#ecfdf5", tc:"#065f46", path:"/admin/attendance" },
  ];

  const quickActions = [
    { icon:"👨‍🎓", title:"Add Student", desc:"Register a new student", path:"/admin/students" },
    { icon:"📊", title:"Enter Results", desc:"Add semester grades", path:"/admin/results" },
    { icon:"✅", title:"Mark Attendance", desc:"Update attendance records", path:"/admin/attendance" },
    { icon:"💰", title:"Add Fee Voucher", desc:"Create fee record", path:"/admin/fee" },
    { icon:"📚", title:"Add Course", desc:"Create new course entry", path:"/admin/courses" },
    { icon:"🗓️", title:"Set Timetable", desc:"Configure class schedule", path:"/admin/timetable" },
  ];

  return (
    <div>
      <div style={{ background:"linear-gradient(135deg,#1a3a5c,#2563a8)", borderRadius:14, padding:"22px 28px", marginBottom:28, color:"white" }}>
        <div style={{ fontSize:13, opacity:0.7 }}>
          {new Date().toLocaleDateString("en-PK",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
        </div>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, marginTop:4, marginBottom:4 }}>Admin Dashboard</h2>
        <div style={{ fontSize:13, opacity:0.75 }}>University Learning Management System — Overview</div>
      </div>

      {loading ? (
        <div className="empty-state"><p>Loading stats...</p></div>
      ) : (
        <>
          <div className="stats-grid">
            {statCards.map(s => (
              <div key={s.label} className="stat-card" style={{ cursor:"pointer" }} onClick={() => navigate(s.path)}>
                <div className="stat-icon" style={{ background:s.color }}><span style={{ fontSize:20 }}>{s.icon}</span></div>
                <div>
                  <div className="stat-value" style={{ fontSize: typeof s.value === "string" ? 16 : 26, color:s.tc }}>{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ fontFamily:"'Playfair Display',serif", color:"var(--primary)", marginBottom:16, fontSize:18 }}>Quick Actions</h3>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px,1fr))", gap:14 }}>
            {quickActions.map(q => (
              <button key={q.title} onClick={() => navigate(q.path)}
                style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 18px", background:"white", borderRadius:12, border:"1px solid var(--border)", cursor:"pointer", textAlign:"left", transition:"all 0.2s", boxShadow:"var(--shadow)", fontFamily:"'Inter',sans-serif" }}
                onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="var(--shadow)"; }}>
                <div style={{ fontSize:24, flexShrink:0 }}>{q.icon}</div>
                <div>
                  <div style={{ fontWeight:600, fontSize:14, color:"var(--primary)" }}>{q.title}</div>
                  <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:2 }}>{q.desc}</div>
                </div>
                <span style={{ marginLeft:"auto", color:"var(--text-muted)" }}>→</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
