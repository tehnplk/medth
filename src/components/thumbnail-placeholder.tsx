type ThumbnailPlaceholderProps = {
  kind: "branch" | "staff";
  label: string;
  className?: string;
};

function getInitials(label: string): string {
  const base = label.replace(/^สาขา\s*/u, "").trim();

  if (!base) return "TH";

  const words = base.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const first = Array.from(words[0])[0] ?? "";
    const second = Array.from(words[1])[0] ?? "";
    return `${first}${second}`.toUpperCase();
  }

  const chars = Array.from(base);
  const initials = chars.slice(0, 1).join("");
  return (initials || "TH").toUpperCase();
}

export default function ThumbnailPlaceholder({
  kind,
  label,
  className = "",
}: ThumbnailPlaceholderProps) {
  const initials = getInitials(label);
  const isStaff = kind === "staff";

  return (
    <div
      aria-hidden="true"
      className={`relative flex ${isStaff ? "h-14 w-14 rounded-full" : "h-16 w-16 rounded-2xl"} shrink-0 items-center justify-center overflow-hidden border border-white/70 bg-[linear-gradient(135deg,_#e0f2fe_0%,_#93c5fd_55%,_#2563eb_100%)] text-white shadow-[0_14px_24px_-16px_rgba(37,99,235,0.65)] ${className}`}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.45)_0%,_rgba(255,255,255,0.08)_38%,_transparent_72%)]" />
      <span className="relative text-sm font-bold">{initials}</span>
    </div>
  );
}
