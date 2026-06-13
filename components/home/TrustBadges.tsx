// Server component — no JS sent to browser
const BADGES = [
  { emoji: "🛵", title: "Fast Delivery", desc: "15–40 min" },
  { emoji: "🛡️", title: "Safe & Secure", desc: "Payments" },
  { emoji: "🌿", title: "Fresh", desc: "Ingredients" },
  { emoji: "🎧", title: "Live Support", desc: "24/7" },
];

export default function TrustBadges() {
  return (
    <section className="py-5">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-4 gap-3">
          {BADGES.map((b) => (
            <div
              key={b.title}
              className="flex flex-col items-center text-center rounded-2xl py-4 px-2 bg-white"
              style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
            >
              <span className="text-2xl sm:text-3xl mb-2">{b.emoji}</span>
              <p className="text-[11px] sm:text-xs font-bold text-gray-800 leading-tight">{b.title}</p>
              <p className="text-[9px] sm:text-[10px] text-gray-400 leading-tight mt-0.5">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
