import React, { useEffect, useState } from "react";
import { collection, getDocs, setDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../../firebase/config";

const EMPTY_FORM = { name:"",fatherName:"",cnic:"",email:"",phone:"",gender:"Male",dob:"",city:"",address:"" };
const EMPTY_PROG = { title:"",session:"",shift:"Morning",rollNo:"",regNo:"",dmcNo:"" };

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

  useEffect(() => { loadStudents(); }, []);

  async function loadStudents() {
    setLoading(true);
    const snap = await getDocs(collection(db,"students"));
    setStudents(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    setLoading(false);
  }

  function openAdd() { setForm(EMPTY_FORM); setPrograms([{...EMPTY_PROG}]); setEditing(null); setPassword(""); setShowModal(true); setCredentials(null); }
  function openEdit(s) {
    const { programs:progs, uid, id, ...rest } = s;
    setForm(rest); setPrograms(progs?.length ? progs : [{...EMPTY_PROG}]);
    setEditing(s.id); setPassword(""); setShowModal(true); setCredentials(null);
  }

  function addProg() { setPrograms([...programs, {...EMPTY_PROG}]); }
  function removeProg(i) { if(programs.length>1) setPrograms(programs.filter((_,idx)=>idx!==i)); }
  function setProg(i,key,val) { setPrograms(programs.map((p,idx)=>idx===i?{...p,[key]:val}:p)); }

  async function handleSave() {
    if (!programs[0].title || !programs[0].rollNo) { alert("Fill in at least one program with title and roll number."); return; }
    setSaving(true);
    const active = programs[programs.length-1];
    const data = { ...form, rollNo:active.rollNo||"", regNo:active.regNo||"", program:active.title||"", session:active.session||"", shift:active.shift||"Morning", dmcNo:active.dmcNo||"", programs };
    try {
      if (editing) {
        await updateDoc(doc(db,"students",editing), data);
        setShowModal(false); loadStudents();
      } else {
        const finalPwd = password.trim() || "Password@123";
        const cred = await createUserWithEmailAndPassword(auth, form.email, finalPwd);
        // ✅ setDoc with UID as document ID — this is what makes login work
        await setDoc(doc(db,"students",cred.user.uid), { ...data, uid:cred.user.uid });
        setShowModal(false);
        setCredentials({ email:form.email, password:finalPwd, name:form.name });
        loadStudents();
      }
    } catch(e) { alert("Error: "+e.message); }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this student?")) return;
    await deleteDoc(doc(db,"students",id)); loadStudents();
  }

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.rollNo?.toLowerCase().includes(search.toLowerCase()) ||
    s.program?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const personalFields = [
    ["name","Full Name","text"],["fatherName","Father Name","text"],
    ["cnic","CNIC","text"],["email","Email","email"],
    ["phone","Phone","text"],["dob","Date of Birth","date"],
    ["city","City","text"],["address","Address","text"],
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Student Management</h2>
          <div className="page-header-sub">Register and manage student accounts</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Student</button>
      </div>

      {credentials && (
        <div className="cred-banner">
          <div style={{ flex:1 }}>
            <div className="cred-title">✅ Student Registered Successfully!</div>
            <div style={{ fontSize:13, opacity:0.85, marginBottom:4 }}>Share these login credentials with <strong>{credentials.name}</strong>:</div>
            <div className="cred-row">
              <div className="cred-item"><span className="cred-label">Email</span><span className="cred-value">{credentials.email}</span></div>
              <div className="cred-item"><span className="cred-label">Password</span><span className="cred-value">{credentials.password}</span></div>
            </div>
            <div className="cred-note">⚠️ Save these now. The password will not be shown again.</div>
          </div>
          <button style={{ background:"rgba(255,255,255,0.15)",border:"none",color:"white",cursor:"pointer",padding:"6px 12px",borderRadius:6,fontSize:13 }} onClick={() => setCredentials(null)}>✕ Dismiss</button>
        </div>
      )}

      <div style={{ marginBottom:18 }}>
        <input className="form-control" style={{ maxWidth:400 }} placeholder="🔍 Search by name, roll no, email or program..."
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
                {filtered.map((s,i) => (
                  <tr key={s.id}>
                    <td>{i+1}</td>
                    <td><span className="badge badge-primary">{s.rollNo}</span></td>
                    <td>
                      <div style={{ fontWeight:600 }}>{s.name}</div>
                      <div style={{ fontSize:11,color:"var(--text-muted)" }}>{s.email}</div>
                    </td>
                    <td style={{ fontSize:12 }}>
                      {s.programs?.length > 1 ? (
                        <div>
                          <span className="badge badge-info">{s.programs.length} Degrees</span>
                          <div style={{ fontSize:11,color:"var(--text-muted)",marginTop:2 }}>{s.programs.map(p=>p.title).join(" · ")}</div>
                        </div>
                      ) : s.program}
                    </td>
                    <td style={{ fontSize:12 }}>{s.session}</td>
                    <td style={{ fontSize:12 }}>{s.phone}</td>
                    <td>
                      <div style={{ display:"flex",gap:8 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(s)}>✏️ Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={7}><div className="empty-state"><p>No students found</p></div></td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal modal-lg" style={{ maxHeight:"90vh",overflowY:"auto" }}>
            <div className="modal-header">
              <h3>{editing ? "Edit Student" : "Add New Student"}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="section-header">Personal Information</div>
            <div className="form-row">
              {personalFields.map(([key,label,type]) => (
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

            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8 }}>
              <div className="section-header" style={{ margin:0 }}>Enrolled Programs / Degrees</div>
              <button className="btn btn-outline btn-sm" onClick={addProg}>+ Add Another Degree</button>
            </div>
            <p style={{ fontSize:12,color:"var(--text-muted)",margin:"6px 0 14px" }}>Last program is the active/current one used for courses, timetable and attendance.</p>

            {programs.map((prog,i) => (
              <div key={i} style={{ border:"1px solid var(--border)",borderRadius:10,padding:"16px 18px",marginBottom:14,background:"#f8fafc" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
                  <span style={{ fontWeight:700,color:"var(--primary)",fontSize:13 }}>
                    {i===programs.length-1 ? "🟢 Current Program" : `📘 Previous Program ${i+1}`}
                  </span>
                  {programs.length > 1 && <button className="btn btn-danger btn-sm" onClick={() => removeProg(i)}>Remove</button>}
                </div>
                <div className="form-row">
                  <div className="form-group full-width">
                    <label>Program Title</label>
                    <input className="form-control" placeholder="e.g. M.Phil International Relations"
                      value={prog.title} onChange={e=>setProg(i,"title",e.target.value)} />
                  </div>
                  <div className="form-group"><label>Roll No</label><input className="form-control" placeholder="e.g. 230797" value={prog.rollNo} onChange={e=>setProg(i,"rollNo",e.target.value)} /></div>
                  <div className="form-group"><label>Registration No</label><input className="form-control" placeholder="e.g. 2016-GCUF-08920" value={prog.regNo} onChange={e=>setProg(i,"regNo",e.target.value)} /></div>
                  <div className="form-group"><label>Session</label><input className="form-control" placeholder="e.g. 2023-2025" value={prog.session} onChange={e=>setProg(i,"session",e.target.value)} /></div>
                  <div className="form-group">
                    <label>Shift</label>
                    <select className="form-control" value={prog.shift} onChange={e=>setProg(i,"shift",e.target.value)}>
                      <option>Morning</option><option>Evening</option>
                    </select>
                  </div>
                  <div className="form-group full-width"><label>DMC No</label><input className="form-control" placeholder="e.g. 499635" value={prog.dmcNo} onChange={e=>setProg(i,"dmcNo",e.target.value)} /></div>
                </div>
              </div>
            ))}

            {!editing && (
              <>
                <div className="section-header" style={{ marginTop:8 }}>Login Credentials</div>
                <p style={{ fontSize:12,color:"var(--text-muted)",margin:"-8px 0 12px" }}>Leave blank to use default: <strong>Password@123</strong></p>
                <div className="form-group">
                  <label>Password</label>
                  <input className="form-control" type="text" placeholder="Password@123" value={password} onChange={e=>setPassword(e.target.value)} />
                </div>
              </>
            )}

            <div style={{ display:"flex",gap:10,marginTop:20,justifyContent:"flex-end" }}>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?"Saving...":"💾 Save Student"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
