import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

export interface FirestoreProduct {
  id?: string;
  name: string;
  brand: string;
  price: number;
  originalPrice?: number;
  discount?: string;
  section?: "bestSellers" | "trending" | "spotlight" | "catalog" | "";
  spotlight?: boolean;
  featured?: boolean;
  tag?: string;
  tagColor?: string;
  rating?: number;
  reviews?: number;
  specs?: string[];
  processor?: string;
  ram?: string;
  storage?: string;
  os?: string;
  condition?: "new" | "refurbished" | "open box";
  warranty?: string;
  returnPolicy?: string;
  description?: string;
  image: string; // primary image URL (ImgBB-hosted)
  images?: string[]; // all gallery images (ImgBB-hosted)
  stock?: number;
  status?: "published" | "draft" | "archived";
  numericId?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface FirestoreCategory {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  icon?: string;
  displayOrder?: number;
  active?: boolean;
  featured?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface FirestoreBrand {
  id?: string;
  name: string;
  slug?: string;
  logo?: string;
  description?: string;
  displayOrder?: number;
  active?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface FirestoreBlogPost {
  id?: string;
  title: string;
  slug?: string;
  category?: string;
  categoryColor?: string;
  excerpt?: string;
  body?: string[] | string;
  date?: string;
  gradient?: string;
  image?: string;
  published?: boolean;
  tags?: string[];
  createdAt?: any;
  updatedAt?: any;
}

export interface FirestoreVideo {
  id?: string;
  title: string;
  description?: string;
  /** Canonical Instagram Reel link, e.g. https://www.instagram.com/reel/XXXX/ (links only — never file uploads). */
  url?: string;
  /** Legacy mirrors kept so older customer-site builds keep working. */
  videoUrl?: string;
  youtubeUrl?: string;
  platform?: "instagram" | "youtube" | string;
  thumbnail?: string; // ImgBB-hosted thumbnail URL
  category?: string;
  displayOrder?: number;
  active?: boolean;
  published?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface FirestoreMediaAsset {
  id?: string;
  url: string;
  name: string;
  group: string; // products | categories | brands | homepage | blog | videos | offers | site
  usedIn?: string[];
  createdAt?: any;
}

export interface FirestoreOffer {
  id?: string;
  title: string;
  name?: string;
  badge?: string;
  description?: string;
  discount?: string;
  image?: string;
  banner?: string;
  appliesTo?: string;
  validUntil?: string;
  startDate?: any;
  endDate?: any;
  active?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface FirestoreCoupon {
  id?: string; // usually coupon code in uppercase, e.g. "KARNI5"
  code: string;
  discountType?: "percent" | "flat";
  discountValue?: number;
  minOrder?: number;
  maxDiscount?: number;
  description?: string;
  active?: boolean;
  expiresAt?: number;
  usageLimit?: number;
  usedCount?: number;
  createdAt?: any;
}

export interface FirestoreReview {
  id?: string;
  productId: string;
  productName?: string;
  customerName: string;
  rating: number;
  text: string;
  status: "approved" | "pending" | "hidden";
  featured?: boolean;
  createdAt?: any;
}

/* ================= PRODUCTS CRUD ================= */
export async function getProducts(options?: {
  section?: string;
  spotlight?: boolean;
  status?: string;
}) {
  const colRef = collection(db, "products");
  let q = query(colRef);

  if (options?.section) {
    q = query(colRef, where("section", "==", options.section));
  } else if (options?.spotlight) {
    q = query(colRef, where("spotlight", "==", true));
  }

  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreProduct));

  if (options?.status) {
    return items.filter((p) => (p.status || "published") === options.status);
  }
  return items;
}

export async function getProduct(id: string) {
  const docRef = doc(db, "products", id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as FirestoreProduct;
}

export async function saveProduct(data: Partial<FirestoreProduct>, id?: string) {
  const colRef = collection(db, "products");
  const docRef = id ? doc(db, "products", id) : doc(colRef);

  // Auto calculate discount if originalPrice and price exist
  let discount = data.discount;
  if (!discount && data.originalPrice && data.price && data.originalPrice > data.price) {
    const pct = Math.round(((data.originalPrice - data.price) / data.originalPrice) * 100);
    discount = `${pct}% off`;
  }

  // Ensure primary image is sync'd
  const images = Array.isArray(data.images) ? data.images : data.image ? [data.image] : [];
  const primaryImage = images[0] || data.image || "/images/laptop-thinkpad.png";

  // Build specs array if separate fields provided
  const specs = Array.isArray(data.specs) && data.specs.length > 0
    ? data.specs
    : [data.processor, data.ram, data.storage].filter(Boolean) as string[];

  const payload: any = {
    ...data,
    image: primaryImage,
    images,
    specs,
    discount,
    updatedAt: serverTimestamp(),
  };

  if (!id) {
    payload.createdAt = serverTimestamp();
    payload.numericId = data.numericId || Date.now() % 1000000;
  }

  await setDoc(docRef, payload, { merge: true });
  return { id: docRef.id, ...payload };
}

export async function deleteProduct(id: string) {
  await deleteDoc(doc(db, "products", id));
}

/* ================= CATEGORIES CRUD ================= */
export async function getCategories() {
  const colRef = collection(db, "categories");
  const snap = await getDocs(colRef);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreCategory));
  return items.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
}

export async function saveCategory(data: Partial<FirestoreCategory>, id?: string) {
  const colRef = collection(db, "categories");
  const docRef = id ? doc(db, "categories", id) : doc(colRef);
  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
    createdAt: data.createdAt || serverTimestamp(),
  };
  await setDoc(docRef, payload, { merge: true });
  return { id: docRef.id, ...payload };
}

export async function deleteCategory(id: string) {
  await deleteDoc(doc(db, "categories", id));
}

/* ================= BRANDS CRUD ================= */
export async function getBrands() {
  const colRef = collection(db, "brands");
  const snap = await getDocs(colRef);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreBrand));
  return items.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
}

export async function saveBrand(data: Partial<FirestoreBrand>, id?: string) {
  const colRef = collection(db, "brands");
  const docRef = id ? doc(db, "brands", id) : doc(colRef);
  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
    createdAt: data.createdAt || serverTimestamp(),
  };
  await setDoc(docRef, payload, { merge: true });
  return { id: docRef.id, ...payload };
}

export async function deleteBrand(id: string) {
  await deleteDoc(doc(db, "brands", id));
}

/* ================= BLOG POSTS CRUD ================= */
export async function getBlogPosts() {
  const colRef = collection(db, "blogPosts");
  const snap = await getDocs(colRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreBlogPost));
}

export async function saveBlogPost(data: Partial<FirestoreBlogPost>, id?: string) {
  const colRef = collection(db, "blogPosts");
  const docRef = id ? doc(db, "blogPosts", id) : doc(colRef);
  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
    createdAt: data.createdAt || serverTimestamp(),
  };
  await setDoc(docRef, payload, { merge: true });
  return { id: docRef.id, ...payload };
}

export async function deleteBlogPost(id: string) {
  await deleteDoc(doc(db, "blogPosts", id));
}

/* ================= VIDEOS CRUD ================= */
export async function getVideos() {
  const colRef = collection(db, "videos");
  const snap = await getDocs(colRef);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreVideo));
  return items.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
}

export async function saveVideo(data: Partial<FirestoreVideo>, id?: string) {
  const colRef = collection(db, "videos");
  const docRef = id ? doc(db, "videos", id) : doc(colRef);
  // Canonical Instagram Reel link; mirror to legacy fields so any
  // customer-site build reading videoUrl/youtubeUrl keeps working.
  const url = (data.url || data.videoUrl || data.youtubeUrl || "").trim();
  const payload = {
    ...data,
    url,
    videoUrl: url,
    platform: data.platform || "instagram",
    active: data.active !== false && data.published !== false,
    published: data.published !== false && data.active !== false,
    updatedAt: serverTimestamp(),
    createdAt: data.createdAt || serverTimestamp(),
  };
  await setDoc(docRef, payload, { merge: true });
  return { id: docRef.id, ...payload };
}

export async function deleteVideo(id: string) {
  await deleteDoc(doc(db, "videos", id));
}

/* ================= OFFERS CRUD ================= */
export async function getOffers() {
  const colRef = collection(db, "offers");
  const snap = await getDocs(colRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreOffer));
}

export async function saveOffer(data: Partial<FirestoreOffer>, id?: string) {
  const colRef = collection(db, "offers");
  const docRef = id ? doc(db, "offers", id) : doc(colRef);
  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
    createdAt: data.createdAt || serverTimestamp(),
  };
  await setDoc(docRef, payload, { merge: true });
  return { id: docRef.id, ...payload };
}

export async function deleteOffer(id: string) {
  await deleteDoc(doc(db, "offers", id));
}

/* ================= COUPONS CRUD ================= */
export async function getCoupons() {
  const colRef = collection(db, "coupons");
  const snap = await getDocs(colRef);
  return snap.docs.map((d) => ({ id: d.id, code: d.id, ...d.data() } as FirestoreCoupon));
}

export async function saveCoupon(data: Partial<FirestoreCoupon>) {
  const code = (data.code || "").trim().toUpperCase();
  if (!code) throw new Error("Coupon code is required");

  const docRef = doc(db, "coupons", code);
  const payload = {
    ...data,
    code,
    active: data.active !== false,
    minOrder: Number(data.minOrder) || 0,
    expiresAt: data.expiresAt || null,
    updatedAt: serverTimestamp(),
  };
  await setDoc(docRef, payload, { merge: true });
  return { id: code, ...payload };
}

export async function deleteCoupon(code: string) {
  await deleteDoc(doc(db, "coupons", code.trim().toUpperCase()));
}

/* ================= REVIEWS CRUD ================= */
export async function getReviews() {
  const colRef = collection(db, "reviews");
  const snap = await getDocs(colRef);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreReview));
}

export async function updateReviewStatus(id: string, status: "approved" | "pending" | "hidden", featured?: boolean) {
  const docRef = doc(db, "reviews", id);
  const patch: any = { status };
  if (featured !== undefined) patch.featured = featured;
  await updateDoc(docRef, patch);
}

export async function deleteReview(id: string) {
  await deleteDoc(doc(db, "reviews", id));
}

/* ================= SITE SETTINGS & HOMEPAGE ================= */
export async function getDocData<T = any>(col: string, docId: string): Promise<T | null> {
  const docRef = doc(db, col, docId);
  const snap = await getDoc(docRef);
  return snap.exists() ? (snap.data() as T) : null;
}

export async function setDocData(col: string, docId: string, data: any): Promise<void> {
  const docRef = doc(db, col, docId);
  await setDoc(docRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

/* ================= USERS & ORDERS ================= */
export interface UserOrder {
  id: string;
  userId: string;
  customerName: string;
  phone: string;
  address: any;
  items: any[];
  subtotal: number;
  couponCode?: string;
  couponDiscount?: number;
  total: number;
  paymentMethod: string;
  status: string;
  createdAt: any;
  cancellationReason?: string;
  cancellationNote?: string;
}

export async function getAllCustomerOrders(): Promise<UserOrder[]> {
  try {
    // Read from users collection, then read each user's orders subcollection
    const usersSnap = await getDocs(collection(db, "users"));
    const allOrders: UserOrder[] = [];

    await Promise.all(
      usersSnap.docs.map(async (uDoc) => {
        try {
          const ordersSnap = await getDocs(collection(db, "users", uDoc.id, "orders"));
          ordersSnap.docs.forEach((oDoc) => {
            allOrders.push({
              id: oDoc.id,
              userId: uDoc.id,
              ...oDoc.data(),
            } as UserOrder);
          });
        } catch (e) {
          console.warn(`Could not read orders for user ${uDoc.id}:`, e);
        }
      })
    );

    // Also check root 'orders' collection if any exists
    try {
      const rootOrders = await getDocs(collection(db, "orders"));
      rootOrders.docs.forEach((ro) => {
        if (!allOrders.some((o) => o.id === ro.id)) {
          allOrders.push({ id: ro.id, ...ro.data() } as UserOrder);
        }
      });
    } catch {}

    // Sort newest first
    return allOrders.sort((a, b) => {
      const ta = typeof a.createdAt === "number" ? a.createdAt : a.createdAt?.toMillis?.() || 0;
      const tb = typeof b.createdAt === "number" ? b.createdAt : b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });
  } catch (err) {
    console.error("Error reading all orders:", err);
    return [];
  }
}

export async function updateCustomerOrderStatus(userId: string, orderId: string, status: string) {
  // Update in users/{userId}/orders/{orderId}
  if (userId) {
    try {
      const orderRef = doc(db, "users", userId, "orders", orderId);
      await updateDoc(orderRef, { status, updatedAt: serverTimestamp() });
    } catch (e) {
      console.warn("Could not update subcollection order:", e);
    }
  }
  // Also update in root orders if it exists
  try {
    const rootOrderRef = doc(db, "orders", orderId);
    await updateDoc(rootOrderRef, { status, updatedAt: serverTimestamp() });
  } catch {}
}

export async function getAllCustomers() {
  const usersSnap = await getDocs(collection(db, "users"));
  return usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* ================= ENQUIRIES (shared with customer website) ================= */
export interface FirestoreEnquiry {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  productId?: string;
  productName?: string;
  message?: string;
  source?: string;
  status?: "new" | "contacted" | "interested" | "converted" | "closed";
  createdAt?: any;
  updatedAt?: any;
}

export async function getEnquiries() {
  const snap = await getDocs(collection(db, "enquiries"));
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreEnquiry));
  return items.sort((a, b) => {
    const ta = (a.createdAt as any)?.toMillis?.() ?? 0;
    const tb = (b.createdAt as any)?.toMillis?.() ?? 0;
    return tb - ta;
  });
}

export async function saveEnquiry(data: Partial<FirestoreEnquiry>, id?: string) {
  const docRef = id ? doc(db, "enquiries", id) : doc(collection(db, "enquiries"));
  const payload: any = {
    ...data,
    status: data.status || "new",
    updatedAt: serverTimestamp(),
  };
  if (!id) payload.createdAt = serverTimestamp();
  await setDoc(docRef, payload, { merge: true });
  return { id: docRef.id, ...payload };
}

export async function updateEnquiryStatus(id: string, status: string) {
  await updateDoc(doc(db, "enquiries", id), { status, updatedAt: serverTimestamp() });
}

export async function deleteEnquiry(id: string) {
  await deleteDoc(doc(db, "enquiries", id));
}

/* ================= ADMIN USERS (Firestore — same project as site) ================= */
export interface FirestoreAdminUser {
  id?: string;
  name: string;
  email: string;
  role: "superadmin" | "admin" | "staff";
  active?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export async function getAdminUsers() {
  const snap = await getDocs(collection(db, "adminUsers"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreAdminUser));
}

export async function saveAdminUser(data: Partial<FirestoreAdminUser>, id?: string) {
  const docRef = id ? doc(db, "adminUsers", id) : doc(collection(db, "adminUsers"));
  const payload: any = {
    name: data.name,
    email: (data.email || "").toLowerCase().trim(),
    role: data.role || "staff",
    active: data.active !== false,
    updatedAt: serverTimestamp(),
  };
  if (!id) payload.createdAt = serverTimestamp();
  await setDoc(docRef, payload, { merge: true });
  return { id: docRef.id, ...payload };
}

export async function deleteAdminUser(id: string) {
  await deleteDoc(doc(db, "adminUsers", id));
}

/* ================= ACTIVITY LOG (Firestore) ================= */
export interface FirestoreActivity {
  id?: string;
  adminId?: string;
  adminName?: string;
  action: string;
  entity: string;
  entityId?: string;
  summary?: string;
  diff?: any;
  createdAt?: any;
}

export async function logActivity(entry: Omit<FirestoreActivity, "id" | "createdAt">) {
  try {
    const docRef = doc(collection(db, "activityLog"));
    await setDoc(docRef, { ...entry, createdAt: serverTimestamp() });
  } catch (e) {
    console.warn("activity log write failed (non-fatal):", e);
  }
}

export async function getActivityLog(limitCount = 200) {
  const snap = await getDocs(query(collection(db, "activityLog"), orderBy("createdAt", "desc"), limit(limitCount)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreActivity));
}

/* ================= APPEARANCE + SEO (live customer-site config) ================= */
export async function getAppearance() {
  return (await getDocData<any>("siteSettings", "appearance")) ?? null;
}
export async function saveAppearance(data: any) {
  return setDocData("siteSettings", "appearance", data);
}
export async function getSeoSettings() {
  return (await getDocData<any>("siteSettings", "seo")) ?? null;
}
export async function saveSeoSettings(data: any) {
  return setDocData("siteSettings", "seo", data);
}

/* ================= REALTIME LISTENERS (live sync with user website) ================= */
export function subscribeCollection(col: string, cb: (rows: any[]) => void, onError?: (e: any) => void) {
  try {
    return onSnapshot(
      collection(db, col),
      (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => {
        console.error(`Firestore subscribe ${col} error:`, e);
        onError?.(e);
      }
    );
  } catch (e) {
    console.error(`Firestore subscribe ${col} failed:`, e);
    onError?.(e);
    return () => {};
  }
}

export function subscribeDoc(col: string, docId: string, cb: (data: any | null) => void, onError?: (e: any) => void) {
  try {
    return onSnapshot(
      doc(db, col, docId),
      (snap) => cb(snap.exists() ? { id: snap.id, ...snap.data() } : null),
      (e) => {
        console.error(`Firestore subscribe ${col}/${docId} error:`, e);
        onError?.(e);
      }
    );
  } catch (e) {
    console.error(`Firestore subscribe ${col}/${docId} failed:`, e);
    onError?.(e);
    return () => {};
  }
}

/* ================= MEDIA LIBRARY (ImgBB URLs catalogued in Firestore) ================= */
export async function getMediaAssets() {
  const snap = await getDocs(query(collection(db, "media"), orderBy("createdAt", "desc"), limit(300)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreMediaAsset));
}

export async function saveMediaAsset(data: { url: string; name: string; group: string }) {
  const docRef = doc(collection(db, "media"));
  const payload = { ...data, createdAt: serverTimestamp() };
  await setDoc(docRef, payload);
  return { id: docRef.id, ...payload };
}

export async function deleteMediaAsset(id: string) {
  // Removes the catalogue reference only. ImgBB delete URLs are never
  // stored/exposed, so hosted bytes are left untouched — no broken refs.
  await deleteDoc(doc(db, "media", id));
}

/** Scans live Firestore docs to report where an image URL is referenced. */
export async function findMediaUsage(url: string): Promise<string[]> {
  const usedIn: string[] = [];
  if (!url) return usedIn;
  const match = (v: unknown): boolean => {
    if (typeof v === "string") return v === url;
    if (Array.isArray(v)) return v.some(match);
    return false;
  };
  try {
    const [products, categories, brands, videos, offers, blogs] = await Promise.all([
      getProducts().catch(() => []),
      getCategories().catch(() => []),
      getBrands().catch(() => []),
      getVideos().catch(() => []),
      getOffers().catch(() => []),
      getBlogPosts().catch(() => []),
    ]);
    for (const p of products as any[]) {
      if (match(p.image) || match(p.images)) usedIn.push(`Product: ${p.name || p.id}`);
    }
    for (const c of categories as any[]) {
      if (match(c.image)) usedIn.push(`Category: ${c.name || c.id}`);
    }
    for (const b of brands as any[]) {
      if (match(b.logo)) usedIn.push(`Brand: ${b.name || b.id}`);
    }
    for (const v of videos as any[]) {
      if (match(v.thumbnail)) usedIn.push(`Video: ${v.title || v.id}`);
    }
    for (const o of offers as any[]) {
      if (match(o.banner) || match(o.image)) usedIn.push(`Offer: ${o.title || o.name || o.id}`);
    }
    for (const b of blogs as any[]) {
      if (match(b.image)) usedIn.push(`Blog: ${b.title || b.id}`);
    }
    const [home, site, seo] = await Promise.all([
      getDocData<any>("homepage", "content").catch(() => null),
      getDocData<any>("siteSettings", "main").catch(() => null),
      getDocData<any>("siteSettings", "seo").catch(() => null),
    ]);
    if (home && match((home as any).heroImage)) usedIn.push("Homepage: hero image");
    if (site && (match((site as any).logo) || match((site as any).favicon))) usedIn.push("Site Settings: logo/favicon");
    if (seo && match((seo as any).ogImage)) usedIn.push("SEO: OG image");
  } catch (e) {
    console.warn("findMediaUsage scan failed (non-fatal):", e);
  }
  return usedIn.slice(0, 12);
}
