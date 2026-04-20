import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Import all your pages here (Keep your existing imports)
import LoginPage from "./pages/LoginPage";
import StudentLayout from "./pages/student/StudentLayout";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentProfile from "./pages/student/StudentProfile";
import StudentCourses from "./pages/student/StudentCourses";
import StudentTimetable from "./pages/student/StudentTimetable";
import StudentAttendance from "./pages/student/StudentAttendance";
import StudentResults from "./pages/student/StudentResults";
import StudentFee from "./pages/student/StudentFee";
import StudentTranscript from "./pages/student/StudentTranscript";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminAttendance from "./pages/admin/AdminAttendance";
import AdminResults from "./pages/admin/AdminResults";
import AdminFee from "./pages/admin/AdminFee";
import AdminTimetable from "./pages/admin/AdminTimetable";

function ProtectedRoute({ children, allowedRole }) {
  const { currentUser, userRole, loading } = useAuth();
  
  if (loading) return <div style={{ padding: 20 }}>Verifying Access...</div>;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (allowedRole && userRole !== allowedRole) return <Navigate to="/login" replace />;
  
  return children;
}

function AppRoutes() {
  const { currentUser, userRole, loading } = useAuth();

  // Debugging: This will tell you in the Console why the page is blank
  useEffect(() => {
    console.log("Auth State:", { currentUser: !!currentUser, userRole, loading });
  }, [currentUser, userRole, loading]);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ width: 40, height: 40, border: "4px solid #f3f3f3", borderTop: "4px solid #1a3a5c", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <Routes>
      {/* Route for the root path / */}
      <Route path="/" element={
        currentUser && userRole 
          ? <Navigate to={userRole === "admin" ? "/admin" : "/student"} replace /> 
          : <Navigate to="/login" replace />
      } />

      <Route path="/login" element={
        currentUser && userRole 
          ? <Navigate to={userRole === "admin" ? "/admin" : "/student"} replace /> 
          : <LoginPage />
      } />

      <Route path="/student" element={<ProtectedRoute allowedRole="student"><StudentLayout /></ProtectedRoute>}>
        <Route index element={<StudentDashboard />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="courses" element={<StudentCourses />} />
        <Route path="timetable" element={<StudentTimetable />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="results" element={<StudentResults />} />
        <Route path="fee" element={<StudentFee />} />
        <Route path="transcript" element={<StudentTranscript />} />
      </Route>

      <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="courses" element={<AdminCourses />} />
        <Route path="attendance" element={<AdminAttendance />} />
        <Route path="results" element={<AdminResults />} />
        <Route path="fee" element={<AdminFee />} />
        <Route path="timetable" element={<AdminTimetable />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}