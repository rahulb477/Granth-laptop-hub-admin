"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHead, Loading, ErrorBox } from "@/admin/lib";
import {
  getProducts,
  getCategories,
  getAllCustomerOrders,
  getAllCustomers,
  getEnquiries,
} from "@/lib/firestore-service";

/* UI-only analytics: reads existing Firestore collections via existing
   service functions and visualizes them. No new backend, no fake data. */
function toMs(v: any): number {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (typeof v?.toMillis === "function") return v.toMillis();
  if (typeof v?.seconds === "number") return v.seconds * 1000;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : 0;
}
function inr(n: number) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [o, p, c, cu, e] = await Promise.all([
          getAllCustomerOrders(),
          getProducts(),
          getCategories(),
          getAllCustomers(),
          getEnquiries(),
        ]);
        setOrders(o);
        setProducts(p);
        setCategories(c);
        setCustomers(cu);
        setEnquiries(e);
      } catch (err: any) {
        setError(err?.message || "Could not load analytics from Firestore.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const revenue = useMemo(
    () => orders.filter((o) => (o.status || "").toLowerCase() !== "cancelled").reduce((s, o) => s + (Number(o.total) || 0), 0),
    [orders]
  );

  const statusMix = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders) {
      const k = o.status || "Placed";
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [orders]);

  const maxStatus = Math.max(...statusMix.map(([, n]) => n), 1);

  const sourceMix = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of enquiries) {
      const k = e.source || "website";
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [enquiries]);
  const maxSource = Math.max(...sourceMix.map(([, n]) => n), 1);

  const brandMix = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of products) {
      const k = p.brand || "Other";
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [products]);
  const maxBrand = Math.max(...brandMix.map(([, n]) => n), 1);

  const monthly = useMemo(() => {
    const buckets = new Map<string, { revenue: number; count: number; key: number }>();
    for (const o of orders) {
      const t = toMs(o.createdAt);
      if (!t) continue;
      const d = new Date(t);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cur = buckets.get(key) ?? { revenue: 0, count: 0, key: new Date(d.getFullYear(), d.getMonth(), 1).getTime() };
      cur.count += 1;
      if ((o.status || "").toLowerCase() !== "cancelled") cur.revenue += Number(o.total) || 0;
      buckets.set(key, cur);
    }
    return [...buckets.entries()]
      .sort((a, b) => a[1].key - b[1].key)
      .slice(-8)
      .map(([label, v]) => ({ label, ...v }));
  }, [orders]);
  const maxMonthly = Math.max(...monthly.map((m) => m.revenue), 1);

  return (
    <div>
      <PageHead
        title="Analytics"
        desc="Real store performance computed live from Firestore orders, products, customers and enquiries."
      >
        <Link href="/admin/orders" className="adm-btn adm-btn-line text-xs">View Orders</Link>
        <Link href="/admin/backup" className="adm-btn adm-btn-gold text-xs">Backup & Export</Link>
      </PageHead>

      {error && <div className="mb-4"><ErrorBox msg={error} /></div>}

      {loading ? (
        <Loading />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: "Revenue (all time)", value: inr(revenue), sub: `${orders.length} orders` },
              { label: "Avg. Order Value", value: orders.length ? inr(Math.round(revenue / orders.length)) : "—", sub: "Excludes cancelled" },
              { label: "Catalog Size", value: String(products.length), sub: `${categories.length} categories` },
              { label: "Enquiry → Customer", value: `${enquiries.length} / ${customers.length}`, sub: "Pipeline volume" },
            ].map((s) => (
              <div key={s.label} className="adm-card p-5">
                <p className="text-[12px] font-semibold text-slate-500">{s.label}</p>
                <p className="text-[24px] font-extrabold tracking-tight text-[#111827] mt-1">{s.value}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="adm-card p-5 sm:p-6">
              <p className="text-[15px] font-bold text-[#111827] tracking-tight">Revenue by Month</p>
              <p className="text-[11px] text-slate-400 mb-4">Last {monthly.length || 0} active months · real orders</p>
              {monthly.length === 0 ? (
                <p className="text-[13px] text-slate-400 text-center py-8">No dated orders yet — monthly revenue appears here automatically.</p>
              ) : (
                <div className="space-y-2.5">
                  {monthly.map((m) => (
                    <div key={m.label}>
                      <div className="flex items-center justify-between text-[12px] font-semibold mb-1">
                        <span className="text-slate-600">{m.label}</span>
                        <span className="text-[#111827]">{inr(m.revenue)} · {m.count} orders</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${(m.revenue / maxMonthly) * 100}%`, background: "linear-gradient(90deg,#0F172A,#1F2937)" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="adm-card p-5 sm:p-6">
              <p className="text-[15px] font-bold text-[#111827] tracking-tight">Orders by Status</p>
              <p className="text-[11px] text-slate-400 mb-4">Live fulfillment mix</p>
              {statusMix.length === 0 ? (
                <p className="text-[13px] text-slate-400 text-center py-8">No orders yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {statusMix.map(([label, n]) => (
                    <div key={label}>
                      <div className="flex items-center justify-between text-[12px] font-semibold mb-1">
                        <span className="text-slate-600">{label}</span>
                        <span className="text-[#111827]">{n}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${(n / maxStatus) * 100}%`, background: "linear-gradient(90deg,#D6A600,#D6A600)" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="adm-card p-5 sm:p-6">
              <p className="text-[15px] font-bold text-[#111827] tracking-tight">Enquiries by Source</p>
              <p className="text-[11px] text-slate-400 mb-4">WhatsApp vs website demand</p>
              {sourceMix.length === 0 ? (
                <p className="text-[13px] text-slate-400 text-center py-8">No enquiries yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {sourceMix.map(([label, n]) => (
                    <div key={label}>
                      <div className="flex items-center justify-between text-[12px] font-semibold mb-1">
                        <span className="text-slate-600 capitalize">{label}</span>
                        <span className="text-[#111827]">{n}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(n / maxSource) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="adm-card p-5 sm:p-6">
              <p className="text-[15px] font-bold text-[#111827] tracking-tight">Catalog by Brand</p>
              <p className="text-[11px] text-slate-400 mb-4">Product distribution</p>
              {brandMix.length === 0 ? (
                <p className="text-[13px] text-slate-400 text-center py-8">No products yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {brandMix.map(([label, n]) => (
                    <div key={label}>
                      <div className="flex items-center justify-between text-[12px] font-semibold mb-1">
                        <span className="text-slate-600">{label}</span>
                        <span className="text-[#111827]">{n}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${(n / maxBrand) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
