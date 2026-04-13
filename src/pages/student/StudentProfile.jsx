import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/config";

// Helper to get full name if stored as ID
const DEPARTMENTS = {
  cs: "Computer Science",
  ir: "International Relations",
  edu: "Education",
  bus: "Business Administration",
  eng: "English",
  math: "Mathematics",
};

export default function StudentProfile() {
  const { userData, currentUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ 
    phone: userData?.phone || "", 
    address: userData?.address || "" 
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateDoc(doc(db, "students", currentUser.uid), { 
        phone: form.phone, 
        address: form.address 
      });
      setSuccess(true); 
      setEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) { 
      alert("Error: " + e.message); 
    }
    setSaving(false);
  }

  const personal = [
    { label: "CNIC", value: userData?.cnic, icon: "🪪" },
    { label: "Email", value: userData?.email, icon: "✉️" },
    { label: "Gender", value: userData?.gender, icon: "👤" },
    { label: "Date of Birth", value: userData?.dob, icon: "🎂" },
    { label: "Phone", value: userData?.phone, icon: "📱", editable: true, key: "phone" },
    { label: "City", value: userData?.city, icon: "🏙️" },
    { label: "Address", value: userData?.address, icon: "🏠", editable: true, key: "address", full: true },
  ];

  // Logic to determine the Program/Department Name
  const displayDept = DEPARTMENTS[userData?.dept] || userData?.dept || userData?.program || "General";

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>My Profile</h2>
          <div className="page-header-sub">View and manage your personal information</div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          {editing ? (
            <>
              <button className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
            </>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => setEditing(true)}>✏️ Edit Profile</button>
          )}
        </div>
      </div>

      {success && <div className="alert alert-success">Profile updated successfully!</div>}

      <div style={{ display:"grid", gridTemplateColumns:"320px 1fr", gap:22, alignItems:"start" }}>
        {/* Left card */}
        <div>
          <div className="card" style={{ padding:28, textAlign:"center", marginBottom:18 }}>
            <div style={{ width:90, height:90, borderRadius:"50%", background:"linear-gradient(135deg,#1a3a5c,#2563a8)", color:"white", fontSize:34, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", boxShadow:"0 4px 16px rgba(26,58,92,0.3)" }}>
              {userData?.name?.charAt(0) || "S"}
            </div>
            <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:"var(--primary)", marginBottom:4 }}>{userData?.name}</h3>
            <p style={{ color:"var(--text-muted)", fontSize:13, marginBottom:4 }}>S/O {userData?.fatherName}</p>
            {/* Added Department display here for visibility */}
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", marginBottom: 12 }}>{displayDept}</p>
            <div style={{ display:"inline-block", padding:"5px 16px", background:"#dbeafe", color:"#1d4ed8", borderRadius:20, fontSize:12, fontWeight:600 }}>Roll: {userData?.rollNo}</div>
          </div>

          <div className="card" style={{ padding:22 }}>
            <div className="section-header">Academic Status</div>
            <div style={{ background:"#f8fafc", borderRadius:10, padding:"12px 14px", border:"1px solid var(--border)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <span style={{ fontSize:18 }}>🎓</span>
                <div style={{ fontWeight:700, fontSize:13, color:"var(--primary)" }}>{displayDept}</div>
              </div>
              <div style={{ fontSize:11, color:"var(--text-muted)", display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
                <span>Semester: {userData?.sem || userData?.semester || "1"}</span>
                <span>Session: {userData?.session}</span>
                <span>Shift: {userData?.shift}</span>
                <span>Roll: {userData?.rollNo}</span>
              </div>
              <div style={{ marginTop:8 }}><span className="badge badge-success" style={{ fontSize:10 }}>Current Enrollment</span></div>
            </div>
          </div>
        </div>

        {/* Right card */}
        <div className="card" style={{ padding:28 }}>
          <div className="section-header">Personal Information</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            {personal.map(item => (
              <div key={item.label} style={item.full ? { gridColumn:"1/-1" } : {}}>
                <div className="info-label">{item.icon} {item.label}</div>
                {editing && item.editable ? (
                  <input className="form-control" value={form[item.key]} onChange={e => setForm({ ...form, [item.key]: e.target.value })} />
                ) : (
                  <div className="info-value">{item.value || "—"}</div>
                )}
              </div>
            ))}
          </div>

          <div className="section-header" style={{ marginTop:28 }}>Academic Information</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            {[
              { label: "Department / Program", value: displayDept },
              { label: "Current Semester", value: userData?.sem || userData?.semester },
              { label: "Session", value: userData?.session },
              { label: "Shift", value: userData?.shift },
              { label: "Roll No", value: userData?.rollNo },
              { label: "Reg No", value: userData?.regNo },
              { label: "DMC No", value: userData?.dmcNo },
            ].map(item => (
              <div key={item.label}>
                <div className="info-label">{item.label}</div>
                <div className="info-value">{item.value || "—"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}