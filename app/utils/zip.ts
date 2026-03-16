/**
 * Normalize postal/zip code for multi-format international support.
 * Handles: US ZIP+4, UK postcodes, Indian pincodes, Australian postcodes, Canadian postal codes.
 */
export function normalizeZipCode(raw: string): string {
  let z = raw.trim().toUpperCase();
  z = z.replace(/\s+/g, "");        // collapse all internal spaces (UK: SW1A 2AA → SW1A2AA)
  z = z.replace(/-\d{4}$/, "");     // strip US ZIP+4 suffix (90210-1234 → 90210)
  return z;
}
