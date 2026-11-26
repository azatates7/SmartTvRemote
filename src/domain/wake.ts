/**
 * Vestel tabanlı TV'lerin kimliği (UDN) `uuid:00000000-0000-0000-0000-<12 hex>` biçimindedir ve son 12 hane TV'nin MAC adresidir.
 * TV-001'de kimlik `uuid:00000000-0000-0000-0000-909877e434b0`, MAC adresi `90:98:77:e4:34:b0` olarak okunur.
 * Kimlik bu biçimde değilse MAC adresi tahmin edilmez ve null döner; bu durumda "TV'yi aç" düğmesi gösterilmez.
 */
export function macFromDeviceId(deviceId: string | undefined): string | null {
  const match = /^uuid:0{8}-0{4}-0{4}-0{4}-([0-9a-f]{12})$/i.exec(deviceId ?? '');
  if (!match) return null;
  const hex = match[1].toLowerCase();
  // Tamamı sıfır ya da çok noktaya yayın (multicast) biti açık olan adresler gerçek bir cihaz adresi olamaz.
  if (/^0{12}$/.test(hex) || parseInt(hex.slice(0, 2), 16) % 2 === 1) return null;
  return hex.match(/../g)!.join(':');
}

/** Telefonun IP adresinden aynı /24 ağın yayın adresini üretir, örneğin 192.168.1.37 için 192.168.1.255. */
export function subnetBroadcast(phoneIp: string): string {
  const [a, b, c] = phoneIp.split('.');
  return `${a}.${b}.${c}.255`;
}