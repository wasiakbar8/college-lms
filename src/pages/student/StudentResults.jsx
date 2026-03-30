import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";

const SEMESTERS = ["1st Semester","2nd Semester","3rd Semester","4th Semester","5th Semester","6th Semester","7th Semester","8th Semester"];
const GRADE_POINTS = { "A+":4.0,"A":4.0,"A-":3.7,"B+":3.3,"B":3.0,"B-":2.7,"C+":2.3,"C":2.0,"C-":1.7,"D+":1.3,"D":1.0,"F":0.0 };
const GRADE_COLORS = { "A+":"#16a34a","A":"#16a34a","A-":"#22c55e","B+":"#2563a8","B":"#2563a8","B-":"#3b82f6","C+":"#d97706","C":"#d97706","C-":"#f59e0b","D+":"#ea580c","D":"#dc2626","F":"#dc2626" };

function getGradeColor(g) { return GRADE_COLORS[g] || "#64748b"; }
function calcSGPA(courses) {
  const totalQP = courses.reduce((a,c) => a + (GRADE_POINTS[c.grade]||0) * (c.creditHours||0), 0);
  const totalCH = courses.reduce((a,c) => a + (c.creditHours||0), 0);
  return totalCH > 0 ? (totalQP / totalCH).toFixed(2) : "0.00";
}
function calcCGPA(semMap) {
  let totalQP = 0, totalCH = 0;
  Object.values(semMap).forEach(courses => {
    courses.forEach(c => { totalQP += (GRADE_POINTS[c.grade]||0) * (c.creditHours||0); totalCH += (c.creditHours||0); });
  });
  return totalCH > 0 ? (totalQP / totalCH).toFixed(2) : "0.00";
}
function getClassification(cgpa) {
  if (cgpa >= 3.7) return { label:"Distinction", color:"#16a34a" };
  if (cgpa >= 3.0) return { label:"First Division", color:"#2563a8" };
  if (cgpa >= 2.0) return { label:"Second Division", color:"#d97706" };
  if (cgpa >= 1.0) return { label:"Third Division", color:"#ea580c" };
  return { label:"Fail", color:"#dc2626" };
}

export default function StudentResults() {
  const { userData } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSem, setActiveSem] = useState("1st Semester");

  useEffect(() => {
    if (!userData?.rollNo) return;
    async function load() {
      try {
        const snap = await getDocs(query(collection(db, "results"), where("rollNo", "==", userData.rollNo)));
        setResults(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch(e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [userData]);

  const semMap = {};
  results.forEach(r => { if (!semMap[r.semester]) semMap[r.semester] = []; semMap[r.semester].push(r); });
  const cgpa = calcCGPA(semMap);
  const classification = getClassification(parseFloat(cgpa));
  const cgpaColor = parseFloat(cgpa) >= 3.0 ? "#16a34a" : parseFloat(cgpa) >= 2.0 ? "#d97706" : "#dc2626";
  const semCourses = semMap[activeSem] || [];
  const sgpa = semCourses.length > 0 ? calcSGPA(semCourses) : null;
  const availableSems = SEMESTERS.filter(s => semMap[s]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Results & CGPA</h2>
          <div className="page-header-sub">Semester-wise results and cumulative grade point average</div>
        </div>
        <button className="btn btn-outline btn-sm no-print" onClick={() => window.print()}>🖨️ Print Results</button>
      </div>

      {/* Print header */}
      <div className="print-header" style={{ marginBottom:20, borderBottom:"2px solid #1a3a5c", paddingBottom:12 }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", color:"#1a3a5c" }}>Academic Results</h2>
        <p>Name: {userData?.name} | Roll No: {userData?.rollNo} | Program: {userData?.program}</p>
      </div>

      {/* CGPA Summary */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:18, marginBottom:28 }}>
        <div className="card" style={{ padding:24, textAlign:"center" }}>
          <div className="cgpa-ring" style={{ borderColor: cgpaColor, color: cgpaColor }}>{cgpa}</div>
          <div style={{ fontSize:13, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:0.5 }}>CGPA</div>
          <div style={{ marginTop:8 }}>
            <span className="badge" style={{ background: classification.color + "20", color: classification.color, fontSize:12 }}>{classification.label}</span>
          </div>
        </div>
        <div className="card" style={{ padding:24, textAlign:"center" }}>
          <div style={{ fontSize:36, fontWeight:700, color:"var(--primary)", marginBottom:4 }}>{availableSems.length}</div>
          <div style={{ fontSize:13, color:"var(--text-muted)" }}>Semesters Completed</div>
          <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:8 }}>of 8 total</div>
        </div>
        <div className="card" style={{ padding:24, textAlign:"center" }}>
          <div style={{ fontSize:36, fontWeight:700, color:"var(--primary)", marginBottom:4 }}>{results.length}</div>
          <div style={{ fontSize:13, color:"var(--text-muted)" }}>Total Courses</div>
          <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:8 }}>
            {results.reduce((a,c) => a + (c.creditHours||0), 0)} Credit Hours
          </div>
        </div>
        <div className="card" style={{ padding:24, textAlign:"center" }}>
          <div style={{ fontSize:36, fontWeight:700, color:results.filter(r=>r.grade==="F").length>0?"#dc2626":"#16a34a", marginBottom:4 }}>
            {results.filter(r => r.grade === "F").length}
          </div>
          <div style={{ fontSize:13, color:"var(--text-muted)" }}>Failed Courses</div>
          <div style={{ fontSize:12, color:"var(--text-muted)", marginTop:8 }}>
            {results.filter(r => r.grade !== "F" && r.grade).length} Passed
          </div>
        </div>
      </div>

      {/* SGPA Bar Chart */}
      {availableSems.length > 0 && (
        <div className="card" style={{ padding:24, marginBottom:24 }}>
          <div className="card-header" style={{ padding:"0 0 16px", border:"none", marginBottom:16 }}>
            <h3>SGPA Progress</h3>
          </div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:120 }}>
            {SEMESTERS.map(sem => {
              const courses = semMap[sem];
              if (!courses) return (
                <div key={sem} style={{ flex:1, textAlign:"center" }}>
                  <div style={{ height:100, background:"#f1f5f9", borderRadius:"6px 6px 0 0", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ fontSize:10, color:"var(--text-muted)", writingMode:"vertical-lr" }}>—</span>
                  </div>
                  <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:4 }}>{sem.replace(" Semester","")}</div>
                </div>
              );
              const sgpaVal = parseFloat(calcSGPA(courses));
              const height = Math.round((sgpaVal / 4.0) * 100);
              const barColor = sgpaVal >= 3.0 ? "#16a34a" : sgpaVal >= 2.0 ? "#d97706" : "#dc2626";
              return (
                <div key={sem} style={{ flex:1, textAlign:"center" }}>
                  <div style={{ fontSize:11, fontWeight:700, color:barColor, marginBottom:4 }}>{sgpaVal.toFixed(2)}</div>
                  <div style={{ height:100, display:"flex", alignItems:"flex-end" }}>
                    <div style={{ width:"100%", height:`${height}%`, background:barColor, borderRadius:"4px 4px 0 0", transition:"height 0.4s", minHeight:4 }} />
                  </div>
                  <div style={{ fontSize:10, color:"var(--text-muted)", marginTop:4 }}>{sem.replace(" Semester","")}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Semester Results */}
      <div className="card">
        <div className="card-header">
          <h3>Semester Results</h3>
          {sgpa && <span className="badge badge-primary">SGPA: {sgpa}</span>}
        </div>
        <div className="card-body" style={{ paddingTop:0 }}>
          <div className="tabs" style={{ marginTop:16 }}>
            {SEMESTERS.map(sem => (
              <button key={sem} className={`tab-btn ${activeSem === sem ? "active" : ""}`}
                onClick={() => setActiveSem(sem)} disabled={!semMap[sem]}>
                {sem.replace(" Semester", "")}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="empty-state"><p>Loading results...</p></div>
          ) : semCourses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <p>No results available for {activeSem}.</p>
              <p style={{ fontSize:12, marginTop:8 }}>Results will appear here once the admin enters them.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Course ID</th><th>Course Title</th><th>Credit Hours</th>
                    <th>Marks Obtained</th><th>Total Marks</th><th>Grade</th><th>Grade Points</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {semCourses.map(r => (
                    <tr key={r.id}>
                      <td><span className="badge badge-primary">{r.courseId}</span></td>
                      <td style={{ fontWeight:500 }}>{r.subjectTitle}</td>
                      <td style={{ textAlign:"center" }}>{r.creditHours}</td>
                      <td style={{ textAlign:"center" }}>{r.marksObtained ?? "—"}</td>
                      <td style={{ textAlign:"center" }}>{r.totalMarks ?? "—"}</td>
                      <td>
                        <div className="grade-chip" style={{ background: getGradeColor(r.grade) + "20", color: getGradeColor(r.grade) }}>
                          {r.grade || "—"}
                        </div>
                      </td>
                      <td style={{ textAlign:"center", fontWeight:600 }}>{GRADE_POINTS[r.grade] ?? "—"}</td>
                      <td>
                        <span className={`badge ${r.grade === "F" ? "badge-danger" : r.grade ? "badge-success" : "badge-gray"}`}>
                          {r.grade === "F" ? "Fail" : r.grade ? "Pass" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background:"#f8fafc", fontWeight:600 }}>
                    <td colSpan={2} style={{ padding:"12px 16px", fontSize:13 }}>Semester Total</td>
                    <td style={{ padding:"12px 16px", fontSize:13, textAlign:"center" }}>{semCourses.reduce((a,c) => a+(c.creditHours||0),0)}</td>
                    <td colSpan={2} />
                    <td colSpan={2} style={{ padding:"12px 16px", fontSize:13 }}>SGPA: <strong>{sgpa}</strong></td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
