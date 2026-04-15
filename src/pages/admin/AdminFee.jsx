import React, { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, setDoc, doc, updateDoc, arrayRemove } from "firebase/firestore";
import { db } from "../../firebase/config";
import { toast, Toaster } from "react-hot-toast";
import { ArrowLeft, Plus, X, Search, FileText, CheckCircle, XCircle, Eye, Printer, AlertCircle } from "lucide-react";

const DEPARTMENTS = [
  { id: "cs", name: "Computer Science", icon: "💻", color: "#185FA5" },
  { id: "ir", name: "International Relations", icon: "🌍", color: "#0F6E56" },
  { id: "edu", name: "Education", icon: "📚", color: "#854F0B" },
  { id: "bus", name: "Business Administration", icon: "📊", color: "#993C1D" },
  { id: "eng", name: "English", icon: "✍️", color: "#534AB7" },
  { id: "math", name: "Mathematics", icon: "🔢", color: "#3B6D11" },
];

const SEMESTERS = ["1st Semester", "2nd Semester", "3rd Semester", "4th Semester", "5th Semester", "6th Semester", "7th Semester", "8th Semester"];

const INITIAL_FEE_FORM = {
  amount: "",
  lateFeePerDay: "100",
  dueDate: new Date().toISOString().split('T')[0],
  voucherNo: "",
  bankName: "HBL",
  note: "Standard Semester Fee"
};

export default function AdminFee() {
  const [view, setView] = useState("depts");
  const [activeDept, setActiveDept] = useState(null);
  const [activeSem, setActiveSem] = useState("1st Semester");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [students, setStudents] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false); // NEW
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedVoucher, setSelectedVoucher] = useState(null); // NEW
  const [feeForm, setFeeForm] = useState(INITIAL_FEE_FORM);

  useEffect(() => {
    const unsubStudents = onSnapshot(collection(db, "students"), (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubVouchers = onSnapshot(collection(db, "fees"), (snap) => {
      setVouchers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => { unsubStudents(); unsubVouchers(); };
  }, []);

  const normalizeSem = (sem) => {
    if (!sem) return "";
    const s = String(sem).toLowerCase().trim();
    if (s === "1" || s.includes("1st")) return "1st Semester";
    if (s === "2" || s.includes("2nd")) return "2nd Semester";
    if (s === "3" || s.includes("3rd")) return "3rd Semester";
    if (s === "4" || s.includes("4th")) return "4th Semester";
    if (s === "5" || s.includes("5th")) return "5th Semester";
    if (s === "6" || s.includes("6th")) return "6th Semester";
    if (s === "7" || s.includes("7th")) return "7th Semester";
    if (s === "8" || s.includes("8th")) return "8th Semester";
    return s;
  };

  const filteredStudents = useMemo(() => {
    if (!activeDept) return [];
    return students.filter(s => {
      const isCorrectDept = s.dept === activeDept.id || s.department === activeDept.name;
      const isCorrectSem = normalizeSem(s.semester || s.sem) === normalizeSem(activeSem);
      const matchesSearch = s.rollNo?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            s.name?.toLowerCase().includes(searchTerm.toLowerCase());
      return isCorrectDept && isCorrectSem && matchesSearch;
    });
  }, [students, activeDept, activeSem, searchTerm]);

  const handleAssignFee = async () => {
    if (!feeForm.amount || !feeForm.voucherNo) return toast.error("Required fields missing");
    try {
      const refId = `FEE-${Date.now()}`;
      await setDoc(doc(db, "fees", refId), {
        ...feeForm,
        referenceId: refId,
        rollNo: selectedStudent.rollNo,
        studentName: selectedStudent.name,
        dept: activeDept.id,
        semester: activeSem,
        totalAmount: Number(feeForm.amount),
        paidAmt: 0,
        status: "Unpaid",
        pendingPayments: [],
        createdAt: new Date().toISOString()
      });
      toast.success("Voucher Posted!");
      setShowAssignModal(false);
      setFeeForm(INITIAL_FEE_FORM);
    } catch (e) { toast.error(e.message); }
  };

  const handleApproveReject = async (voucherId, proof, action) => {
    const feeRef = doc(db, "fees", voucherId);
    try {
      if (action === "approve") {
        await updateDoc(feeRef, {
          status: "Paid",
          paidAmt: Number(proof.amount),
          pendingPayments: arrayRemove(proof),
          verifiedAt: new Date().toISOString()
        });
        toast.success("Payment Verified & Approved");
      } else {
        await updateDoc(feeRef, { pendingPayments: arrayRemove(proof) });
        toast.error("Proof Rejected");
      }
    } catch (e) { toast.error("Action failed"); }
  };

  if (view === "depts") {
    return (
      <div style={{ padding: 32, background: "#f4f6fb", minHeight: "100vh" }}>
        <Toaster />
        <h2 style={{ fontWeight: 800, color: "#1e293b" }}>Finance & Fee Center</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20, marginTop: 24 }}>
          {DEPARTMENTS.map(dept => (
            <div key={dept.id} onClick={() => { setActiveDept(dept); setView("students"); }}
                 style={{ background: "#fff", padding: 30, borderRadius: 24, cursor: "pointer", border: "1px solid #e2e8f0", transition: "0.2s" }}>
              <div style={{ fontSize: 32, marginBottom: 15 }}>{dept.icon}</div>
              <h3 style={{ margin: 0 }}>{dept.name}</h3>
              <div style={{ marginTop: 15, fontSize: 12, color: "#6366f1", fontWeight: 700 }}>Open Dues List →</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 32, background: "#f4f6fb", minHeight: "100vh" }}>
      <Toaster />
      <button onClick={() => setView("depts")} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "#6366f1", cursor: "pointer", fontWeight: 700, marginBottom: 20 }}>
        <ArrowLeft size={18} /> Back to Hub
      </button>

      {/* ── VERIFICATION QUEUE ── */}
      {vouchers.filter(v => v.dept === activeDept.id && v.pendingPayments?.length > 0).length > 0 && (
        <div style={{ marginBottom: 30 }}>
          <h4 style={{ display: "flex", alignItems: "center", gap: 8, color: "#b45309", marginBottom: 15 }}>
            <AlertCircle size={20} /> Pending Verifications
          </h4>
          <div style={{ display: "grid", gap: 12 }}>
            {vouchers.filter(v => v.dept === activeDept.id && v.pendingPayments?.length > 0).map(v => (
              v.pendingPayments.map((p, idx) => (
                <div key={`${v.id}-${idx}`} style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: "16px 20px", borderRadius: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{v.studentName} <span style={{ fontWeight: 400, color: "#92400e" }}>({v.rollNo})</span></div>
                    <div style={{ fontSize: 12, color: "#b45309", marginTop: 4 }}>
                      TID: <strong>{p.transactionId}</strong> • Amount: <strong>Rs. {p.amount}</strong> • Via: {p.method}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => { setSelectedVoucher(v); setShowVoucherModal(true); }} style={{ background: "#fff", color: "#64748b", border: "1px solid #ddd", padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      <Eye size={14} /> View Voucher
                    </button>
                    <button onClick={() => handleApproveReject(v.id, p, "approve")} style={{ background: "#16a34a", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button onClick={() => handleApproveReject(v.id, p, "reject")} style={{ background: "#dc2626", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))
            ))}
          </div>
        </div>
      )}

      {/* ── STUDENT LIST ── */}
      <div style={{ background: "#fff", borderRadius: 24, padding: 24, border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0 }}>{activeDept.icon} {activeDept.name}</h2>
          <div style={{ display: "flex", gap: 10 }}>
            <select value={activeSem} onChange={e => setActiveSem(e.target.value)} style={{ padding: "10px 16px", borderRadius: 12, border: "1px solid #e2e8f0", fontWeight: 600 }}>
              {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="text" placeholder="Search Roll No..." style={{ padding: "10px 16px", borderRadius: 12, border: "1px solid #e2e8f0" }} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "#f8fafc", color: "#64748b", fontSize: 11, textTransform: "uppercase" }}>
              <th style={{ padding: 16 }}>Student</th>
              <th style={{ padding: 16 }}>Roll No</th>
              <th style={{ padding: 16 }}>Status</th>
              <th style={{ padding: 16, textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(student => {
              const v = vouchers.find(v => v.rollNo === student.rollNo && normalizeSem(v.semester) === normalizeSem(activeSem));
              return (
                <tr key={student.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: 16, fontWeight: 700 }}>{student.name}</td>
                  <td style={{ padding: 16 }}>{student.rollNo}</td>
                  <td style={{ padding: 16 }}>
                    {v ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 800, background: v.status === 'Paid' ? '#dcfce7' : '#fee2e2', color: v.status === 'Paid' ? '#16a34a' : '#dc2626' }}>
                          {v.status.toUpperCase()}
                        </span>
                        <button onClick={() => { setSelectedVoucher(v); setShowVoucherModal(true); }} style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", display: "flex", alignItems: "center" }} title="View Voucher">
                          <Eye size={16} />
                        </button>
                      </div>
                    ) : <span style={{ color: "#94a3b8", fontSize: 12 }}>Not Assigned</span>}
                  </td>
                  <td style={{ padding: 16, textAlign: "right" }}>
                    {!v ? (
                      <button onClick={() => { setSelectedStudent(student); setShowAssignModal(true); }} style={{ background: "#6366f1", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontWeight: 700 }}>Assign Fee</button>
                    ) : <span style={{ fontSize: 12, fontWeight: 700 }}>Rs. {v.totalAmount}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── MODAL: ASSIGN ── */}
      {showAssignModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: "480px", borderRadius: 24, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Assign New Voucher</h3>
              <X onClick={() => setShowAssignModal(false)} style={{ cursor: "pointer" }} />
            </div>
            <div style={{ display: "grid", gap: 15 }}>
              <div style={{ background: "#f8fafc", padding: 15, borderRadius: 16, border: "1px solid #e2e8f0" }}>
                <strong>{selectedStudent?.name}</strong> • {activeSem}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <input type="number" placeholder="Amount (Rs.)" style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }} value={feeForm.amount} onChange={e => setFeeForm({...feeForm, amount: e.target.value})} />
                <input type="text" placeholder="Voucher No" style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }} value={feeForm.voucherNo} onChange={e => setFeeForm({...feeForm, voucherNo: e.target.value})} />
              </div>
              <input type="date" style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }} value={feeForm.dueDate} onChange={e => setFeeForm({...feeForm, dueDate: e.target.value})} />
              <select style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }} value={feeForm.bankName} onChange={e => setFeeForm({...feeForm, bankName: e.target.value})}>
                <option value="HBL">HBL Bank</option><option value="MCB">MCB Bank</option><option value="UBL">UBL Bank</option>
              </select>
              <textarea placeholder="Note" style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }} value={feeForm.note} onChange={e => setFeeForm({...feeForm, note: e.target.value})} />
              <button onClick={handleAssignFee} style={{ background: "#6366f1", color: "#fff", border: "none", padding: 14, borderRadius: 12, fontWeight: 800 }}>Create & Send</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: VIEW VOUCHER (SHARED DESIGN) ── */}
      {showVoucherModal && selectedVoucher && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 20 }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: "800px", borderRadius: 15, overflow: "hidden" }}>
             <div style={{ padding: 40 }} id="printable-area">
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "4px solid #1e293b", paddingBottom: 20, marginBottom: 20 }}>
                   <h1 style={{ margin: 0, color: "#1e293b" }}>UNIVERSITY FEE VOUCHER</h1>
                   <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 900 }}>VOUCHER NO: {selectedVoucher.voucherNo}</div>
                      <div>DATE: {selectedVoucher.createdAt?.split('T')[0]}</div>
                   </div>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 30 }}>
                   <div>
                      <label style={{ fontSize: 10, color: "gray", textTransform: "uppercase" }}>Student Details</label>
                      <div style={{ fontWeight: 800, fontSize: 18 }}>{selectedVoucher.studentName}</div>
                      <div>Roll No: {selectedVoucher.rollNo}</div>
                      <div>Dept: {selectedVoucher.dept?.toUpperCase()}</div>
                   </div>
                   <div style={{ textAlign: "right" }}>
                      <label style={{ fontSize: 10, color: "gray", textTransform: "uppercase" }}>Payment Details</label>
                      <div style={{ fontWeight: 800, fontSize: 18 }}>{selectedVoucher.bankName} Bank</div>
                      <div style={{ color: "#dc2626", fontWeight: 700 }}>DUE DATE: {selectedVoucher.dueDate}</div>
                   </div>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 30 }}>
                   <thead style={{ background: "#f8fafc" }}>
                      <tr><th style={{ padding: 15, textAlign: "left", border: "1px solid #ddd" }}>Description</th><th style={{ padding: 15, textAlign: "right", border: "1px solid #ddd" }}>Amount</th></tr>
                   </thead>
                   <tbody>
                      <tr><td style={{ padding: 15, border: "1px solid #ddd" }}>{selectedVoucher.semester} Academic Dues</td><td style={{ padding: 15, textAlign: "right", border: "1px solid #ddd" }}>Rs. {selectedVoucher.totalAmount}</td></tr>
                      <tr style={{ fontWeight: 900 }}><td style={{ padding: 15, border: "1px solid #ddd", textAlign: "right" }}>TOTAL PAYABLE</td><td style={{ padding: 15, textAlign: "right", border: "1px solid #ddd" }}>Rs. {selectedVoucher.totalAmount}</td></tr>
                   </tbody>
                </table>
                <div style={{ fontSize: 11, color: "gray" }}>Status: <strong>{selectedVoucher.status.toUpperCase()}</strong> • Verified Amount: Rs. {selectedVoucher.paidAmt || 0}</div>
             </div>
             <div style={{ padding: 20, background: "#f1f5f9", textAlign: "right" }}>
                <button onClick={() => window.print()} style={{ padding: "10px 20px", background: "#1e293b", color: "#fff", borderRadius: 8, marginRight: 10, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Printer size={16} /> Print
                </button>
                <button onClick={() => setShowVoucherModal(false)} style={{ padding: "10px 20px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>Close</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}