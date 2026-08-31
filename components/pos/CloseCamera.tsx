"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, RotateCw } from "lucide-react";
import { POS } from "@/lib/pos/theme";

/**
 * A photograph of whoever signs the day off.
 *
 * Openly, which is the whole point. The preview runs while the drawer is being
 * counted and the caption says the picture is kept with the shift, so it is a
 * deterrent people can see rather than a camera they cannot. A control nobody
 * knows about does not change anybody's behaviour, which is what this is for.
 *
 * It never blocks the close. A tablet with no camera, or with permission
 * refused, still reconciles — a missing photo is a question for a manager, a
 * blocked day close is a night's takings nobody can account for.
 */
export default function CloseCamera({
  onCapture,
}: {
  /** Handed the JPEG, or null if it was retaken. */
  onCapture: (photo: Blob | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [shot, setShot] = useState<string>("");
  const [state, setState] = useState<"starting" | "live" | "unavailable">("starting");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // The panel faces the person closing, so the front camera is the one.
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setState("live");
    } catch {
      // No camera, or permission refused. Say so and carry on.
      setState("unavailable");
    }
  }, []);

  useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  function capture() {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 0.7 is plenty to recognise a face and keeps the upload under a second on
    // a café connection.
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setShot(URL.createObjectURL(blob));
        onCapture(blob);
        stop();
      },
      "image/jpeg",
      0.7,
    );
  }

  function retake() {
    setShot("");
    onCapture(null);
    start();
  }

  return (
    <div>
      <p className="mb-1.5 text-[11.5px] font-semibold" style={{ color: POS.inkSoft }}>
        Photo at close
      </p>

      <div
        className="relative overflow-hidden rounded-xl"
        style={{ aspectRatio: "4 / 3", background: "#111", border: `1px solid ${POS.line}` }}
      >
        {shot ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={shot} alt="" className="h-full w-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            muted
            playsInline
            className="h-full w-full object-cover"
            // Mirrored, because an un-mirrored preview of your own face is
            // disconcerting enough that people move the wrong way to frame it.
            style={{ transform: "scaleX(-1)" }}
          />
        )}

        {state === "unavailable" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3 text-center">
            <CameraOff size={22} style={{ color: "#9CA3AF" }} />
            <p className="text-[11.5px]" style={{ color: "#D1D5DB" }}>
              No camera available. You can still close the day.
            </p>
          </div>
        )}
      </div>

      {state === "live" && !shot && (
        <button
          onClick={capture}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg text-[13px] font-bold text-white"
          style={{ background: POS.night, height: 40 }}
        >
          <Camera size={15} />
          Take photo
        </button>
      )}

      {shot && (
        <button
          onClick={retake}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg text-[13px] font-bold"
          style={{ background: POS.page, color: POS.ink, border: `1px solid ${POS.line}`, height: 40 }}
        >
          <RotateCw size={15} />
          Retake
        </button>
      )}

      <p className="mt-1.5 text-[11px] leading-snug" style={{ color: POS.inkSoft }}>
        Kept with this shift so management can see who closed it.
      </p>
    </div>
  );
}
