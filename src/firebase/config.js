import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBSswy0YDa268mwUCfCY-3nn6ukZzTd9YE",
  authDomain: "lms-system-6a566.firebaseapp.com",
  projectId: "lms-system-6a566",
  storageBucket: "lms-system-6a566.firebasestorage.app",
  messagingSenderId: "386569861400",
  appId: "1:386569861400:web:636e7db75c81353f75466d",
};

// Primary app — admin session
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Secondary app — only for creating new student accounts
// Prevents Firebase from auto-switching admin session to the new student
const secondaryApp = initializeApp(firebaseConfig, "secondary");
export const secondaryAuth = getAuth(secondaryApp);

export default app;