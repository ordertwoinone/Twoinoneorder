"use client";
import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Phone, Utensils, Users, Clock,
  MessageSquare, Send, CalendarIcon, CheckCircle2, ChevronDown, Check,
} from "lucide-react";
import { buildWhatsAppUrl, CateringEnquiry } from "@/lib/whatsapp";
import { format } from "date-fns";
import { arSA, enGB } from "date-fns/locale";
import { useTranslation } from "@/lib/i18n/useTranslation";
import type { TranslationKey } from "@/lib/i18n/types";

type FormValues = {
  name: string;
  phone: string;
  eventType: string;
  guests: number;
  timeSlot: string;
  notes?: string;
};

/* `value` is what travels to WhatsApp and the bookings table, so it stays in
   English no matter which language the form is filled in — the kitchen reads
   one consistent wording. Only the on-screen label is translated. */
const EVENT_TYPES: { value: string; key: TranslationKey }[] = [
  { value: "Wedding",       key: "cateringForm.eventTypes.wedding" },
  { value: "Corporate",     key: "cateringForm.eventTypes.corporate" },
  { value: "Birthday",      key: "cateringForm.eventTypes.birthday" },
  { value: "Graduation",    key: "cateringForm.eventTypes.graduation" },
  { value: "Ramadan Iftar", key: "cateringForm.eventTypes.iftar" },
  { value: "Other",         key: "cateringForm.eventTypes.other" },
];
const TIME_SLOTS: { value: string; labelKey: TranslationKey; subKey: TranslationKey }[] = [
  { value: "Morning (8am – 12pm)",   labelKey: "cateringForm.slots.morning",   subKey: "cateringForm.slots.morningSub" },
  { value: "Afternoon (12pm – 5pm)", labelKey: "cateringForm.slots.afternoon", subKey: "cateringForm.slots.afternoonSub" },
  { value: "Evening (5pm – 11pm)",   labelKey: "cateringForm.slots.evening",   subKey: "cateringForm.slots.eveningSub" },
];

function EventTypeDropdown({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = EVENT_TYPES.find((e) => e.value === value);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 ps-10 pe-4 py-3 border-2 rounded-xl text-sm text-start transition-colors ${
          open ? "border-orange-400 bg-white" : "border-neutral-200 bg-white hover:border-orange-300"
        } ${error ? "border-red-300" : ""}`}
      >
        <Utensils size={16} className="absolute start-3.5 text-neutral-400 shrink-0" />
        <span className={value ? "text-neutral-900" : "text-neutral-400"}>
          {selected ? t(selected.key) : t("cateringForm.eventTypePlaceholder")}
        </span>
        <ChevronDown
          size={16}
          className={`ms-auto text-neutral-400 transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-neutral-200 rounded-xl shadow-xl overflow-hidden z-50"
          >
            {EVENT_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => { onChange(type.value); setOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-start text-neutral-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"
              >
                {t(type.key)}
                {value === type.value && <Check size={14} className="text-orange-500 shrink-0" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function BookingForm() {
  const { t, locale, dir } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showCalendar, setShowCalendar] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    watch,
  } = useForm<FormValues>();

  const watchedTime = watch("timeSlot");
  // date-fns needs the locale object to write month and weekday names in Arabic.
  const dateLocale = locale === "ar" ? arSA : enGB;

  const handleEventChange = (v: string) => {
    setSelectedEvent(v);
    setValue("eventType", v, { shouldValidate: true });
  };

  const onSubmit = (data: FormValues) => {
    if (!selectedDate) return;

    const enquiry: CateringEnquiry = {
      name: data.name,
      phone: data.phone,
      eventType: data.eventType,
      guests: data.guests,
      date: format(selectedDate, "d MMMM yyyy", { locale: dateLocale }),
      timeSlot: data.timeSlot,
      notes: data.notes,
    };

    // The event type and time slot are stored in English; show the customer
    // their own language in the message they are about to send.
    const eventLabel = t(
      EVENT_TYPES.find((e) => e.value === enquiry.eventType)?.key ?? "cateringForm.eventTypes.other",
    );
    const slot = TIME_SLOTS.find((sl) => sl.value === enquiry.timeSlot);
    const timeLabel = slot ? `${t(slot.labelKey)} (${t(slot.subKey)})` : enquiry.timeSlot;

    const message = [
      t("cateringForm.wa.heading"),
      "",
      t("cateringForm.wa.name", { name: enquiry.name }),
      t("cateringForm.wa.phone", { phone: enquiry.phone }),
      t("cateringForm.wa.event", { event: eventLabel }),
      t("cateringForm.wa.guests", { guests: enquiry.guests }),
      t("cateringForm.wa.date", { date: enquiry.date }),
      t("cateringForm.wa.time", { time: timeLabel }),
      enquiry.notes ? t("cateringForm.wa.notes", { notes: enquiry.notes }) : "",
      "",
      t("cateringForm.wa.footer"),
    ];

    // Save the catering enquiry as a booking (fire-and-forget — must NOT await
    // before window.open or the browser blocks the WhatsApp popup)
    fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "catering",
        guest_name: data.name,
        phone: data.phone,
        table_section: data.eventType,
        date: format(selectedDate, "yyyy-MM-dd"),
        guests: data.guests,
        notes: `Event: ${data.eventType} · Preferred time: ${data.timeSlot}${data.notes ? ` · ${data.notes}` : ""}`,
        status: "pending",
      }),
    }).catch(() => { /* ignore — still continue to WhatsApp */ });

    // Open WhatsApp synchronously (inside the click gesture)
    window.open(buildWhatsAppUrl(message), "_blank");
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
          <CheckCircle2 size={40} className="text-green-500" />
        </div>
        <h3 className="text-2xl font-bold text-neutral-900 mb-2">{t("cateringForm.successTitle")}</h3>
        <p className="text-neutral-500 mb-6">
          {t("cateringForm.successText")}
        </p>
        <div className="flex gap-2 items-center text-sm text-neutral-400">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-bounce" />
          <div className="w-2 h-2 rounded-full bg-green-400 animate-bounce [animation-delay:0.15s]" />
          <div className="w-2 h-2 rounded-full bg-green-400 animate-bounce [animation-delay:0.3s]" />
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Name + Phone */}
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            {t("cateringForm.nameLabel")}
          </label>
          <div className="relative">
            <User size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              {...register("name", { required: t("cateringForm.errors.nameRequired") })}
              type="text"
              placeholder={t("cateringForm.namePlaceholder")}
              className="w-full ps-10 pe-4 py-3 border-2 border-neutral-200 rounded-xl focus:border-orange-400 focus:outline-none text-sm transition-colors"
            />
          </div>
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            {t("cateringForm.phoneLabel")}
          </label>
          <div className="relative">
            <Phone size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              {...register("phone", {
                required: t("cateringForm.errors.phoneRequired"),
                pattern: {
                  value: /^[+\d\s\-()]{7,15}$/,
                  message: t("cateringForm.errors.phoneInvalid"),
                },
              })}
              type="tel"
              placeholder={t("cateringForm.phonePlaceholder")}
              dir="ltr"
              className="w-full ps-10 pe-4 py-3 border-2 border-neutral-200 rounded-xl focus:border-orange-400 focus:outline-none text-sm transition-colors"
            />
          </div>
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
        </div>
      </div>

      {/* Event Type */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          {t("cateringForm.eventTypeLabel")}
        </label>
        <input
          type="hidden"
          {...register("eventType", { required: t("cateringForm.errors.eventTypeRequired") })}
        />
        <EventTypeDropdown
          value={selectedEvent}
          onChange={handleEventChange}
          error={errors.eventType?.message}
        />
      </div>

      {/* Guests */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          {t("cateringForm.guestsLabel")}
        </label>
        <div className="relative">
          <Users size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            {...register("guests", {
              required: t("cateringForm.errors.guestsRequired"),
              min: { value: 10, message: t("cateringForm.errors.guestsMin") },
              max: { value: 5000, message: t("cateringForm.errors.guestsMax") },
              valueAsNumber: true,
            })}
            type="number"
            placeholder={t("cateringForm.guestsPlaceholder")}
            className="w-full ps-10 pe-4 py-3 border-2 border-neutral-200 rounded-xl focus:border-orange-400 focus:outline-none text-sm transition-colors"
          />
        </div>
        {errors.guests && <p className="text-red-500 text-xs mt-1">{errors.guests.message}</p>}
      </div>

      {/* Date Picker */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          {t("cateringForm.dateLabel")}
        </label>
        <button
          type="button"
          onClick={() => setShowCalendar(!showCalendar)}
          className="w-full flex items-center gap-3 px-4 py-3 border-2 border-neutral-200 rounded-xl text-sm text-start hover:border-orange-400 transition-colors"
        >
          <CalendarIcon size={16} className="text-neutral-400" />
          <span className={selectedDate ? "text-neutral-900" : "text-neutral-400"}>
            {selectedDate
              ? format(selectedDate, "EEEE, d MMMM yyyy", { locale: dateLocale })
              : t("cateringForm.datePlaceholder")}
          </span>
        </button>
        <AnimatePresence>
          {showCalendar && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 bg-white border-2 border-orange-200 rounded-2xl p-4 shadow-lg">
                <DayPicker
                  mode="single"
                  dir={dir}
                  locale={dateLocale}
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setShowCalendar(false);
                  }}
                  disabled={{ before: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) }}
                  modifiersClassNames={{
                    selected: "bg-orange-500 text-white rounded-full",
                    today: "font-bold text-orange-600",
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {!selectedDate && (
          <p className="text-xs text-neutral-400 mt-1">{t("cateringForm.dateHint")}</p>
        )}
      </div>

      {/* Time Slot */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          {t("cateringForm.timeLabel")}
        </label>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {TIME_SLOTS.map((slot) => (
            <label
              key={slot.value}
              className={`relative flex flex-col items-center text-center p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                watchedTime === slot.value
                  ? "border-orange-400 bg-orange-50"
                  : "border-neutral-200 hover:border-orange-200"
              }`}
            >
              <input
                {...register("timeSlot", { required: t("cateringForm.errors.timeRequired") })}
                type="radio"
                value={slot.value}
                className="sr-only"
              />
              <Clock
                size={18}
                className={watchedTime === slot.value ? "text-orange-500" : "text-neutral-400"}
              />
              <span className="text-sm font-semibold mt-2 text-neutral-800">{t(slot.labelKey)}</span>
              <span className="text-xs text-neutral-500 mt-0.5 force-ltr">{t(slot.subKey)}</span>
            </label>
          ))}
        </div>
        {errors.timeSlot && <p className="text-red-500 text-xs mt-1">{errors.timeSlot.message}</p>}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1.5">
          {t("cateringForm.notesLabel")}
        </label>
        <div className="relative">
          <MessageSquare size={16} className="absolute start-3.5 top-3.5 text-neutral-400" />
          <textarea
            {...register("notes")}
            rows={4}
            placeholder={t("cateringForm.notesPlaceholder")}
            className="w-full ps-10 pe-4 py-3 border-2 border-neutral-200 rounded-xl focus:border-orange-400 focus:outline-none text-sm transition-colors resize-none"
          />
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!selectedDate}
        className="w-full flex items-center justify-center gap-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] text-sm"
      >
        <Send size={16} />
        {t("cateringForm.submit")}
      </button>

      <p className="text-center text-xs text-neutral-400">
        {t("cateringForm.footnote")}
      </p>
    </form>
  );
}
