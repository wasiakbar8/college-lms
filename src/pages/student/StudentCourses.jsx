import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { BookOpen, Clock, User, AlertCircle, Loader2 } from "lucide-react";

const SEMESTERS = ["1st Semester", "2nd Semester", "3rd Semester", "4th Semester", "5th Semester", "6th Semester", "7th Semester", "8th Semester"];

// Mapping IDs to Full Names to ensure the query matches Admin data
const DEPT_MAP = {
  "cs": "Computer Science",
  "ir": "International Relations",
  "edu": "Education",
  "bus": "Business Administration",
  "eng": "English",
  "math": "Mathematics"
};

export default function StudentCourses() {
  const { userData } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSem, setActiveSem] = useState("1st Semester");

  useEffect(() => {
    if (!userData) return;

    // 1. Try to find the department name from any possible field
    const rawDept = userData.program || userData.dept || userData.department;
    
    // 2. Convert ID (like 'cs') to full name (like 'Computer Science') if necessary
    const studentProgram = DEPT_MAP[rawDept?.toLowerCase()] || rawDept;

    if (!studentProgram) {
      setError("Department not found in your profile. Please update your profile in Admin Panel.");
      setLoading(false);
      return;
    }

    console.log("Searching for courses in:", studentProgram);

    // 3. Fetch courses where the 'program' field matches exactly
    const q = query(
      collection(db, "courses"), 
      where("program", "==", studentProgram.trim())
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCourses(data);
      
      // Auto-set the active semester tab
      const currentSem = userData.sem || userData.semester || "1st Semester";
      setActiveSem(currentSem);
      
      setError(null);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Error:", err);
      setError("Database connection failed.");
      setLoading(false);
    });

    return () => unsub();
  }, [userData]);

  const semCourses = useMemo(() => courses.filter(c => c.semester === activeSem), [courses, activeSem]);

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", color: "#6366f1" }}>
      <Loader2 size={40} className="animate-spin" />
      <p style={{ marginTop: 15, fontWeight: 600 }}>Loading Course Outline...</p>
    </div>
  );

  if (error) return (
    <div style={{ margin: "40px auto", maxWidth: "500px", padding: "30px", background: "#fef2f2", borderRadius: "20px", textAlign: "center", border: "1px solid #fee2e2" }}>
      <AlertCircle size={40} color="#ef4444" style={{ marginBottom: 15 }} />
      <h3 style={{ color: "#991b1b", margin: "0 0 10px" }}>Profile Incomplete</h3>
      <p style={{ color: "#b91c1c", fontSize: "14px" }}>{error}</p>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ background: "linear-gradient(135deg, #1e293b, #334155)", padding: 32, borderRadius: 24, color: "#fff", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontWeight: 800 }}>My Courses</h2>
        <p style={{ opacity: 0.8, marginTop: 8 }}>{DEPT_MAP[userData?.dept] || userData?.program || "Computer Science"} • {activeSem}</p>
      </div>

      {/* Semester Selection Tabs */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 24, paddingBottom: 10, scrollbarWidth: "none" }}>
        {SEMESTERS.map(sem => (
          <button key={sem} onClick={() => setActiveSem(sem)}
            style={{
              padding: "10px 24px", borderRadius: 12, border: "none", cursor: "pointer", whiteSpace: "nowrap", fontWeight: 700,
              background: activeSem === sem ? "#6366f1" : "#fff",
              color: activeSem === sem ? "#fff" : "#64748b",
              transition: "0.2s"
            }}>
            {sem.split(" ")[0]}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
        {semCourses.map(course => (
          <div key={course.id} style={{ background: "#fff", padding: 24, borderRadius: 24, border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ background: "#f1f5f9", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 800, color: "#475569" }}>{course.courseId}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#6366f1" }}>{course.type}</span>
            </div>
            <h3 style={{ margin: "0 0 16px", fontSize: 18, color: "#1e293b", fontWeight: 800 }}>{course.title}</h3>
            <div style={{ display: "flex", gap: 20, borderTop: "1px solid #f1f5f9", paddingTop: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b" }}>
                <Clock size={15} color="#6366f1" /> {course.creditHours} CH
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b" }}>
                <User size={15} color="#6366f1" /> {course.teacher}
              </div>
            </div>
          </div>
        ))}

        {semCourses.length === 0 && (
          <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 24 }}>
            <BookOpen size={40} style={{ marginBottom: 12, opacity: 0.2 }} />
            <p style={{ color: "#94a3b8" }}>No courses registered for {activeSem}.</p>
          </div>
        )}
      </div>
    </div>
  );
}