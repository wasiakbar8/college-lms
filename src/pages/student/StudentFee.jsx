import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";

export default function StudentFee() {
  const { userData } = useAuth();
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!userData?.rollNo) return;
    async function load() {
      try {
        const snap = await getDocs(query(collection(db, "fees"), where("rollNo", "==", userData.rollNo)));
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (a.semester || "").localeCompare(b.semester || ""));
        setFees(data);
      } catch(e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [userData]);

  const totalPaid = fees.filter(f => f.status === "Paid").reduce((a, f) => a + Number(f.paidAmt || 0), 0);
  const totalDue = fees.filter(f => f.status !== "Paid").reduce((a, f) => a + Number(f.netAmt || 0), 0);

  function printVoucher(fee) {
    setSelected(fee);
    setTimeout(() => { window.print(); }, 300);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Fee & Vouchers</h2>
          <div className="page-header-sub">View fee history and download payment vouchers</div>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px,1fr))", gap:16, marginBottom:24 }}>
        {[
          { label:"Total Paid", value:`Rs. ${totalPaid.toLocaleString()}`, icon:"✅", color:"#dcfce7", tc:"#16a34a" },
          { label:"Total Due", value:totalDue > 0 ? `Rs. ${totalDue.toLocaleString()}` : "Clear", icon:totalDue > 0 ? "⚠️" : "✅", color: totalDue > 0 ? "#fee2e2" : "#dcfce7", tc: totalDue > 0 ? "#dc2626" : "#16a34a" },
          { label:"Total Vouchers", value:fees.length, icon:"🧾", color:"#dbeafe", tc:"#1d4ed8" },
          { label:"Pending", value:fees.filter(f=>f.status!=="Paid").length, icon:"🕐", color:"#fef3c7", tc:"#d97706" },
        ].map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{ background:s.color }}><span style={{ fontSize:18 }}>{s.icon}</span></div>
            <div>
              <div className="stat-value" style={{ fontSize:18, color:s.tc }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="empty-state"><p>Loading fee records...</p></div>
      ) : fees.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">💰</div><p>No fee records found.</p></div>
      ) : (
        <div style={{ display:"grid", gap:16 }}>
          {fees.map(fee => (
            <div key={fee.id} className="voucher-card no-print">
              <div className="voucher-header">
                <div>
                  <div style={{ fontSize:11, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:0.5, marginBottom:4 }}>Fee Voucher</div>
                  <div style={{ fontWeight:700, fontSize:16, color:"var(--primary)" }}>#{fee.voucherNo}</div>
                  <div style={{ fontSize:13, color:"var(--text-muted)", marginTop:2 }}>{fee.programTitle}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div className={`voucher-stamp ${fee.status === "Paid" ? "paid" : "unpaid"}`}>{fee.status || "Unpaid"}</div>
                  <div style={{ fontSize:24, fontWeight:700, color: fee.status === "Paid" ? "var(--success)" : "var(--danger)", marginTop:8 }}>
                    Rs. {Number(fee.netAmt || 0).toLocaleString()}
                  </div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap:14, marginBottom:16 }}>
                {[
                  { label:"Semester", value:fee.semester },
                  { label:"Due Date", value:fee.dueDate },
                  { label:"Paid Date", value:fee.paidDate || "—" },
                  { label:"Paid Amount", value:fee.paidAmt ? `Rs. ${Number(fee.paidAmt).toLocaleString()}` : "—" },
                  { label:"Bank", value:fee.bankName || "—" },
                  { label:"Roll No", value:fee.rollNo },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ fontSize:11, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:0.5, marginBottom:3 }}>{item.label}</div>
                    <div style={{ fontSize:13, fontWeight:500, color:"var(--text)" }}>{item.value}</div>
                  </div>
                ))}
              </div>
              {fee.note && (
                <div className="alert alert-info" style={{ marginBottom:12, fontSize:12 }}>Note: {fee.note}</div>
              )}
              <div style={{ display:"flex", justifyContent:"flex-end" }}>
                <button className="btn btn-outline btn-sm" onClick={() => printVoucher(fee)}>🖨️ Print Voucher</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Print voucher */}
      {selected && (
        <div className="print-header" style={{ border:"2px solid #1a3a5c", padding:28, borderRadius:8 }}>
          <div style={{ textAlign:"center", marginBottom:20, borderBottom:"1px solid #ccc", paddingBottom:16 }}>
            <h2 style={{ fontFamily:"'Playfair Display',serif", color:"#1a3a5c", fontSize:22 }}>University LMS</h2>
            <h3 style={{ fontSize:16, fontWeight:400, marginTop:4 }}>FEE PAYMENT VOUCHER</h3>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>
            {[
              ["Voucher No", selected.voucherNo],["Student Name", userData?.name],
              ["Roll No", selected.rollNo],["Program", selected.programTitle],
              ["Semester", selected.semester],["Session", userData?.session],
              ["Due Date", selected.dueDate],["Paid Date", selected.paidDate || "—"],
              ["Net Amount", `Rs. ${Number(selected.netAmt||0).toLocaleString()}`],["Paid Amount", `Rs. ${Number(selected.paidAmt||0).toLocaleString()}`],
              ["Bank", selected.bankName || "—"],["Status", selected.status],
            ].map(([l,v]) => (
              <div key={l} style={{ borderBottom:"1px solid #eee", paddingBottom:8 }}>
                <div style={{ fontSize:11, color:"#666", textTransform:"uppercase" }}>{l}</div>
                <div style={{ fontSize:13, fontWeight:600, marginTop:2 }}>{v}</div>
              </div>
            ))}
          </div>
          {selected.note && <p style={{ fontSize:12, color:"#666" }}>Note: {selected.note}</p>}
          <div style={{ textAlign:"center", marginTop:28, paddingTop:16, borderTop:"1px solid #ccc", color:"#666", fontSize:11 }}>
            This is a computer generated voucher. University LMS — {new Date().toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  );
}
