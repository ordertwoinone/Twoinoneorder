/**
 * Printing a page without leaving the one you are on.
 *
 * Every Print button used to open the invoice in a new tab so the browser had
 * something to print. That works, but it costs the user two extra steps they
 * did not ask for — a tab appears, the dialog opens over it, and afterwards
 * they are looking at a receipt instead of the till they were working. On a
 * shared tablet those orphan tabs pile up all shift.
 *
 * A hidden iframe prints the same document from where you already are. The
 * dialog belongs to the iframe, so its own @page rules apply — which is what
 * keeps the 80mm roll size on a POS receipt — and the page behind it never
 * moves.
 */

/** Long enough for the logo and the web font; short enough not to feel stuck. */
const SETTLE_MS = 350;

/** If afterprint never fires — some browsers skip it — clean up anyway. */
const CLEANUP_MS = 60_000;

export function printDocument(url: string): void {
  if (typeof document === "undefined") return;

  const frame = document.createElement("iframe");
  /* Off-screen rather than display:none. A hidden iframe is not guaranteed to
     lay out, and a document that never laid out prints blank. */
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "1px";
  frame.style.height = "1px";
  frame.style.opacity = "0";
  frame.style.border = "0";
  frame.style.pointerEvents = "none";

  // `embed` tells the page it is being printed from somewhere else, so it drops
  // its own toolbar and does not fire a second print of its own.
  const separator = url.includes("?") ? "&" : "?";
  frame.src = `${url}${separator}embed=1`;

  let done = false;
  const cleanUp = () => {
    if (done) return;
    done = true;
    // A frame removed while the dialog is still open cancels the job, so this
    // only ever runs after the dialog has closed or the fallback has expired.
    frame.remove();
  };

  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win) {
      cleanUp();
      return;
    }

    window.setTimeout(() => {
      try {
        win.addEventListener("afterprint", cleanUp, { once: true });
        win.focus();
        win.print();
      } catch {
        /* A blocked print is not worth an error on a till; the button can be
           pressed again, and the invoice is still reachable at its own URL. */
        cleanUp();
      }
      window.setTimeout(cleanUp, CLEANUP_MS);
    }, SETTLE_MS);
  };

  frame.onerror = cleanUp;
  document.body.appendChild(frame);
}
