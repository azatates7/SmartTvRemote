import { requireOptionalNativeModule } from 'expo';

type WakeOnLanNative = {
  sendMagicPacket(mac: string, addresses: string[]): Promise<void>;
};

// Modül yalnızca Android'de derlenir; iOS'ta ve web önizlemesinde null döner ve "TV'yi aç" düğmesi gösterilmez.
const native = requireOptionalNativeModule<WakeOnLanNative>('WakeOnLan');

/** Bu cihazda Wake-on-LAN paketi gönderilebiliyorsa true döner. */
export const isWakeOnLanAvailable = native !== null;

/** Verilen MAC adresine, verilen yerel adresler üzerinden sihirli paketi gönderir; modül yoksa hata fırlatır. */
export function sendMagicPacket(mac: string, addresses: string[]): Promise<void> {
  if (!native) return Promise.reject(new Error('Wake-on-LAN is not available on this platform'));
  return native.sendMagicPacket(mac, addresses);
}