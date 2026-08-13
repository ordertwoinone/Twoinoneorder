import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import PageMeta from "@/lib/i18n/PageMeta";
import { getSiteFlags } from "@/lib/site-flags";
import { getStudentCardDesign } from "@/lib/student-card-design-server";
import StudentCardClient from "./StudentCardClient";

export const metadata: Metadata = {
  title: "Student Privilege Card",
  description: "Register your Two In One Student Privilege Card and get 10% off every order.",
  robots: { index: false, follow: false },
};

export default async function StudentCardPage() {
  /* Switched off in admin → Settings → Features. The invitation is hidden there
     too, so this only catches a bookmark or a shared link. */
  const [{ studentCardEnabled }, cardDesign] = await Promise.all([
    getSiteFlags(),
    getStudentCardDesign(),
  ]);
  if (!studentCardEnabled) redirect("/account");

  return (
    <>
      <PageMeta titleKey="studentCard.metaTitle" descriptionKey="studentCard.metaDescription" />
      <Navbar />
      <main className="bg-white min-h-[70vh] pb-20 sm:pb-8">
        <StudentCardClient cardDesign={cardDesign} />
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
