import { POS } from "@/lib/pos/theme";

/**
 * What a till screen shows while the next one is being fetched.
 *
 * Every page under /pos is force-dynamic and reads the session, the shift and
 * the day's orders before it can render anything, so a tap on the rail sat on
 * the previous screen for as long as that took — which reads as a dead button,
 * and gets pressed again.
 *
 * The rail is drawn here at full strength because it does not depend on any of
 * that: the frame stays put and only the panel inside it changes, so the tap
 * registers instantly even when the data behind it does not.
 */
export default function PosLoading() {
  return (
    <div className="w-full h-full flex" style={{ background: POS.page }}>
      <nav
        className="shrink-0 flex flex-col items-center py-3 gap-1"
        style={{ background: POS.night, width: 86 }}
      >
        <p className="text-xl font-black tracking-tight mb-2 text-white">
          <span style={{ color: POS.brand }}>2</span>
          <span className="text-sm align-middle">in</span>
          <span style={{ color: POS.brand }}>1</span>
        </p>
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className="w-[70px] h-[52px] rounded-xl"
            style={{ background: "rgba(255,255,255,0.06)" }}
          />
        ))}
      </nav>

      <div className="flex-1 min-w-0 flex flex-col">
        <header
          className="shrink-0 flex items-center px-5 bg-white"
          style={{ height: 62, borderBottom: `1px solid ${POS.line}` }}
        >
          <span className="h-4 w-40 rounded" style={{ background: POS.line }} />
        </header>

        <div className="flex-1 flex items-center justify-center">
          {/* A spinner rather than a skeleton of the content: the six screens
              look nothing alike, and a skeleton of the wrong one is a worse lie
              than an honest wait. */}
          <span
            className="h-8 w-8 rounded-full animate-spin"
            style={{ border: `3px solid ${POS.line}`, borderTopColor: POS.action }}
          />
        </div>
      </div>
    </div>
  );
}
