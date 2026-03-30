import React, { createContext, useContext, useEffect, useState } from "react";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const AuthContext = createContext();
export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }
  async function logout() {
    await signOut(auth);
    setUserRole(null);
    setUserData(null);
  }
  async function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const adminDoc = await getDoc(doc(db, "admins", user.uid));
          if (adminDoc.exists()) {
            setUserRole("admin");
            setUserData(adminDoc.data());
          } else {
            const studentDoc = await getDoc(doc(db, "students", user.uid));
            if (studentDoc.exists()) {
              setUserRole("student");
              setUserData(studentDoc.data());
            } else {
              setUserRole(null);
              setUserData(null);
            }
          }
        } else {
          setUserRole(null);
          setUserData(null);
        }
      } catch (e) {
        console.error("Auth error:", e);
        setUserRole(null);
        setUserData(null);
      } finally {
        setCurrentUser(user);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userRole, userData, login, logout, resetPassword, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
