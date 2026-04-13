import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

// --- EMBEDDED BUSINESS LOGIC ---
const calculateLateFee = (dueDateString, lateFeePerDay = 100) => {
  if (!dueDateString) return 0;
  const today = new Date(); const dueDate = new Date(dueDateString);
  today.setHours(0, 0, 0, 0); dueDate.setHours(0, 0, 0, 0);
  if (today > dueDate) return Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24)) * lateFeePerDay;
  return 0;
};

const processFeeRecord = (rawFee) => {
  const baseAmount = (rawFee.feeBreakdown && rawFee.feeBreakdown.length > 0)
    ? rawFee.feeBreakdown.reduce((sum, item) => sum + Number(item.amount), 0)
    : Number(rawFee.netAmt || 0);
    
  const lateFee = calculateLateFee(rawFee.dueDate, rawFee.lateFeePerDay || 100);
  const totalAmount = baseAmount + lateFee;
  
  const totalPaid = (rawFee.payments && rawFee.payments.length > 0)
    ? rawFee.payments.reduce((sum, p) => sum + Number(p.amount), 0)
    : Number(rawFee.paidAmt || 0);
    
  const remainingAmount = Math.max(0, totalAmount - totalPaid);
  
  let status = "Partial";
  if (totalPaid === 0) status = "Unpaid";
  else if (totalPaid >= totalAmount) status = "Paid";

  return { ...rawFee, totalAmount, totalPaid, remainingAmount, status };
};
// -------------------------------

export default function StudentDashboard() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ attendance: 0, courses: 0, cgpa: "0.00", feeDueAmount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.rollNo) return;
    async function load() {
      try {
        const [courseSnap, feeSnap, resultSnap, dailyAttSnap] = await Promise.all([
          getDocs(query(collection(db, "courses"), where("program", "==", userData.program))),
          getDocs(query(collection(db, "fees"), where("rollNo", "==", userData.rollNo))),
          getDocs(query(collection(db, "results"), where("rollNo", "==", userData.rollNo))),
          getDocs(query(collection(db, "dailyAttendance"), where("rollNo", "==", userData.rollNo))),
        ]);
        
        // --- FIXED ATTENDANCE CALCULATION ---
        let totalLec = 0;
        let totalPres = 0;

        dailyAttSnap.docs.forEach(doc => {
          const data = doc.data();
          
          // 1. Check if it's a Bulk Lecture Summary
          if (data.markMode === "lectures") {
            totalLec += Number(data.totalLectures || 0);
            totalPres += Number(data.present || 0);
          } 
          // 2. Check for Single Daily Records (Supports old and new data)
          else if (data.status) {
            totalLec += 1;
            // Counts 'P' (Present) and 'T' (Late) as being present
            if (data.status === "P" || data.status === "T") {
              totalPres += 1;
            }
          }
        });

        const attPct = totalLec > 0 ? Math.round((totalPres / totalLec) * 100) : 0;
        
        // --- Fee Logic ---
        const processedFees = feeSnap.docs.map(d => processFeeRecord({ id: d.id, ...d.data() }));
        const feeDueAmount = processedFees.reduce((sum, f) => sum + f.remainingAmount, 0);
        
        // --- CGPA Logic ---
        const resultData = resultSnap.docs.map(d => d.data());
        let finalCgpa = "0.00";
        if (resultData.length > 0) {
          let totalQP = 0; let totalCH = 0;
          resultData.forEach(res => {
            const gp = Number(res.gradePoints || 0);
            const ch = Number(res.creditHours || 0);
            totalQP += (gp * ch); totalCH += ch;
          });
          if (totalCH > 0) finalCgpa = (totalQP / totalCH).toFixed(2);
        }
        
        setStats({ 
          attendance: attPct, 
          courses: courseSnap.size, 
          cgpa: finalCgpa, 
          feeDueAmount 
        });

      } catch (e) { 
        console.error("Dashboard Load Error: ", e); 
      }
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

  const cgpaColor = Number(stats.cgpa) >= 3.5 ? "#16a34a" : Number(stats.cgpa) >= 2.5 ? "#d97706" : "#dc2626";
  const attColor = stats.attendance >= 75 ? "#16a34a" : stats.attendance >= 60 ? "#d97706" : "#dc2626";

  return (
    <div style={{ padding: "10px" }}>
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

      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        {[
          { icon: "📊", label: "CGPA", value: loading ? "—" : stats.cgpa, color: "#f3e8ff", iconColor: cgpaColor },
          { icon: "✅", label: "Attendance", value: loading ? "—" : `${stats.attendance}%`, color: "#dcfce7", iconColor: attColor },
          { icon: "📚", label: "Courses", value: loading ? "—" : stats.courses, color: "#dbeafe", iconColor: "#1d4ed8" },
          { 
            icon: "💰", 
            label: "Fee Due", 
            value: loading ? "—" : (stats.feeDueAmount > 0 ? `Rs. ${stats.feeDueAmount.toLocaleString()}` : "Clear"), 
            color: stats.feeDueAmount > 0 ? "#fee2e2" : "#dcfce7", 
            iconColor: stats.feeDueAmount > 0 ? "#dc2626" : "#16a34a" 
          },
        ].map(s => (
          <div className="stat-card" key={s.label} style={{ background: "#fff", padding: "20px", borderRadius: "16px", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: "15px" }}>
            <div className="stat-icon" style={{ background: s.color, width: "45px", height: "45px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
            </div>
            <div>
              <div className="stat-value" style={{ fontSize: 20, fontWeight: 800, color: s.iconColor }}>{s.value}</div>
              <div className="stat-label" style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ fontFamily: "'Playfair Display', serif", color: "#1a3a5c", marginBottom: 16, fontSize: 18 }}>Quick Access</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {quickLinks.map(q => (
          <button key={q.title} onClick={() => navigate(q.path)}
            style={{ display:"flex", alignItems:"center", gap:16, padding:"18px 20px", background:"white", borderRadius:12, border:"1px solid #e5e7eb", cursor:"pointer", textAlign:"left", transition:"all 0.2s", fontFamily:"'Inter',sans-serif" }}>
            <div style={{ width:44, height:44, borderRadius:10, background:q.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{q.icon}</div>
            <div>
              <div style={{ fontWeight:600, fontSize:14, color:"#1a3a5c" }}>{q.title}</div>
              <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>{q.desc}</div>
            </div>
            <span style={{ marginLeft:"auto", color:"#9ca3af", fontSize:16 }}>→</span>
          </button>
        ))}
      </div>
    </div>
  );
}