import { supabaseAdmin } from "@/lib/supabase-admin";
import { FALLBACK_LOGO, FALLBACK_SITE_NAME } from "@/lib/branding";
import FooterClient, { FooterContent, SocialKind } from "./FooterClient";

/* Data stays on the server; FooterClient renders it so the copy can follow the
   visitor's language. The brand mark comes from admin → Header (or → Settings),
   the same value the top bar uses. */
async function getFooterContent(): Promise<FooterContent> {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select(
      "facebook_url, instagram_url, twitter_url, tiktok_url, whatsapp_number, phone, email, address, city, header_logo_url, logo_url, site_name",
    )
    .single();

  const waNumber = (data?.whatsapp_number || "971522305216").replace(/\D/g, "");

  const socialLinks = (
    [
      data?.facebook_url && { href: data.facebook_url, kind: "facebook" as SocialKind, label: "Facebook" },
      data?.instagram_url && { href: data.instagram_url, kind: "instagram" as SocialKind, label: "Instagram" },
      data?.twitter_url && { href: data.twitter_url, kind: "twitter" as SocialKind, label: "Twitter" },
      data?.tiktok_url && { href: data.tiktok_url, kind: "tiktok" as SocialKind, label: "TikTok" },
      { href: `https://wa.me/${waNumber}`, kind: "whatsapp" as SocialKind, label: "WhatsApp" },
    ] as (FooterContent["socialLinks"][number] | false | null | undefined)[]
  ).filter(Boolean) as FooterContent["socialLinks"];

  return {
    logoUrl: data?.header_logo_url?.trim() || data?.logo_url?.trim() || FALLBACK_LOGO,
    siteName: data?.site_name?.trim() || FALLBACK_SITE_NAME,
    address: data?.address ?? null,
    city: data?.city ?? null,
    phone: data?.phone ?? null,
    email: data?.email ?? null,
    socialLinks,
  };
}

export default async function Footer() {
  const content = await getFooterContent();
  return <FooterClient content={content} />;
}
