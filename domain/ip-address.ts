/**
 * Local-network IPv4 validation for manual TV entry.
 * Only private (RFC 1918) addresses are accepted: TV control must stay on the LAN (AGENTS.md principle 2).
 */

export type IpValidationError = 'empty' | 'invalidFormat' | 'notPrivate';

export type IpValidationResult =
  | { ok: true; value: string }
  | { ok: false; error: IpValidationError };

const OCTET = /^(0|[1-9]\d{0,2})$/; // no leading zeros, avoids octal-looking input like "010"

export function parsePrivateIPv4(input: string): IpValidationResult {
  // Some numeric keyboards (e.g. Turkish locale) type "," instead of "."
  const text = input.trim().replace(/,/g, '.');
  if (text.length === 0) return { ok: false, error: 'empty' };

  const parts = text.split('.');
  if (parts.length !== 4 || !parts.every((p) => OCTET.test(p))) {
    return { ok: false, error: 'invalidFormat' };
  }

  const octets = parts.map(Number);
  if (octets.some((o) => o > 255)) return { ok: false, error: 'invalidFormat' };

  const [a, b] = octets;
  const isPrivate =
    a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  if (!isPrivate) return { ok: false, error: 'notPrivate' };

  return { ok: true, value: octets.join('.') };
}