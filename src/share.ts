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

export async function shareText(text: string): Promise<ShareOutcome> {
  if (navigator.share) {
    try {
      await navigator.share({ title: "قشطة", text });
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
      await navigator.clipboard.writeText(text);
      return "copied";
    } catch {
      /* fall through to legacy copy */
    }
  }
  return legacyCopy(text) ? "copied" : "unavailable";
}
