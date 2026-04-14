import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { Clock, MapPin, Calendar, User, AlertCircle } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SEMESTERS = ["1st Semester", "2nd Semester", "3rd Semester", "4th Semester", "5th Semester", "6th Semester", "7th Semester", "8th Semester"];

// Mapping to handle ID vs Full Name mismatches
const DEPT_MAP = {
  "cs": "Computer Science",
  "ir": "Information Relations",
  "edu": "Education",
  "bus": "Business Administration",
  "eng": "English",
  "math": "Mathematics"
};

export default function StudentTimetable() {
  const { userData } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 1. Normalize the Department Name
  const rawDept = userData?.program || userData?.dept || userData?.department;
  const studentProgram = DEPT_MAP[rawDept?.toLowerCase()] || rawDept;

  // 2. Normalize the Semester
  const rawSem = userData?.sem || userData?.semester || "1st Semester";
  const studentSem = typeof rawSem === 'number' ? `${rawSem}${rawSem === 1 ? 'st' : rawSem === 2 ? 'nd' : rawSem === 3 ? 'rd' : 'th'} Semester` : rawSem;

  const [activeSem, setActiveSem] = useState(studentSem);

  useEffect(() => {
    if (!studentProgram) return;

    // Use a simpler query first to ensure we get data, then filter locally
    const q = query(
      collection(db, "timetable"), 
      where("program", "==", studentProgram)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      console.log("Timetable Data Found:", data); // Check your console (F12)
      setSlots(data);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [studentProgram]);

  // 3. Filter by normalized semester
  const semSlots = useMemo(() => {
    return slots.filter(s => {
        const dbSem = s.semester?.toLowerCase().trim();
        const uiSem = activeSem?.toLowerCase().trim();
        return dbSem === uiSem;
    });
  }, [slots, activeSem]);

  if (loading) return <div style={{ padding: 100, textAlign: "center" }}>Fetching your schedule...</div>;

  if (!studentProgram) return (
    <div style={{ margin: 50, padding: 30, background: "#fff5f5", borderRadius: 20, textAlign: "center", border: "1px solid #feb2b2" }}>
      <AlertCircle color="#c53030" style={{ marginBottom: 10 }} />
      <h3 style={{ color: "#c53030", margin: 0 }}>Department Not Set</h3>
      <p>Your profile is missing department info. Please contact Admin.</p>
    </div>
  );

  return (
    <div style={{ padding: 24, background: "#f4f6fb", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        
        {/* Header */}
        <div style={{ background: "#fff", padding: "24px 30px", borderRadius: 24, marginBottom: 24, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: 800 }}>{studentProgram}</h2>
            <p style={{ color: "#64748b", margin: "4px 0 0" }}>Weekly Schedule • {activeSem}</p>
          </div>
          <div style={{ background: "#eef2ff", color: "#6366f1", padding: "8px 16px", borderRadius: 12, fontWeight: 700, fontSize: 13 }}>
            {slots.length} Classes Total
          </div>
        </div>

        {/* Semester Tabs */}
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 15, marginBottom: 25, scrollbarWidth: "none" }}>
          {SEMESTERS.map(sem => (
            <button key={sem} onClick={() => setActiveSem(sem)}
              style={{
                padding: "12px 24px", borderRadius: 14, border: "none", whiteSpace: "nowrap", cursor: "pointer", fontWeight: 700, fontSize: 13,
                background: activeSem === sem ? "#6366f1" : "#fff",
                color: activeSem === sem ? "#fff" : "#64748b",
                boxShadow: activeSem === sem ? "0 10px 15px -3px rgba(99,102,241,0.3)" : "none",
                transition: "all 0.2s"
              }}>
              {sem}
            </button>
          ))}
        </div>

        {/* Timetable Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 25 }}>
          {DAYS.map(day => {
            const dayClasses = semSlots.filter(s => s.day === day);
            if (dayClasses.length === 0) return null;
            
            return (
              <div key={day}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 15 }}>
                   <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#6366f1" }}></div>
                   <h4 style={{ margin: 0, textTransform: "uppercase", fontSize: 12, letterSpacing: "0.1em", color: "#1e293b", fontWeight: 800 }}>{day}</h4>
                </div>

                {dayClasses.sort((a,b) => a.timeSlot.localeCompare(b.timeSlot)).map(slot => (
                  <div key={slot.id} style={{ background: "#fff", padding: 20, borderRadius: 20, border: "1px solid #e2e8f0", marginBottom: 15, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 5, background: "#6366f1" }}></div>
                    
                    <div style={{ fontWeight: 800, fontSize: 16, color: "#1e293b", marginBottom: 12 }}>{slot.courseName}</div>
                    
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={{ fontSize: 13, color: "#475569", display: "flex", alignItems: "center", gap: 8 }}>
                        <Clock size={15} color="#6366f1" /> {slot.timeSlot}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 13, color: "#475569", display: "flex", alignItems: "center", gap: 8 }}>
                          <MapPin size={15} color="#6366f1" /> Room: {slot.room}
                        </div>
                        <div style={{ fontSize: 13, color: "#475569", display: "flex", alignItems: "center", gap: 8 }}>
                          <User size={15} color="#6366f1" /> {slot.teacher}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {semSlots.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 20px", background: "#fff", borderRadius: 24, border: "1px solid #e2e8f0" }}>
            <Calendar size={40} color="#cbd5e1" style={{ marginBottom: 15 }} />
            <h3 style={{ color: "#1e293b", margin: 0 }}>No Classes Scheduled</h3>
            <p style={{ color: "#94a3b8" }}>Relax! No lectures found for {activeSem}.</p>
          </div>
        )}
      </div>
    </div>
  );
}