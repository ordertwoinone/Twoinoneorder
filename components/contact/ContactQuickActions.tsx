"use client";
import { Phone, MessageCircle, UserPlus } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function ContactQuickActions({
  phone,
  waNumber,
  restaurantName,
  email,
  address,
}: {
  phone: string;
  waNumber: string;
  restaurantName: string;
  email: string;
  address: string;
}) {
  const { t } = useTranslation();

  function saveContact() {
    const tel = phone.replace(/\s+/g, "");
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${restaurantName}`,
      `ORG:${restaurantName}`,
      `TEL;TYPE=CELL:${tel}`,
      `TEL;TYPE=WORK,VOICE:+${waNumber}`,
      email ? `EMAIL:${email}` : "",
      address ? `ADR;TYPE=WORK:;;${address};;;;` : "",
      "END:VCARD",
    ].filter(Boolean).join("\n");

    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${restaurantName.replace(/\s+/g, "-")}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const items = [
    { key: "call", icon: Phone, label: t("common.callNow"), href: `tel:${phone.replace(/\s+/g, "")}` },
    { key: "wa", icon: MessageCircle, label: t("common.whatsapp"), href: `https://wa.me/${waNumber}`, external: true },
    { key: "save", icon: UserPlus, label: t("common.saveContact"), onClick: saveContact },
  ];

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm grid grid-cols-3 divide-x divide-gray-100">
      {items.map(({ key, icon: Icon, label, href, external, onClick }) =>
        onClick ? (
          <button
            key={key}
            onClick={onClick}
            className="flex flex-col items-center gap-2 py-4 px-1 hover:bg-orange-50/50 transition-colors first:rounded-s-3xl last:rounded-e-3xl"
          >
            <span className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
              <Icon size={20} />
            </span>
            <span className="text-[11px] font-semibold text-gray-700 text-center leading-tight">{label}</span>
          </button>
        ) : (
          <a
            key={key}
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            className="flex flex-col items-center gap-2 py-4 px-1 hover:bg-orange-50/50 transition-colors first:rounded-s-3xl last:rounded-e-3xl"
          >
            <span className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
              <Icon size={20} />
            </span>
            <span className="text-[11px] font-semibold text-gray-700 text-center leading-tight">{label}</span>
          </a>
        )
      )}
    </div>
  );
}
