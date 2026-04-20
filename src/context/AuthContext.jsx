import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  sendPasswordResetEmail,
  setPersistence,
  browserSessionPersistence // This makes logout happen when tab closes
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const AuthContext = createContext();

export function useAuth() { 
  return useContext(AuthContext); 
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- 1. Login with Session Persistence ---
  async function login(email, password) {
    // If you want the user to stay logged in even after closing the browser,
    // remove the setPersistence line below.
    await setPersistence(auth, browserSessionPersistence);
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    try {
      await signOut(auth);
      // Explicitly clear states on logout
      setCurrentUser(null);
      setUserRole(null);
      setUserData(null);
    } catch (e) {
      console.error("Logout error", e);
    }
  }

  async function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true); // Start loading whenever auth state changes
      
      try {
        if (user) {
          // Check Admin Collection
          const adminDoc = await getDoc(doc(db, "admins", user.uid));
          if (adminDoc.exists()) {
            setUserData(adminDoc.data());
            setUserRole("admin");
          } else {
            // Check Student Collection
            const studentDoc = await getDoc(doc(db, "students", user.uid));
            if (studentDoc.exists()) {
              setUserData(studentDoc.data());
              setUserRole("student");
            } else {
              setUserRole(null);
              setUserData(null);
            }
          }
          setCurrentUser(user);
        } else {
          // No user is signed in
          setCurrentUser(null);
          setUserRole(null);
          setUserData(null);
        }
      } catch (e) {
        console.error("Auth context error:", e);
      } finally {
        setLoading(false); // Stop loading ONLY after role check is complete
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    userData,
    login,
    logout,
    resetPassword,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children} 
    </AuthContext.Provider>
  );
}