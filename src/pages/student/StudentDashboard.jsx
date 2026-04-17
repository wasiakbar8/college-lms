import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  Trophy, 
  CalendarCheck, 
  BookOpen, 
  CreditCard, 
  ArrowRight,
  UserCircle
} from "lucide-react";

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
  return Math.max(0, totalAmount - totalPaid);
};

export default function StudentDashboard() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [feeDue, setFeeDue] = useState(0);

  useEffect(() => {
    if (!userData?.rollNo) return;
    async function load() {
      try {
        const feeSnap = await getDocs(query(collection(db, "fees"), where("rollNo", "==", userData.rollNo)));
        const dueAmount = feeSnap.docs.map(d => processFeeRecord(d.data())).reduce((a, b) => a + b, 0);
        setFeeDue(dueAmount);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    load();
  }, [userData]);

  const quickLinks = [
    { icon: <Trophy size={22}/>, title: " Results", desc: "View grades and semester GPA", path: "/student/results", color: "#f3e8ff", tc: "#7c3aed" },
    { icon: <CalendarCheck size={22}/>, title: "Attendance ", desc: "Detailed subject-wise presence", path: "/student/attendance", color: "#dcfce7", tc: "#16a34a" },
    { icon: <CreditCard size={22}/>, title: "Fee ", desc: "Invoices and payment history", path: "/student/fee", color: "#fee2e2", tc: "#dc2626" },
    { icon: <BookOpen size={22}/>, title: "Courses", desc: "Outline and faculty details", path: "/student/courses", color: "#dbeafe", tc: "#1d4ed8" },
  { icon: <BookOpen size={22}/>, title: "Timetable", desc: "Outline and faculty details", path: "/student/timetable", color: "#dbeafe", tc: "#1d4ed8" },
  ];

  return (
    <div style={{ padding: "10px" }}>
      {/* Header Banner */}
      <div style={{ 
        background: "linear-gradient(135deg, #1e293b, #334155)", 
        borderRadius: 24, 
        padding: "35px 40px", 
        marginBottom: 32, 
        color: "white",
        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, letterSpacing: "1px", marginBottom: 8, textTransform: "uppercase" }}>
            {new Date().toLocaleDateString("en-PK", { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 26, fontWeight: 800, margin: 0 }}>
            Welcome back, {userData?.name?.split(" ")[0] || "Student"}
          </h2>
          <div style={{ fontSize: 14, opacity: 0.8, marginTop: 6, display: "flex", alignItems: "center", gap: "8px" }}>
            <UserCircle size={16} /> {userData?.program} • {userData?.rollNo}
          </div>
        </div>
      </div>

      {/* Primary Status Grid */}
      <h3 style={{ color: "#1e293b", fontSize: 18, fontWeight: 800, marginBottom: 20, paddingLeft: 5 }}>Dashboard Overview</h3>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px", marginBottom: "32px" }}>
        
        {/* Status Card 1 */}
        <div style={cardStyle}>
          <div style={{ ...iconBox, background: "#f3e8ff", color: "#7c3aed" }}><Trophy size={20}/></div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#1e293b" }}>Academic Status</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Standard GPA Performance</div>
          </div>
        </div>

        {/* Status Card 2 */}
        <div style={cardStyle}>
          <div style={{ ...iconBox, background: "#dcfce7", color: "#16a34a" }}><CalendarCheck size={20}/></div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#1e293b" }}>Attendance Health</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>Daily presence is being tracked</div>
          </div>
        </div>

        {/* Status Card 3 */}
        <div style={cardStyle}>
          <div style={{ ...iconBox, background: feeDue > 0 ? "#fee2e2" : "#dcfce7", color: feeDue > 0 ? "#dc2626" : "#16a34a" }}><CreditCard size={20}/></div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#1e293b" }}>Results</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              {loading ? "Checking records..." : feeDue > 0 ? "Outstanding balance exists" : "Academic Records"}
            </div>
          </div>
        </div>

      </div>

      {/* Quick Access Grid */}
      <h3 style={{ color: "#1e293b", fontSize: 18, fontWeight: 800, marginBottom: 20, paddingLeft: 5 }}>Quick Access</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {quickLinks.map(q => (
          <button key={q.title} onClick={() => navigate(q.path)} style={actionButtonStyle}>
            <div style={{ ...iconBox, background: q.color, color: q.tc, width: 44, height: 44 }}>{q.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{q.title}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{q.desc}</div>
            </div>
            <ArrowRight size={18} color="#cbd5e1" />
          </button>
        ))}
      </div>
    </div>
  );
}

// Styles
const cardStyle = {
  background: "#fff",
  padding: "24px",
  borderRadius: "24px",
  border: "1px solid #e2e8f0",
  display: "flex",
  alignItems: "center",
  gap: "16px",
  transition: "all 0.3s ease"
};

const iconBox = {
  width: "48px",
  height: "48px",
  borderRadius: "14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0
};

const actionButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  padding: "20px",
  background: "white",
  borderRadius: "20px",
  border: "1px solid #e2e8f0",
  cursor: "pointer",
  textAlign: "left",
  transition: "all 0.2s ease",
  fontFamily: "'Inter', sans-serif"
};