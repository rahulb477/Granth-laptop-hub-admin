"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, signOut } from "firebase/auth";
import { auth, AUTHORIZED_ADMIN_UID } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

interface AdminAuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  role: "superadmin" | "admin" | "staff";
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  role: "staff",
  logout: async () => {},
});

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<"superadmin" | "admin" | "staff">("staff");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check if UID matches primary authorized admin UID or has admin doc
        if (currentUser.uid === AUTHORIZED_ADMIN_UID) {
          setIsAdmin(true);
          setRole("superadmin");
        } else {
          // Check Firestore adminUsers or users collection for role
          try {
            const adminDoc = await getDoc(doc(db, "adminUsers", currentUser.uid));
            if (adminDoc.exists() && adminDoc.data()?.active !== false) {
              setIsAdmin(true);
              setRole(adminDoc.data()?.role || "admin");
            } else {
              // Also check users collection
              const userDoc = await getDoc(doc(db, "users", currentUser.uid));
              if (userDoc.exists() && (userDoc.data()?.role === "admin" || userDoc.data()?.role === "superadmin")) {
                setIsAdmin(true);
                setRole(userDoc.data()?.role);
              } else {
                // If not in firestore, but logged in as admin email:
                if (currentUser.email === "admin@maakarni.com") {
                  setIsAdmin(true);
                  setRole("superadmin");
                } else {
                  setIsAdmin(false);
                }
              }
            }
          } catch (e) {
            console.warn("Role check error:", e);
            if (currentUser.uid === AUTHORIZED_ADMIN_UID || currentUser.email === "admin@maakarni.com") {
              setIsAdmin(true);
              setRole("superadmin");
            } else {
              setIsAdmin(false);
            }
          }
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const logout = async () => {
    await signOut(auth);
    // Also remove cookie if any
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } catch {}
  };

  return (
    <AdminAuthContext.Provider value={{ user, loading, isAdmin, role, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export const useAdminAuth = () => useContext(AdminAuthContext);
