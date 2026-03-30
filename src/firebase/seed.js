/**
 * SEED SCRIPT — Run once to populate sample data
 * Usage: paste into browser console on your running app OR run as node script
 * 
 * IMPORTANT: Add your Firebase config below before running
 */

import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, setDoc, doc, addDoc, collection } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBSswy0YDa268mwUCfCY-3nn6ukZzTd9YE",
  authDomain: "lms-system-6a566.firebaseapp.com",
  projectId: "lms-system-6a566",
  storageBucket: "lms-system-6a566.firebasestorage.app",
  messagingSenderId: "386569861400",
  appId: "1:386569861400:web:636e7db75c81353f75466d",
};

const app = initializeApp(firebaseConfig, "seed");
const auth = getAuth(app);
const db = getFirestore(app);

async function seed() {
  console.log("🌱 Seeding database...");

  // 1. Admin
  const adminCred = await createUserWithEmailAndPassword(auth, "admin@university.edu", "Admin@123456");
  await setDoc(doc(db, "admins", adminCred.user.uid), {
    name: "System Administrator", email: "admin@university.edu", role: "admin",
  });
  console.log("✅ Admin: admin@university.edu / Admin@123456");

  // 2. Student — using setDoc with UID as document ID (critical for login)
  const studentCred = await createUserWithEmailAndPassword(auth, "student@university.edu", "Student@123");
  await setDoc(doc(db, "students", studentCred.user.uid), {
    uid: studentCred.user.uid,
    name: "Hafiz Muhammad Bilal", fatherName: "Abdul Ghani",
    cnic: "33102-2377725-7", email: "student@university.edu",
    phone: "0302-3026029", gender: "Male", dob: "27-06-1991",
    city: "Faisalabad", address: "House P-71 Street 1 Saifabad Jhang Road Faisalabad",
    rollNo: "230797", regNo: "2016-GCUF-08920",
    program: "M.Phil International Relations",
    session: "2023-2025", shift: "Morning", dmcNo: "499635",
    programs: [
      { title:"M.A. International Relations", session:"2016-2018", shift:"Morning", rollNo:"163830", regNo:"2016-GCUF-08920", dmcNo:"375199" },
      { title:"M.Phil International Relations", session:"2023-2025", shift:"Morning", rollNo:"230797", regNo:"2016-GCUF-08920", dmcNo:"499635" },
    ],
  });
  console.log("✅ Student: student@university.edu / Student@123");

  // 3. Courses
  const courses = [
    { courseId:"IRS-728", title:"Seminar (General)", teacher:"Zahoor Ahmad", program:"M.Phil International Relations", semester:"1st Semester", creditHours:1, type:"Seminar" },
    { courseId:"IRS-704", title:"Analysis of Pakistan's Foreign Policy", teacher:"Dr. Ghulam Mustafa", program:"M.Phil International Relations", semester:"1st Semester", creditHours:3, type:"Theory" },
    { courseId:"IRS-701", title:"Research Methodology", teacher:"Dr. Arif Hussain", program:"M.Phil International Relations", semester:"1st Semester", creditHours:3, type:"Theory" },
    { courseId:"IRS-702", title:"International Relations Theory", teacher:"Dr. Sajid Mehmood", program:"M.Phil International Relations", semester:"1st Semester", creditHours:3, type:"Theory" },
    { courseId:"IRS-801", title:"Global Security Studies", teacher:"Dr. Usman Hayat", program:"M.Phil International Relations", semester:"2nd Semester", creditHours:3, type:"Theory" },
    { courseId:"IRS-802", title:"South Asian Politics", teacher:"Dr. Rabia Naz", program:"M.Phil International Relations", semester:"2nd Semester", creditHours:3, type:"Theory" },
    { courseId:"IRS-803", title:"Research Design & Methods", teacher:"Dr. Arif Hussain", program:"M.Phil International Relations", semester:"2nd Semester", creditHours:3, type:"Theory" },
  ];
  for (const c of courses) await addDoc(collection(db, "courses"), c);
  console.log("✅ Courses seeded");

  // 4. Attendance
  const attendance = [
    { rollNo:"230797", courseId:"IRS-728", subjectTitle:"Seminar (General)", teacher:"Zahoor Ahmad", semester:"1st Semester", lectures:17, present:12, leave:0, absent:5 },
    { rollNo:"230797", courseId:"IRS-704", subjectTitle:"Analysis of Pakistan's Foreign Policy", teacher:"Dr. Ghulam Mustafa", semester:"1st Semester", lectures:22, present:19, leave:1, absent:2 },
    { rollNo:"230797", courseId:"IRS-701", subjectTitle:"Research Methodology", teacher:"Dr. Arif Hussain", semester:"1st Semester", lectures:20, present:15, leave:2, absent:3 },
    { rollNo:"230797", courseId:"IRS-702", subjectTitle:"International Relations Theory", teacher:"Dr. Sajid Mehmood", semester:"1st Semester", lectures:18, present:16, leave:0, absent:2 },
  ];
  for (const a of attendance) await addDoc(collection(db, "attendance"), a);
  console.log("✅ Attendance seeded");

  // 5. Results
  const results = [
    { rollNo:"230797", courseId:"IRS-728", subjectTitle:"Seminar (General)", creditHours:1, semester:"1st Semester", marksObtained:82, totalMarks:100, grade:"B+", gradePoints:3.3 },
    { rollNo:"230797", courseId:"IRS-704", subjectTitle:"Analysis of Pakistan's Foreign Policy", creditHours:3, semester:"1st Semester", marksObtained:76, totalMarks:100, grade:"B", gradePoints:3.0 },
    { rollNo:"230797", courseId:"IRS-701", subjectTitle:"Research Methodology", creditHours:3, semester:"1st Semester", marksObtained:88, totalMarks:100, grade:"A-", gradePoints:3.7 },
    { rollNo:"230797", courseId:"IRS-702", subjectTitle:"International Relations Theory", creditHours:3, semester:"1st Semester", marksObtained:91, totalMarks:100, grade:"A", gradePoints:4.0 },
  ];
  for (const r of results) await addDoc(collection(db, "results"), r);
  console.log("✅ Results seeded");

  // 6. Fees
  const fees = [
    { voucherNo:"4881536", rollNo:"0", semester:"0th Semester", programTitle:"M.Phil International Relations (Morning)", netAmt:1200, paidAmt:1200, dueDate:"24-AUG-23", paidDate:"24-AUG-23", bankName:"Allied Bank Limited", status:"Paid", note:"" },
    { voucherNo:"4907655", rollNo:"0", semester:"1st Semester", programTitle:"M.Phil International Relations (Morning)", netAmt:48290, paidAmt:48290, dueDate:"11-SEP-23", paidDate:"11-SEP-23", bankName:"Bank of Punjab", status:"Paid", note:"" },
    { voucherNo:"4983842", rollNo:"230797", semester:"2nd Semester", programTitle:"M.Phil International Relations (Morning)", netAmt:50, paidAmt:50, dueDate:"15-FEB-24", paidDate:"31-JAN-24", bankName:"Bank of Punjab", status:"Paid", note:"Ref. No.GCUF/SFAO/23/1029" },
    { voucherNo:"5217716", rollNo:"230797", semester:"2nd Semester", programTitle:"M.Phil International Relations (Morning)", netAmt:15000, paidAmt:15000, dueDate:"19-JUL-24", paidDate:"19-JUL-24", bankName:"Allied Bank Limited", status:"Paid", note:"Fee of Summer Semester 2024" },
    { voucherNo:"5317800", rollNo:"230797", semester:"3rd Semester", programTitle:"M.Phil International Relations (Morning)", netAmt:48290, paidAmt:0, dueDate:"01-DEC-24", paidDate:"", bankName:"", status:"Unpaid", note:"" },
  ];
  for (const f of fees) await addDoc(collection(db, "fees"), f);
  console.log("✅ Fees seeded");

  // 7. Timetable
  const timetable = [
    { program:"M.Phil International Relations", semester:"1st Semester", day:"Monday", timeSlot:"8:00 - 9:30 AM", courseName:"Research Methodology", teacher:"Dr. Arif Hussain", room:"Room 101" },
    { program:"M.Phil International Relations", semester:"1st Semester", day:"Monday", timeSlot:"10:00 - 11:30 AM", courseName:"IR Theory", teacher:"Dr. Sajid Mehmood", room:"Room 102" },
    { program:"M.Phil International Relations", semester:"1st Semester", day:"Tuesday", timeSlot:"8:00 - 9:30 AM", courseName:"Pakistan's Foreign Policy", teacher:"Dr. Ghulam Mustafa", room:"Room 103" },
    { program:"M.Phil International Relations", semester:"1st Semester", day:"Wednesday", timeSlot:"10:00 - 11:30 AM", courseName:"Seminar", teacher:"Zahoor Ahmad", room:"Seminar Hall" },
    { program:"M.Phil International Relations", semester:"1st Semester", day:"Thursday", timeSlot:"8:00 - 9:30 AM", courseName:"Research Methodology", teacher:"Dr. Arif Hussain", room:"Room 101" },
    { program:"M.Phil International Relations", semester:"1st Semester", day:"Friday", timeSlot:"10:00 - 11:30 AM", courseName:"IR Theory", teacher:"Dr. Sajid Mehmood", room:"Room 102" },
  ];
  for (const t of timetable) await addDoc(collection(db, "timetable"), t);
  console.log("✅ Timetable seeded");

  console.log("\n🎉 Database seeded successfully!");
  console.log("Admin:   admin@university.edu   / Admin@123456");
  console.log("Student: student@university.edu / Student@123");
}

seed().catch(console.error);
