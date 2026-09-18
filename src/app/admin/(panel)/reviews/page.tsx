"use client";
import React, { useEffect, useState } from "react";
import {
  getReviews,
  updateReviewStatus,
  deleteReview,
  FirestoreReview,
} from "@/lib/firestore-service";

export default function ReviewsAdminPage() {
  const [reviews, setReviews] = useState<FirestoreReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadAll = async () => {
    setLoading(true);
    try {
      const data = await getReviews();
      setReviews(data);
    } catch (err: any) {
      setError("Load error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleStatus = async (r: FirestoreReview, status: "approved" | "pending" | "hidden") => {
    if (!r.id) return;
    try {
      await updateReviewStatus(r.id, status);
      setReviews((prev) => prev.map((item) => (item.id === r.id ? { ...item, status } : item)));
      setSuccess(`Review marked as ${status}.`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      alert("Status update failed: " + err.message);
    }
  };

  const handleToggleFeatured = async (r: FirestoreReview) => {
    if (!r.id) return;
    try {
      const nextFeatured = !r.featured;
      await updateReviewStatus(r.id, r.status, nextFeatured);
      setReviews((prev) => prev.map((item) => (item.id === r.id ? { ...item, featured: nextFeatured } : item)));
    } catch (err: any) {
      alert("Feature toggle failed: " + err.message);
    }
  };

  const handleDelete = async (r: FirestoreReview) => {
    if (!r.id) return;
    if (!confirm(`Delete review from "${r.customerName}"?`)) return;
    try {
      await deleteReview(r.id);
      setReviews((prev) => prev.filter((item) => item.id !== r.id));
      setSuccess("Review deleted.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B88900]">Granth Laptop Hub</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#111827]">Granth Laptop Hub Testimonials</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manages customer reviews in Firestore <code className="text-slate-700">/reviews</code>
          </p>
        </div>
      </div>

      {success && <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold">✓ {success}</div>}
      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs font-semibold">{error}</div>}

      <div className="adm-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading reviews from Firestore...</div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No reviews found in Firestore yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Feedback</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reviews.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-900">{r.customerName}</td>
                    <td className="px-4 py-3 text-amber-500 font-bold">★ {r.rating} / 5</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs">
                      <p className="truncate">{r.text}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.status !== "approved" ? (
                          <button onClick={() => handleStatus(r, "approved")} className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 font-semibold">
                            Approve
                          </button>
                        ) : (
                          <button onClick={() => handleStatus(r, "hidden")} className="px-2 py-1 rounded bg-slate-100 text-slate-600 font-semibold">
                            Hide
                          </button>
                        )}
                        <button onClick={() => handleToggleFeatured(r)} className="px-2 py-1 rounded bg-purple-50 text-purple-700 font-semibold">
                          {r.featured ? "Unfeature" : "Feature"}
                        </button>
                        <button onClick={() => handleDelete(r)} className="px-2 py-1 rounded bg-red-50 text-red-700 font-semibold">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
