"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getProduct,
  saveProduct,
  deleteProduct,
  getBrands,
  getCategories,
  logActivity,
  FirestoreProduct,
} from "@/lib/firestore-service";
import { useAdminAuth } from "@/lib/firebase-auth";
import { ImageUploader, MultiImageUploader } from "@/admin/image-uploader";
import { CUSTOMER_WEBSITE_URL } from "@/lib/firebase";

export function ProductsEditor({ id }: { id?: string }) {
  const router = useRouter();
  const { user } = useAdminAuth();
  const isNew = !id || id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [brandsList, setBrandsList] = useState<string[]>([]);
  const [categoriesList, setCategoriesList] = useState<string[]>([]);

  // Form state normalized to customer website schema
  const [formData, setFormData] = useState<FirestoreProduct>({
    name: "",
    brand: "LENOVO",
    price: 24999,
    originalPrice: 65000,
    discount: "",
    section: "",
    spotlight: false,
    featured: false,
    tag: "Student-friendly",
    tagColor: "green",
    rating: 4.5,
    reviews: 5,
    specs: ["Intel Core i5", "8GB", "256GB SSD"],
    processor: "Intel Core i5",
    ram: "8GB",
    storage: "256GB SSD",
    os: "Windows 11 pro",
    condition: "refurbished",
    warranty: "6 Months Warranty Assistance in Jodhpur",
    returnPolicy: "7 Days Easy Replacement for Manufacturing Defects",
    description: "",
    image: "",
    images: [],
    stock: 5,
    status: "published",
  });

  // Load brands and categories for dropdowns
  useEffect(() => {
    getBrands().then((bs) => {
      const names = bs.map((b) => b.name.toUpperCase());
      setBrandsList(Array.from(new Set(["LENOVO", "HP", "DELL", "APPLE", "ASUS", "ACER", ...names])));
    }).catch(() => {});

    getCategories().then((cs) => {
      const names = cs.map((c) => c.name);
      setCategoriesList(names);
    }).catch(() => {});
  }, []);

  // Load existing product
  useEffect(() => {
    if (isNew) {
      setLoading(false);
      return;
    }

    getProduct(id!)
      .then((p) => {
        if (!p) {
          setError(`Product with ID "${id}" was not found in Firestore.`);
          return;
        }

        // Normalize specs
        const specs = Array.isArray(p.specs) ? p.specs : [];
        const proc = p.processor || specs[0] || "";
        const r = p.ram || specs[1] || "";
        const st = p.storage || specs[2] || "";

        const allImages = Array.isArray(p.images) && p.images.length > 0
          ? p.images
          : p.image
          ? [p.image]
          : [];

        setFormData({
          ...p,
          brand: (p.brand || "LENOVO").toUpperCase(),
          processor: proc,
          ram: r,
          storage: st,
          specs: specs.length > 0 ? specs : [proc, r, st].filter(Boolean),
          images: allImages,
          image: p.image || allImages[0] || "",
          price: Number(p.price) || 0,
          originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
        });
      })
      .catch((err) => {
        console.error("Error loading product:", err);
        setError("Error loading product: " + err.message);
      })
      .finally(() => setLoading(false));
  }, [id, isNew]);

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.name.trim()) {
      setError("Product Name is required.");
      return;
    }
    if (!formData.price || formData.price <= 0) {
      setError("Please provide a valid selling price in ₹.");
      return;
    }

    // Ensure at least one image is provided
    const allImgs = formData.images && formData.images.length > 0
      ? formData.images
      : formData.image
      ? [formData.image]
      : [];

    if (allImgs.length === 0) {
      setError("Please upload at least one product image using the upload button.");
      return;
    }

    setSaving(true);

    try {
      // Rebuild specs
      const finalSpecs = [formData.processor, formData.ram, formData.storage].filter(Boolean) as string[];

      // Calculate discount
      let discountStr = formData.discount;
      if (!discountStr && formData.originalPrice && formData.originalPrice > formData.price) {
        const pct = Math.round(((formData.originalPrice - formData.price) / formData.originalPrice) * 100);
        discountStr = `${pct}% off`;
      }

      const payload: Partial<FirestoreProduct> = {
        ...formData,
        brand: formData.brand.toUpperCase(),
        specs: finalSpecs.length > 0 ? finalSpecs : formData.specs,
        discount: discountStr,
        image: allImgs[0],
        images: allImgs,
        price: Number(formData.price),
        originalPrice: formData.originalPrice ? Number(formData.originalPrice) : Number(formData.price),
        spotlight: formData.section === "spotlight" || formData.spotlight === true,
      };

      const result = await saveProduct(payload, isNew ? undefined : id);

      logActivity({
        adminId: user?.uid,
        adminName: user?.email ?? "admin",
        action: isNew ? "create" : "update",
        entity: "products",
        entityId: result.id,
        summary: `Product ${isNew ? "created" : "updated"}: ${payload.name} — ₹${Number(payload.price).toLocaleString("en-IN")}`,
      });

      setSuccess("Product saved successfully to Firestore! Changes are now live on the customer website.");
      setTimeout(() => setSuccess(""), 4000);

      if (isNew && result.id) {
        router.replace(`/admin/products/${result.id}`);
      }
    } catch (err: any) {
      console.error("Error saving product:", err);
      setError("Failed to save product to Firestore: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || isNew) return;
    if (!confirm(`Are you sure you want to permanently delete "${formData.name}" from Firestore?`)) return;
    try {
      await deleteProduct(id);
      router.push("/admin/products");
    } catch (err: any) {
      alert("Delete failed: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <span className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span>Loading product details from Firestore...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/admin/products" className="hover:text-[#B88900]">← Back to Products</Link>
            <span>/</span>
            <span>{isNew ? "New Product" : formData.name || id}</span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B88900]">Granth Laptop Hub</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#111827]">
            {isNew ? "Create New Product" : `Edit: ${formData.name}`}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Document location: <code className="text-slate-700">products/{id || "[auto-id]"}</code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isNew && (
            <button
              type="button"
              onClick={handleDelete}
              className="adm-btn adm-btn-danger text-xs py-2 px-3.5"
            >
              Delete Product
            </button>
          )}

          <button
            type="submit"
            disabled={saving}
            className="adm-btn adm-btn-gold text-xs py-2 px-4 shadow-sm"
          >
            {saving ? "Saving to Firestore..." : isNew ? "Create Product" : "Save Changes"}
          </button>
        </div>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center justify-between">
          <span>✓ {success}</span>
          <a
            href={CUSTOMER_WEBSITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-bold text-emerald-900 ml-4"
          >
            Verify on Customer Website ↗
          </a>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Grid Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Core Fields */}
        <div className="lg:col-span-2 space-y-5">
          {/* Section 1: Basic Info */}
          <div className="adm-card p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
              Basic Information
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Title / Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder='e.g. Lenovo ThinkPad L490 | Intel i5 8th Gen | 14" HD | Windows 11 Pro'
                className="adm-input text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Brand <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value.toUpperCase() })}
                    className="adm-input text-xs"
                  >
                    {brandsList.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Custom Brand"
                    className="adm-input text-xs !w-32"
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        setFormData({ ...formData, brand: e.target.value.trim().toUpperCase() });
                      }
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Condition</label>
                <select
                  value={formData.condition || "refurbished"}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                  className="adm-input text-xs"
                >
                  <option value="refurbished">Refurbished (Quality Checked)</option>
                  <option value="new">Brand New (Billed)</option>
                  <option value="open box">Open Box / Demo Unit</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Short Description / Highlight
              </label>
              <textarea
                rows={3}
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Key highlights, condition rating, ideal use case..."
                className="adm-input text-xs"
              />
            </div>
          </div>

          {/* Section 2: Pricing & Badges */}
          <div className="adm-card p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
              Pricing & Customer Badges
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Selling Price (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.price || ""}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  placeholder="22999"
                  className="adm-input text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Original Price / MRP (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.originalPrice || ""}
                  onChange={(e) => setFormData({ ...formData, originalPrice: Number(e.target.value) })}
                  placeholder="64000"
                  className="adm-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Discount Text (Auto or Custom)
                </label>
                <input
                  type="text"
                  value={formData.discount || ""}
                  onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                  placeholder="e.g. 64% off"
                  className="adm-input text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tag / Badge Label
                </label>
                <input
                  type="text"
                  value={formData.tag || ""}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                  placeholder="Student-friendly, Pro workstation, Gaming, etc."
                  className="adm-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tag Color Theme
                </label>
                <select
                  value={formData.tagColor || "green"}
                  onChange={(e) => setFormData({ ...formData, tagColor: e.target.value })}
                  className="adm-input text-xs"
                >
                  <option value="green">Green (Student-friendly / Best value)</option>
                  <option value="purple">Purple (Pro workstation / High-end)</option>
                  <option value="blue">Blue (Corporate / Business)</option>
                  <option value="gray">Gray (Available)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Hardware Specifications */}
          <div className="adm-card p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
              Hardware Specifications
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Processor (Spec #1)
                </label>
                <input
                  type="text"
                  value={formData.processor || ""}
                  onChange={(e) => setFormData({ ...formData, processor: e.target.value })}
                  placeholder="Intel Core i5 / Apple M1 / AMD Ryzen 5"
                  className="adm-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  RAM (Spec #2)
                </label>
                <input
                  type="text"
                  value={formData.ram || ""}
                  onChange={(e) => setFormData({ ...formData, ram: e.target.value })}
                  placeholder="8GB / 16GB / 32GB"
                  className="adm-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Storage (Spec #3)
                </label>
                <input
                  type="text"
                  value={formData.storage || ""}
                  onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                  placeholder="256GB SSD / 512GB SSD / 1TB"
                  className="adm-input text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Operating System
              </label>
              <input
                type="text"
                value={formData.os || ""}
                onChange={(e) => setFormData({ ...formData, os: e.target.value })}
                placeholder="Windows 11 pro / macOS / Windows 10"
                className="adm-input text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Warranty Information
                </label>
                <input
                  type="text"
                  value={formData.warranty || ""}
                  onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
                  placeholder="6 Months in-store warranty assistance"
                  className="adm-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Return / Exchange Policy
                </label>
                <input
                  type="text"
                  value={formData.returnPolicy || ""}
                  onChange={(e) => setFormData({ ...formData, returnPolicy: e.target.value })}
                  placeholder="7 days easy replacement"
                  className="adm-input text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 4: PRODUCT IMAGE UPLOAD (ImgBB via secure /api/upload-image) */}
          <div className="adm-card p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Product Image & Gallery Upload
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload images directly to Firebase Storage. No manual URLs required. The download URL will be stored in Firestore and loaded on the customer website.
              </p>
            </div>

            <MultiImageUploader
              values={formData.images || (formData.image ? [formData.image] : [])}
              onChange={(urls) => {
                setFormData({
                  ...formData,
                  images: urls,
                  image: urls[0] || "",
                });
              }}
              folder="products"
              label="Product Images (Upload from Camera or File Picker)"
            />
          </div>
        </div>

        {/* Right Column: Section Placement, Status & Visibility */}
        <div className="space-y-5">
          {/* Homepage Section Assignment */}
          <div className="adm-card p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
              Homepage Placement
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assign to Section on Homepage
              </label>
              <select
                value={formData.section || ""}
                onChange={(e) => {
                  const s = e.target.value as any;
                  setFormData({
                    ...formData,
                    section: s,
                    spotlight: s === "spotlight" ? true : formData.spotlight,
                  });
                }}
                className="adm-input text-xs"
              >
                <option value="">None (Catalog view only)</option>
                <option value="bestSellers">Best Sellers Section</option>
                <option value="trending">Trending Laptops Section</option>
                <option value="spotlight">Today's Spotlight (Live Deal)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                The customer website queries Firestore: <code className="text-slate-600">where("section", "==", "bestSellers")</code> etc.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!formData.spotlight}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      spotlight: e.target.checked,
                      section: e.target.checked ? "spotlight" : formData.section,
                    })
                  }
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Set as "Deal of the Day" / Spotlight</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Mark as Featured Product</span>
              </label>
            </div>
          </div>

          {/* Publication Status & Stock */}
          <div className="adm-card p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
              Stock & Publishing
            </h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Publishing Status
              </label>
              <select
                value={formData.status || "published"}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="adm-input text-xs"
              >
                <option value="published">Published (Visible on site)</option>
                <option value="draft">Draft (Hidden from site)</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Available Stock Units
              </label>
              <input
                type="number"
                min="0"
                value={formData.stock ?? 5}
                onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                className="adm-input text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rating</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  value={formData.rating ?? 4.5}
                  onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                  className="adm-input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Review Count</label>
                <input
                  type="number"
                  min="0"
                  value={formData.reviews ?? 5}
                  onChange={(e) => setFormData({ ...formData, reviews: Number(e.target.value) })}
                  className="adm-input text-xs"
                />
              </div>
            </div>
          </div>

          {/* Action Card */}
          <div className="adm-card p-5 space-y-3 bg-amber-50/50 border-amber-200">
            <p className="text-xs font-bold text-amber-900">Firestore Live Synchronization</p>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              When you click Save, this document is written to the Firestore collection <code className="bg-white px-1 py-0.5 rounded border border-amber-200">products</code>.
              The customer website will load it immediately.
            </p>
            <button
              type="submit"
              disabled={saving}
              className="w-full adm-btn adm-btn-gold text-xs py-2.5 shadow-sm font-bold"
            >
              {saving ? "Saving to Firestore..." : isNew ? "Create Product" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
