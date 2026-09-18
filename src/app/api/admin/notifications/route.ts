import { getSessionUser } from "@/lib/auth";
import { adminNotifications } from "@/lib/api";
import { getSetting } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getSessionUser();
  if (!admin) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const n = await getSetting("notifications");
  const data = await adminNotifications(Number(n.lowStockThreshold) || 5);
  return Response.json(data);
}
