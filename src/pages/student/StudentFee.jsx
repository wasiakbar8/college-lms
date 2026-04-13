import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";

// --- EMBEDDED BUSINESS LOGIC ---
const calculateLateFee = (dueDateString, lateFeePerDay = 100) => {
  if (!dueDateString) return 0;
  const today = new Date(); const dueDate = new Date(dueDateString);
  today.setHours(0, 0, 0, 0); dueDate.setHours(0, 0, 0, 0);
  if (today > dueDate) return Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24)) * lateFeePerDay;
  return 0;
};

const processFeeRecord = (rawFee) => {
  const baseAmount = (rawFee.feeBreakdown && rawFee.feeBreakdown.length > 0)
    ? rawFee.feeBreakdown.reduce((sum, item) => sum + Number(item.amount), 0)
    : Number(rawFee.netAmt || 0);
    
  const lateFee = calculateLateFee(rawFee.dueDate, rawFee.lateFeePerDay || 100);
  const totalAmount = baseAmount + lateFee;
  
  const totalPaid = (rawFee.payments && rawFee.payments.length > 0)
    ? rawFee.payments.reduce((sum, p) => sum + Number(p.amount), 0)
    : Number(rawFee.paidAmt || 0);
    
  const remainingAmount = Math.max(0, totalAmount - totalPaid);
  
  let status = "Partial";
  if (totalPaid === 0) status = "Unpaid";
  else if (totalPaid >= totalAmount) status = "Paid";

  return { 
    ...rawFee, totalAmount, totalPaid, remainingAmount, status, lateFee, 
    payments: rawFee.payments || [], 
    feeBreakdown: rawFee.feeBreakdown || [],
    pendingPayments: rawFee.pendingPayments || [] // NEW: Track unapproved proofs
  };
};
// -------------------------------

export default function StudentFee() {
  const { userData } = useAuth();
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  
  // NEW: Proof Upload Modal State
  const [proofModal, setProofModal] = useState({ open: false, voucherId: null, amount: "", date: new Date().toISOString().split('T')[0], method: "Bank Transfer", transactionId: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, [userData]);

  async function load() {
    if (!userData?.rollNo) return;
    try {
      const snap = await getDocs(query(collection(db, "fees"), where("rollNo", "==", userData.rollNo)));
      const data = snap.docs.map(d => processFeeRecord({ id: d.id, ...d.data() }));
      data.sort((a, b) => (a.semester || "").localeCompare(b.semester || ""));
      setFees(data);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  const totalPaid = fees.reduce((a, f) => a + f.totalPaid, 0);
  const totalDue = fees.reduce((a, f) => a + f.remainingAmount, 0);

  function printVoucher(fee) {
    setSelected(fee);
    setTimeout(() => { window.print(); }, 300);
  }

  // NEW: Handle Student Submitting Proof
  async function handleSubmitProof(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const pendingObj = {
        amount: Number(proofModal.amount),
        date: proofModal.date,
        method: proofModal.method,
        transactionId: proofModal.transactionId,
        submittedAt: new Date().toISOString()
      };
      
      await updateDoc(doc(db, "fees", proofModal.voucherId), {
        pendingPayments: arrayUnion(pendingObj)
      });
      
      setProofModal({ open: false, voucherId: null, amount: "", date: "", method: "Bank Transfer", transactionId: "" });
      alert("Payment proof submitted for admin verification.");
      load();
    } catch (error) {
      alert("Error submitting proof: " + error.message);
    }
    setSubmitting(false);
  }

  return (
    <div>
      <div className="page-header no-print">
        <div>
          <h2>Fee & Vouchers</h2>
          <div className="page-header-sub">View fee history and submit payment proofs</div>
        </div>
      </div>

      <div className="no-print" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px,1fr))", gap:16, marginBottom:24 }}>
        {[
          { label:"Total Paid", value:`Rs. ${totalPaid.toLocaleString()}`, icon:"✅", color:"#dcfce7", tc:"#16a34a" },
          { label:"Total Due", value:totalDue > 0 ? `Rs. ${totalDue.toLocaleString()}` : "Clear", icon:totalDue > 0 ? "⚠️" : "✅", color: totalDue > 0 ? "#fee2e2" : "#dcfce7", tc: totalDue > 0 ? "#dc2626" : "#16a34a" },
          { label:"Pending Vouchers", value:fees.filter(f=>f.status!=="Paid").length, icon:"🕐", color:"#fef3c7", tc:"#d97706" },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{ background:s.color }}><span style={{ fontSize:18 }}>{s.icon}</span></div>
            <div><div className="stat-value" style={{ fontSize:18, color:s.tc }}>{s.value}</div><div className="stat-label">{s.label}</div></div>
          </div>
        ))}
      </div>

      {loading ? ( <div className="empty-state"><p>Loading fee records...</p></div> ) : (
        <div className="no-print" style={{ display:"grid", gap:16 }}>
          {fees.map(fee => (
            <div key={fee.id} className="voucher-card">
              <div className="voucher-header">
                <div>
                  <div style={{ fontSize:11, color:"var(--text-muted)", textTransform:"uppercase" }}>Fee Voucher</div>
                  <div style={{ fontWeight:700, fontSize:16 }}>Ref: {fee.referenceId || fee.voucherNo}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div className={`voucher-stamp ${fee.status === "Paid" ? "paid" : "unpaid"}`}>{fee.status}</div>
                  <div style={{ fontSize:20, fontWeight:700, color: fee.status === "Paid" ? "var(--success)" : "var(--danger)" }}>
                    Remaining: Rs. {fee.remainingAmount.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Verified Payments UI */}
              <div style={{marginTop: 12, padding: 12, background: '#f8fafc', borderRadius: 6}}>
                <strong>Payment History (Verified)</strong>
                {fee.payments?.length > 0 ? (
                   <ul style={{ margin:0, paddingLeft: 16, fontSize: 13 }}>
                     {fee.payments.map((p, i) => (
                       <li key={i}>{p.date} - {p.method} - Rs. {Number(p.amount).toLocaleString()}</li>
                     ))}
                   </ul>
                ) : <div style={{ fontSize: 12, color: '#64748b' }}>No verified payments yet.</div>}
              </div>

              {/* NEW: Pending Payments UI */}
              {fee.pendingPayments?.length > 0 && (
                <div style={{marginTop: 8, padding: 12, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6}}>
                  <strong style={{color: '#d97706'}}>⏳ Pending Verification</strong>
                  <ul style={{ margin:0, paddingLeft: 16, fontSize: 13, color: '#92400e' }}>
                    {fee.pendingPayments.map((p, i) => (
                      <li key={i}>Rs. {Number(p.amount).toLocaleString()} submitted via {p.method} (Ref: {p.transactionId})</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ display:"flex", justifyContent:"flex-end", gap: 8, marginTop: 16 }}>
                {fee.status !== "Paid" && (
                  <button className="btn btn-primary btn-sm" onClick={() => setProofModal({ open:true, voucherId:fee.id, amount:"", date: new Date().toISOString().split('T')[0], method:"Bank Transfer", transactionId:"" })}>
                    📤 Submit Proof
                  </button>
                )}
                <button className="btn btn-outline btn-sm" onClick={() => printVoucher(fee)}>🖨️ Print Detailed Voucher</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NEW: Proof Upload Modal */}
      {proofModal.open && (
        <div className="modal-overlay">
          <form className="modal" onSubmit={handleSubmitProof} style={{maxWidth: 400}}>
             <div className="modal-header">
              <h3>Submit Payment Proof</h3>
              <button type="button" className="btn btn-ghost btn-icon" onClick={()=>setProofModal({...proofModal, open:false})}>✕</button>
            </div>
            <p style={{fontSize: 12, color: "gray", marginBottom: 12}}>Submit your transaction details. Admin will verify and update your balance.</p>
            <div className="form-group mb-2"><label>Amount Paid (Rs.)</label><input required className="form-control" type="number" min="1" value={proofModal.amount} onChange={e=>setProofModal({...proofModal, amount:e.target.value})} /></div>
            <div className="form-group mb-2"><label>Payment Date</label><input required className="form-control" type="date" value={proofModal.date} onChange={e=>setProofModal({...proofModal, date:e.target.value})} /></div>
            <div className="form-group mb-2">
               <label>Payment Method</label>
               <select className="form-control" value={proofModal.method} onChange={e=>setProofModal({...proofModal, method:e.target.value})}>
                 <option>Bank Transfer</option><option>EasyPaisa/JazzCash</option><option>Cash Deposit</option>
               </select>
            </div>
            <div className="form-group mb-4"><label>Transaction ID / Reference No.</label><input required className="form-control" placeholder="e.g. TID-123456789" value={proofModal.transactionId} onChange={e=>setProofModal({...proofModal, transactionId:e.target.value})} /></div>
            <button type="submit" className="btn btn-primary full-width" disabled={submitting}>{submitting ? "Submitting..." : "Submit for Verification"}</button>
          </form>
        </div>
      )}
      
      {/* Print View remains the same... */}
    </div>
  );
}