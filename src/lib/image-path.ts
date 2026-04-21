function normalizeSlashes(value: string) {
  return value.replace(/\\/g, "/").trim();
}

function toMediaPath(pathname: string) {
  let normalized = normalizeSlashes(pathname);
  if (!normalized) return "";

  if (normalized.startsWith("./")) {
    normalized = normalized.slice(1);
  }

  if (!normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  if (normalized.startsWith("/public/")) {
    normalized = normalized.slice("/public".length);
  }

  if (normalized.startsWith("/media/")) {
    return normalized;
  }

  if (normalized.startsWith("/images/")) {
    return `/media/${normalized.slice("/images/".length)}`;
  }

  return normalized;
}

export function resolveImageSrc(value: string | null | undefined) {
  if (typeof value !== "string") return "";

  const normalized = normalizeSlashes(value);
  if (!normalized) return "";

  if (normalized.startsWith("data:") || normalized.startsWith("blob:")) {
    return normalized;
  }

  if (/^https?:\/\//i.test(normalized)) {
    try {
      const url = new URL(normalized);
      const mediaPath = toMediaPath(url.pathname);
      return mediaPath || url.toString();
    } catch {
      return normalized;
    }
  }

  return toMediaPath(normalized);
}

export function normalizeImagePathForStorage(value: string | null | undefined) {
  const normalized = resolveImageSrc(value);
  return normalized || null;
}
