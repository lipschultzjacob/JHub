import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { auth } from "@/auth";

// Saves a browser's push subscription so we can send it notifications
// later. Called by the browser right after it grants notification
// permission and Web Push hands back the subscription details (see
// src/components/push-subscribe-button.tsx).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { endpoint, keys } = await request.json();
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  // The same browser subscribing again (e.g. after clearing site data)
  // would otherwise hit the unique constraint on `endpoint` -- upsert so
  // that just refreshes the existing row instead of erroring.
  await db
    .insert(pushSubscriptions)
    .values({
      userId: Number(session.user.id),
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { p256dh: keys.p256dh, auth: keys.auth, userId: Number(session.user.id) },
    });

  return NextResponse.json({ success: true });
}

// Removes a subscription -- called when notifications get turned off.
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { endpoint } = await request.json();
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
  }

  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.endpoint, endpoint),
        eq(pushSubscriptions.userId, Number(session.user.id))
      )
    );

  return NextResponse.json({ success: true });
}
