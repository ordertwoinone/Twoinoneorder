"use client";

import { KIOSK } from "@/lib/kiosk/theme";
import { TIO_AVATAR } from "@/lib/kiosk/tio";

/**
 * TIO's face, in a round frame.
 *
 * A photo of the robot rather than the 3D model in public/: the model is flat
 * shaded, has no rig to wave with and no lettering on its badge, and a WebGL
 * canvas per pop-up is not something a kiosk tablet should be asked to run.
 * The render is on a pale ground, so it is framed rather than cut out — a
 * circle reads as an avatar on the dark idle screen and on the white menu alike.
 */
export default function TioAvatar({
  size,
  float,
  ring = true,
}: {
  /** Any CSS length; the kiosk sizes everything in vh. */
  size: string;
  float?: boolean;
  ring?: boolean;
}) {
  return (
    <span
      className={`relative inline-block shrink-0 rounded-full overflow-hidden ${float ? "tio-float" : ""}`}
      style={{
        width: size,
        height: size,
        background: "#FDFDFD",
        boxShadow: ring ? `0 0 0 0.3vh ${KIOSK.gold}, 0 0.6vh 1.6vh rgba(0,0,0,0.25)` : undefined,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={TIO_AVATAR} alt="TIO" draggable={false} className="w-full h-full object-cover" />
    </span>
  );
}

/** Three dots, for while TIO is waiting on an answer. */
export function TioThinking({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-[0.5vh]" role="status" aria-label={label}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="tio-dot rounded-full w-[0.9vh] h-[0.9vh]"
          style={{ background: KIOSK.inkSoft, animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}
