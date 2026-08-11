import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import PageMeta from "@/lib/i18n/PageMeta";
import StudentCardClient from "./StudentCardClient";

export const metadata: Metadata = {
  title: "Student Privilege Card",
  description: "Register your Two In One Student Privilege Card and get 10% off every order.",
  robots: { index: false, follow: false },
};

export default function StudentCardPage() {
  return (
    <>
      <PageMeta titleKey="studentCard.metaTitle" descriptionKey="studentCard.metaDescription" />
      <Navbar />
      <main className="bg-white min-h-[70vh] pb-20 sm:pb-8">
        <StudentCardClient />
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
