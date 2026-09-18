"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/lib/firebase-auth";
import { AdminShell } from "@/admin/shell";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.replace("/admin/login");
    }
  }, [user, loading, isAdmin, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Connecting to Firebase Admin...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null; // Will redirect via useEffect
  }

  return <AdminShell>{children}</AdminShell>;
}
