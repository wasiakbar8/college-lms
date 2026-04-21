import React, { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, setDoc, doc, updateDoc, arrayRemove } from "firebase/firestore";
import { db } from "../../firebase/config";
import { toast, Toaster } from "react-hot-toast";
import { ArrowLeft, Plus, X, Search, FileText, CheckCircle, XCircle, Eye, Printer, AlertCircle } from "lucide-react";

// ── Configuration (Matched with Dashboard Theme) ──
const DEPARTMENTS = [
  { id: "cs",   name: "Computer Science",         icon: "💻", bg: "#E6F1FB", color: "#185FA5" },
  { id: "ir",   name: "International Relations", icon: "🌍", bg: "#E1F5EE", color: "#0F6E56" },
  { id: "edu",  name: "Education",                 icon: "📚", bg: "#FAEEDA", color: "#854F0B" },
  { id: "bus",  name: "Business Administration", icon: "📊", bg: "#FAECE7", color: "#993C1D" },
  { id: "eng",  name: "English",                 icon: "✍️", bg: "#EEEDFE", color: "#534AB7" },
  { id: "math", name: "Mathematics",             icon: "🔢", bg: "#EAF3DE", color: "#3B6D11" },
];

const SEMESTERS = [
  "1st Semester", "2nd Semester", "3rd Semester", "4th Semester",
  "5th Semester", "6th Semester", "7th Semester", "8th Semester",
];

const INITIAL_FEE_FORM = {
  amount: "",
  lateFeePerDay: "100",
  dueDate: new Date().toISOString().split('T')[0],
  voucherNo: "",
  bankName: "HBL",
  note: "Standard Semester Fee"
};

const c = { 
  primary: "#6366f1", 
  sub: "#6b7280", 
  border: "#e5e7eb", 
  bg: "#f4f6fb", 
  white: "#ffffff",
  dark: "#1e293b"
};

const lbl = { display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6, letterSpacing: "0.05em" };
const inp = { width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${c.border}`, fontSize: 14, outline: "none", boxSizing: "border-box" };

export default function AdminFee() {
  const [view, setView] = useState("depts");
  const [activeDept, setActiveDept] = useState(null);
  const [activeSem, setActiveSem] = useState("1st Semester");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [students, setStudents] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
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

  // ── View 1: Department Cards ──
  if (view === "depts") {
    return (
      <div style={{ padding: 40, background: c.bg, minHeight: "100vh" }}>
        <Toaster />
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2 style={{ fontWeight: 800, color: c.dark }}>Finance & Fee Center</h2>
          <p style={{ color: c.sub, marginBottom: 30 }}>Select a department to manage dues, verify payments, and issue vouchers.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {DEPARTMENTS.map(dept => (
              <div key={dept.id} onClick={() => { setActiveDept(dept); setView("students"); }}
                   style={{ background: "#fff", padding: 30, borderRadius: 20, cursor: "pointer", border: `1px solid ${c.border}`, transition: "0.2s" }}>
                <div style={{ fontSize: 40, marginBottom: 15 }}>{dept.icon}</div>
                <h3 style={{ margin: 0, color: c.dark }}>{dept.name}</h3>
                <div style={{ marginTop: 15, fontSize: 12, color: dept.color, fontWeight: 700 }}>Manage Finance →</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── View 2: Student Fee List with Semester Filter ──
  return (
    <div style={{ padding: "30px 20px", background: c.bg, minHeight: "100vh" }}>
      <Toaster />
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <button onClick={() => setView("depts")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: c.primary, cursor: "pointer", fontWeight: 700, marginBottom: 20 }}>
          <ArrowLeft size={18} /> Back to Departments
        </button>

        {/* ── VERIFICATION QUEUE ── */}
        {vouchers.filter(v => v.dept === activeDept.id && v.pendingPayments?.length > 0).length > 0 && (
          <div style={{ marginBottom: 30 }}>
            <h4 style={{ display: "flex", alignItems: "center", gap: 8, color: "#b45309", marginBottom: 15, fontWeight: 800 }}>
              <AlertCircle size={20} /> Action Required: Pending Proofs
            </h4>
            <div style={{ display: "grid", gap: 12 }}>
              {vouchers.filter(v => v.dept === activeDept.id && v.pendingPayments?.length > 0).map(v => (
                v.pendingPayments.map((p, idx) => (
                  <div key={`${v.id}-${idx}`} style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: "16px 20px", borderRadius: 16, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                    <div>
                      <div style={{ fontWeight: 800 }}>{v.studentName} <span style={{ fontWeight: 400, color: c.sub }}>({v.rollNo})</span></div>
                      <div style={{ fontSize: 12, color: "#b45309", marginTop: 4 }}>
                        TID: <strong>{p.transactionId}</strong> • Rs. <strong>{p.amount}</strong> via {p.method}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { setSelectedVoucher(v); setShowVoucherModal(true); }} style={{ background: "#fff", color: c.sub, border: `1px solid ${c.border}`, padding: "8px 12px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                        <Eye size={14} /> View
                      </button>
                      <button onClick={() => handleApproveReject(v.id, p, "approve")} style={{ background: "#16a34a", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button onClick={() => handleApproveReject(v.id, p, "reject")} style={{ background: "#dc2626", color: "#fff", border: "none", padding: "8px 12px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  </div>
                ))
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 30 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>{activeDept.icon} {activeDept.name}</h1>
            <p style={{ color: c.sub }}>Finance View: <strong>{activeSem}</strong></p>
          </div>
          
          {/* Semester Pill Filter */}
          <div style={{ display: "flex", gap: 6, background: "#fff", padding: 6, borderRadius: 14, border: `1px solid ${c.border}` }}>
            {SEMESTERS.map(sem => (
              <button key={sem} onClick={() => setActiveSem(sem)}
                style={{
                  padding: "8px 14px", borderRadius: 10, fontSize: 11, cursor: "pointer", border: "none",
                  background: activeSem === sem ? activeDept.color : "transparent",
                  color: activeSem === sem ? "#fff" : c.sub, fontWeight: 700, transition: "0.2s"
                }}>
                {sem.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 24, border: `1px solid ${c.border}`, overflow: "hidden" }}>
          <div style={{ padding: 20, borderBottom: `1px solid ${c.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ margin: 0 }}>Fee Ledger: {activeSem}</h4>
            <div style={{ position: "relative" }}>
               <Search size={16} style={{ position: "absolute", left: 12, top: 10, color: c.sub }} />
               <input placeholder="Search Roll No..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                      style={{ ...inp, paddingLeft: 35, width: 250, height: 36 }} />
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr style={{ textAlign: "left", color: c.sub, fontSize: 11, textTransform: "uppercase" }}>
                <th style={{ padding: 16 }}>Student</th>
                <th style={{ padding: 16 }}>Roll No</th>
                <th style={{ padding: 16 }}>Payment Status</th>
                <th style={{ padding: 16, textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => {
                const v = vouchers.find(v => v.rollNo === student.rollNo && normalizeSem(v.semester) === normalizeSem(activeSem));
                return (
                  <tr key={student.id} style={{ borderBottom: `1px solid ${c.border}` }}>
                    <td style={{ padding: 16, fontWeight: 700, color: c.dark }}>{student.name}</td>
                    <td style={{ padding: 16 }}>
                        <span style={{ background: activeDept.bg, color: activeDept.color, padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
                            {student.rollNo}
                        </span>
                    </td>
                    <td style={{ padding: 16 }}>
                      {v ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 800, background: v.status === 'Paid' ? '#dcfce7' : '#fee2e2', color: v.status === 'Paid' ? '#16a34a' : '#dc2626' }}>
                            {v.status.toUpperCase()}
                          </span>
                          <button onClick={() => { setSelectedVoucher(v); setShowVoucherModal(true); }} style={{ background: "none", border: "none", color: c.primary, cursor: "pointer" }} title="View Voucher">
                            <Eye size={16} />
                          </button>
                        </div>
                      ) : <span style={{ color: "#cbd5e1", fontSize: 12 }}>No Voucher Assigned</span>}
                    </td>
                    <td style={{ padding: 16, textAlign: "right" }}>
                      {!v ? (
                        <button onClick={() => { setSelectedStudent(student); setShowAssignModal(true); }} style={{ background: c.primary, color: "#fff", border: "none", padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 12 }}>
                            + Assign Fee
                        </button>
                      ) : <span style={{ fontSize: 13, fontWeight: 800, color: c.dark }}>Rs. {v.totalAmount}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredStudents.length === 0 && (
            <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>No students found in this semester.</div>
          )}
        </div>
      </div>

      {/* --- MODAL: ASSIGN --- */}
      {showAssignModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: "480px", borderRadius: 24, overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ background: c.dark, padding: "20px 24px", color: "#fff", display: "flex", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>Assign Fee Voucher</h3>
              <X onClick={() => setShowAssignModal(false)} style={{ cursor: "pointer" }} />
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ background: "#f1f5f9", padding: 15, borderRadius: 15, marginBottom: 20 }}>
                <div style={{ fontWeight: 800 }}>{selectedStudent?.name}</div>
                <div style={{ fontSize: 12, color: c.sub }}>Roll No: {selectedStudent?.rollNo} • {activeSem}</div>
              </div>
              
              <div style={{ display: "grid", gap: 15 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={lbl}>Amount (Rs.)</label>
                    <input type="number" style={inp} placeholder="e.g. 45000" value={feeForm.amount} onChange={e => setFeeForm({...feeForm, amount: e.target.value})} />
                  </div>
                  <div>
                    <label style={lbl}>Voucher No</label>
                    <input style={inp} placeholder="UAF-XXXX" value={feeForm.voucherNo} onChange={e => setFeeForm({...feeForm, voucherNo: e.target.value})} />
                  </div>
                </div>
                
                <div>
                  <label style={lbl}>Due Date</label>
                  <input type="date" style={inp} value={feeForm.dueDate} onChange={e => setFeeForm({...feeForm, dueDate: e.target.value})} />
                </div>

                <div>
                  <label style={lbl}>Preferred Bank</label>
                  <select style={inp} value={feeForm.bankName} onChange={e => setFeeForm({...feeForm, bankName: e.target.value})}>
                    <option value="HBL">HBL Bank</option>
                    <option value="MCB">MCB Bank</option>
                    <option value="UBL">UBL Bank</option>
                  </select>
                </div>

                <div>
                  <label style={lbl}>Internal Note</label>
                  <textarea style={{...inp, height: 80}} placeholder="Special instructions..." value={feeForm.note} onChange={e => setFeeForm({...feeForm, note: e.target.value})} />
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                  <button onClick={() => setShowAssignModal(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${c.border}`, background: "none", fontWeight: 600 }}>Cancel</button>
                  <button onClick={handleAssignFee} style={{ flex: 2, background: c.primary, color: "#fff", border: "none", padding: 12, borderRadius: 12, fontWeight: 800 }}>Post Voucher</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: VIEW VOUCHER --- */}
      {showVoucherModal && selectedVoucher && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 20, backdropFilter: "blur(8px)" }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: "800px", borderRadius: 24, overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
             <div style={{ padding: 40 }} id="printable-area">
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `4px solid ${c.dark}`, paddingBottom: 20, marginBottom: 20 }}>
                   <h1 style={{ margin: 0, color: c.dark }}>UAF FEE VOUCHER</h1>
                   <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 900, fontSize: 18 }}>NO: {selectedVoucher.voucherNo}</div>
                      <div style={{ color: c.sub, fontSize: 12 }}>ISSUED: {selectedVoucher.createdAt?.split('T')[0]}</div>
                   </div>
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginBottom: 30 }}>
                   <div>
                      <label style={lbl}>Student Info</label>
                      <div style={{ fontWeight: 800, fontSize: 18 }}>{selectedVoucher.studentName}</div>
                      <div style={{ fontSize: 14 }}>Roll No: {selectedVoucher.rollNo}</div>
                      <div style={{ fontSize: 14 }}>Department: {selectedVoucher.dept?.toUpperCase()}</div>
                   </div>
                   <div style={{ textAlign: "right" }}>
                      <label style={lbl}>Payment Portal</label>
                      <div style={{ fontWeight: 800, fontSize: 18 }}>{selectedVoucher.bankName} Bank</div>
                      <div style={{ color: "#dc2626", fontWeight: 800, marginTop: 5 }}>DUE DATE: {selectedVoucher.dueDate}</div>
                   </div>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 30 }}>
                   <thead style={{ background: "#f8fafc" }}>
                      <tr><th style={{ padding: 15, textAlign: "left", border: `1px solid ${c.border}`, fontSize: 12 }}>DESCRIPTION</th><th style={{ padding: 15, textAlign: "right", border: `1px solid ${c.border}`, fontSize: 12 }}>AMOUNT</th></tr>
                   </thead>
                   <tbody>
                      <tr><td style={{ padding: 15, border: `1px solid ${c.border}` }}>{selectedVoucher.semester} Academic Dues</td><td style={{ padding: 15, textAlign: "right", border: `1px solid ${c.border}` }}>Rs. {selectedVoucher.totalAmount}</td></tr>
                      <tr style={{ fontWeight: 900 }}><td style={{ padding: 15, border: `1px solid ${c.border}`, textAlign: "right", background: "#f8fafc" }}>TOTAL PAYABLE</td><td style={{ padding: 15, textAlign: "right", border: `1px solid ${c.border}`, background: "#f8fafc" }}>Rs. {selectedVoucher.totalAmount}</td></tr>
                   </tbody>
                </table>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 11, color: c.sub }}>Reference: <b>{selectedVoucher.referenceId}</b> | Status: <b>{selectedVoucher.status.toUpperCase()}</b></div>
                    {selectedVoucher.status === "Paid" && <div style={{ color: "#16a34a", fontWeight: 800, fontSize: 12 }}>✓ VERIFIED PAYMENT</div>}
                </div>
             </div>
             <div style={{ padding: "20px 40px", background: "#f8fafc", borderTop: `1px solid ${c.border}`, textAlign: "right" }}>
                <button onClick={() => window.print()} style={{ padding: "10px 20px", background: c.dark, color: "#fff", border: "none", borderRadius: 12, marginRight: 10, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
                  <Printer size={16} /> Print Voucher
                </button>
                <button onClick={() => setShowVoucherModal(false)} style={{ padding: "10px 20px", borderRadius: 12, border: `1px solid ${c.border}`, background: "#fff", cursor: "pointer", fontWeight: 700 }}>Close</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}