import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";

const SEMESTERS = ["1st Semester","2nd Semester","3rd Semester","4th Semester","5th Semester","6th Semester","7th Semester","8th Semester"];

export default function StudentAttendance() {
  const { userData } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSem, setActiveSem] = useState("1st Semester");

  useEffect(() => {
    if (!userData?.rollNo) return;
    async function load() {
      try {
        const snap = await getDocs(query(collection(db, "attendance"), where("rollNo", "==", userData.rollNo)));
        setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        const all = snap.docs.map(d => d.data());
        const firstSem = SEMESTERS.find(s => all.some(a => a.semester === s));
        if (firstSem) setActiveSem(firstSem);
      } catch(e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [userData]);

  const semRecords = records.filter(r => r.semester === activeSem);
  const availableSems = SEMESTERS.filter(s => records.some(r => r.semester === s));
  const totalPresent = semRecords.reduce((a, r) => a + (r.present || 0), 0);
  const totalLectures = semRecords.reduce((a, r) => a + (r.lectures || 0), 0);
  const overallPct = totalLectures > 0 ? Math.round((totalPresent / totalLectures) * 100) : 0;

  function getPctColor(p) { return p >= 75 ? "#16a34a" : p >= 60 ? "#d97706" : "#dc2626"; }
  function getStatusBadge(p) {
    if (p >= 75) return <span className="badge badge-success">Regular</span>;
    if (p >= 60) return <span className="badge badge-warning">Warning</span>;
    return <span className="badge badge-danger">Short</span>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Attendance Record</h2>
          <div className="page-header-sub">Subject-wise attendance for all semesters</div>
        </div>
        <button className="btn btn-outline btn-sm no-print" onClick={() => window.print()}>🖨️ Print</button>
      </div>

      <div className="print-header" style={{ marginBottom:16, borderBottom:"2px solid #1a3a5c", paddingBottom:10 }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", color:"#1a3a5c" }}>Attendance Report</h2>
        <p>Name: {userData?.name} | Roll No: {userData?.rollNo} | Program: {userData?.program} | Semester: {activeSem}</p>
      </div>

      {/* Overall stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px,1fr))", gap:16, marginBottom:24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:"#dbeafe" }}><span style={{ fontSize:20 }}>📊</span></div>
          <div>
            <div className="stat-value" style={{ color: getPctColor(overallPct) }}>{overallPct}%</div>
            <div className="stat-label">Overall ({activeSem})</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:"#dcfce7" }}><span style={{ fontSize:20 }}>✅</span></div>
          <div><div className="stat-value">{totalPresent}</div><div className="stat-label">Total Present</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:"#fee2e2" }}><span style={{ fontSize:20 }}>❌</span></div>
          <div><div className="stat-value">{semRecords.reduce((a,r)=>a+(r.absent||0),0)}</div><div className="stat-label">Total Absent</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:"#fef3c7" }}><span style={{ fontSize:20 }}>📅</span></div>
          <div><div className="stat-value">{totalLectures}</div><div className="stat-label">Total Lectures</div></div>
        </div>
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
            <div className="empty-state"><p>Loading attendance...</p></div>
          ) : semRecords.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <p>No attendance records for {activeSem}.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th><th>Subject</th><th>Teacher</th>
                    <th>Total</th><th>Present</th><th>Leave</th><th>Absent</th>
                    <th>Percentage</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {semRecords.map((r, i) => {
                    const pct = r.lectures > 0 ? Math.round((r.present / r.lectures) * 100) : 0;
                    const color = getPctColor(pct);
                    return (
                      <tr key={r.id}>
                        <td>{i+1}</td>
                        <td>
                          <div style={{ fontWeight:600 }}>{r.subjectTitle}</div>
                          <div style={{ fontSize:11, color:"var(--text-muted)" }}>{r.courseId}</div>
                        </td>
                        <td style={{ fontSize:12 }}>{r.teacher}</td>
                        <td style={{ textAlign:"center" }}>{r.lectures}</td>
                        <td style={{ textAlign:"center", color:"var(--success)", fontWeight:600 }}>{r.present}</td>
                        <td style={{ textAlign:"center", color:"var(--warning)" }}>{r.leave}</td>
                        <td style={{ textAlign:"center", color:"var(--danger)" }}>{r.absent}</td>
                        <td style={{ minWidth:160 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <div className="progress-bar" style={{ flex:1 }}>
                              <div className="progress-fill" style={{ width:`${pct}%`, background:color }} />
                            </div>
                            <span style={{ fontSize:12, fontWeight:700, color, minWidth:36 }}>{pct}%</span>
                          </div>
                        </td>
                        <td>{getStatusBadge(pct)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && semRecords.length > 0 && overallPct < 75 && (
            <div className="alert alert-warning" style={{ marginTop:16 }}>
              ⚠️ Your overall attendance is {overallPct}%. Minimum required attendance is 75%. Please contact your department.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
