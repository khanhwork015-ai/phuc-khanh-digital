type Bucket = number[];

export function createRateLimiter(windowMs: number, maxRequests: number) {
  const hits = new Map<string, Bucket>();

  return function isLimited(key: string): boolean {
    const now = Date.now();
    if (hits.size > 5000) {
      for (const [k, timestamps] of hits) {
        if (timestamps.every((ts) => now - ts >= windowMs)) {
          hits.delete(k);
        }
      }
    }

    const prev = hits.get(key) ?? [];
    const fresh = prev.filter((ts) => now - ts < windowMs);
    if (fresh.length >= maxRequests) {
      hits.set(key, fresh);
      return true;
    }

    fresh.push(now);
    hits.set(key, fresh);
    return false;
  };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
