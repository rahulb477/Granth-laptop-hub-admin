"use client";
import React, { useEffect, useState } from "react";
import { Card, Empty, Loading, Modal, PageHead, SaveBar, Toggle, useConfirm } from "@/admin/lib";
import { getAdminUsers, saveAdminUser, deleteAdminUser, logActivity, type FirestoreAdminUser } from "@/lib/firestore-service";
import { useAdminAuth } from "@/lib/firebase-auth";
import { AUTHORIZED_ADMIN_UID } from "@/lib/firebase";

export default function UsersPage() {
  const { user, role } = useAdminAuth();
  const [rows, setRows] = useState<FirestoreAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const { ask, node } = useConfirm();

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAdminUsers();
      setRows(data);
    } catch (e: any) {
      setErr(e?.message || "Could not read adminUsers from Firestore.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const canManage = role === "superadmin" || user?.uid === AUTHORIZED_ADMIN_UID;

  async function save() {
    setErr("");
    if (!form.name?.trim() || !form.email?.trim()) {
      setErr("Name and email are required.");
      return;
    }
    setSaving(true);
    try {
      if (editing === "new") {
        await saveAdminUser({ name: form.name.trim(), email: form.email.trim(), role: form.role, active: form.active });
      } else {
        await saveAdminUser(
          { name: form.name.trim(), email: form.email.trim(), role: form.role, active: form.active },
          editing.id
        );
      }
      logActivity({
        adminId: user?.uid,
        adminName: user?.email ?? "admin",
        action: editing === "new" ? "create" : "update",
        entity: "adminUsers",
        entityId: form.email,
        summary: `Admin user ${form.email} ${editing === "new" ? "added" : "updated"} (${form.role})`,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setEditing(null);
      load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  const roleTone: Record<string, string> = {
    superadmin: "bg-violet-100 text-violet-700",
    admin: "bg-[#FFF3C4] text-[#7A5E00]",
    staff: "bg-slate-100 text-slate-600",
  };

  function fmtDate(v: any) {
    try {
      if (!v) return "—";
      if (typeof v?.toDate === "function") return v.toDate().toLocaleDateString("en-IN");
      return new Date(v).toLocaleDateString("en-IN");
    } catch {
      return "—";
    }
  }

  return (
    <div>
      <PageHead
        title="Admin Users"
        desc="Stored in Firestore /adminUsers — the same project as the customer website. Create the Firebase Auth user first, then grant a role here by email."
      >
        {canManage && (
          <button className="adm-btn adm-btn-gold" onClick={() => { setForm({ name: "", email: "", role: "staff", active: true }); setErr(""); setEditing("new"); }}>+ Add User</button>
        )}
      </PageHead>
      {!canManage && (
        <div className="adm-card p-4 mb-4 text-[13px] text-[#7A5E00] bg-[#FFF9E8] border-amber-200">
          Only Super Admin can manage roles. This list is read-only for your account.
        </div>
      )}
      <Card>
        {loading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty title="No admin users in Firestore yet" sub="Add the owner account here. UID qdVg8nA0dVaA7SxE9QrIRzOXiz23 is always superadmin." />
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="th">Name</th><th className="th">Email</th><th className="th">Role</th><th className="th">Active</th><th className="th">Created</th><th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-[#FFF9E8]/30">
                    <td className="td font-semibold">{u.name}</td>
                    <td className="td">{u.email}</td>
                    <td className="td"><span className={`px-2 py-0.5 rounded-md text-[11px] font-bold capitalize ${roleTone[u.role]}`}>{u.role}</span></td>
                    <td className="td">{u.active !== false ? "✓" : "—"}</td>
                    <td className="td text-[12px] text-slate-400">{fmtDate(u.createdAt)}</td>
                    <td className="td">
                      {canManage ? (
                        <div className="flex justify-end gap-1 text-[12px] font-semibold">
                          <button className="px-2 py-1 rounded-md hover:bg-slate-100 text-slate-700" onClick={() => { setForm({ name: u.name, email: u.email, role: u.role, active: u.active !== false }); setErr(""); setEditing(u); }}>Edit</button>
                          <button
                            className="px-2 py-1 rounded-md hover:bg-red-50 text-red-600"
                            onClick={() =>
                              ask(`Remove ${u.name} (${u.email})? They lose admin access immediately.`, async () => {
                                if (!u.id) return;
                                await deleteAdminUser(u.id);
                                load();
                              })
                            }
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">read-only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="adm-card p-4 mt-4 text-[12px] text-slate-500">
        <strong>How access works:</strong> 1) Create/login the person in Firebase Authentication (email+password) ·
        2) Add the same email here with a role · 3) They sign in at /admin/login. Never store passwords in Firestore.
      </div>

      {editing && (
        <Modal title={editing === "new" ? "Add admin user" : `Edit ${form.name}`} onClose={() => setEditing(null)}>
          <div className="space-y-3.5">
            <div><label className="adm-label">Full name</label><input className="adm-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="adm-label">Email (must match Firebase Auth email)</label><input className="adm-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div>
              <label className="adm-label">Role</label>
              <select className="adm-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="superadmin">Super Admin — full access</option>
                <option value="admin">Admin — content, products, orders, settings</option>
                <option value="staff">Staff — limited operational access</option>
              </select>
            </div>
            <Toggle checked={!!form.active} onChange={(x) => setForm({ ...form, active: x })} label="Account active" />
            {err && <p className="text-[13px] font-semibold text-red-600">{err}</p>}
            <div className="flex items-center justify-end gap-3 pt-1">
              <SaveBar saving={saving} saved={saved} error="" />
              <button className="adm-btn adm-btn-line" onClick={() => setEditing(null)}>Cancel</button>
              <button className="adm-btn adm-btn-gold" onClick={save} disabled={saving}>{editing === "new" ? "Create User" : "Save"}</button>
            </div>
          </div>
        </Modal>
      )}
      {node}
    </div>
  );
}
