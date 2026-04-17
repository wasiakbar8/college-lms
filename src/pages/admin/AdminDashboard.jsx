import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  Wallet, 
  CheckCircle, 
  BookOpen, 
  GraduationCap, 
  Calendar, 
  LayoutDashboard,
  ArrowRight
} from "lucide-react";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const moduleCards = [
    { 
      icon: <Users size={24} />, 
      label: "Student Management", 
      desc: "Register new students and manage profiles", 
      color: "#dbeafe", 
      tc: "#1d4ed8", 
      path: "/admin/students" 
    },
    { 
      icon: <Wallet size={24} />, 
      label: "Fee Records", 
      desc: "View collected fees and manage vouchers", 
      color: "#dcfce7", 
      tc: "#16a34a", 
      path: "/admin/fee" 
    },
    { 
      icon: <CheckCircle size={24} />, 
      label: "Payment Verifications", 
      desc: "Approve or reject student fee proofs", 
      color: "#fee2e2", 
      tc: "#dc2626", 
      path: "/admin/fee" 
    },
    { 
      icon: <BookOpen size={24} />, 
      label: "Course Catalog", 
      desc: "Configure syllabus and course outlines", 
      color: "#f3e8ff", 
      tc: "#7c3aed", 
      path: "/admin/courses" 
    },
    { 
      icon: <GraduationCap size={24} />, 
      label: "Academic Results", 
      desc: "Manage semester grades and transcripts", 
      color: "#ecfdf5", 
      tc: "#065f46", 
      path: "/admin/results" 
    },
    { 
      icon: <Calendar size={24} />, 
      label: "University Timetable", 
      desc: "Set class schedules and room allocations", 
      color: "#fff7ed", 
      tc: "#c2410c", 
      path: "/admin/timetable" 
    },
  ];

  return (
    <div style={{ padding: "10px" }}>
      {/* Hero Banner */}
      <div style={{ 
        background: "linear-gradient(135deg, #1a3a5c, #2563a8)", 
        borderRadius: 20, 
        padding: "35px 40px", 
        marginBottom: 32, 
        color: "white",
        boxShadow: "0 10px 25px -5px rgba(26, 58, 92, 0.3)" 
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <LayoutDashboard size={20} style={{ opacity: 0.8 }} />
          <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.8, letterSpacing: "1px", textTransform: "uppercase" }}>
            Admin Control Center
          </span>
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, margin: 0 }}>
          University Management System
        </h2>
        <p style={{ fontSize: 15, opacity: 0.8, marginTop: 10, maxWidth: "500px", lineHeight: "1.5" }}>
          Welcome back! Access and manage all academic modules, financial records, and student activities from your central command.
        </p>
      </div>

      {/* Grid Section */}
      <h3 style={{ 
        fontFamily: "'Playfair Display', serif", 
        color: "#1a3a5c", 
        marginBottom: 20, 
        fontSize: 20,
        paddingLeft: "5px" 
      }}>
        Management Modules
      </h3>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", 
        gap: 20 
      }}>
        {moduleCards.map((m) => (
          <div 
            key={m.label} 
            onClick={() => navigate(m.path)}
            style={{ 
              background: "#fff", 
              padding: "24px", 
              borderRadius: 20, 
              border: "1px solid #e2e8f0", 
              cursor: "pointer", 
              transition: "all 0.3s ease",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              position: "relative",
              overflow: "hidden"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-5px)";
              e.currentTarget.style.boxShadow = "0 12px 30px -10px rgba(0,0,0,0.1)";
              e.currentTarget.style.borderColor = m.tc;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "#e2e8f0";
            }}
          >
            <div style={{ 
              background: m.color, 
              color: m.tc,
              width: "50px", 
              height: "50px", 
              borderRadius: "14px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center" 
            }}>
              {m.icon}
            </div>

            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "#1e293b", marginBottom: 4 }}>
                {m.label}
              </div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: "1.4" }}>
                {m.desc}
              </div>
            </div>

            <div style={{ 
              marginTop: "auto", 
              display: "flex", 
              alignItems: "center", 
              gap: 8, 
              color: m.tc, 
              fontSize: 13, 
              fontWeight: 700 
            }}>
              Access Module <ArrowRight size={14} />
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div style={{ 
        marginTop: 40, 
        padding: "20px", 
        textAlign: "center", 
        borderTop: "1px solid #e2e8f0",
        color: "#94a3b8",
        fontSize: 12
      }}>
        {new Date().toLocaleDateString("en-PK", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} | System Version 2.0.4
      </div>
    </div>
  );
}