export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { supabaseAdminLive } from "@/lib/supabase-admin";
import { roundMoney } from "@/lib/kalba/pricing";
import { currentStaff } from "@/lib/pos/auth";
import { can } from "@/lib/pos/permissions";
import { openShiftFor } from "@/lib/pos/shift-server";
import { KITCHEN_TYPES } from "@/lib/order-source";
import {
  amendOrder,
  clearCancelRequests,
  isPaid,
  liveLines,
  needsKitchenApproval,
  refundable,
  requestCancel,
  requestedIndexes,
  type OrderLine,
} from "@/lib/pos/amend";

/**
 * Amending an order that has already been rung up.
 *
 * Taking one dish off a three-dish order, or cancelling the whole thing, and
 * giving back whatever that comes to. The two rules it turns on are written up
 * in lib/pos/amend.ts; this is where they meet the database.
 *
 * Everything that decides an amount is worked out here from the stored order.
 * The screen sends which lines to take off and nothing else — a payload naming
 * its own refund amount would be a button that pays out whatever it likes.
 */

const METHODS = ["cash", "card", "online"];

interface AmendBody {
  /** Positions in the stored items array. Not names: two of the same dish. */
  cancelIndexes?: number[];
  /** The whole order. Sets the status to cancelled as well. */
  cancelOrder?: boolean;
  /** How the money goes back. Defaults to however it came in. */
  method?: string;
  reason?: string;
  /**
   * The kitchen answering a cancellation the counter asked for.
   *
   * 'accept' takes the lines off and gives the money back; 'decline' puts them
   * back on the ticket because they are already on the pan.
   */
  decision?: "accept" | "decline";
  /** Skips the kitchen and cancels outright. A manager overriding the pass. */
  force?: boolean;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const staff = await currentStaff();
  if (!staff) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as AmendBody;

  const { data, error: readError } = await supabaseAdminLive
    .from("bookings")
    .select(
      "id, status, items, total_amount, payment_method, refunded_total, pos_shift_id, cancel_state",
    )
    .eq("id", params.id)
    .in("type", KITCHEN_TYPES as unknown as string[])
    .maybeSingle();

  if (readError || !data) return NextResponse.json({ error: "Unknown order" }, { status: 404 });

  const order = data as unknown as {
    id: string;
    status: string;
    items: OrderLine[] | null;
    total_amount: number | string | null;
    payment_method: string | null;
    refunded_total: number | string | null;
    cancel_state: string | null;
  };

  const items = Array.isArray(order.items) ? order.items : [];
  const paid = isPaid(order.payment_method);
  const refundedTotal = Number(order.refunded_total) || 0;

  if (order.status === "cancelled") {
    return NextResponse.json({ error: "That order is already cancelled." }, { status: 409 });
  }

  /* Editing an unpaid order is ordinary counter work — a customer changing
     their mind before they have paid. Touching a paid one is giving money
     back, which is somebody's drawer and needs the permission that says so. */
  const permission = paid ? "void_order" : "till";
  if (!can(staff, permission)) {
    return NextResponse.json(
      {
        error: paid
          ? "Refunding needs a manager. Ask one to sign in."
          : "You are not set up to change an order.",
      },
      { status: 403 },
    );
  }

  /* ─── The kitchen answering ─── */
  if (body.decision === "accept" || body.decision === "decline") {
    /* Whoever is working the food gets to answer. A manager can too — they are
       often the one standing at the pass when it happens. */
    if (!can(staff, "kitchen") && !can(staff, "orders") && !can(staff, "void_order")) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    const asked = requestedIndexes(items);
    if (asked.length === 0) {
      return NextResponse.json(
        { error: "There is no cancellation waiting on this order." },
        { status: 409 },
      );
    }

    if (body.decision === "decline") {
      /* Back on the ticket, and the counter is told. Nothing was refunded
         while it was waiting, so there is nothing to unwind — which is the
         whole reason the money waits for this answer. */
      const { error } = await supabaseAdminLive
        .from("bookings")
        .update({
          items: clearCancelRequests(items),
          cancel_state: "declined",
          cancel_reason: String(body.reason ?? "").trim().slice(0, 300),
        })
        .eq("id", params.id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, declined: true });
    }

    // Accepted: this is the moment the lines actually come off.
    return applyCancellation(params.id, order, items, asked, staff, body, refundedTotal);
  }

  const cancelIndexes = Array.isArray(body.cancelIndexes)
    ? body.cancelIndexes.map((n) => Math.floor(Number(n))).filter((n) => n >= 0 && n < items.length)
    : [];

  if (!body.cancelOrder && cancelIndexes.length === 0) {
    return NextResponse.json({ error: "Nothing was selected to take off." }, { status: 400 });
  }

  /* ─── The counter asking ─── */
  /*
   * A ticket the kitchen is still working is not the counter's alone to cancel.
   * The food may already be on the pan, and handing money back for a dish that
   * turns out to have been cooked and served is the one outcome worth designing
   * against — the money is gone and the food is gone with it. So it becomes a
   * request the pass answers, and nothing is refunded until it does.
   *
   * `force` is the way past it, for a manager standing at the pass who can
   * already see the answer.
   */
  if (needsKitchenApproval(order.status) && !body.force) {
    const { error } = await supabaseAdminLive
      .from("bookings")
      .update({
        items: requestCancel(items, cancelIndexes, body.cancelOrder === true),
        cancel_state: "requested",
        cancel_reason: String(body.reason ?? "").trim().slice(0, 300),
      })
      .eq("id", params.id)
      .eq("status", order.status);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      awaitingKitchen: true,
      refunded: 0,
    });
  }

  return applyCancellation(
    params.id,
    order,
    items,
    body.cancelOrder === true ? items.map((_, i) => i) : cancelIndexes,
    staff,
    body,
    refundedTotal,
  );
}

/**
 * Taking the lines off for real: the items, the totals, the refund and its row.
 *
 * Reached two ways — the counter cancelling a ticket nobody is cooking, and the
 * kitchen accepting one they are. Written once because the second path is
 * exactly the first with a delay in front of it, and two copies of a refund are
 * two chances to pay somebody twice.
 */
async function applyCancellation(
  id: string,
  order: {
    status: string;
    payment_method: string | null;
  },
  items: OrderLine[],
  cancelIndexes: number[],
  staff: { id: string },
  body: AmendBody,
  refundedTotal: number,
) {
  const result = amendOrder({
    items,
    paymentMethod: order.payment_method,
    refundedTotal,
    cancelIndexes,
  });

  if (result.refundedLines.length === 0) {
    return NextResponse.json({ error: "Those lines are already off the order." }, { status: 409 });
  }

  /* Cancelled when the whole thing goes, or when the last standing line does —
     an order with everything taken off it is a cancelled order however it got
     there, and leaving it "preparing" puts an empty ticket on the kitchen
     board forever. */
  const nothingLeft = liveLines(result.items).length === 0;
  const cancelled = body.cancelOrder === true || nothingLeft;

  const patch: Record<string, unknown> = {
    items: result.items,
    total_amount: result.totalAmount,
    subtotal: result.subtotal,
    tax_amount: result.taxAmount,
    // Whatever was waiting on the kitchen has now been answered.
    cancel_state: "",
  };
  if (cancelled) patch.status = "cancelled";
  if (result.refundAmount > 0) {
    patch.refunded_total = roundMoney(refundedTotal + result.refundAmount);
  }

  const { error: writeError } = await supabaseAdminLive
    .from("bookings")
    .update(patch)
    .eq("id", id)
    /* Guards two tablets refunding the same order at once: the second one's
       update matches nothing, because the first has already moved it on. */
    .eq("status", order.status);

  if (writeError) return NextResponse.json({ error: writeError.message }, { status: 500 });

  /* The refund is its own row, attached to the drawer it came out of rather
     than to the shift that took the order. A refund at nine in the evening for
     a breakfast is the evening cashier being short, and pinning it to the
     morning leaves two people each unable to explain their own count. */
  if (result.refundAmount > 0) {
    const shift = await openShiftFor(staff.id);
    const method = METHODS.includes(String(body.method))
      ? String(body.method)
      : (order.payment_method ?? "cash");

    await supabaseAdminLive.from("pos_refunds").insert([
      {
        booking_id: id,
        shift_id: shift?.id ?? null,
        staff_uuid: staff.id,
        amount: result.refundAmount,
        method: METHODS.includes(method) ? method : "cash",
        kind: body.cancelOrder ? "order" : "item",
        reason: String(body.reason ?? "").trim().slice(0, 300),
        items: result.refundedLines,
      },
    ]);
  }

  return NextResponse.json({
    ok: true,
    cancelled,
    refunded: result.refundAmount,
    totalAmount: result.totalAmount,
    /* What is still outstanding after this, so the card can grey the Refund
       button the moment there is nothing left to give back. */
    refundable: refundable({
      items: result.items,
      totalAmount: result.totalAmount,
      refundedTotal: roundMoney(refundedTotal + result.refundAmount),
      paymentMethod: order.payment_method,
    }),
  });
}
