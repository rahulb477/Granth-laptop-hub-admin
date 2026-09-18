import { NextResponse } from "next/server";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSessionToken, getSessionUser, SESSION_COOKIE, verifyPassword } from "@/lib/auth";
import { logActivity } from "@/lib/api";

export const dynamic = "force-dynamic";

function res(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return res({ error: "Invalid request." }, 400);
  }
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password) return res({ error: "Email and password are required." }, 400);
  const rows = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  const u = rows[0];
  if (!u || !u.active || !verifyPassword(password, u.passwordHash)) {
    return res({ error: "Invalid email or password, or the account is disabled." }, 401);
  }
  const maxAge = body.remember ? 30 * 86400 : 2 * 3600;
  const token = createSessionToken(u.id, maxAge * 1000);
  const out = res({ ok: true, user: { id: u.id, name: u.name, role: u.role } });
  out.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
  await logActivity({ id: u.id, name: u.name } as any, "login", "session", u.id, `${u.name} signed in`);
  return out;
}

export async function GET() {
  const u = await getSessionUser();
  return res({
    user: u ? { id: u.id, name: u.name, role: u.role, email: u.email } : null,
  });
}

export async function DELETE() {
  const u = await getSessionUser();
  if (u) await logActivity({ id: u.id, name: u.name } as any, "logout", "session", u.id, `${u.name} signed out`);
  const out = res({ ok: true });
  out.cookies.delete(SESSION_COOKIE);
  return out;
}
