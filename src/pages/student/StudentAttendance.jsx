import React, { useEffect, useState, useMemo } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { Calendar, User, BookOpen, UserCheck } from "lucide-react";

const STATUS_CONFIG = {
  P: { label: "Present", color: "#16a34a", bg: "#dcfce7" },
  A: { label: "Absent", color: "#dc2626", bg: "#fee2e2" },
  L: { label: "Leave", color: "#d97706", bg: "#fef3c7" },
};

export default function StudentAttendance() {
  const { userData } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If userData is still null, keep loading
    if (!userData?.rollNo) return;

    console.log("Fetching attendance for Roll No:", userData.rollNo);

    const q = query(
      collection(db, "dailyAttendance"),
      where("rollNo", "==", userData.rollNo)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Manually sort by date since we removed orderBy for index safety
      const sortedData = data.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setRecords(sortedData);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [userData]);

  const stats = useMemo(() => {
    const total = records.length;
    const present = records.filter(r => r.status === "P").length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, percentage };
  }, [records]);

  if (loading) return (
    <div style={{ padding: 100, textAlign: "center", color: "#6366f1", fontWeight: 600 }}>
      <div style={{ width: 40, height: 40, border: "4px solid #f3f3f3", borderTop: "4px solid #6366f1", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 20px" }}></div>
      Syncing Attendance Data...
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ padding: "20px", maxWidth: "1100px", margin: "0 auto" }}>
      
      <div style={{ marginBottom: 25 }}>
        <h2 style={{ margin: 0, fontWeight: 800 }}>Attendance Dashboard</h2>
        <p style={{ color: "#64748b" }}>Logged in as: {userData.name} ({userData.rollNo})</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, marginBottom: 30 }}>
        <div style={{ background: "linear-gradient(135deg, #6366f1, #4338ca)", padding: 24, borderRadius: 24, color: "#fff" }}>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8 }}>OVERALL ATTENDANCE</div>
          <div style={{ fontSize: 36, fontWeight: 900, marginTop: 8 }}>{stats.percentage}%</div>
        </div>

        <div style={{ background: "#fff", padding: 24, borderRadius: 24, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>TOTAL CLASSES</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{stats.total}</div>
          </div>
          <BookOpen color="#6366f1" />
        </div>

        <div style={{ background: "#fff", padding: 24, borderRadius: 24, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>PRESENT DAYS</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#16a34a", marginTop: 4 }}>{stats.present}</div>
          </div>
          <UserCheck color="#16a34a" />
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 24, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {records.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", background: "#f8fafc" }}>
                <th style={{ padding: "16px 24px", fontSize: 11, color: "#94a3b8" }}>DATE & COURSE</th>
                <th style={{ padding: "16px 24px", fontSize: 11, color: "#94a3b8" }}>INSTRUCTOR</th>
                <th style={{ padding: "16px 24px", fontSize: 11, color: "#94a3b8", textAlign: "center" }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "20px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                      <div style={{ background: "#f1f5f9", padding: "10px", borderRadius: 12 }}><Calendar size={18} color="#6366f1" /></div>
                      <div>
                        <div style={{ fontWeight: 700 }}>{record.courseTitle || "General Class"}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{record.date}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "20px 24px" }}><User size={14} /> {record.teacher}</td>
                  <td style={{ padding: "20px 24px", textAlign: "center" }}>
                    <span style={{
                      padding: "6px 16px", borderRadius: 10, fontSize: 11, fontWeight: 800,
                      background: STATUS_CONFIG[record.status]?.bg,
                      color: STATUS_CONFIG[record.status]?.color
                    }}>
                      {STATUS_CONFIG[record.status]?.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>
            No attendance records found.
          </div>
        )}
      </div>
    </div>
  );
}