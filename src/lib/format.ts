export function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function clock(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function humanDuration(totalSeconds: number): string {
  const mins = Math.round(totalSeconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Pull a YouTube video id out of the common URL shapes. */
export function youtubeId(input: string): string | null {
  const url = input.trim();
  if (!url) return null;
  // Bare id
  if (/^[\w-]{11}$/.test(url)) return url;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.slice(1);
      return id ? id.slice(0, 11) : null;
    }
    if (u.searchParams.get("v")) return u.searchParams.get("v")!.slice(0, 11);
    const parts = u.pathname.split("/");
    const i = parts.findIndex((p) => p === "embed" || p === "shorts" || p === "live");
    if (i >= 0 && parts[i + 1]) return parts[i + 1].slice(0, 11);
  } catch {
    return null;
  }
  return null;
}
