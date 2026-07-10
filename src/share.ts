export type ShareOutcome = "shared" | "copied" | "cancelled" | "unavailable";

function legacyCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-1000px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  document.body.removeChild(textarea);
  return copied;
}

export async function shareResult(text: string, url: string): Promise<ShareOutcome> {
  // The URL is embedded directly in the shared text (not just passed via the
  // `url` field) because several major share targets on Android — WhatsApp
  // among them — only read the `text` member of the share intent and silently
  // drop `url`. `url` is still included for targets that do use it (e.g. rich
  // link previews), so both paths are covered.
  const fullText = `${text}\n\n${url}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: "قشطة", text: fullText, url });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return "cancelled";
      }
      if (import.meta.env.DEV) {
        console.warn("navigator.share failed, falling back to copy:", err);
      }
    }
  }
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(fullText);
      return "copied";
    } catch {
      /* fall through to legacy copy */
    }
  }
  return legacyCopy(fullText) ? "copied" : "unavailable";
}
