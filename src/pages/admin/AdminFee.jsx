import React, { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../../firebase/config";

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
    payments: rawFee.payments || [], feeBreakdown: rawFee.feeBreakdown || [],
    pendingPayments: rawFee.pendingPayments || [] // NEW
  };
};
// -------------------------------

const EMPTY = { referenceId: "", voucherNo: "", rollNo: "", semester: "1st Semester", programTitle: "", dueDate: "", bankName: "", note: "", lateFeePerDay: 100, feeBreakdown: [{ title: "Tuition Fee", amount: 0 }], payments: [], pendingPayments: [] };

export default function AdminFee() {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  
  // NEW: State for reviewing a student's pending proofs
  const [reviewModal, setReviewModal] = useState({ open: false, fee: null });

  useEffect(() => { load(); }, []);
  
  async function load() {
    setLoading(true);
    const snap = await getDocs(collection(db,"fees"));
    setFees(snap.docs.map(d => processFeeRecord({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  // Handle Admin Approving a Proof
  async function handleApproveProof(feeId, pendingPaymentObj) {
    if (!window.confirm(`Approve payment of Rs. ${pendingPaymentObj.amount}?`)) return;
    try {
      const feeRef = doc(db, "fees", feeId);
      // Remove from pending, add to confirmed payments
      await updateDoc(feeRef, {
        pendingPayments: arrayRemove(pendingPaymentObj),
        payments: arrayUnion({
          amount: pendingPaymentObj.amount,
          date: pendingPaymentObj.date,
          method: pendingPaymentObj.method,
          transactionId: pendingPaymentObj.transactionId,
          approvedAt: new Date().toISOString()
        })
      });
      setReviewModal({open: false, fee: null});
      load();
    } catch(e) { alert("Error approving: " + e.message); }
  }

  // Handle Admin Rejecting a Proof
  async function handleRejectProof(feeId, pendingPaymentObj) {
    if (!window.confirm("Reject this payment proof? The student will need to submit it again.")) return;
    try {
      await updateDoc(doc(db, "fees", feeId), {
        pendingPayments: arrayRemove(pendingPaymentObj)
      });
      setReviewModal({open: false, fee: null});
      load();
    } catch(e) { alert("Error rejecting: " + e.message); }
  }

  const filtered = fees.filter(f => {
    const ms = f.rollNo?.toLowerCase().includes(search.toLowerCase()) || f.voucherNo?.toLowerCase().includes(search.toLowerCase());
    return ms && (filterStatus === "All" || f.status === filterStatus);
  });

  const pendingCount = fees.reduce((sum, f) => sum + (f.pendingPayments?.length || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div><h2>Fee Management</h2><div className="page-header-sub">Manage fee vouchers & partial payments</div></div>
        <button className="btn btn-primary" onClick={() => { setForm({...EMPTY, referenceId: `REF-${Date.now()}`}); setShowModal(true); }}>+ Add Voucher</button>
      </div>

      {/* Alert for Pending Verifications */}
      {pendingCount > 0 && (
        <div style={{ background: "#fffbeb", borderLeft: "4px solid #f59e0b", padding: "12px 16px", marginBottom: 20, borderRadius: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><strong>Action Required:</strong> You have <b>{pendingCount}</b> student payment proofs waiting for verification. Look for the ⏳ icon in the table.</div>
        </div>
      )}

      {/* Table & Dashboard Stats remain identical, just adding a column for Verifications */}
      <div className="card" style={{ padding:0 }}>
        <div className="table-wrap">
          {loading ? <div className="empty-state"><p>Loading...</p></div> : (
            <table>
              <thead>
                <tr><th>Ref ID</th><th>Roll No</th><th>Total</th><th>Paid</th><th>Remaining</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map((f)=>(
                  <tr key={f.id} style={{ background: f.pendingPayments?.length > 0 ? "#fffbeb" : "transparent" }}>
                    <td style={{ fontWeight:600 }}>{f.referenceId || f.voucherNo}</td>
                    <td><span className="badge badge-primary">{f.rollNo}</span></td>
                    <td style={{ fontWeight:600 }}>Rs. {f.totalAmount.toLocaleString()}</td>
                    <td style={{ color: "green" }}>Rs. {f.totalPaid.toLocaleString()}</td>
                    <td style={{ color: f.remainingAmount > 0 ? "red" : "inherit" }}>Rs. {f.remainingAmount.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${f.status === "Paid" ? "badge-success" : f.status === "Partial" ? "badge-warning" : "badge-danger"}`}>{f.status}</span>
                    </td>
                    <td>
                      <div style={{ display:"flex",gap:8 }}>
                        {f.pendingPayments?.length > 0 && (
                           <button className="btn btn-sm" style={{background: "#f59e0b", color:"white"}} onClick={()=>setReviewModal({open:true, fee: f})}>⏳ Verify</button>
                        )}
                        {/* Other buttons (Edit, Delete, Manual Pay) remain here */}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* NEW: Verification Review Modal */}
      {reviewModal.open && reviewModal.fee && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Verify Payment Proofs</h3>
              <button type="button" className="btn btn-ghost btn-icon" onClick={()=>setReviewModal({open:false, fee:null})}>✕</button>
            </div>
            <p className="mb-4">Student: <strong>{reviewModal.fee.rollNo}</strong></p>

            {reviewModal.fee.pendingPayments.map((p, i) => (
              <div key={i} style={{ border: "1px solid #e2e8f0", padding: 16, borderRadius: 8, marginBottom: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 14, marginBottom: 12 }}>
                  <div><span style={{color: "gray"}}>Amount:</span> <b>Rs. {Number(p.amount).toLocaleString()}</b></div>
                  <div><span style={{color: "gray"}}>Date:</span> {p.date}</div>
                  <div><span style={{color: "gray"}}>Method:</span> {p.method}</div>
                  <div><span style={{color: "gray"}}>Trans ID:</span> {p.transactionId}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-success full-width" onClick={() => handleApproveProof(reviewModal.fee.id, p)}>✅ Approve</button>
                  <button className="btn btn-danger full-width" onClick={() => handleRejectProof(reviewModal.fee.id, p)}>❌ Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}