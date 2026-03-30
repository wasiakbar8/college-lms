import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { path: "/student/dashboard", icon: "⊞", label: "Dashboard" },
  { path: "/student/profile", icon: "👤", label: "My Profile" },
  { path: "/student/courses", icon: "📚", label: "Course Outline" },
  { path: "/student/timetable", icon: "🗓️", label: "Timetable" },
  { path: "/student/attendance", icon: "✅", label: "Attendance" },
  { path: "/student/results", icon: "📊", label: "Results & CGPA" },
  { path: "/student/fee", icon: "💰", label: "Fee & Vouchers" },
  { path: "/student/transcript", icon: "📋", label: "Transcript" },
];

const pageTitles = {
  "/student/dashboard": "Dashboard",
  "/student/profile": "My Profile",
  "/student/courses": "Course Outline",
  "/student/timetable": "Class Timetable",
  "/student/attendance": "Attendance Record",
  "/student/results": "Results & CGPA",
  "/student/fee": "Fee & Vouchers",
  "/student/transcript": "Academic Transcript",
};

export default function StudentLayout() {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleNav(path) { navigate(path); setSidebarOpen(false); }

  return (
    <div className="app-shell">
      {sidebarOpen && <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:250 }} onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">🎓</div>
          <div className="logo-title">University LMS</div>
          <div className="logo-sub">Student Portal</div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {navItems.map(item => (
            <button key={item.path} className={`nav-item ${location.pathname === item.path || (location.pathname === "/student" && item.path === "/student/dashboard") ? "active" : ""}`}
              onClick={() => handleNav(item.path)}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{userData?.name?.charAt(0) || "S"}</div>
            <div>
              <div className="sidebar-user-name">{userData?.name || "Student"}</div>
              <div className="sidebar-user-role">Roll: {userData?.rollNo || "—"}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ width:"100%", justifyContent:"center", color:"rgba(255,255,255,0.5)", marginTop:4 }}
            onClick={logout}>Sign Out</button>
        </div>
      </aside>
      <div className="main-area">
        <header className="top-header">
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
            <div className="header-title">{pageTitles[location.pathname] || "Student Portal"}</div>
          </div>
          <div className="header-right">
            <div style={{ fontSize:13, color:"var(--text-muted)" }}>
              {userData?.program || ""}
            </div>
            <div className="sidebar-avatar" style={{ width:36, height:36, fontSize:13 }}>
              {userData?.name?.charAt(0) || "S"}
            </div>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
