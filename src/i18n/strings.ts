/**
 * User-facing strings. English is the source of truth for keys;
 * every other language must provide every key (enforced by the type below).
 */

export const en = {
  'tabs.home': 'Home',
  'tabs.guide': 'Guide',
  'tabs.remote': 'Remote',
  'tabs.apps': 'Apps',
  'tabs.settings': 'Settings',

  'home.title': 'Home',
  'home.noTv.title': 'No TV saved yet',
  'home.noTv.message':
    'Connect your phone to the same Wi-Fi network as your TV, then search below.',
  'home.tv.notChecked': 'Connection not checked yet',

  'guide.title': 'TV Guide',
  'guide.unsupported.title': 'Guide not available',
  'guide.unsupported.message':
    'Channels and programs are only shown when a verified data source is available for your TV.',

  'remote.title': 'Remote',
  'remote.noTv.title': 'No TV connected',
  'remote.noTv.message':
    'Connect to a TV to use the remote. Only controls verified on your TV model will be shown.',

  'apps.title': 'Apps',
  'apps.unsupported.title': 'Apps not available',
  'apps.unsupported.message':
    'The list of installed apps is only shown if your TV supports it and a TV is connected.',

  'settings.title': 'Settings',
  'settings.section.tv': 'TV',
  'settings.tv.none': 'No saved TV',
  'settings.tv.addByIp': 'Add by IP address',
  'settings.tv.manualHint': 'TV not found? You can enter its IP address instead.',
  'settings.tv.remove': 'Remove',
  'settings.tv.storageError': 'Could not access saved TVs on this device. Changes may not be kept.',
  'settings.section.language': 'Language',
  'settings.language.current': 'App language',
  'settings.language.followsDevice': 'Follows your device language (Turkish or English).',
  'settings.section.about': 'About',
  'settings.about.version': 'Version',
  'settings.about.disclaimer':
    'Independent app. Not affiliated with, endorsed by or sponsored by Toshiba or Vestel.',

  'addTv.name.label': 'Name (optional)',
  'addTv.name.placeholder': 'Living room TV',
  'addTv.ip.label': 'TV IP address',
  'addTv.ip.hint': 'Find it on the TV under Settings > Network, or in your router.',
  'addTv.error.empty': 'Enter the TV’s IP address.',
  'addTv.error.invalidFormat': 'Enter an address like 192.168.1.50.',
  'addTv.error.notPrivate': 'Only local network addresses are allowed (192.168.x.x, 10.x.x.x or 172.16–31.x.x).',
  'addTv.error.duplicate': 'A TV with this IP address is already saved.',
  'addTv.noCheckNote':
    'Saving does not contact the TV; it is only stored on this device. You can check the connection from Home.',

  'discover.intro':
    'Searches your Wi-Fi network for Smart Center TVs. The TV must be on, with Virtual Remote enabled.',
  'discover.start': 'Search for TVs on Wi-Fi',
  'discover.again': 'Search again',
  'discover.stop': 'Stop',
  'discover.preparing': 'Preparing…',
  'discover.scanning': 'Searching…',
  'discover.noneFound':
    'No TV found. Check that the TV is on, Virtual Remote is enabled, and the phone is not on a guest Wi-Fi.',
  'discover.respondedOnPort': 'Responded on the Smart Center port',
  'discover.add': 'Add',
  'discover.alreadySaved': 'Saved',
  'discover.error.noWifi': 'Connect the phone to Wi-Fi (the same network as the TV) and try again.',
  'discover.error.unknown': 'The search failed for an unknown reason.',

  'check.button': 'Check connection',
  'check.checking': 'Checking…',
  'check.responded': 'The TV responded',
  'check.respondedWithError': 'Something responded, but with an error status',
  'check.experimentalNote':
    'Experimental: this only shows that the address answered. It does not mean the TV is supported.',
  'check.error.invalidAddress': 'The saved IP address is not valid.',
  'check.error.timeout':
    'No response in time. Check that the TV is on, Virtual Remote is enabled, and both devices are on the same Wi-Fi.',
  'check.error.unreachable':
    'Could not reach the TV. Check the IP address, Wi-Fi connection and (on iPhone) local network permission.',
  'check.error.unknown': 'The check failed for an unknown reason.',

  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.loading': 'Loading…',

  'language.name': 'English',
} as const;

export type StringKey = keyof typeof en;

export const tr: Record<StringKey, string> = {
  'tabs.home': 'Ana Sayfa',
  'tabs.guide': 'Rehber',
  'tabs.remote': 'Kumanda',
  'tabs.apps': 'Uygulamalar',
  'tabs.settings': 'Ayarlar',

  'home.title': 'Ana Sayfa',
  'home.noTv.title': 'Henüz kayıtlı TV yok',
  'home.noTv.message':
    'Telefonunuzu TV ile aynı Wi-Fi ağına bağlayın, ardından aşağıdan arama yapın.',
  'home.tv.notChecked': 'Bağlantı henüz kontrol edilmedi',

  'guide.title': 'TV Rehberi',
  'guide.unsupported.title': 'Rehber kullanılamıyor',
  'guide.unsupported.message':
    'Kanal ve program bilgileri yalnızca TV’niz için doğrulanmış bir veri kaynağı olduğunda gösterilir.',

  'remote.title': 'Kumanda',
  'remote.noTv.title': 'Bağlı TV yok',
  'remote.noTv.message':
    'Kumandayı kullanmak için bir TV’ye bağlanın. Yalnızca TV modelinizde doğrulanmış tuşlar gösterilir.',

  'apps.title': 'Uygulamalar',
  'apps.unsupported.title': 'Uygulamalar kullanılamıyor',
  'apps.unsupported.message':
    'Yüklü uygulama listesi yalnızca TV’niz destekliyorsa ve bir TV bağlıysa gösterilir.',

  'settings.title': 'Ayarlar',
  'settings.section.tv': 'Televizyon',
  'settings.tv.none': 'Kayıtlı TV yok',
  'settings.tv.addByIp': 'IP adresiyle ekle',
  'settings.tv.manualHint': 'TV bulunamadı mı? IP adresini elle girebilirsiniz.',
  'settings.tv.remove': 'Kaldır',
  'settings.tv.storageError': 'Bu cihazdaki kayıtlı TV’lere erişilemedi. Değişiklikler saklanmayabilir.',
  'settings.section.language': 'Dil',
  'settings.language.current': 'Uygulama dili',
  'settings.language.followsDevice': 'Cihazınızın dilini kullanır (Türkçe veya İngilizce).',
  'settings.section.about': 'Hakkında',
  'settings.about.version': 'Sürüm',
  'settings.about.disclaimer':
    'Bağımsız bir uygulamadır. Toshiba veya Vestel ile bağlantılı değildir, onlar tarafından onaylanmamış veya desteklenmemiştir.',

  'addTv.name.label': 'Ad (isteğe bağlı)',
  'addTv.name.placeholder': 'Salon TV',
  'addTv.ip.label': 'TV IP adresi',
  'addTv.ip.hint': 'TV’de Ayarlar > Ağ bölümünde veya modem arayüzünde bulabilirsiniz.',
  'addTv.error.empty': 'TV’nin IP adresini girin.',
  'addTv.error.invalidFormat': '192.168.1.50 gibi bir adres girin.',
  'addTv.error.notPrivate': 'Yalnızca yerel ağ adreslerine izin verilir (192.168.x.x, 10.x.x.x veya 172.16–31.x.x).',
  'addTv.error.duplicate': 'Bu IP adresiyle kayıtlı bir TV zaten var.',
  'addTv.noCheckNote':
    'Kaydetmek TV’ye bağlanmaz, TV yalnızca bu cihaza kaydedilir. Bağlantıyı Ana Sayfa’dan kontrol edebilirsiniz.',

  'discover.intro':
    'Wi-Fi ağınızda Smart Center destekli TV’leri arar. TV açık ve Sanal Kumanda (Virtual Remote) etkin olmalıdır.',
  'discover.start': 'Wi-Fi’da TV ara',
  'discover.again': 'Tekrar ara',
  'discover.stop': 'Durdur',
  'discover.preparing': 'Hazırlanıyor…',
  'discover.scanning': 'Aranıyor…',
  'discover.noneFound':
    'TV bulunamadı. TV’nin açık, Sanal Kumanda’nın etkin ve telefonun misafir Wi-Fi’da olmadığını kontrol edin.',
  'discover.respondedOnPort': 'Smart Center portunda yanıt verdi',
  'discover.add': 'Ekle',
  'discover.alreadySaved': 'Kayıtlı',
  'discover.error.noWifi': 'Telefonu Wi-Fi’a (TV ile aynı ağa) bağlayıp tekrar deneyin.',
  'discover.error.unknown': 'Arama bilinmeyen bir nedenle başarısız oldu.',

  'check.button': 'Bağlantıyı kontrol et',
  'check.checking': 'Kontrol ediliyor…',
  'check.responded': 'TV yanıt verdi',
  'check.respondedWithError': 'Bir yanıt geldi ama hata durumuyla',
  'check.experimentalNote':
    'Deneysel: bu yalnızca adresin yanıt verdiğini gösterir. TV’nin desteklendiği anlamına gelmez.',
  'check.error.invalidAddress': 'Kayıtlı IP adresi geçerli değil.',
  'check.error.timeout':
    'Zamanında yanıt gelmedi. TV’nin açık, Sanal Kumanda’nın (Virtual Remote) etkin ve iki cihazın aynı Wi-Fi’da olduğunu kontrol edin.',
  'check.error.unreachable':
    'TV’ye ulaşılamadı. IP adresini, Wi-Fi bağlantısını ve (iPhone’da) yerel ağ iznini kontrol edin.',
  'check.error.unknown': 'Kontrol bilinmeyen bir nedenle başarısız oldu.',

  'common.save': 'Kaydet',
  'common.cancel': 'Vazgeç',
  'common.loading': 'Yükleniyor…',

  'language.name': 'Türkçe',
};