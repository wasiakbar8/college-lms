import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { BookOpen, Clock, User, Loader2 } from "lucide-react";

const SEMESTERS = [
  "1st Semester", "2nd Semester", "3rd Semester", "4th Semester",
  "5th Semester", "6th Semester", "7th Semester", "8th Semester",
];

const DEPT_MAP = {
  "cs": "Computer Science",
  "ir": "International Relations",
  "edu": "Education",
  "bus": "Business Administration",
  "eng": "English",
  "math": "Mathematics"
};

const c = { 
  primary: "#6366f1", 
  sub: "#6b7280", 
  border: "#e5e7eb", 
  bg: "#f4f6fb", 
  white: "#ffffff",
  dark: "#1e293b"
};

export default function StudentCourses() {
  const { userData } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSem, setActiveSem] = useState("1st Semester");

  useEffect(() => {
    if (!userData) return;

    const rawDept = userData.program || userData.dept || userData.department;
    const studentProgram = DEPT_MAP[rawDept?.toLowerCase()] || rawDept;

    const q = query(
      collection(db, "courses"), 
      where("program", "==", studentProgram?.trim() || "")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCourses(data);
      const currentSem = userData.sem || userData.semester || "1st Semester";
      setActiveSem(currentSem);
      setLoading(false);
    });

    return () => unsub();
  }, [userData]);

  const semCourses = useMemo(() => courses.filter(c => c.semester === activeSem), [courses, activeSem]);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh", color: c.primary }}>
      <Loader2 size={30} className="animate-spin" />
    </div>
  );

  return (
    <div style={{ padding: "20px", maxWidth: "1250px", margin: "0 auto" }}>
      
      {/* HEADER ROW: Title and Filter in front of each other */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "30px",
        background: "#fff",
        padding: "15px 25px",
        borderRadius: "20px",
        border: `1px solid ${c.border}`,
        boxShadow: "0 2px 10px rgba(0,0,0,0.03)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <div style={{ background: c.primary, padding: "10px", borderRadius: "12px", color: "#fff" }}>
            <BookOpen size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: c.dark }}>Course Outline</h2>
            <p style={{ margin: 0, fontSize: "12px", color: c.sub }}>{activeSem}</p>
          </div>
        </div>

        {/* Semester Filter Buttons */}
        <div style={{ 
          display: "flex", 
          gap: "4px", 
          background: c.bg, 
          padding: "4px", 
          borderRadius: "12px" 
        }}>
          {SEMESTERS.map(sem => (
            <button 
              key={sem} 
              onClick={() => setActiveSem(sem)}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "11px",
                cursor: "pointer",
                border: "none",
                background: activeSem === sem ? c.primary : "transparent",
                color: activeSem === sem ? "#fff" : c.sub,
                fontWeight: 700,
                transition: "0.2s"
              }}>
              {sem.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* COURSES GRID: Restricted card width for a cleaner look */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
        gap: "20px",
        justifyItems: "start" 
      }}>
        {semCourses.map(course => (
          <div key={course.id} style={{ 
            background: "#fff", 
            borderRadius: "20px", 
            border: `1px solid ${c.border}`, 
            width: "100%",
            maxWidth: "320px", // Reduced width for "less width" look
            transition: "0.2s",
            overflow: "hidden"
          }}>
            <div style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontSize: "10px", fontWeight: 800, color: c.primary, letterSpacing: "0.05em" }}>
                  {course.courseId}
                </span>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8" }}>
                  {course.type?.toUpperCase()}
                </span>
              </div>

              <h3 style={{ margin: "0 0 15px", fontSize: "16px", color: c.dark, fontWeight: 800, height: "45px", overflow: "hidden" }}>
                {course.title}
              </h3>

              <div style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                paddingTop: "15px", 
                borderTop: `1px solid ${c.bg}` 
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: c.sub }}>
                  <Clock size={14} color={c.primary} />
                  <span>{course.creditHours} CH</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: c.sub }}>
                  <User size={14} color={c.primary} />
                  <span style={{ fontWeight: 600 }}>{course.teacher?.split(" ")[0]}</span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {semCourses.length === 0 && (
          <div style={{ 
            gridColumn: "1/-1", 
            textAlign: "center", 
            width: "100%", 
            padding: "50px", 
            background: "#fff", 
            borderRadius: "20px", 
            border: `1px dashed ${c.border}` 
          }}>
            <p style={{ color: c.sub, fontSize: "14px" }}>No courses found for {activeSem}.</p>
          </div>
        )}
      </div>
    </div>
  );
}