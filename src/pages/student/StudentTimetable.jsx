import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const SEMESTERS = ["1st Semester","2nd Semester","3rd Semester","4th Semester","5th Semester","6th Semester","7th Semester","8th Semester"];
const DAY_COLORS = ["#dbeafe","#dcfce7","#fef3c7","#fce7f3","#f3e8ff","#ecfdf5"];

export default function StudentTimetable() {
  const { userData } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSem, setActiveSem] = useState("1st Semester");
  const [view, setView] = useState("grid");

  useEffect(() => {
    if (!userData?.program) return;
    async function load() {
      try {
        const snap = await getDocs(query(collection(db, "timetable"), where("program", "==", userData.program)));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setSlots(data);
        const first = SEMESTERS.find(s => data.some(t => t.semester === s));
        if (first) setActiveSem(first);
      } catch(e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [userData]);

  const semSlots = slots.filter(s => s.semester === activeSem);
  const availableSems = SEMESTERS.filter(s => slots.some(t => t.semester === s));
  const byDay = {};
  DAYS.forEach(d => { byDay[d] = semSlots.filter(s => s.day === d).sort((a,b) => a.timeSlot?.localeCompare(b.timeSlot)); });

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Class Timetable</h2>
          <div className="page-header-sub">{userData?.program} — Weekly schedule</div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <div style={{ display:"flex", background:"#f1f5f9", borderRadius:8, padding:3, gap:2 }}>
            <button className={`btn btn-sm ${view==="grid"?"btn-primary":"btn-ghost"}`} onClick={() => setView("grid")}>Grid</button>
            <button className={`btn btn-sm ${view==="list"?"btn-primary":"btn-ghost"}`} onClick={() => setView("list")}>List</button>
          </div>
          <button className="btn btn-outline btn-sm no-print" onClick={() => window.print()}>🖨️ Print</button>
        </div>
      </div>

      <div className="print-header" style={{ marginBottom:16, borderBottom:"2px solid #1a3a5c", paddingBottom:10 }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", color:"#1a3a5c" }}>Class Timetable</h2>
        <p>Name: {userData?.name} | Roll No: {userData?.rollNo} | Program: {userData?.program} | Semester: {activeSem}</p>
      </div>

      <div className="tabs">
        {SEMESTERS.map(sem => (
          <button key={sem} className={`tab-btn ${activeSem === sem ? "active" : ""}`}
            onClick={() => setActiveSem(sem)} disabled={!availableSems.includes(sem)}>
            {sem.replace(" Semester", "")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty-state"><p>Loading timetable...</p></div>
      ) : semSlots.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🗓️</div>
          <p>No timetable found for {activeSem}.</p>
        </div>
      ) : view === "grid" ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:16 }}>
          {DAYS.map((day, di) => byDay[day].length > 0 && (
            <div key={day} className="card" style={{ overflow:"hidden" }}>
              <div style={{ background: DAY_COLORS[di], padding:"12px 18px", borderBottom:"1px solid var(--border)" }}>
                <div style={{ fontWeight:700, fontSize:14, color:"var(--primary)" }}>{day}</div>
                <div style={{ fontSize:11, color:"var(--text-muted)" }}>{byDay[day].length} class{byDay[day].length !== 1 ? "es" : ""}</div>
              </div>
              <div style={{ padding:14, display:"flex", flexDirection:"column", gap:10 }}>
                {byDay[day].map(slot => (
                  <div key={slot.id} style={{ background:"#f8fafc", borderRadius:8, padding:"12px 14px", borderLeft:"3px solid var(--primary-light)" }}>
                    <div style={{ fontSize:12, color:"var(--primary)", fontWeight:700, marginBottom:4 }}>{slot.timeSlot}</div>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:2 }}>{slot.courseName}</div>
                    <div style={{ fontSize:11, color:"var(--text-muted)" }}>{slot.teacher}</div>
                    {slot.room && <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:3 }}>📍 {slot.room}</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Day</th><th>Time Slot</th><th>Course</th><th>Teacher</th><th>Room</th></tr>
              </thead>
              <tbody>
                {DAYS.flatMap(day => byDay[day].map(slot => (
                  <tr key={slot.id}>
                    <td><span className="badge badge-primary">{day}</span></td>
                    <td style={{ fontWeight:500, whiteSpace:"nowrap" }}>{slot.timeSlot}</td>
                    <td style={{ fontWeight:500 }}>{slot.courseName}</td>
                    <td style={{ fontSize:12, color:"var(--text-muted)" }}>{slot.teacher}</td>
                    <td style={{ fontSize:12 }}>{slot.room || "—"}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
