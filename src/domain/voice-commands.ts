import type { RemoteKey } from './tv';

/**
 * Turns a recognised sentence (Turkish or English) into one remote command.
 * Pure function: no network, no React, so it can be tested on its own.
 *
 * Examples: "bir sonraki kanala geç" → P+, "sesi 3 kıs" → V− ×3, "youtube'u aç" → YouTube,
 * "kanal 7" → digits 7, "televizyonu kapat" → power (the UI asks for confirmation).
 */
export type VoiceCommand =
  | { type: 'key'; key: RemoteKey; count: number }
  | { type: 'channel'; number: number }
  | { type: 'app'; appId: string }
  | { type: 'power' };

/** An app the TV reported (id + label), so "open X" only targets apps that can be opened. */
export type VoiceApp = { id: string; label: string };

const MAX_COUNT = 10;

/** Extra names people say for apps, matched after normalisation. */
const APP_ALIASES: Record<string, string[]> = {
  AmazonInstantVideo: ['prime', 'amazon', 'primevideo', 'amazonprime'],
  disneyplus: ['disney', 'disneyplus', 'disneyartı', 'disneyarti'],
  YouTube: ['youtube', 'yutup', 'yutub'],
  Netflix: ['netflix', 'netflik', 'netfliks'],
  tabii: ['tabii', 'tabi', 'trttabii'],
};

const NUMBER_WORDS: Record<string, number> = {
  // "bir" (one / a) is left out on purpose: in Turkish it is mostly an article ("bir sonraki kanal").
  iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10,
  two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

const TR_MAP: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', 'i̇': 'i' };

/** Lower-case, Turkish letters folded to ASCII, apostrophes and punctuation turned into spaces. */
export function normalizeSpeech(text: string): string {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/i̇|[çğıöşü]/g, (ch) => TR_MAP[ch] ?? ch)
    .replace(/\+/g, ' plus ')
    .replace(/['’`]/g, ' ')
    .replace(/(\d)\s*\.(?=\s|$)/g, '$1 ') // "7." → "7"
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function parseVoiceCommand(text: string, apps: readonly VoiceApp[] = []): VoiceCommand | null {
  const s = normalizeSpeech(text);
  if (!s) return null;
  const words = s.split(' ');
  const joined = words.join('');
  const has = (...stems: string[]) => words.some((w) => stems.some((stem) => w.startsWith(stem)));
  const hasWord = (...exact: string[]) => words.some((w) => exact.includes(w));
  const hasPhrase = (...phrases: string[]) => phrases.some((p) => ` ${s} `.includes(` ${p} `));
  const count = Math.min(MAX_COUNT, readCount(words) ?? 1);

  const aboutSound = has('ses', 'volume', 'sound');
  const aboutChannel = has('kanal', 'channel');
  const aboutTv = has('televizyon') || hasWord('tv', 'tvyi', 'teve', 'tivi');

  // 1. Power: "televizyonu kapat", "turn off the tv". Never when the sentence is about sound.
  if (!aboutSound && ((aboutTv && has('kapat')) || hasPhrase('turn off', 'switch off', 'power off', 'shut down'))) {
    return { type: 'power' };
  }

  // 2. Mute: "sessize al", "sesi kapat", "sesi kes", "mute".
  if (has('sessiz', 'mute', 'unmute') || (aboutSound && has('kapat', 'kes'))) {
    return { type: 'key', key: 'mute', count: 1 };
  }

  // 3. Apps: any app the TV offers, by label or a common alias ("youtube'u aç", "open disney plus").
  const app = findApp(joined, apps);
  if (app) return { type: 'app', appId: app.id };

  // 4. Channels.
  if (aboutChannel || hasPhrase('last channel')) {
    if (hasWord('son') || has('izledigim') || hasPhrase('last channel')) {
      return { type: 'key', key: 'lastChannel', count: 1 };
    }
    if (has('sonraki', 'ileri', 'yukari', 'artir', 'arttir', 'next', 'up')) {
      return { type: 'key', key: 'channelUp', count };
    }
    // "bir önceki kanal" → P− (the opposite of "bir sonraki kanal"); "son kanal" is handled above.
    if (has('onceki', 'geri', 'asagi', 'azalt', 'previous', 'prev', 'down', 'back')) {
      return { type: 'key', key: 'channelDown', count };
    }
    const number = words.find((w) => /^\d{1,4}$/.test(w));
    if (number) return { type: 'channel', number: Number(number) };
    return null;
  }

  // 5. Volume: "sesi artır / kıs", "volume up 3", "louder", "quieter".
  if (aboutSound || has('louder', 'quieter')) {
    if (has('artir', 'arttir', 'yukselt', 'ac', 'up', 'louder', 'raise', 'increase')) {
      return { type: 'key', key: 'volumeUp', count };
    }
    if (has('kis', 'azalt', 'dusur', 'alcalt', 'down', 'quieter', 'lower', 'decrease')) {
      return { type: 'key', key: 'volumeDown', count };
    }
    return null;
  }

  // 6. Single keys.
  const single: [RemoteKey, () => boolean][] = [
    ['home', () => hasPhrase('ana sayfa', 'ana ekran') || has('anasayfa', 'home')],
    ['guide', () => has('rehber', 'guide', 'epg') || hasPhrase('yayin akisi')],
    ['teletext', () => has('teletext', 'teletekst')],
    ['exit', () => has('cikis', 'exit')],
    ['menu', () => hasWord('menu', 'menuyu', 'menuye')],
    ['source', () => has('kaynak', 'source', 'input')],
    ['play', () => has('oynat', 'devam', 'play', 'resume')],
    ['stop', () => has('durdur', 'stop')],
    ['back', () => hasWord('geri', 'back', 'geriye', 'don')],
    ['ok', () => hasWord('tamam', 'ok', 'okay', 'sec', 'onayla', 'enter', 'select')],
    ['up', () => has('yukari', 'up')],
    ['down', () => has('asagi', 'down')],
    ['left', () => has('sol', 'left')],
    ['right', () => hasWord('sag', 'saga', 'right')],
  ];
  for (const [key, matches] of single) {
    if (matches()) {
      const repeatable = key === 'up' || key === 'down' || key === 'left' || key === 'right';
      return { type: 'key', key, count: repeatable ? count : 1 };
    }
  }
  return null;
}

function findApp(joined: string, apps: readonly VoiceApp[]): VoiceApp | undefined {
  return apps.find((app) => {
    const names = [app.label, ...(APP_ALIASES[app.id] ?? [])].map((n) => normalizeSpeech(n).replace(/ /g, ''));
    return names.some((n) => n.length >= 3 && joined.includes(n));
  });
}

/** "sesi 3 kıs" → 3, "volume up five" → 5; undefined when no number is said. */
function readCount(words: string[]): number | undefined {
  for (const w of words) {
    if (/^\d{1,2}$/.test(w)) return Math.max(1, Number(w));
    if (w in NUMBER_WORDS) return NUMBER_WORDS[w];
  }
  return undefined;
}