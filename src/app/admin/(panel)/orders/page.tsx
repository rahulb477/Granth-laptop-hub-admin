"use client";
import React, { useEffect, useState } from "react";
import {
  getAllCustomerOrders,
  updateCustomerOrderStatus,
  UserOrder,
} from "@/lib/firestore-service";

const STATUSES = ["Order Placed", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];

export default function OrdersAdminPage() {
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<UserOrder | null>(null);
  const [updating, setUpdating] = useState(false);
  const [success, setSuccess] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await getAllCustomerOrders();
      setOrders(data);
    } catch (err: any) {
      console.error("Load orders error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleStatusChange = async (order: UserOrder, newStatus: string) => {
    setUpdating(true);
    try {
      await updateCustomerOrderStatus(order.userId, order.id, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: newStatus } : o))
      );
      if (selectedOrder && selectedOrder.id === order.id) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
      setSuccess(`Order #${order.id.slice(0, 8)} status updated to "${newStatus}".`);
      setTimeout(() => setSuccess(""), 3500);
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      o.id?.toLowerCase().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.phone?.toLowerCase().includes(q);

    const matchStatus = !statusFilter || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B88900]">Granth Laptop Hub</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#111827]">Order Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Read from Firestore <code className="text-slate-700">users/{'{uid}'}/orders</code> placed by real customers
          </p>
        </div>

        <button
          onClick={loadOrders}
          className="adm-btn adm-btn-line text-xs py-2 px-3 inline-flex items-center gap-1.5"
        >
          <span>↻ Refresh Orders</span>
        </button>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold">
          ✓ {success}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="adm-card p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter("")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              !statusFilter ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Orders ({orders.length})
          </button>
          {STATUSES.map((st) => {
            const count = orders.filter((o) => o.status === st).length;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(statusFilter === st ? "" : st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  statusFilter === st ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>

        <input
          type="text"
          placeholder="Search by customer name, phone, order ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="adm-input text-xs"
        />
      </div>

      {/* Orders List / Table */}
      <div className="adm-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading orders from Firestore...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No orders found in this view.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total (₹)</th>
                  <th className="px-4 py-3">Coupon</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      #{ord.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{ord.customerName || "Customer"}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{ord.phone || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {ord.createdAt
                        ? new Date(
                            typeof ord.createdAt === "number" ? ord.createdAt : ord.createdAt.toMillis?.() || 0
                          ).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {Array.isArray(ord.items) ? ord.items.length : 1} item(s)
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                      ₹ {Number(ord.total || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-[#B88900]">
                      {ord.couponCode || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        disabled={updating}
                        value={ord.status || "Order Placed"}
                        onChange={(e) => handleStatusChange(ord, e.target.value)}
                        className={`text-[10px] font-bold rounded-full px-2.5 py-1 border-0 outline-none cursor-pointer ${
                          ord.status === "Delivered"
                            ? "bg-emerald-100 text-emerald-800"
                            : ord.status === "Cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(ord)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Order #{selectedOrder.id}</h2>
                <p className="text-xs text-slate-400">User UID: {selectedOrder.userId}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 font-bold text-lg">✕</button>
            </div>

            {/* Customer Details */}
            <div className="p-3.5 bg-slate-50 rounded-xl space-y-1 text-xs">
              <p className="font-bold text-slate-800">Customer & Delivery Information</p>
              <p><span className="text-slate-400">Name:</span> <strong>{selectedOrder.customerName}</strong></p>
              <p><span className="text-slate-400">Phone:</span> {selectedOrder.phone}</p>
              <p><span className="text-slate-400">Address:</span> {typeof selectedOrder.address === "string" ? selectedOrder.address : JSON.stringify(selectedOrder.address)}</p>
              <p><span className="text-slate-400">Payment:</span> {selectedOrder.paymentMethod || "COD"}</p>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Ordered Products</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {Array.isArray(selectedOrder.items) && selectedOrder.items.map((it: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-white text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-8 rounded bg-slate-100 overflow-hidden shrink-0">
                        {it.image ? <img src={it.image} alt="" className="w-full h-full object-cover" /> : null}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{it.name || "Product"}</p>
                        <p className="text-[10px] text-slate-400">Qty: {it.quantity || 1} • {it.price}</p>
                      </div>
                    </div>
                    <span className="font-bold text-slate-900">{it.price}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="p-3 border-t border-slate-100 text-xs space-y-1 text-right">
              <p className="text-slate-500">Subtotal: ₹ {Number(selectedOrder.subtotal || 0).toLocaleString("en-IN")}</p>
              {selectedOrder.couponCode && (
                <p className="text-emerald-700">Coupon ({selectedOrder.couponCode}): -₹ {Number(selectedOrder.couponDiscount || 0).toLocaleString("en-IN")}</p>
              )}
              <p className="text-sm font-bold text-slate-900">Total: ₹ {Number(selectedOrder.total || 0).toLocaleString("en-IN")}</p>
            </div>

            {/* Status Update Control */}
            <div className="p-3.5 bg-amber-50/60 rounded-xl flex items-center justify-between gap-3 text-xs">
              <span className="font-bold text-amber-900">Update Order Status:</span>
              <select
                disabled={updating}
                value={selectedOrder.status}
                onChange={(e) => handleStatusChange(selectedOrder, e.target.value)}
                className="adm-input text-xs !w-44 font-semibold"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
