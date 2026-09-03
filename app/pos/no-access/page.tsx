import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { currentStaff } from "@/lib/pos/auth";
import { POS } from "@/lib/pos/theme";
import { ROLE_LABEL } from "@/lib/pos/constants";
import { landingFor } from "@/lib/pos/permissions";

export const dynamic = "force-dynamic";

/**
 * The one screen for an account that has been granted nothing.
 *
 * Rare, and worth having anyway: without it, an account with every permission
 * withdrawn bounced between /pos and a guard that sent it back, and the tablet
 * showed a reload loop rather than a sentence explaining anything. It happens
 * for a real reason — somebody being moved between jobs, mid-edit — so it says
 * who is signed in and offers the way out, which is signing in as somebody else.
 */
export default async function NoAccessPage() {
  const staff = await currentStaff();
  if (!staff) redirect("/pos/login");

  // Something was granted in the meantime, or they arrived here by hand.
  const home = landingFor(staff);
  if (home) redirect(home);

  return (
    <div
      className="flex h-full w-full items-center justify-center p-6"
      style={{ background: POS.page }}
    >
      <div
        className="w-full max-w-[440px] rounded-2xl bg-white p-7 text-center"
        style={{ border: `1px solid ${POS.line}` }}
      >
        <span
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: POS.page }}
        >
          <ShieldOff size={26} style={{ color: POS.inkSoft }} />
        </span>
        <h1 className="mt-3 text-xl font-black" style={{ color: POS.ink }}>
          Nothing is set up for you yet
        </h1>
        <p className="mt-2 text-[13.5px]" style={{ color: POS.inkSoft }}>
          {staff.name || staff.staff_id} · {ROLE_LABEL[staff.role]} — this account has no screens
          granted to it. A manager can set that up in the admin panel, under POS → Staff.
        </p>

        <Link
          href="/pos/login"
          className="mt-5 flex items-center justify-center rounded-xl text-sm font-bold text-white"
          style={{ background: POS.action, height: 48 }}
        >
          Sign in as somebody else
        </Link>
      </div>
    </div>
  );
}
