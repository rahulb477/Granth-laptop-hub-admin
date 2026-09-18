"use client";
import React, { useEffect, useState } from "react";
import {
  getAllCustomers,
  getAllCustomerOrders,
} from "@/lib/firestore-service";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [usersList, ordersList] = await Promise.all([
          getAllCustomers(),
          getAllCustomerOrders(),
        ]);
        setCustomers(usersList);
        setOrders(ordersList);
      } catch (err) {
        console.error("Customers error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      !search ||
      c.id?.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    );
  });

  const getUserOrders = (uid: string) => orders.filter((o) => o.userId === uid);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B88900]">Granth Laptop Hub</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#111827]">Customer Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Read from Firestore <code className="text-slate-700">/users</code> and subcollections <code className="text-slate-700">addresses</code>, <code className="text-slate-700">orders</code>, <code className="text-slate-700">rewards</code>
          </p>
        </div>
      </div>

      <div className="adm-card p-4">
        <input
          type="text"
          placeholder="Search by customer name, email, phone, UID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="adm-input text-xs"
        />
      </div>

      <div className="adm-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading registered customers from Firestore...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No registered customers found in Firestore users collection.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">UID</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Total Orders</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => {
                  const uOrders = getUserOrders(c.id);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {c.name || c.displayName || c.email?.split("@")[0] || "Customer"}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500 truncate max-w-[140px]">
                        {c.id}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <p>{c.email || "—"}</p>
                        <p className="text-[10px] text-slate-400">{c.phone || "—"}</p>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {uOrders.length} order(s)
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedUser(c)}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">{selectedUser.name || "Customer Profile"}</h2>
                <p className="text-xs text-slate-400 font-mono">UID: {selectedUser.id}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 font-bold text-lg">✕</button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl space-y-1.5 text-xs">
              <p><span className="text-slate-400">Email:</span> <strong>{selectedUser.email || "—"}</strong></p>
              <p><span className="text-slate-400">Phone:</span> {selectedUser.phone || "—"}</p>
              <p><span className="text-slate-400">Role:</span> {selectedUser.role || "customer"}</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Orders by this Customer</p>
              {getUserOrders(selectedUser.id).length === 0 ? (
                <p className="text-xs text-slate-400 p-3 bg-slate-50 rounded-lg">No orders placed yet.</p>
              ) : (
                getUserOrders(selectedUser.id).map((o) => (
                  <div key={o.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">#{o.id.slice(0, 8)}</p>
                      <p className="text-[10px] text-slate-400">{o.status} • {Array.isArray(o.items) ? o.items.length : 1} items</p>
                    </div>
                    <span className="font-bold text-slate-900">₹ {Number(o.total || 0).toLocaleString("en-IN")}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
