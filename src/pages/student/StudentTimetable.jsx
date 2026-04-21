import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { Clock, MapPin, Calendar, User, AlertCircle, Loader2 } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
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

export default function StudentTimetable() {
  const { userData } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  const rawDept = userData?.program || userData?.dept || userData?.department;
  const studentProgram = DEPT_MAP[rawDept?.toLowerCase()] || rawDept;

  const rawSem = userData?.sem || userData?.semester || "1st Semester";
  const studentSem = typeof rawSem === 'number' ? `${rawSem}${rawSem === 1 ? 'st' : rawSem === 2 ? 'nd' : rawSem === 3 ? 'rd' : 'th'} Semester` : rawSem;

  const [activeSem, setActiveSem] = useState(studentSem);

  useEffect(() => {
    if (!studentProgram) return;
    const q = query(collection(db, "timetable"), where("program", "==", studentProgram));
    const unsub = onSnapshot(q, (snap) => {
      setSlots(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [studentProgram]);

  const semSlots = useMemo(() => {
    return slots.filter(s => s.semester?.toLowerCase().trim() === activeSem?.toLowerCase().trim());
  }, [slots, activeSem]);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh", color: c.primary }}>
      <Loader2 size={30} className="animate-spin" />
    </div>
  );

  if (!studentProgram) return (
    <div style={{ margin: "40px auto", maxWidth: "500px", padding: "30px", background: "#fef2f2", borderRadius: "20px", textAlign: "center", border: "1px solid #fee2e2" }}>
      <AlertCircle size={40} color="#ef4444" style={{ marginBottom: 15 }} />
      <h3 style={{ color: "#991b1b", margin: "0 0 10px" }}>Department Not Set</h3>
      <p style={{ color: "#b91c1c", fontSize: "14px" }}>Please contact Admin to update your profile.</p>
    </div>
  );

  return (
    <div style={{ padding: "20px", maxWidth: "1250px", margin: "0 auto" }}>
      
      {/* HEADER ROW: Title and Filter side-by-side */}
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
            <Calendar size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: c.dark }}>Weekly Schedule</h2>
            <p style={{ margin: 0, fontSize: "12px", color: c.sub }}>{studentProgram}</p>
          </div>
        </div>

        {/* Semester Pill Navigation */}
        <div style={{ 
          display: "flex", 
          gap: "4px", 
          background: c.bg, 
          padding: "4px", 
          borderRadius: "12px",
          overflowX: "auto",
          scrollbarWidth: "none"
        }}>
          {SEMESTERS.map(sem => (
            <button key={sem} onClick={() => setActiveSem(sem)}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "11px",
                cursor: "pointer",
                border: "none",
                whiteSpace: "nowrap",
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

      {/* TIMETABLE GRID */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", 
        gap: "25px" 
      }}>
        {DAYS.map(day => {
          const dayClasses = semSlots.filter(s => s.day === day);
          if (dayClasses.length === 0) return null;
          
          return (
            <div key={day} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingLeft: "5px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: c.primary }}></div>
                <span style={{ fontSize: "12px", fontWeight: 800, color: c.dark, textTransform: "uppercase", letterSpacing: "1px" }}>{day}</span>
              </div>

              {dayClasses.sort((a,b) => a.timeSlot.localeCompare(b.timeSlot)).map(slot => (
                <div key={slot.id} style={{ 
                  background: "#fff", 
                  borderRadius: "20px", 
                  border: `1px solid ${c.border}`, 
                  width: "100%",
                  maxWidth: "320px", // Professional restricted width
                  overflow: "hidden",
                  position: "relative",
                  transition: "0.2s"
                }}>
                  <div style={{ position: "absolute", top: 0, left: 0, width: "4px", height: "100%", background: c.primary }}></div>
                  
                  <div style={{ padding: "20px" }}>
                    <h3 style={{ margin: "0 0 12px", fontSize: "15px", color: c.dark, fontWeight: 800, lineHeight: "1.4" }}>
                      {slot.courseName}
                    </h3>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: c.sub }}>
                        <Clock size={14} color={c.primary} />
                        <span style={{ fontWeight: 600 }}>{slot.timeSlot}</span>
                      </div>
                      
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "5px", paddingTop: "10px", borderTop: `1px solid ${c.bg}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: c.sub }}>
                          <MapPin size={13} color={c.primary} />
                          <span>Room: <b>{slot.room}</b></span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: c.sub }}>
                          <User size={13} color={c.primary} />
                          <span>{slot.teacher?.split(" ")[0]}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {semSlots.length === 0 && (
          <div style={{ 
            gridColumn: "1/-1", 
            textAlign: "center", 
            padding: "60px", 
            background: "#fff", 
            borderRadius: "24px", 
            border: `1px dashed ${c.border}` 
          }}>
            <Calendar size={40} color={c.border} style={{ marginBottom: "15px" }} />
            <p style={{ color: c.sub, fontWeight: 600 }}>No classes scheduled for {activeSem}.</p>
          </div>
        )}
      </div>
    </div>
  );
}