import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
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

  return { 
    ...rawFee, totalAmount, totalPaid, remainingAmount, status,
    pendingPayments: rawFee.pendingPayments || [] // Required to count verifications
  };
};
// -------------------------------

export default function AdminDashboard() {
  const [stats, setStats] = useState({ students:0, courses:0, feePaid:0, unpaidVouchers:0, pendingVerifications:0, results:0, attendance:0 });
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
        
        const processedFees = fees.docs.map(d => processFeeRecord({ id: d.id, ...d.data() }));
        
        setStats({
          students: students.size, 
          courses: courses.size, 
          results: results.size, 
          attendance: attendance.size,
          feePaid: processedFees.reduce((sum, f) => sum + f.totalPaid, 0),
          unpaidVouchers: processedFees.filter(f => f.status !== "Paid").length,
          
          // NEW: Count exactly how many proofs are waiting for admin approval
          pendingVerifications: processedFees.reduce((sum, f) => sum + (f.pendingPayments ? f.pendingPayments.length : 0), 0)
        });
      } catch(e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, []);

  const statCards = [
    { icon:"👨‍🎓", label:"Add Students", value:stats.students, color:"#dbeafe", tc:"#1d4ed8", path:"/admin/students" },
    { icon:"💰", label:"Fee Collected", value:`Rs. ${stats.feePaid.toLocaleString()}`, color:"#dcfce7", tc:"#16a34a", path:"/admin/fee" },
    
    // NEW: Verification Action Card (Turns red if there are pending proofs, otherwise green)
    { 
      icon:"⏳", 
      label:"Pending Verifications", 
      value: stats.pendingVerifications, 
      color: stats.pendingVerifications > 0 ? "#fee2e2" : "#dcfce7", 
      tc: stats.pendingVerifications > 0 ? "#dc2626" : "#16a34a", 
      path:"/admin/fee" 
    },
    
    // Updated wording to differentiate from pending proofs
    { icon:"⚠️", label:"Unpaid Vouchers", value:stats.unpaidVouchers, color:"#fef3c7", tc:"#d97706", path:"/admin/fee" },
    { icon:"📚", label:"Total Courses", value:stats.courses, color:"#f3e8ff", tc:"#7c3aed", path:"/admin/courses" },
    { icon:"📊", label:"Result Entries", value:stats.results, color:"#ecfdf5", tc:"#065f46", path:"/admin/results" },
  ];

  const quickActions = [
    { icon:"👨‍🎓", title:"Add Student", desc:"Register a new student", path:"/admin/students" },
    { icon:"✅", title:"Verify Payments", desc:"Approve student fee proofs", path:"/admin/fee" },
    { icon:"📊", title:"Enter Results", desc:"Add semester grades", path:"/admin/results" },
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