import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { Printer, TrendingUp, BookOpen, Award, CheckCircle2 } from "lucide-react";

const DEPARTMENTS = [
  { id: "cs",   name: "Computer Science"        },
  { id: "ir",   name: "International Relations" },
  { id: "edu",  name: "Education"               },
  { id: "bus",  name: "Business Administration" },
  { id: "eng",  name: "English"                 },
  { id: "math", name: "Mathematics"             },
];

const SEMESTERS = [
  "1st Semester","2nd Semester","3rd Semester","4th Semester",
  "5th Semester","6th Semester","7th Semester","8th Semester",
];

const GRADE_POINTS = {
  "A+":4.0,"A":4.0,"A-":3.7,"B+":3.3,"B":3.0,"B-":2.7,
  "C+":2.3,"C":2.0,"C-":1.7,"D+":1.3,"D":1.0,"F":0.0,
};

const c = {
  primary: "#6366f1", success: "#10b981", danger: "#ef4444",
  sub: "#6b7280", border: "#e5e7eb", bg: "#f8fafc", text: "#1e293b",
};

export default function StudentResults() {
  const { userData } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSem, setActiveSem] = useState("1st Semester");

  useEffect(() => {
    if (!userData?.rollNo) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, "results"), where("rollNo", "==", userData.rollNo));
    
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setResults(docs);
      setLoading(false);

      // Set active tab to the latest semester that has data
      if (docs.length > 0) {
        const sortedResults = [...docs].sort((a, b) => 
            SEMESTERS.indexOf(b.semester) - SEMESTERS.indexOf(a.semester)
        );
        setActiveSem(sortedResults[0].semester);
      }
    });

    return () => unsub();
  }, [userData]);

  // Calculations for overall degree
  const stats = useMemo(() => {
    let totalQualityPoints = 0;
    let totalCreditHours = 0;
    let totalMarksObtained = 0;
    let totalMaxMarks = 0;

    results.forEach(r => {
      const gp = GRADE_POINTS[r.grade] || 0;
      const ch = Number(r.creditHours) || 0;
      totalQualityPoints += (gp * ch);
      totalCreditHours += ch;
      totalMarksObtained += Number(r.marksObtained) || 0;
      totalMaxMarks += Number(r.totalMarks) || 0;
    });

    return {
      cgpa: totalCreditHours > 0 ? (totalQualityPoints / totalCreditHours).toFixed(2) : "0.00",
      totalCredits: totalCreditHours,
      aggregate: totalMaxMarks > 0 ? ((totalMarksObtained / totalMaxMarks) * 100).toFixed(1) : "0",
      totalSubjects: results.length
    };
  }, [results]);

  // Calculations for the currently selected tab (SGPA)
  const currentSemResults = results.filter(r => r.semester === activeSem);
  
  const currentSgpa = useMemo(() => {
    let semQP = 0;
    let semCH = 0;
    currentSemResults.forEach(r => {
      semQP += (GRADE_POINTS[r.grade] || 0) * (Number(r.creditHours) || 0);
      semCH += (Number(r.creditHours) || 0);
    });
    return semCH > 0 ? (semQP / semCH).toFixed(2) : "0.00";
  }, [currentSemResults]);

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Syncing Academic Records...</div>;

  return (
    <div style={{ background: c.bg, minHeight: "100vh", padding: "20px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        
        {/* Top Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 25 }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: 800 }}>Student Transcript</h2>
            <p style={{ color: c.sub, margin: 0, fontSize: 13 }}>{userData?.name} • {userData?.rollNo}</p>
          </div>
          <button onClick={() => window.print()} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "#fff", border: `1px solid ${c.border}`, borderRadius: 12, fontWeight: 700, cursor: "pointer" }}>
            <Printer size={16} /> Print Transcript
          </button>
        </div>

        {/* Dashboard Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 15, marginBottom: 25 }}>
          <div style={{ background: "#1e293b", color: "#fff", padding: 20, borderRadius: 20 }}>
            <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 700 }}>CUMULATIVE GPA (CGPA)</div>
            <div style={{ fontSize: 32, fontWeight: 900, marginTop: 5 }}>{stats.cgpa}</div>
          </div>
          <div style={{ background: "#fff", padding: 20, borderRadius: 20, border: `1px solid ${c.border}` }}>
            <div style={{ fontSize: 12, color: c.sub, fontWeight: 700 }}>TOTAL CREDITS</div>
            <div style={{ fontSize: 32, fontWeight: 900, marginTop: 5, color: c.text }}>{stats.totalCredits}</div>
          </div>
          <div style={{ background: "#fff", padding: 20, borderRadius: 20, border: `1px solid ${c.border}` }}>
            <div style={{ fontSize: 12, color: c.sub, fontWeight: 700 }}>AGGREGATE %</div>
            <div style={{ fontSize: 32, fontWeight: 900, marginTop: 5, color: c.success }}>{stats.aggregate}%</div>
          </div>
        </div>

        {/* Transcript Section */}
        <div style={{ background: "#fff", borderRadius: 24, border: `1px solid ${c.border}`, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.03)" }}>
          
          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, padding: 15, background: "#f8fafc", overflowX: "auto", borderBottom: `1px solid ${c.border}` }}>
            {SEMESTERS.map(sem => {
                const count = results.filter(r => r.semester === sem).length;
                return (
                    <button key={sem} onClick={() => setActiveSem(sem)}
                      style={{
                        padding: "8px 16px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 12, whiteSpace: "nowrap",
                        background: activeSem === sem ? c.primary : "transparent",
                        color: activeSem === sem ? "#fff" : count > 0 ? c.text : "#cbd5e1",
                        fontWeight: 700, transition: "0.2s"
                      }}>
                      {sem.split(" ")[0]} {sem.split(" ")[1]} {count > 0 ? `(${count})` : ""}
                    </button>
                )
            })}
          </div>

          {/* Current Semester Info */}
          <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fcfdfe" }}>
             <h3 style={{ margin: 0, fontSize: 16 }}>{activeSem} Breakdown</h3>
             <div style={{ background: "#eef2ff", color: c.primary, padding: "6px 14px", borderRadius: 10, fontWeight: 800, fontSize: 14 }}>
               Semester GPA: {currentSgpa}
             </div>
          </div>

          {/* Detailed Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f9fafb" }}>
                <tr>
                  <th style={{ padding: 16, textAlign: "left", fontSize: 11, color: c.sub }}>COURSE DETAILS</th>
                  <th style={{ padding: 16, textAlign: "center", fontSize: 11, color: c.sub }}>CR. HRS</th>
                  <th style={{ padding: 16, textAlign: "center", fontSize: 11, color: c.sub }}>MARKS</th>
                  <th style={{ padding: 16, textAlign: "center", fontSize: 11, color: c.sub }}>GRADE</th>
                  <th style={{ padding: 16, textAlign: "center", fontSize: 11, color: c.sub }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {currentSemResults.length > 0 ? currentSemResults.map(r => (
                  <tr key={r.id} style={{ borderBottom: `1px solid #f1f5f9` }}>
                    <td style={{ padding: 16 }}>
                      <div style={{ fontWeight: 700, color: c.text }}>{r.subjectTitle}</div>
                      <div style={{ fontSize: 11, color: c.sub, marginTop: 2 }}>{r.courseId}</div>
                    </td>
                    <td style={{ padding: 16, textAlign: "center", fontWeight: 700 }}>{r.creditHours}</td>
                    <td style={{ padding: 16, textAlign: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: c.primary, background: "#eef2ff", padding: "4px 10px", borderRadius: 6 }}>
                        {r.marksObtained} / {r.totalMarks}
                      </span>
                    </td>
                    <td style={{ padding: 16, textAlign: "center" }}>
                      <div style={{ width: 36, height: 36, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 10, background: r.grade === "F" ? "#fef2f2" : "#f0fdf4", color: r.grade === "F" ? c.danger : c.success, fontWeight: 800 }}>
                        {r.grade}
                      </div>
                    </td>
                    <td style={{ padding: 16, textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, color: r.grade === "F" ? c.danger : c.success, fontWeight: 700, fontSize: 12 }}>
                           {r.grade === "F" ? "Failed" : <> <CheckCircle2 size={14} /> Passed </>}
                        </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} style={{ padding: 60, textAlign: "center", color: c.sub }}>
                      No academic records found for this semester.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}