import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";

const SEMESTERS = ["1st Semester","2nd Semester","3rd Semester","4th Semester","5th Semester","6th Semester","7th Semester","8th Semester"];
const TYPE_COLORS = { Theory:"#dbeafe", Practical:"#dcfce7", Seminar:"#fef3c7", Lab:"#f3e8ff" };
const TYPE_TEXT = { Theory:"#1d4ed8", Practical:"#16a34a", Seminar:"#d97706", Lab:"#7c3aed" };

export default function StudentCourses() {
  const { userData } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSem, setActiveSem] = useState("1st Semester");

  useEffect(() => {
    if (!userData?.program) return;
    async function load() {
      try {
        const snap = await getDocs(query(collection(db, "courses"), where("program", "==", userData.program)));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCourses(data);
        const first = SEMESTERS.find(s => data.some(c => c.semester === s));
        if (first) setActiveSem(first);
      } catch(e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [userData]);

  const semCourses = courses.filter(c => c.semester === activeSem);
  const totalCH = semCourses.reduce((a, c) => a + Number(c.creditHours || 0), 0);
  const availableSems = SEMESTERS.filter(s => courses.some(c => c.semester === s));

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Course Outline</h2>
          <div className="page-header-sub">{userData?.program} — All enrolled courses</div>
        </div>
        <button className="btn btn-outline btn-sm no-print" onClick={() => window.print()}>🖨️ Print</button>
      </div>

      <div className="print-header" style={{ marginBottom:16, borderBottom:"2px solid #1a3a5c", paddingBottom:10 }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", color:"#1a3a5c" }}>Course Outline</h2>
        <p>Name: {userData?.name} | Roll No: {userData?.rollNo} | Program: {userData?.program} | Semester: {activeSem}</p>
      </div>

      {/* Summary */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:16, marginBottom:24 }}>
        {[
          { label:"Total Semesters", value: availableSems.length, icon:"📅", color:"#dbeafe", tc:"#1d4ed8" },
          { label:"Courses This Sem", value: semCourses.length, icon:"📚", color:"#dcfce7", tc:"#16a34a" },
          { label:"Credit Hours", value: totalCH, icon:"⏱️", color:"#fef3c7", tc:"#d97706" },
          { label:"Total Courses", value: courses.length, icon:"📋", color:"#f3e8ff", tc:"#7c3aed" },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{ background:s.color }}><span style={{ fontSize:18 }}>{s.icon}</span></div>
            <div>
              <div className="stat-value" style={{ fontSize:22, color:s.tc }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-body">
          <div className="tabs">
            {SEMESTERS.map(sem => (
              <button key={sem} className={`tab-btn ${activeSem === sem ? "active" : ""}`}
                onClick={() => setActiveSem(sem)} disabled={!availableSems.includes(sem)}>
                {sem.replace(" Semester", "")}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="empty-state"><p>Loading courses...</p></div>
          ) : semCourses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <p>No courses found for {activeSem}.</p>
              <p style={{ fontSize:12, marginTop:8 }}>Courses will appear once the admin adds them for your program.</p>
            </div>
          ) : (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>Course ID</th><th>Course Title</th>
                      <th>Teacher</th><th>Credit Hours</th><th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {semCourses.map((c, i) => (
                      <tr key={c.id}>
                        <td>{i + 1}</td>
                        <td><span className="badge badge-primary">{c.courseId}</span></td>
                        <td style={{ fontWeight:500 }}>{c.title}</td>
                        <td style={{ fontSize:12, color:"var(--text-muted)" }}>{c.teacher}</td>
                        <td style={{ textAlign:"center" }}>
                          <span className="badge badge-gray">{c.creditHours} CH</span>
                        </td>
                        <td>
                          <span className="badge" style={{ background: TYPE_COLORS[c.type] || "#f1f5f9", color: TYPE_TEXT[c.type] || "#64748b" }}>
                            {c.type || "Theory"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background:"#f8fafc", fontWeight:600 }}>
                      <td colSpan={4} style={{ padding:"12px 16px", fontSize:13 }}>Total Credit Hours — {activeSem}</td>
                      <td style={{ padding:"12px 16px", fontSize:13, textAlign:"center" }}>{totalCH}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div style={{ display:"flex", gap:10, marginTop:16, flexWrap:"wrap" }}>
                {Object.entries(TYPE_COLORS).map(([type, bg]) => (
                  semCourses.some(c => c.type === type) ? (
                    <div key={type} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"var(--text-muted)" }}>
                      <span style={{ width:12, height:12, borderRadius:3, background:bg, border:"1px solid var(--border)", display:"inline-block" }} />
                      {type}: {semCourses.filter(c => c.type === type).length}
                    </div>
                  ) : null
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
