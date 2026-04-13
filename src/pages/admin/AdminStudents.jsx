import React, { useEffect, useState, useRef } from "react";
import {
  collection, getDocs, setDoc, updateDoc, deleteDoc,
  doc, query, where
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth, secondaryAuth } from "../../firebase/config";

// ── Department config — add/remove departments here ──
const DEPARTMENTS = [
  { id: "cs",   name: "Computer Science",        icon: "💻", color: "#185FA5", bg: "#E6F1FB" },
  { id: "ir",   name: "International Relations", icon: "🌍", color: "#0F6E56", bg: "#E1F5EE" },
  { id: "edu",  name: "Education",               icon: "📚", color: "#854F0B", bg: "#FAEEDA" },
  { id: "bus",  name: "Business Administration", icon: "📊", color: "#993C1D", bg: "#FAECE7" },
  { id: "eng",  name: "English",                 icon: "✍️", color: "#534AB7", bg: "#EEEDFE" },
  { id: "math", name: "Mathematics",             icon: "🔢", color: "#3B6D11", bg: "#EAF3DE" },
];

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

const EMPTY_FORM = {
  name: "", fatherName: "", cnic: "", email: "", phone: "",
  gender: "Male", dob: "", city: "", address: "",
  rollNo: "", regNo: "", session: "", shift: "Morning", dmcNo: "",
};

// ── Parse CSV text ──
function parseCSV(text) {
  const lines = text.trim().split("\n").map(l => l.replace(/\r/g, ""));
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, ""));
  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
    return obj;
  });
}

function rowToStudent(row, deptId, sem) {
  return {
    name:        row.name || row.fullname || "",
    fatherName:  row.fathername || row.father || "",
    cnic:        row.cnic || "",
    email:       row.email || "",
    phone:       row.phone || row.contact || "",
    gender:      row.gender || "Male",
    dob:         row.dob || row.dateofbirth || "",
    city:        row.city || "",
    address:     row.address || "",
    rollNo:      row.rollno || row.roll || "",
    regNo:       row.regno || row.registration || "",
    session:     row.session || "",
    shift:       row.shift || "Morning",
    dmcNo:       row.dmcno || row.dmc || "",
    dept:        deptId,
    sem:         Number(sem),
    _password:   row.password || "Password@123",
  };
}

export default function AdminStudents() {
  // ── View state: "depts" | "dept" ──
  const [view, setView]         = useState("depts");
  const [activeDept, setActiveDept] = useState(null);  // dept object
  const [activeSem, setActiveSem]   = useState(1);

  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");

  // Single add/edit modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [password, setPassword]   = useState("");
  const [saving, setSaving]       = useState(false);
  const [credentials, setCredentials] = useState(null);

  // Delete
  const [deleting, setDeleting] = useState(null);

  // Bulk upload
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile]           = useState(null);
  const [bulkPreview, setBulkPreview]     = useState([]);
  const [bulkErrors, setBulkErrors]       = useState([]);
  const [bulkProgress, setBulkProgress]   = useState(null);
  const [bulkResults, setBulkResults]     = useState([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const fileInputRef = useRef();

  useEffect(() => { loadStudents(); }, []);

  async function loadStudents() {
    setLoading(true);
    const snap = await getDocs(collection(db, "students"));
    setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  // ── Derived counts ──
  function deptCount(deptId) {
    return students.filter(s => s.dept === deptId).length;
  }
  function semCount(deptId, sem) {
    return students.filter(s => s.dept === deptId && Number(s.sem) === sem).length;
  }

  // ── Filtered list for current dept + sem ──
  const filteredStudents = students.filter(s => {
    if (!activeDept) return false;
    if (s.dept !== activeDept.id) return false;
    if (Number(s.sem) !== activeSem) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.rollNo?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  });

  // ── Navigate to dept ──
  function openDept(dept) {
    setActiveDept(dept);
    setActiveSem(1);
    setView("dept");
    setSearch("");
    setCredentials(null);
  }

  function backToDepts() {
    setView("depts");
    setActiveDept(null);
    setCredentials(null);
  }

  // ── Single student modal ──
  function openAdd() {
    setForm(EMPTY_FORM);
    setEditing(null);
    setPassword("");
    setCredentials(null);
    setShowModal(true);
  }

  function openEdit(s) {
    const { uid, id, dept, sem, programs, ...rest } = s;
    setForm(rest);
    setEditing(s.id);
    setPassword("");
    setCredentials(null);
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.email || !form.rollNo) {
      alert("Name, Email, and Roll No are required.");
      return;
    }
    setSaving(true);
    const data = {
      ...form,
      dept: activeDept.id,
      sem: activeSem,
    };
    try {
      if (editing) {
        await updateDoc(doc(db, "students", editing), data);
        setShowModal(false);
        loadStudents();
      } else {
        const finalPwd = password?.trim().length >= 6 ? password.trim() : "Password@123";
        const cred = await createUserWithEmailAndPassword(secondaryAuth, form.email, finalPwd);
        await setDoc(doc(db, "students", cred.user.uid), { ...data, uid: cred.user.uid });
        setShowModal(false);
        setCredentials({ email: form.email, password: finalPwd, name: form.name });
        loadStudents();
      }
    } catch (e) { alert("Error: " + e.message); }
    setSaving(false);
  }

  // ── Delete ──
  async function handleDelete(id) {
    const student = students.find(s => s.id === id);
    if (!student) return;
    const confirmed = window.confirm(
      `Delete student: ${student.name}?\n\nThis will permanently delete:\n• Student profile\n• All attendance records\n• All results & grades\n• All fee vouchers\n\nThis cannot be undone.`
    );
    if (!confirmed) return;
    setDeleting(id);
    try {
      const rollNo = student.rollNo;
      const [attSnap, resSnap, feeSnap] = await Promise.all([
        getDocs(query(collection(db, "attendance"), where("rollNo", "==", rollNo))),
        getDocs(query(collection(db, "results"),    where("rollNo", "==", rollNo))),
        getDocs(query(collection(db, "fees"),       where("rollNo", "==", rollNo))),
      ]);
      await Promise.all([
        ...attSnap.docs.map(d => deleteDoc(doc(db, "attendance", d.id))),
        ...resSnap.docs.map(d => deleteDoc(doc(db, "results",    d.id))),
        ...feeSnap.docs.map(d => deleteDoc(doc(db, "fees",       d.id))),
      ]);
      await deleteDoc(doc(db, "students", id));
      loadStudents();
    } catch (e) { alert("Error deleting student: " + e.message); }
    setDeleting(null);
  }

  // ── Bulk upload ──
  function openBulkModal() {
    setBulkFile(null); setBulkPreview([]); setBulkErrors([]);
    setBulkProgress(null); setBulkResults([]); setBulkUploading(false);
    setShowBulkModal(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setBulkFile(file);
    setBulkPreview([]); setBulkErrors([]); setBulkResults([]);
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext)) {
      setBulkErrors(["Only CSV, XLSX, or XLS files are supported."]);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        if (ext === "csv") {
          validateAndPreview(parseCSV(ev.target.result));
        } else if (window.XLSX) {
          const wb = window.XLSX.read(ev.target.result, { type: "binary" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = window.XLSX.utils.sheet_to_json(ws, { defval: "" }).map(r => {
            const obj = {};
            Object.keys(r).forEach(k => { obj[k.toLowerCase().replace(/\s+/g, "")] = String(r[k]); });
            return obj;
          });
          validateAndPreview(rows);
        } else {
          setBulkErrors(["XLSX support requires SheetJS. Please save as CSV first.\n\nIn Excel: File → Save As → CSV (Comma delimited)"]);
        }
      } catch (err) {
        setBulkErrors(["Error reading file: " + err.message]);
      }
    };
    if (ext === "csv") reader.readAsText(file);
    else reader.readAsBinaryString(file);
  }

  function validateAndPreview(rows) {
    const errors = [];
    const valid = [];
    rows.forEach((row, i) => {
      const rowNum = i + 2;
      const student = rowToStudent(row, activeDept.id, activeSem);
      if (!student.name)  errors.push(`Row ${rowNum}: Name is required`);
      if (!student.email) errors.push(`Row ${rowNum}: Email is required`);
      if (!student.email.includes("@")) errors.push(`Row ${rowNum}: Invalid email "${student.email}"`);
      if (!student.rollNo) errors.push(`Row ${rowNum}: Roll No is required`);
      if (!errors.find(e => e.startsWith(`Row ${rowNum}`))) {
        valid.push({ ...student });
      }
    });
    setBulkErrors(errors);
    setBulkPreview(valid);
  }

  async function handleBulkUpload() {
    if (bulkPreview.length === 0) return;
    setBulkUploading(true);
    setBulkProgress({ done: 0, total: bulkPreview.length });
    const results = [];
    for (let i = 0; i < bulkPreview.length; i++) {
      const student = bulkPreview[i];
      const pwd = student._password?.trim().length >= 6 ? student._password.trim() : "Password@123";
      try {
        const cred = await createUserWithEmailAndPassword(secondaryAuth, student.email, pwd);
        const { _password, ...cleanData } = student;
        await setDoc(doc(db, "students", cred.user.uid), { ...cleanData, uid: cred.user.uid });
        results.push({ name: student.name, email: student.email, password: pwd, status: "success" });
      } catch (e) {
        results.push({ name: student.name, email: student.email, password: pwd, status: "error", error: e.message });
      }
      setBulkProgress({ done: i + 1, total: bulkPreview.length });
    }
    setBulkResults(results);
    setBulkUploading(false);
    loadStudents();
  }

  function downloadTemplate() {
    const csv = `name,fatherName,cnic,email,phone,gender,dob,city,address,rollNo,regNo,session,shift,dmcNo,password
Ahmed Ali,Muhammad Ali,33102-1234567-1,ahmed@university.edu,0300-1234567,Male,01-01-1999,Lahore,House 1 Street 1,${activeDept?.id?.toUpperCase() || "XX"}-001,2023-001,2023-2027,Morning,499001,Ahmed@123
Sara Khan,Khan Muhammad,33102-7654321-2,sara@university.edu,0311-7654321,Female,15-06-2000,Karachi,Flat 5 Block B,${activeDept?.id?.toUpperCase() || "XX"}-002,2023-002,2023-2027,Morning,499002,Sara@123`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeDept?.id || "students"}_sem${activeSem}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const successCount = bulkResults.filter(r => r.status === "success").length;
  const errorCount   = bulkResults.filter(r => r.status === "error").length;

  // ════════════════════════════════════════════
  //  RENDER — Department Cards View
  // ════════════════════════════════════════════
  if (view === "depts") {
    return (
      <div>
        <div className="page-header">
          <div>
            <h2>Student Management</h2>
            <div className="page-header-sub">Select a department to manage students</div>
          </div>
        </div>

        {/* Summary stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total Students", value: students.length },
            { label: "Departments",    value: DEPARTMENTS.length },
            { label: "Semesters",      value: 8 },
          ].map(stat => (
            <div key={stat.label} className="card" style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{stat.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="empty-state"><p>Loading...</p></div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {DEPARTMENTS.map(dept => {
              const total = deptCount(dept.id);
              return (
                <div
                  key={dept.id}
                  className="card"
                  style={{ padding: "20px 22px", cursor: "pointer", transition: "border-color .15s, box-shadow .15s" }}
                  onClick={() => openDept(dept)}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)"}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
                >
                  {/* Icon */}
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: dept.bg, display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 22, marginBottom: 14,
                  }}>
                    {dept.icon}
                  </div>

                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{dept.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
                    {total} student{total !== 1 ? "s" : ""} enrolled
                  </div>

                  {/* Semester breakdown badges */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {SEMESTERS.map(sem => {
                      const sc = semCount(dept.id, sem);
                      if (sc === 0) return null;
                      return (
                        <span key={sem} className="badge badge-primary" style={{ fontSize: 11 }}>
                          Sem {sem}: {sc}
                        </span>
                      );
                    })}
                    {total === 0 && (
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>No students yet</span>
                    )}
                  </div>

                  <div style={{
                    marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)",
                    fontSize: 12, color: dept.color, fontWeight: 600,
                  }}>
                    Open Department →
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════
  //  RENDER — Department Detail View
  // ════════════════════════════════════════════
  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
        <span
          style={{ cursor: "pointer", color: "var(--primary)" }}
          onClick={backToDepts}
        >
          Departments
        </span>
        <span>›</span>
        <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
          {activeDept.icon} {activeDept.name}
        </span>
      </div>

      {/* Header */}
      <div className="page-header">
        <div>
          <h2>{activeDept.name}</h2>
          <div className="page-header-sub">Manage students by semester</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-outline" onClick={openBulkModal}>📂 Bulk Upload</button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Student</button>
        </div>
      </div>

      {/* Credentials banner */}
      {credentials && (
        <div className="cred-banner">
          <div style={{ flex: 1 }}>
            <div className="cred-title">✅ Student Registered Successfully!</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>
              Share credentials with <strong>{credentials.name}</strong>:
            </div>
            <div className="cred-row">
              <div className="cred-item"><span className="cred-label">Email</span><span className="cred-value">{credentials.email}</span></div>
              <div className="cred-item"><span className="cred-label">Password</span><span className="cred-value">{credentials.password}</span></div>
            </div>
            <div className="cred-note">⚠️ Save these now. Password will not be shown again.</div>
          </div>
          <button
            style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "white", cursor: "pointer", padding: "6px 12px", borderRadius: 6, fontSize: 13 }}
            onClick={() => setCredentials(null)}
          >✕ Dismiss</button>
        </div>
      )}

      {/* Semester tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {SEMESTERS.map(sem => {
          const sc = semCount(activeDept.id, sem);
          const isActive = activeSem === sem;
          return (
            <button
              key={sem}
              onClick={() => { setActiveSem(sem); setSearch(""); }}
              style={{
                padding: "6px 16px",
                borderRadius: 20,
                fontSize: 13,
                cursor: "pointer",
                border: isActive ? "none" : "1px solid var(--border)",
                background: isActive ? activeDept.color : "transparent",
                color: isActive ? "#fff" : "var(--text-muted)",
                fontWeight: isActive ? 600 : 400,
                transition: "all .15s",
              }}
            >
              Semester {sem}{sc > 0 ? ` (${sc})` : ""}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          className="form-control"
          style={{ maxWidth: 380 }}
          placeholder="🔍 Search by name, roll no or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Students table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          {loading ? (
            <div className="empty-state"><p>Loading students...</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Roll No</th>
                  <th>Name</th>
                  <th>Session</th>
                  <th>Shift</th>
                  <th>Phone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s, i) => (
                  <tr key={s.id} style={{ opacity: deleting === s.id ? 0.4 : 1, transition: "opacity .2s" }}>
                    <td>{i + 1}</td>
                    <td><span className="badge badge-primary">{s.rollNo}</span></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.email}</div>
                    </td>
                    <td style={{ fontSize: 12 }}>{s.session || "—"}</td>
                    <td>
                      <span className={`badge ${s.shift === "Morning" ? "badge-success" : "badge-info"}`}>
                        {s.shift}
                      </span>
                    </td>
                    <td style={{ fontSize: 12 }}>{s.phone}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(s)} disabled={deleting === s.id}>✏️ Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)} disabled={deleting === s.id}>
                          {deleting === s.id ? "Deleting..." : "🗑️ Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <p>No students in Semester {activeSem} yet.</p>
                        <button className="btn btn-primary btn-sm" onClick={openAdd} style={{ marginTop: 8 }}>
                          + Add First Student
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════
           SINGLE ADD / EDIT MODAL
      ═══════════════════════════════════ */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal modal-lg" style={{ maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-header">
              <h3>{editing ? "Edit Student" : `Add Student — ${activeDept.name} · Semester ${activeSem}`}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {/* Context pill */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: activeDept.bg, color: activeDept.color,
              borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 600,
              marginBottom: 18,
            }}>
              {activeDept.icon} {activeDept.name} &nbsp;·&nbsp; Semester {activeSem}
            </div>

            <div className="section-header">Personal Information</div>
            <div className="form-row">
              {[
                ["name",        "Full Name",     "text"],
                ["fatherName",  "Father Name",   "text"],
                ["cnic",        "CNIC",          "text"],
                ["email",       "Email",         "email"],
                ["phone",       "Phone",         "text"],
                ["dob",         "Date of Birth", "date"],
                ["city",        "City",          "text"],
                ["address",     "Address",       "text"],
              ].map(([key, label, type]) => (
                <div className="form-group" key={key} style={key === "address" ? { gridColumn: "1/-1" } : {}}>
                  <label>{label}</label>
                  <input
                    className="form-control" type={type}
                    value={form[key] || ""}
                    onChange={e => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
              <div className="form-group">
                <label>Gender</label>
                <select className="form-control" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                  <option>Male</option>
                  <option>Female</option>
                </select>
              </div>
            </div>

            <div className="section-header" style={{ marginTop: 8 }}>Academic Information</div>
            <div className="form-row">
              <div className="form-group">
                <label>Roll No *</label>
                <input className="form-control" value={form.rollNo || ""} onChange={e => setForm({ ...form, rollNo: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Registration No</label>
                <input className="form-control" value={form.regNo || ""} onChange={e => setForm({ ...form, regNo: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Session</label>
                <input className="form-control" placeholder="e.g. 2023-2027" value={form.session || ""} onChange={e => setForm({ ...form, session: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Shift</label>
                <select className="form-control" value={form.shift || "Morning"} onChange={e => setForm({ ...form, shift: e.target.value })}>
                  <option>Morning</option>
                  <option>Evening</option>
                </select>
              </div>
              <div className="form-group">
                <label>DMC No</label>
                <input className="form-control" value={form.dmcNo || ""} onChange={e => setForm({ ...form, dmcNo: e.target.value })} />
              </div>
            </div>

            {!editing && (
              <>
                <div className="section-header" style={{ marginTop: 8 }}>Login Credentials</div>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "-8px 0 12px" }}>
                  Leave blank to use default: <strong>Password@123</strong>
                </p>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    className="form-control" type="text"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  {password && password.trim().length < 6 && password.trim().length > 0 && (
                    <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 4 }}>⚠️ Password must be at least 6 characters</div>
                  )}
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "💾 Save Student"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════
           BULK UPLOAD MODAL
      ═══════════════════════════════════ */}
      {showBulkModal && (
        <div className="modal-overlay">
          <div className="modal modal-lg" style={{ maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-header">
              <h3>📂 Bulk Upload — {activeDept.name} · Semester {activeSem}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowBulkModal(false)}>✕</button>
            </div>

            {/* Context pill */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: activeDept.bg, color: activeDept.color,
              borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 600,
              marginBottom: 18,
            }}>
              {activeDept.icon} {activeDept.name} &nbsp;·&nbsp; Semester {activeSem}
            </div>

            {/* Step 1 */}
            <div style={{ background: "#f0f7ff", borderRadius: 10, padding: "16px 18px", marginBottom: 18, border: "1px solid #bfdbfe" }}>
              <div style={{ fontWeight: 700, color: "var(--primary)", marginBottom: 6, fontSize: 14 }}>
                Step 1 — Download the CSV Template
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
                Required columns: <strong>name, email, rollNo</strong>. All others optional.
                Template is pre-filled for <strong>{activeDept.name} · Semester {activeSem}</strong>.
              </p>
              <button className="btn btn-outline btn-sm" onClick={downloadTemplate}>⬇️ Download CSV Template</button>
            </div>

            {/* Step 2 */}
            <div style={{ marginBottom: 18 }}>
              <div className="section-header">Step 2 — Upload Your File</div>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>Supported formats: CSV, XLSX, XLS</p>
              <input
                ref={fileInputRef}
                type="file" accept=".csv,.xlsx,.xls"
                style={{ display: "block", padding: 10, border: "2px dashed var(--border)", borderRadius: 8, width: "100%", cursor: "pointer", fontSize: 13 }}
                onChange={handleFileChange}
              />
            </div>

            {/* Errors */}
            {bulkErrors.length > 0 && (
              <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠️ Issues found:</div>
                {bulkErrors.map((e, i) => <div key={i} style={{ fontSize: 12 }}>• {e}</div>)}
              </div>
            )}

            {/* Preview */}
            {bulkPreview.length > 0 && bulkResults.length === 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--primary)" }}>
                    ✅ {bulkPreview.length} student{bulkPreview.length !== 1 ? "s" : ""} ready to import
                  </div>
                  {bulkErrors.length > 0 && <span className="badge badge-warning">{bulkErrors.length} rows skipped</span>}
                </div>
                <div className="table-wrap" style={{ maxHeight: 240, overflowY: "auto", marginBottom: 16, border: "1px solid var(--border)", borderRadius: 8 }}>
                  <table>
                    <thead>
                      <tr><th>#</th><th>Name</th><th>Email</th><th>Roll No</th><th>Password</th></tr>
                    </thead>
                    <tbody>
                      {bulkPreview.map((s, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td style={{ fontWeight: 500 }}>{s.name}</td>
                          <td style={{ fontSize: 12 }}>{s.email}</td>
                          <td><span className="badge badge-primary">{s.rollNo}</span></td>
                          <td style={{ fontSize: 12, fontFamily: "monospace" }}>{s._password}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Progress */}
            {bulkUploading && bulkProgress && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                  <span>Uploading students...</span>
                  <span style={{ fontWeight: 600 }}>{bulkProgress.done} / {bulkProgress.total}</span>
                </div>
                <div className="progress-bar" style={{ height: 12 }}>
                  <div
                    className="progress-fill"
                    style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%`, background: "var(--primary)" }}
                  />
                </div>
              </div>
            )}

            {/* Results */}
            {bulkResults.length > 0 && (
              <>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  {successCount > 0 && <span className="badge badge-success" style={{ fontSize: 13, padding: "6px 14px" }}>✅ {successCount} registered</span>}
                  {errorCount > 0   && <span className="badge badge-danger"  style={{ fontSize: 13, padding: "6px 14px" }}>❌ {errorCount} failed</span>}
                </div>
                <div className="table-wrap" style={{ maxHeight: 260, overflowY: "auto", marginBottom: 16, border: "1px solid var(--border)", borderRadius: 8 }}>
                  <table>
                    <thead>
                      <tr><th>#</th><th>Name</th><th>Email</th><th>Password</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {bulkResults.map((r, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td style={{ fontWeight: 500 }}>{r.name}</td>
                          <td style={{ fontSize: 12 }}>{r.email}</td>
                          <td style={{ fontSize: 12, fontFamily: "monospace" }}>{r.password}</td>
                          <td>
                            {r.status === "success"
                              ? <span className="badge badge-success">✅ Done</span>
                              : <span className="badge badge-danger" title={r.error}>
                                  ❌ {r.error?.includes("email-already") ? "Email exists" : r.error?.includes("password") ? "Weak password" : "Failed"}
                                </span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="alert alert-info" style={{ fontSize: 12 }}>
                  💡 Save the passwords above — they will not be shown again.
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <button className="btn btn-outline" onClick={() => setShowBulkModal(false)}>
                {bulkResults.length > 0 ? "Close" : "Cancel"}
              </button>
              {bulkPreview.length > 0 && bulkResults.length === 0 && (
                <button className="btn btn-primary" onClick={handleBulkUpload} disabled={bulkUploading}>
                  {bulkUploading
                    ? `Uploading ${bulkProgress?.done || 0}/${bulkProgress?.total}...`
                    : `🚀 Upload ${bulkPreview.length} Students`
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}