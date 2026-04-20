import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { path: "/admin", icon: "⊞", label: "Dashboard", exact: true },
  { path: "/admin/students", icon: "👨‍🎓", label: "Students" },
  { path: "/admin/courses", icon: "📚", label: "Courses" },
  { path: "/admin/attendance", icon: "✅", label: "Attendance" },
  { path: "/admin/results", icon: "📊", label: "Results & Grades" },
  { path: "/admin/fee", icon: "💰", label: "Fee Management" },
  { path: "/admin/timetable", icon: "🗓️", label: "Timetable" },
];

const pageTitles = {
  "/admin": "Dashboard",
  "/admin/students": "Student Management",
  "/admin/courses": "Course Management",
  "/admin/attendance": "Attendance Management",
  "/admin/results": "Results & Grades",
  "/admin/fee": "Fee Management",
  "/admin/timetable": "Timetable",
};

export default function AdminLayout() {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function isActive(item) {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  }

  // Helper to get the correct title even for nested paths
  const currentTitle = Object.keys(pageTitles).find(path => 
    location.pathname === path || (path !== "/admin" && location.pathname.startsWith(path))
  );

  return (
    <div className="app-shell">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div 
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 250 }} 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">🎓</div>
          <div className="logo-title">University LMS</div>
          <div className="logo-sub">Admin Panel</div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Management</div>
          {navItems.map(item => (
            <button 
              key={item.path} 
              className={`nav-item ${isActive(item) ? "active" : ""}`}
              onClick={() => { navigate(item.path); setSidebarOpen(false); }}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{userData?.name?.charAt(0) || "A"}</div>
            <div>
              <div className="sidebar-user-name">{userData?.name || "Admin"}</div>
              <div className="sidebar-user-role">Administrator</div>
            </div>
          </div>
          <button 
            className="btn btn-ghost btn-sm" 
            style={{ width: "100%", justifyContent: "center", color: "rgba(255,255,255,0.5)", marginTop: 4 }} 
            onClick={logout}
          >
            Sign Out
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="top-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
            <div className="header-title">{pageTitles[currentTitle] || "Admin Panel"}</div>
          </div>

          <div className="header-right">
            {/* FIXED: Removed duplicate style keys (color and fontSize) */}
            <span style={{ 
              background: "#fee2e2", 
              color: "#dc2626", 
              padding: "4px 10px", 
              borderRadius: 20, 
              fontWeight: 600, 
              fontSize: 11 
            }}>
              Admin
            </span>
            <div className="sidebar-avatar" style={{ width: 36, height: 36, fontSize: 13, marginLeft: 8 }}>
              {userData?.name?.charAt(0) || "A"}
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