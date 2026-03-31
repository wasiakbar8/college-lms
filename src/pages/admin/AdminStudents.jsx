import React, { useEffect, useState, useRef } from "react";
import { collection, getDocs, setDoc, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth, secondaryAuth } from "../../firebase/config";

const FIREBASE_API_KEY = "AIzaSyBSswy0YDa268mwUCfCY-3nn6ukZzTd9YE";
const EMPTY_FORM = { name:"",fatherName:"",cnic:"",email:"",phone:"",gender:"Male",dob:"",city:"",address:"" };
const EMPTY_PROG = { title:"",session:"",shift:"Morning",rollNo:"",regNo:"",dmcNo:"" };

// ── Parse CSV text into array of objects ──
function parseCSV(text) {
  const lines = text.trim().split("\n").map(l => l.replace(/\r/g, ""));
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g,""));
  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
    return obj;
  });
}

// ── Map CSV row to student data structure ──
function rowToStudent(row) {
  return {
    name: row.name || row.fullname || "",
    fatherName: row.fathername || row.father || "",
    cnic: row.cnic || "",
    email: row.email || "",
    phone: row.phone || row.contact || "",
    gender: row.gender || "Male",
    dob: row.dob || row.dateofbirth || "",
    city: row.city || "",
    address: row.address || "",
    rollNo: row.rollno || row.roll || "",
    regNo: row.regno || row.registration || "",
    program: row.program || row.degree || "",
    session: row.session || "",
    shift: row.shift || "Morning",
    dmcNo: row.dmcno || row.dmc || "",
    programs: [{
      title: row.program || row.degree || "",
      session: row.session || "",
      shift: row.shift || "Morning",
      rollNo: row.rollno || row.roll || "",
      regNo: row.regno || row.registration || "",
      dmcNo: row.dmcno || row.dmc || "",
    }],
  };
}

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [programs, setPrograms] = useState([{...EMPTY_PROG}]);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [credentials, setCredentials] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // Bulk upload states
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkProgress, setBulkProgress] = useState(null); // {done, total}
  const [bulkResults, setBulkResults] = useState([]); // [{name, email, password, status}]
  const [bulkUploading, setBulkUploading] = useState(false);
  const fileInputRef = useRef();

  useEffect(() => { loadStudents(); }, []);

  async function loadStudents() {
    setLoading(true);
    const snap = await getDocs(collection(db, "students"));
    setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  function openAdd() {
    setForm(EMPTY_FORM); setPrograms([{...EMPTY_PROG}]);
    setEditing(null); setPassword(""); setShowModal(true); setCredentials(null);
  }

  function openEdit(s) {
    const { programs: progs, uid, id, ...rest } = s;
    setForm(rest); setPrograms(progs?.length ? progs : [{...EMPTY_PROG}]);
    setEditing(s.id); setPassword(""); setShowModal(true); setCredentials(null);
  }

  function addProg() { setPrograms([...programs, {...EMPTY_PROG}]); }
  function removeProg(i) { if (programs.length > 1) setPrograms(programs.filter((_, idx) => idx !== i)); }
  function setProg(i, key, val) { setPrograms(programs.map((p, idx) => idx === i ? {...p, [key]: val} : p)); }

  async function handleSave() {
    if (!programs[0].title || !programs[0].rollNo) {
      alert("Fill in at least one program with title and roll number.");
      return;
    }
    setSaving(true);
    const active = programs[programs.length - 1];
    const data = {
      ...form,
      rollNo: active.rollNo || "", regNo: active.regNo || "",
      program: active.title || "", session: active.session || "",
      shift: active.shift || "Morning", dmcNo: active.dmcNo || "",
      programs,
    };
    try {
      if (editing) {
        await updateDoc(doc(db, "students", editing), data);
        setShowModal(false); loadStudents();
      } else {
        const finalPwd = (password && password.trim().length >= 6) ? password.trim() : "Password@123";
        const cred = await createUserWithEmailAndPassword(secondaryAuth, form.email, finalPwd);
        await setDoc(doc(db, "students", cred.user.uid), { ...data, uid: cred.user.uid });
        setShowModal(false);
        setCredentials({ email: form.email, password: finalPwd, name: form.name });
        loadStudents();
      }
    } catch(e) { alert("Error: " + e.message); }
    setSaving(false);
  }

  async function handleDelete(id) {
    const student = students.find(s => s.id === id);
    if (!student) return;
    const confirmed = window.confirm(
      `Delete student: ${student.name}?\n\nThis will permanently delete:\n• Student profile\n• All attendance records\n• All results & grades\n• All fee vouchers\n• Login account\n\nThis cannot be undone.`
    );
    if (!confirmed) return;
    setDeleting(id);
    try {
      const rollNo = student.rollNo;
      const [attSnap, resSnap, feeSnap] = await Promise.all([
        getDocs(query(collection(db, "attendance"), where("rollNo", "==", rollNo))),
        getDocs(query(collection(db, "results"), where("rollNo", "==", rollNo))),
        getDocs(query(collection(db, "fees"), where("rollNo", "==", rollNo))),
      ]);
      await Promise.all([
        ...attSnap.docs.map(d => deleteDoc(doc(db, "attendance", d.id))),
        ...resSnap.docs.map(d => deleteDoc(doc(db, "results", d.id))),
        ...feeSnap.docs.map(d => deleteDoc(doc(db, "fees", d.id))),
      ]);
      await deleteDoc(doc(db, "students", id));
      loadStudents();
    } catch(e) { alert("Error deleting student: " + e.message); }
    setDeleting(null);
  }

  // ── BULK UPLOAD ──────────────────────────────────────────────────────────

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
          const rows = parseCSV(ev.target.result);
          validateAndPreview(rows);
        } else {
          // For XLSX/XLS — use SheetJS if available, else prompt to use CSV
          if (window.XLSX) {
            const wb = window.XLSX.read(ev.target.result, { type: "binary" });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = window.XLSX.utils.sheet_to_json(ws, { defval: "" });
            // normalize keys
            const normalized = rows.map(r => {
              const obj = {};
              Object.keys(r).forEach(k => { obj[k.toLowerCase().replace(/\s+/g,"")] = String(r[k]); });
              return obj;
            });
            validateAndPreview(normalized);
          } else {
            setBulkErrors(["XLSX support requires SheetJS. Please convert your file to CSV first and upload again.\n\nIn Excel: File → Save As → CSV (Comma delimited)"]);
          }
        }
      } catch(err) {
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
      const student = rowToStudent(row);
      if (!student.name) errors.push(`Row ${rowNum}: Name is required`);
      if (!student.email) errors.push(`Row ${rowNum}: Email is required`);
      if (!student.email.includes("@")) errors.push(`Row ${rowNum}: Invalid email "${student.email}"`);
      if (!student.program) errors.push(`Row ${rowNum}: Program is required`);
      if (!student.rollNo) errors.push(`Row ${rowNum}: Roll No is required`);
      if (!errors.find(e => e.startsWith(`Row ${rowNum}`))) {
        valid.push({ ...student, _password: row.password || "Password@123" });
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
      const pwd = (student._password && student._password.trim().length >= 6)
        ? student._password.trim()
        : "Password@123";
      try {
        const cred = await createUserWithEmailAndPassword(secondaryAuth, student.email, pwd);
        const { _password, ...cleanData } = student;
        await setDoc(doc(db, "students", cred.user.uid), { ...cleanData, uid: cred.user.uid });
        results.push({ name: student.name, email: student.email, password: pwd, status: "success" });
      } catch(e) {
        results.push({ name: student.name, email: student.email, password: pwd, status: "error", error: e.message });
      }
      setBulkProgress({ done: i + 1, total: bulkPreview.length });
    }

    setBulkResults(results);
    setBulkUploading(false);
    loadStudents();
  }

  function downloadTemplate() {
    const csv = `name,fatherName,cnic,email,phone,gender,dob,city,address,rollNo,regNo,program,session,shift,dmcNo,password
Ahmed Ali,Muhammad Ali,33102-1234567-1,ahmed@university.edu,0300-1234567,Male,01-01-1999,Lahore,House 1 Street 1,230001,2023-GCUF-001,M.Phil International Relations,2023-2025,Morning,499001,Ahmed@123
Sara Khan,Khan Muhammad,33102-7654321-2,sara@university.edu,0311-7654321,Female,15-06-2000,Karachi,Flat 5 Block B,230002,2023-GCUF-002,M.Phil International Relations,2023-2025,Morning,499002,Sara@123`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "students_template.csv";
    a.click(); URL.revokeObjectURL(url);
  }

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.rollNo?.toLowerCase().includes(search.toLowerCase()) ||
    s.program?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const personalFields = [
    ["name","Full Name","text"], ["fatherName","Father Name","text"],
    ["cnic","CNIC","text"], ["email","Email","email"],
    ["phone","Phone","text"], ["dob","Date of Birth","date"],
    ["city","City","text"], ["address","Address","text"],
  ];

  const successCount = bulkResults.filter(r => r.status === "success").length;
  const errorCount = bulkResults.filter(r => r.status === "error").length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Student Management</h2>
          <div className="page-header-sub">Register and manage student accounts</div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button className="btn btn-outline" onClick={openBulkModal}>📂 Bulk Upload</button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Student</button>
        </div>
      </div>

      {credentials && (
        <div className="cred-banner">
          <div style={{ flex:1 }}>
            <div className="cred-title">✅ Student Registered Successfully!</div>
            <div style={{ fontSize:13, opacity:0.85, marginBottom:4 }}>
              Share these login credentials with <strong>{credentials.name}</strong>:
            </div>
            <div className="cred-row">
              <div className="cred-item"><span className="cred-label">Email</span><span className="cred-value">{credentials.email}</span></div>
              <div className="cred-item"><span className="cred-label">Password</span><span className="cred-value">{credentials.password}</span></div>
            </div>
            <div className="cred-note">⚠️ Save these now. The password will not be shown again.</div>
          </div>
          <button style={{ background:"rgba(255,255,255,0.15)",border:"none",color:"white",cursor:"pointer",padding:"6px 12px",borderRadius:6,fontSize:13 }}
            onClick={() => setCredentials(null)}>✕ Dismiss</button>
        </div>
      )}

      <div style={{ marginBottom:18 }}>
        <input className="form-control" style={{ maxWidth:400 }}
          placeholder="🔍 Search by name, roll no, email or program..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card" style={{ padding:0 }}>
        <div className="table-wrap">
          {loading ? (
            <div className="empty-state"><p>Loading students...</p></div>
          ) : (
            <table>
              <thead>
                <tr><th>#</th><th>Roll No</th><th>Name</th><th>Program</th><th>Session</th><th>Phone</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id} style={{ opacity: deleting === s.id ? 0.4 : 1, transition:"opacity 0.2s" }}>
                    <td>{i+1}</td>
                    <td><span className="badge badge-primary">{s.rollNo}</span></td>
                    <td>
                      <div style={{ fontWeight:600 }}>{s.name}</div>
                      <div style={{ fontSize:11, color:"var(--text-muted)" }}>{s.email}</div>
                    </td>
                    <td style={{ fontSize:12 }}>
                      {s.programs?.length > 1 ? (
                        <div>
                          <span className="badge badge-info">{s.programs.length} Degrees</span>
                          <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:2 }}>{s.programs.map(p=>p.title).join(" · ")}</div>
                        </div>
                      ) : s.program}
                    </td>
                    <td style={{ fontSize:12 }}>{s.session}</td>
                    <td style={{ fontSize:12 }}>{s.phone}</td>
                    <td>
                      <div style={{ display:"flex", gap:8 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(s)} disabled={deleting===s.id}>✏️ Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)} disabled={deleting===s.id}>
                          {deleting===s.id ? "Deleting..." : "🗑️ Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length===0 && <tr><td colSpan={7}><div className="empty-state"><p>No students found</p></div></td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Single Add/Edit Modal ── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal modal-lg" style={{ maxHeight:"90vh", overflowY:"auto" }}>
            <div className="modal-header">
              <h3>{editing ? "Edit Student" : "Add New Student"}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="section-header">Personal Information</div>
            <div className="form-row">
              {personalFields.map(([key, label, type]) => (
                <div className="form-group" key={key} style={key==="address"?{gridColumn:"1/-1"}:{}}>
                  <label>{label}</label>
                  <input className="form-control" type={type} value={form[key]||""} onChange={e=>setForm({...form,[key]:e.target.value})} />
                </div>
              ))}
              <div className="form-group">
                <label>Gender</label>
                <select className="form-control" value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}>
                  <option>Male</option><option>Female</option>
                </select>
              </div>
            </div>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
              <div className="section-header" style={{ margin:0 }}>Enrolled Programs / Degrees</div>
              <button className="btn btn-outline btn-sm" onClick={addProg}>+ Add Another Degree</button>
            </div>
            <p style={{ fontSize:12, color:"var(--text-muted)", margin:"6px 0 14px" }}>
              Last program is the active/current one.
            </p>

            {programs.map((prog, i) => (
              <div key={i} style={{ border:"1px solid var(--border)", borderRadius:10, padding:"16px 18px", marginBottom:14, background:"#f8fafc" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <span style={{ fontWeight:700, color:"var(--primary)", fontSize:13 }}>
                    {i===programs.length-1 ? "🟢 Current Program" : `📘 Previous Program ${i+1}`}
                  </span>
                  {programs.length>1 && <button className="btn btn-danger btn-sm" onClick={()=>removeProg(i)}>Remove</button>}
                </div>
                <div className="form-row">
                  <div className="form-group full-width">
                    <label>Program Title</label>
                    <input className="form-control" placeholder="e.g. M.Phil International Relations" value={prog.title} onChange={e=>setProg(i,"title",e.target.value)} />
                  </div>
                  <div className="form-group"><label>Roll No</label><input className="form-control" value={prog.rollNo} onChange={e=>setProg(i,"rollNo",e.target.value)} /></div>
                  <div className="form-group"><label>Registration No</label><input className="form-control" value={prog.regNo} onChange={e=>setProg(i,"regNo",e.target.value)} /></div>
                  <div className="form-group"><label>Session</label><input className="form-control" placeholder="e.g. 2023-2025" value={prog.session} onChange={e=>setProg(i,"session",e.target.value)} /></div>
                  <div className="form-group">
                    <label>Shift</label>
                    <select className="form-control" value={prog.shift} onChange={e=>setProg(i,"shift",e.target.value)}>
                      <option>Morning</option><option>Evening</option>
                    </select>
                  </div>
                  <div className="form-group full-width"><label>DMC No</label><input className="form-control" value={prog.dmcNo} onChange={e=>setProg(i,"dmcNo",e.target.value)} /></div>
                </div>
              </div>
            ))}

            {!editing && (
              <>
                <div className="section-header" style={{ marginTop:8 }}>Login Credentials</div>
                <p style={{ fontSize:12, color:"var(--text-muted)", margin:"-8px 0 12px" }}>Leave blank to use default: <strong>Password@123</strong></p>
                <div className="form-group">
                  <label>Password</label>
                  <input className="form-control" type="text" placeholder="Minimum 6 characters" value={password} onChange={e=>setPassword(e.target.value)} />
                  {password && password.trim().length < 6 && password.trim().length > 0 && (
                    <div style={{ color:"var(--danger)", fontSize:12, marginTop:4 }}>⚠️ Password must be at least 6 characters</div>
                  )}
                </div>
              </>
            )}

            <div style={{ display:"flex", gap:10, marginTop:20, justifyContent:"flex-end" }}>
              <button className="btn btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?"Saving...":"💾 Save Student"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Upload Modal ── */}
      {showBulkModal && (
        <div className="modal-overlay">
          <div className="modal modal-lg" style={{ maxHeight:"90vh", overflowY:"auto" }}>
            <div className="modal-header">
              <h3>📂 Bulk Upload Students</h3>
              <button className="btn btn-ghost btn-icon" onClick={()=>setShowBulkModal(false)}>✕</button>
            </div>

            {/* Step 1 — Download template */}
            <div style={{ background:"#f0f7ff", borderRadius:10, padding:"16px 18px", marginBottom:18, border:"1px solid #bfdbfe" }}>
              <div style={{ fontWeight:700, color:"var(--primary)", marginBottom:6, fontSize:14 }}>Step 1 — Download the CSV Template</div>
              <p style={{ fontSize:13, color:"var(--text-muted)", marginBottom:12 }}>
                Fill in all student data in the template. Each row = one student. Required columns: <strong>name, email, rollNo, program</strong>. All others are optional.
              </p>
              <button className="btn btn-outline btn-sm" onClick={downloadTemplate}>⬇️ Download CSV Template</button>
            </div>

            {/* Step 2 — Upload file */}
            <div style={{ marginBottom:18 }}>
              <div className="section-header">Step 2 — Upload Your File</div>
              <p style={{ fontSize:12, color:"var(--text-muted)", marginBottom:10 }}>Supported formats: CSV, XLSX, XLS</p>
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls"
                style={{ display:"block", padding:"10px", border:"2px dashed var(--border)", borderRadius:8, width:"100%", cursor:"pointer", fontSize:13 }}
                onChange={handleFileChange} />
            </div>

            {/* Errors */}
            {bulkErrors.length > 0 && (
              <div className="alert alert-danger" style={{ marginBottom:16 }}>
                <div style={{ fontWeight:700, marginBottom:6 }}>⚠️ Issues found in your file:</div>
                {bulkErrors.map((e, i) => <div key={i} style={{ fontSize:12 }}>• {e}</div>)}
              </div>
            )}

            {/* Preview table */}
            {bulkPreview.length > 0 && bulkResults.length === 0 && (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <div style={{ fontWeight:700, fontSize:14, color:"var(--primary)" }}>
                    ✅ {bulkPreview.length} student{bulkPreview.length!==1?"s":""} ready to import
                  </div>
                  {bulkErrors.length > 0 && (
                    <span className="badge badge-warning">{bulkErrors.length} rows skipped</span>
                  )}
                </div>
                <div className="table-wrap" style={{ maxHeight:240, overflowY:"auto", marginBottom:16, border:"1px solid var(--border)", borderRadius:8 }}>
                  <table>
                    <thead>
                      <tr><th>#</th><th>Name</th><th>Email</th><th>Roll No</th><th>Program</th><th>Password</th></tr>
                    </thead>
                    <tbody>
                      {bulkPreview.map((s, i) => (
                        <tr key={i}>
                          <td>{i+1}</td>
                          <td style={{ fontWeight:500 }}>{s.name}</td>
                          <td style={{ fontSize:12 }}>{s.email}</td>
                          <td><span className="badge badge-primary">{s.rollNo}</span></td>
                          <td style={{ fontSize:12 }}>{s.program}</td>
                          <td style={{ fontSize:12, fontFamily:"monospace" }}>{s._password || "Password@123"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Progress bar */}
            {bulkUploading && bulkProgress && (
              <div style={{ marginBottom:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:6 }}>
                  <span>Uploading students...</span>
                  <span style={{ fontWeight:600 }}>{bulkProgress.done} / {bulkProgress.total}</span>
                </div>
                <div className="progress-bar" style={{ height:12 }}>
                  <div className="progress-fill" style={{ width:`${(bulkProgress.done/bulkProgress.total)*100}%`, background:"var(--primary)" }} />
                </div>
              </div>
            )}

            {/* Results */}
            {bulkResults.length > 0 && (
              <>
                <div style={{ display:"flex", gap:12, marginBottom:12 }}>
                  {successCount > 0 && <span className="badge badge-success" style={{ fontSize:13, padding:"6px 14px" }}>✅ {successCount} registered</span>}
                  {errorCount > 0 && <span className="badge badge-danger" style={{ fontSize:13, padding:"6px 14px" }}>❌ {errorCount} failed</span>}
                </div>
                <div className="table-wrap" style={{ maxHeight:260, overflowY:"auto", marginBottom:16, border:"1px solid var(--border)", borderRadius:8 }}>
                  <table>
                    <thead>
                      <tr><th>#</th><th>Name</th><th>Email</th><th>Password</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {bulkResults.map((r, i) => (
                        <tr key={i}>
                          <td>{i+1}</td>
                          <td style={{ fontWeight:500 }}>{r.name}</td>
                          <td style={{ fontSize:12 }}>{r.email}</td>
                          <td style={{ fontSize:12, fontFamily:"monospace" }}>{r.password}</td>
                          <td>
                            {r.status==="success"
                              ? <span className="badge badge-success">✅ Done</span>
                              : <span className="badge badge-danger" title={r.error}>❌ {r.error?.includes("email-already")?"Email exists":r.error?.includes("password")?"Weak password":"Failed"}</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="alert alert-info" style={{ fontSize:12 }}>
                  💡 Save the passwords above — they will not be shown again. Share them with each student.
                </div>
              </>
            )}

            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:16 }}>
              <button className="btn btn-outline" onClick={()=>setShowBulkModal(false)}>
                {bulkResults.length > 0 ? "Close" : "Cancel"}
              </button>
              {bulkPreview.length > 0 && bulkResults.length === 0 && (
                <button className="btn btn-primary" onClick={handleBulkUpload} disabled={bulkUploading}>
                  {bulkUploading ? `Uploading ${bulkProgress?.done||0}/${bulkProgress?.total}...` : `🚀 Upload ${bulkPreview.length} Students`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}