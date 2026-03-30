import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";

const SEMESTERS = ["1st Semester","2nd Semester","3rd Semester","4th Semester","5th Semester","6th Semester","7th Semester","8th Semester"];
const GRADE_POINTS = { "A+":4.0,"A":4.0,"A-":3.7,"B+":3.3,"B":3.0,"B-":2.7,"C+":2.3,"C":2.0,"C-":1.7,"D+":1.3,"D":1.0,"F":0.0 };

function calcSGPA(courses) {
  const qp = courses.reduce((a,c) => a+(GRADE_POINTS[c.grade]||0)*(c.creditHours||0), 0);
  const ch = courses.reduce((a,c) => a+(c.creditHours||0), 0);
  return ch > 0 ? (qp/ch).toFixed(2) : "0.00";
}
function calcCGPA(semMap) {
  let qp=0, ch=0;
  Object.values(semMap).forEach(cs => cs.forEach(c => { qp+=(GRADE_POINTS[c.grade]||0)*(c.creditHours||0); ch+=(c.creditHours||0); }));
  return ch > 0 ? (qp/ch).toFixed(2) : "0.00";
}
function getClassification(cgpa) {
  if (cgpa>=3.7) return "Distinction";
  if (cgpa>=3.0) return "First Division";
  if (cgpa>=2.0) return "Second Division";
  if (cgpa>=1.0) return "Third Division";
  return "Fail";
}

export default function StudentTranscript() {
  const { userData } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.rollNo) return;
    async function load() {
      try {
        const snap = await getDocs(query(collection(db, "results"), where("rollNo", "==", userData.rollNo)));
        setResults(snap.docs.map(d => ({ id:d.id, ...d.data() })));
      } catch(e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [userData]);

  const semMap = {};
  results.forEach(r => { if(!semMap[r.semester]) semMap[r.semester]=[]; semMap[r.semester].push(r); });
  const cgpa = calcCGPA(semMap);
  const totalCH = results.reduce((a,c) => a+(c.creditHours||0), 0);
  const classification = getClassification(parseFloat(cgpa));
  const completedSems = SEMESTERS.filter(s => semMap[s]);

  return (
    <div>
      <div className="page-header no-print">
        <div>
          <h2>Academic Transcript</h2>
          <div className="page-header-sub">Official academic record — all semesters</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨️ Download / Print Transcript</button>
      </div>

      {loading ? (
        <div className="empty-state"><p>Loading transcript...</p></div>
      ) : results.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>No results available for transcript.</p>
          <p style={{ fontSize:12, marginTop:8 }}>Results will appear here once the admin enters them.</p>
        </div>
      ) : (
        <div style={{ background:"white", padding:40, borderRadius:14, boxShadow:"var(--shadow)", maxWidth:860, margin:"0 auto" }}>
          {/* Header */}
          <div style={{ textAlign:"center", marginBottom:28, borderBottom:"3px double #1a3a5c", paddingBottom:20 }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🎓</div>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, color:"#1a3a5c", marginBottom:4 }}>University LMS</h1>
            <p style={{ color:"#64748b", fontSize:13, marginBottom:12 }}>Official Academic Transcript</p>
            <div style={{ display:"inline-block", padding:"4px 20px", background:"#1a3a5c", color:"white", borderRadius:20, fontSize:12, fontWeight:600, letterSpacing:1 }}>
              OFFICIAL DOCUMENT
            </div>
          </div>

          {/* Student info */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:0, marginBottom:24, border:"1px solid #e2e8f0", borderRadius:8, overflow:"hidden" }}>
            {[
              ["Student Name", userData?.name],
              ["Roll Number", userData?.rollNo],
              ["Father's Name", userData?.fatherName],
              ["Registration No", userData?.regNo],
              ["Program", userData?.program],
              ["Session", userData?.session],
              ["Shift", userData?.shift],
              ["Date of Issue", new Date().toLocaleDateString("en-PK", { year:"numeric", month:"long", day:"numeric" })],
            ].map(([label, value], i) => (
              <div key={label} style={{ padding:"10px 16px", background: i%4 < 2 ? "#f8fafc" : "white", borderBottom:"1px solid #e2e8f0" }}>
                <div style={{ fontSize:10, textTransform:"uppercase", letterSpacing:0.5, color:"#94a3b8", marginBottom:2 }}>{label}</div>
                <div style={{ fontSize:13, fontWeight:600, color:"#1a2332" }}>{value || "—"}</div>
              </div>
            ))}
          </div>

          {/* Results per semester */}
          {completedSems.map(sem => {
            const courses = semMap[sem];
            const sgpa = calcSGPA(courses);
            const semCH = courses.reduce((a,c) => a+(c.creditHours||0), 0);
            return (
              <div key={sem} style={{ marginBottom:22 }}>
                <div style={{ background:"#1a3a5c", color:"white", padding:"8px 16px", borderRadius:"6px 6px 0 0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontWeight:600, fontSize:13 }}>{sem}</span>
                  <span style={{ fontSize:12 }}>SGPA: {sgpa} &nbsp;|&nbsp; Credit Hours: {semCH}</span>
                </div>
                <table style={{ width:"100%", borderCollapse:"collapse", border:"1px solid #e2e8f0", borderTop:"none" }}>
                  <thead>
                    <tr style={{ background:"#f8fafc" }}>
                      {["Course ID","Course Title","Cr. Hrs","Marks","Grade","Grade Points"].map(h => (
                        <th key={h} style={{ padding:"8px 12px", fontSize:11, textAlign:"left", borderBottom:"1px solid #e2e8f0", color:"#64748b", fontWeight:600, textTransform:"uppercase", letterSpacing:0.3 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((c,i) => (
                      <tr key={c.id} style={{ background: i%2===0?"white":"#fafafa" }}>
                        <td style={{ padding:"8px 12px", fontSize:12, fontWeight:600, color:"#2563a8" }}>{c.courseId}</td>
                        <td style={{ padding:"8px 12px", fontSize:12 }}>{c.subjectTitle}</td>
                        <td style={{ padding:"8px 12px", fontSize:12, textAlign:"center" }}>{c.creditHours}</td>
                        <td style={{ padding:"8px 12px", fontSize:12, textAlign:"center" }}>{c.marksObtained ?? "—"}</td>
                        <td style={{ padding:"8px 12px" }}>
                          <span style={{ fontWeight:700, fontSize:13, color: GRADE_POINTS[c.grade]>=3?"#16a34a":GRADE_POINTS[c.grade]>=2?"#d97706":"#dc2626" }}>{c.grade || "—"}</span>
                        </td>
                        <td style={{ padding:"8px 12px", fontSize:12, textAlign:"center" }}>{GRADE_POINTS[c.grade] ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}

          {/* CGPA summary */}
          <div style={{ border:"2px solid #1a3a5c", borderRadius:8, padding:"20px 24px", marginTop:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:16, textAlign:"center" }}>
              {[
                ["Cumulative GPA (CGPA)", cgpa, "#1a3a5c"],
                ["Total Credit Hours", totalCH, "#2563a8"],
                ["Semesters Completed", completedSems.length, "#16a34a"],
                ["Classification", classification, "#d97706"],
              ].map(([label, value, color]) => (
                <div key={label}>
                  <div style={{ fontSize:22, fontWeight:700, color, fontFamily:"'Playfair Display',serif" }}>{value}</div>
                  <div style={{ fontSize:11, color:"#64748b", textTransform:"uppercase", letterSpacing:0.5, marginTop:4 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Grade scale */}
          <div style={{ marginTop:20, padding:"14px 18px", background:"#f8fafc", borderRadius:8, border:"1px solid #e2e8f0" }}>
            <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:0.5, color:"#64748b", marginBottom:8 }}>Grade Scale</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {[["A+ / A","4.0","#16a34a"],["A-","3.7","#22c55e"],["B+","3.3","#2563a8"],["B","3.0","#3b82f6"],["B-","2.7","#60a5fa"],["C+","2.3","#d97706"],["C","2.0","#f59e0b"],["D","1.0","#ea580c"],["F","0.0","#dc2626"]].map(([g,p,c]) => (
                <div key={g} style={{ display:"flex", alignItems:"center", gap:4, fontSize:11 }}>
                  <span style={{ fontWeight:700, color:c }}>{g}</span>
                  <span style={{ color:"#94a3b8" }}>={p}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop:32, paddingTop:16, borderTop:"2px solid #1a3a5c", display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
            <div style={{ fontSize:11, color:"#94a3b8" }}>
              <p>Generated: {new Date().toLocaleString()}</p>
              <p>This is a computer-generated transcript.</p>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ width:120, borderTop:"1px solid #1a3a5c", paddingTop:6, fontSize:11, color:"#64748b" }}>Registrar's Signature</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
