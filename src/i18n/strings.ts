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
    'Add your TV by its IP address in Settings > TV. Your phone and TV must be on the same Wi-Fi network.',
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
  'settings.tv.add': 'Add TV',
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
    'The TV is only saved on this device. The app does not contact the TV yet; connection checks come in a later version.',

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
    'TV’nizi Ayarlar > Televizyon bölümünden IP adresiyle ekleyebilirsiniz. Telefonunuz ve TV aynı Wi-Fi ağında olmalıdır.',
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
  'settings.tv.add': 'TV ekle',
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
    'TV yalnızca bu cihaza kaydedilir. Uygulama henüz TV’ye bağlanmıyor; bağlantı kontrolü sonraki bir sürümde eklenecek.',

  'common.save': 'Kaydet',
  'common.cancel': 'Vazgeç',
  'common.loading': 'Yükleniyor…',

  'language.name': 'Türkçe',
};