import React, { useEffect, useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/config";

const SEMESTERS = ["0th Semester","1st Semester","2nd Semester","3rd Semester","4th Semester","5th Semester","6th Semester","7th Semester","8th Semester"];
const EMPTY = { voucherNo:"", rollNo:"", semester:"1st Semester", programTitle:"", netAmt:"", paidAmt:"", dueDate:"", paidDate:"", bankName:"", status:"Unpaid", note:"" };

export default function AdminFee() {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const snap = await getDocs(collection(db,"fees"));
    setFees(snap.docs.map(d=>({id:d.id,...d.data()})));
    setLoading(false);
  }

  function openAdd() { setForm(EMPTY); setEditing(null); setShowModal(true); }
  function openEdit(f) { setForm(f); setEditing(f.id); setShowModal(true); }

  async function handleSave() {
    if (!form.rollNo || !form.voucherNo) { alert("Voucher No and Roll No are required."); return; }
    setSaving(true);
    try {
      const { id, ...data } = form;
      const clean = { ...data, netAmt:Number(data.netAmt)||0, paidAmt:Number(data.paidAmt)||0 };
      if (editing) await updateDoc(doc(db,"fees",editing), clean);
      else await addDoc(collection(db,"fees"), clean);
      setShowModal(false); load();
    } catch(e) { alert("Error: "+e.message); }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this fee record?")) return;
    await deleteDoc(doc(db,"fees",id)); load();
  }

  const filtered = fees.filter(f => {
    const ms = f.rollNo?.toLowerCase().includes(search.toLowerCase()) || f.voucherNo?.toLowerCase().includes(search.toLowerCase()) || f.programTitle?.toLowerCase().includes(search.toLowerCase());
    const mst = filterStatus==="All" || f.status===filterStatus;
    return ms && mst;
  });

  const totalPaid = fees.filter(f=>f.status==="Paid").reduce((a,f)=>a+Number(f.paidAmt||0),0);
  const totalDue = fees.filter(f=>f.status!=="Paid").reduce((a,f)=>a+Number(f.netAmt||0),0);

  return (
    <div>
      <div className="page-header">
        <div><h2>Fee Management</h2><div className="page-header-sub">Add and manage fee vouchers for all students</div></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Voucher</button>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:16,marginBottom:24 }}>
        {[
          { label:"Total Collected",value:`Rs. ${totalPaid.toLocaleString()}`,icon:"✅",color:"#dcfce7",tc:"#16a34a" },
          { label:"Total Due",value:`Rs. ${totalDue.toLocaleString()}`,icon:"⚠️",color:"#fee2e2",tc:"#dc2626" },
          { label:"Total Vouchers",value:fees.length,icon:"🧾",color:"#dbeafe",tc:"#1d4ed8" },
          { label:"Paid",value:fees.filter(f=>f.status==="Paid").length,icon:"💚",color:"#dcfce7",tc:"#16a34a" },
          { label:"Unpaid",value:fees.filter(f=>f.status!=="Paid").length,icon:"🔴",color:"#fee2e2",tc:"#dc2626" },
        ].map(s=>(
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{ background:s.color }}><span style={{ fontSize:18 }}>{s.icon}</span></div>
            <div><div className="stat-value" style={{ fontSize:16,color:s.tc }}>{s.value}</div><div className="stat-label">{s.label}</div></div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex",gap:12,marginBottom:18,flexWrap:"wrap" }}>
        <input className="form-control" style={{ maxWidth:340 }} placeholder="🔍 Search by roll no, voucher no..." value={search} onChange={e=>setSearch(e.target.value)} />
        <select className="form-control" style={{ width:160 }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
          <option value="All">All Status</option><option>Paid</option><option>Unpaid</option>
        </select>
      </div>

      <div className="card" style={{ padding:0 }}>
        <div className="table-wrap">
          {loading ? <div className="empty-state"><p>Loading...</p></div> : (
            <table>
              <thead>
                <tr><th>#</th><th>Voucher No</th><th>Roll No</th><th>Program</th><th>Semester</th><th>Net Amt</th><th>Paid Amt</th><th>Due Date</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((f,i)=>(
                  <tr key={f.id}>
                    <td>{i+1}</td>
                    <td style={{ fontWeight:600 }}>{f.voucherNo}</td>
                    <td><span className="badge badge-primary">{f.rollNo}</span></td>
                    <td style={{ fontSize:12,maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{f.programTitle}</td>
                    <td style={{ fontSize:12 }}>{f.semester}</td>
                    <td style={{ fontWeight:600 }}>Rs. {Number(f.netAmt||0).toLocaleString()}</td>
                    <td>Rs. {Number(f.paidAmt||0).toLocaleString()}</td>
                    <td style={{ fontSize:12 }}>{f.dueDate}</td>
                    <td><span className={`badge ${f.status==="Paid"?"badge-success":"badge-danger"}`}>{f.status||"Unpaid"}</span></td>
                    <td>
                      <div style={{ display:"flex",gap:8 }}>
                        <button className="btn btn-outline btn-sm" onClick={()=>openEdit(f)}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(f.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length===0&&<tr><td colSpan={10}><div className="empty-state"><p>No records found</p></div></td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3>{editing?"Edit Fee Voucher":"Add Fee Voucher"}</h3>
              <button className="btn btn-ghost btn-icon" onClick={()=>setShowModal(false)}>✕</button>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Voucher No *</label><input className="form-control" placeholder="e.g. 4881536" value={form.voucherNo} onChange={e=>setForm({...form,voucherNo:e.target.value})} /></div>
              <div className="form-group"><label>Roll No *</label><input className="form-control" placeholder="Student roll number" value={form.rollNo} onChange={e=>setForm({...form,rollNo:e.target.value})} /></div>
              <div className="form-group full-width"><label>Program Title</label><input className="form-control" placeholder="Full program name" value={form.programTitle} onChange={e=>setForm({...form,programTitle:e.target.value})} /></div>
              <div className="form-group">
                <label>Semester</label>
                <select className="form-control" value={form.semester} onChange={e=>setForm({...form,semester:e.target.value})}>
                  {SEMESTERS.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select className="form-control" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                  <option>Paid</option><option>Unpaid</option>
                </select>
              </div>
              <div className="form-group"><label>Net Amount (PKR)</label><input className="form-control" type="number" min="0" value={form.netAmt} onChange={e=>setForm({...form,netAmt:e.target.value})} /></div>
              <div className="form-group"><label>Paid Amount (PKR)</label><input className="form-control" type="number" min="0" value={form.paidAmt} onChange={e=>setForm({...form,paidAmt:e.target.value})} /></div>
              <div className="form-group"><label>Due Date</label><input className="form-control" placeholder="e.g. 11-SEP-23" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})} /></div>
              <div className="form-group"><label>Paid Date</label><input className="form-control" placeholder="e.g. 11-SEP-23" value={form.paidDate} onChange={e=>setForm({...form,paidDate:e.target.value})} /></div>
              <div className="form-group"><label>Bank Name</label><input className="form-control" placeholder="e.g. Bank of Punjab" value={form.bankName} onChange={e=>setForm({...form,bankName:e.target.value})} /></div>
              <div className="form-group full-width"><label>Note (Optional)</label><input className="form-control" placeholder="Reference number or remarks" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} /></div>
            </div>
            <div style={{ display:"flex",gap:10,justifyContent:"flex-end",marginTop:16 }}>
              <button className="btn btn-outline" onClick={()=>setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?"Saving...":"💾 Save Voucher"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
