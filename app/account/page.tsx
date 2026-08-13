import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import { getBranding } from "@/lib/branding";
import { getSiteFlags } from "@/lib/site-flags";
import { getStudentCardDesign } from "@/lib/student-card-design-server";
import PageMeta from "@/lib/i18n/PageMeta";
import AccountClient from "./AccountClient";

export const metadata: Metadata = {
  title: "My Account",
  description: "Sign in to manage your Two In One account, orders and favourites.",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const [{ logoUrl }, { studentCardEnabled }, cardDesign] = await Promise.all([
    getBranding(),
    getSiteFlags(),
    getStudentCardDesign(),
  ]);

  return (
    <>
      <PageMeta titleKey="account.metaTitle" descriptionKey="account.metaDescription" />
      <Navbar />
      <main className="bg-white min-h-[70vh] pb-20 sm:pb-8">
        <AccountClient
          logoUrl={logoUrl}
          studentCardEnabled={studentCardEnabled}
          cardDesign={cardDesign}
        />
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
