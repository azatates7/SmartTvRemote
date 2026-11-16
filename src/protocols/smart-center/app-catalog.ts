/**
 * Searchable catalog of popular TV apps (Turkey-focused) that the user can add.
 *
 * DIAL names here are UNVERIFIED guesses: none of these apps publishes a DIAL name for Vestel TVs.
 * Adding an app only GETs `/apps/<name>` (read-only) for each guess; it is saved only if the TV
 * answers 200. Wrong guesses cost nothing but a 404.
 */

import { isValidDialName, type DialAppDefinition } from './dial-apps';

export type CatalogApp = DialAppDefinition & {
  /** Extra search words (normalized by `normalizeSearch`). */
  aliases?: readonly string[];
};

export const APP_CATALOG: readonly CatalogApp[] = [
  { id: 'disneyplus', label: 'Disney+', dialNames: ['DisneyPlus', 'Disney'], aliases: ['disney plus'] },
  { id: 'tvplus', label: 'TV+', dialNames: ['TVPlus', 'TvPlus', 'tvplus'], aliases: ['tv plus', 'turk telekom'] },
  { id: 'exxen', label: 'Exxen', dialNames: ['Exxen', 'exxen'] },
  { id: 'tabii', label: 'tabii', dialNames: ['tabii', 'Tabii', 'TRTtabii'], aliases: ['trt'] },
  { id: 'hbomax', label: 'HBO Max', dialNames: ['HBOMax', 'HBOmax', 'Max'], aliases: ['blutv', 'max'] },
  { id: 'puhutv', label: 'puhutv', dialNames: ['puhutv', 'PuhuTV'], aliases: ['puhu'] },
  { id: 'gain', label: 'Gain', dialNames: ['Gain', 'gain'] },
  { id: 'spotify', label: 'Spotify', dialNames: ['Spotify', 'spotify'] },
  { id: 'appletv', label: 'Apple TV', dialNames: ['AppleTV', 'Apple'], aliases: ['apple tv plus'] },
  { id: 'twitch', label: 'Twitch', dialNames: ['Twitch', 'twitch'] },
];

export const MIN_SEARCH_LENGTH = 3;

const TR_MAP: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', i̇: 'i', ö: 'o', ş: 's', ü: 'u' };

/**
 * Lower-case, Turkish letters folded to ASCII, "+" read as "plus", only letters/digits kept
 * ("Türk Telekom" → "turktelekom", "TV+" → "tvplus").
 */
export function normalizeSearch(text: string): string {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/i̇|[çğıöşü]/g, (ch) => TR_MAP[ch] ?? ch)
    .replace(/\+/g, 'plus')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Catalog entries whose name or alias contains the query; names starting with it come first.
 * Empty if the query is shorter than MIN_SEARCH_LENGTH.
 */
export function searchCatalog(query: string): CatalogApp[] {
  const q = normalizeSearch(query);
  if (query.trim().length < MIN_SEARCH_LENGTH || q.length === 0) return [];
  const names = (app: CatalogApp) => [app.label, ...(app.aliases ?? [])].map(normalizeSearch);
  return APP_CATALOG.filter((app) => names(app).some((n) => n.includes(q))).sort(
    (a, b) => Number(!normalizeSearch(a.label).startsWith(q)) - Number(!normalizeSearch(b.label).startsWith(q)),
  );
}

/**
 * An app definition for a raw DIAL name the user typed (e.g. "TVPlus"), so names not in the
 * catalog can be tried on the TV. Returns null if the text is not a valid DIAL name.
 */
export function customAppFromQuery(query: string): DialAppDefinition | null {
  const name = query.trim();
  if (name.length < MIN_SEARCH_LENGTH || !isValidDialName(name)) return null;
  return { id: `custom:${name}`, label: name, dialNames: [name] };
}