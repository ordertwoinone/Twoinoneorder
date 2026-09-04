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
 *
 * Except on Android, where that is not true.
 *
 * Chrome on Android does not print an iframe. Its print path snapshots the
 * top-level document and hands that to the system print service, so
 * `iframe.contentWindow.print()` prints the page *behind* the receipt — and
 * because the till page is `print:hidden` almost throughout, what comes out is
 * a blank 80mm slip. It works perfectly on a laptop because desktop Chrome
 * prints the frame that asked. Nothing in the receipt or its @page rules was
 * ever wrong, which is why the same document was fine from the same button on
 * a laptop and empty from a tab.
 *
 * So Android gets a real window instead, printing itself as the top-level
 * document, and closing itself again afterwards. Everywhere else keeps the
 * iframe.
 */

/** Long enough for the logo and the web font; short enough not to feel stuck. */
const SETTLE_MS = 350;

/** If afterprint never fires — some browsers skip it — clean up anyway. */
const CLEANUP_MS = 60_000;

/**
 * Whether this browser can be trusted to print an iframe.
 *
 * User-agent sniffing, which is normally the wrong tool and is the right one
 * here: this is a rendering-engine bug with no feature to test for. Everything
 * Android — Chrome, the Samsung browser, and any WebView a kiosk-mode launcher
 * wraps the till in — shares the same print path and the same fault.
 */
function printsIframes(): boolean {
  if (typeof navigator === "undefined") return false;
  return !/android/i.test(navigator.userAgent);
}

/**
 * The Android path: a real window that prints itself.
 *
 * `noopener` is deliberately *not* set. The opened page needs `window.opener`
 * to know it was opened to be printed rather than navigated to, which is what
 * lets it close itself when the dialog is dismissed instead of leaving the
 * orphan tab this whole module exists to avoid.
 */
function printInWindow(url: string): void {
  const separator = url.includes("?") ? "&" : "?";
  /* `print=1` makes the page open the dialog itself once it has painted;
     `popup=1` tells it to close afterwards. Called straight out of a click
     handler, so the popup blocker allows it. */
  const opened = window.open(`${url}${separator}print=1&popup=1`, "_blank");

  /* Blocked anyway — a locked-down kiosk browser, or a launcher that refuses
     new windows. Going to the receipt in this tab is worse than a new one but
     far better than a button that silently does nothing with a customer
     waiting; the page prints on arrival and has its own Back. */
  if (!opened) window.location.href = `${url}${separator}print=1`;
}

export function printDocument(url: string): void {
  if (typeof document === "undefined") return;

  if (!printsIframes()) {
    printInWindow(url);
    return;
  }

  const frame = document.createElement("iframe");
  /* Off-screen rather than display:none, and at the size the document expects.
     A hidden iframe is not guaranteed to lay out, and a document that never
     laid out prints blank — the 1px, opacity-0 frame this used to be was one
     browser quirk away from the same empty slip Android produces. */
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.left = "-10000px";
  frame.style.top = "0";
  frame.style.width = "380px";
  frame.style.height = "800px";
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
