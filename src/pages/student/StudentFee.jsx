import React, { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, updateDoc, doc, arrayUnion } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import { toast, Toaster } from "react-hot-toast";
import { FileText, Printer, Send, X, Landmark, Calendar, Clock, CheckCircle } from "lucide-react";

export default function StudentFee() {
  const { userData } = useAuth();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showVoucher, setShowVoucher] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  
  // Form for submission
  const [proof, setProof] = useState({ transactionId: "", method: "Bank Transfer", amount: "" });

  useEffect(() => {
    if (!userData?.rollNo) return;
    const q = query(collection(db, "fees"), where("rollNo", "==", userData.rollNo));
    return onSnapshot(q, (snap) => {
      setVouchers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [userData]);

  const handleSubmitProof = async () => {
    if (!proof.transactionId || !proof.amount) return toast.error("Fill all details");
    try {
      await updateDoc(doc(db, "fees", selectedVoucher.id), {
        pendingPayments: arrayUnion({
          ...proof,
          submittedAt: new Date().toISOString(),
          status: "Pending"
        })
      });
      toast.success("Proof submitted! Waiting for Admin approval.");
      setShowSubmitModal(false);
      setProof({ transactionId: "", method: "Bank Transfer", amount: "" });
    } catch (e) { toast.error("Submission failed"); }
  };

  if (loading) return <div style={{ padding: 100, textAlign: "center" }}>Fetching your ledger...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <Toaster />
      <div style={{ background: "linear-gradient(135deg, #1e293b, #334155)", padding: 32, borderRadius: 24, color: "#fff", marginBottom: 30 }}>
        <h2 style={{ margin: 0, fontWeight: 800 }}>Fee Portal</h2>
        <p style={{ opacity: 0.8, marginTop: 5 }}>View vouchers and submit payment evidence</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
        {vouchers.map(v => (
          <div key={v.id} style={{ background: "#fff", padding: 24, borderRadius: 24, border: "1px solid #e2e8f0", position: "relative" }}>
            <div style={{ position: "absolute", top: 20, right: 20 }}>
               <span style={{ padding: "6px 12px", borderRadius: 8, fontSize: 10, fontWeight: 900, background: v.status === "Paid" ? "#dcfce7" : "#fee2e2", color: v.status === "Paid" ? "#16a34a" : "#dc2626" }}>
                 {v.status.toUpperCase()}
               </span>
            </div>
            
            <div style={{ fontWeight: 800, color: "#1e293b", fontSize: 18, marginBottom: 5 }}>{v.semester} Fee</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 20 }}>Ref: {v.referenceId}</div>

            <div style={{ fontSize: 32, fontWeight: 900, color: "#1e293b", marginBottom: 20 }}>Rs. {v.totalAmount.toLocaleString()}</div>

            <div style={{ display: "grid", gap: 12, borderTop: "1px solid #f1f5f9", paddingTop: 20 }}>
               <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#64748b" }}>Due Date:</span>
                  <span style={{ fontWeight: 700 }}>{v.dueDate}</span>
               </div>
               <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "#64748b" }}>Bank:</span>
                  <span style={{ fontWeight: 700 }}>{v.bankName || "Any Branch"}</span>
               </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 25 }}>
               <button onClick={() => { setSelectedVoucher(v); setShowVoucher(true); }} style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 700 }}>
                  <Printer size={16} /> Print
               </button>
               {v.status !== "Paid" && (
                 <button onClick={() => { setSelectedVoucher(v); setShowSubmitModal(true); }} style={{ flex: 1, padding: 12, borderRadius: 12, border: "none", background: "#6366f1", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                   Submit Paid
                 </button>
               )}
            </div>
            
            {v.pendingPayments?.length > 0 && (
               <div style={{ marginTop: 15, padding: "10px", background: "#fffbeb", borderRadius: 12, fontSize: 11, color: "#b45309", textAlign: "center", fontWeight: 600 }}>
                  ⏳ Payment verification in progress...
               </div>
            )}
          </div>
        ))}
      </div>

      {/* MODAL: PROFESSIONAL VOUCHER (PRINTABLE) */}
      {showVoucher && selectedVoucher && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 20 }}>
          <div id="printable-voucher" style={{ background: "#fff", width: "100%", maxWidth: "800px", borderRadius: 10, overflow: "hidden" }}>
             <div style={{ padding: 40 }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "4px solid #1e293b", paddingBottom: 20, marginBottom: 20 }}>
                   <h1 style={{ margin: 0 }}>UNIVERSITY FEE VOUCHER</h1>
                   <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 900 }}>VOUCHER NO: {selectedVoucher.voucherNo}</div>
                      <div>DATE: {new Date().toLocaleDateString()}</div>
                   </div>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 30 }}>
                   <div>
                      <label style={{ fontSize: 10, color: "gray" }}>STUDENT DETAILS</label>
                      <div style={{ fontWeight: 800, fontSize: 18 }}>{selectedVoucher.studentName}</div>
                      <div>Roll No: {selectedVoucher.rollNo}</div>
                      <div>Dept: {selectedVoucher.dept.toUpperCase()}</div>
                   </div>
                   <div style={{ textAlign: "right" }}>
                      <label style={{ fontSize: 10, color: "gray" }}>PAYMENT TARGET</label>
                      <div style={{ fontWeight: 800, fontSize: 18 }}>{selectedVoucher.bankName}</div>
                      <div>DUE DATE: {selectedVoucher.dueDate}</div>
                   </div>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 30 }}>
                   <thead style={{ background: "#f8fafc" }}>
                      <tr><th style={{ padding: 15, textAlign: "left", border: "1px solid #ddd" }}>Description</th><th style={{ padding: 15, textAlign: "right", border: "1px solid #ddd" }}>Amount</th></tr>
                   </thead>
                   <tbody>
                      <tr><td style={{ padding: 15, border: "1px solid #ddd" }}>{selectedVoucher.semester} Tuition & Semester Dues</td><td style={{ padding: 15, textAlign: "right", border: "1px solid #ddd" }}>Rs. {selectedVoucher.totalAmount}</td></tr>
                      <tr style={{ fontWeight: 900 }}><td style={{ padding: 15, border: "1px solid #ddd", textAlign: "right" }}>TOTAL PAYABLE</td><td style={{ padding: 15, textAlign: "right", border: "1px solid #ddd" }}>Rs. {selectedVoucher.totalAmount}</td></tr>
                   </tbody>
                </table>

                <div style={{ fontSize: 11, color: "gray", fontStyle: "italic" }}>* Note: Please pay before the due date to avoid a daily late fee of Rs. {selectedVoucher.lateFeePerDay}.</div>
             </div>
             <div className="no-print" style={{ padding: 20, background: "#f1f5f9", textAlign: "right" }}>
                <button onClick={() => window.print()} style={{ padding: "10px 20px", background: "#1e293b", color: "#fff", borderRadius: 8, marginRight: 10, cursor: "pointer" }}>Print Voucher</button>
                <button onClick={() => setShowVoucher(false)} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer" }}>Close</button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT PROOF */}
      {showSubmitModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
           <div style={{ background: "#fff", width: "100%", maxWidth: "400px", borderRadius: 24, padding: 30 }}>
              <h3 style={{ marginTop: 0 }}>Submit Payment Proof</h3>
              <div style={{ display: "grid", gap: 15 }}>
                 <input type="number" placeholder="Actual Amount Paid" style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }} value={proof.amount} onChange={e => setProof({...proof, amount: e.target.value})} />
                 <input type="text" placeholder="Transaction ID (TID)" style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }} value={proof.transactionId} onChange={e => setProof({...proof, transactionId: e.target.value})} />
                 <select style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }} value={proof.method} onChange={e => setProof({...proof, method: e.target.value})}>
                    <option>Bank Transfer</option><option>EasyPaisa/JazzCash</option><option>Cash Deposit</option>
                 </select>
                 <button onClick={handleSubmitProof} style={{ background: "#6366f1", color: "#fff", border: "none", padding: 14, borderRadius: 12, fontWeight: 800 }}>Submit for Verification</button>
                 <button onClick={() => setShowSubmitModal(false)} style={{ background: "none", border: "none", color: "gray" }}>Cancel</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}