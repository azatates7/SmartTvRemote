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
    'Adding a TV (discovery and manual IP entry) is not available yet. Your phone and TV will need to be on the same Wi-Fi network.',

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
  'settings.tv.comingSoon': 'Discovery and manual IP entry are coming in a later version.',
  'settings.section.language': 'Language',
  'settings.language.current': 'App language',
  'settings.language.followsDevice': 'Follows your device language (Turkish or English).',
  'settings.section.about': 'About',
  'settings.about.version': 'Version',
  'settings.about.disclaimer':
    'Independent app. Not affiliated with, endorsed by or sponsored by Toshiba or Vestel.',

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
    'TV ekleme (otomatik bulma ve manuel IP girişi) henüz hazır değil. Telefonunuz ve TV aynı Wi-Fi ağında olmalıdır.',

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
  'settings.tv.comingSoon': 'Otomatik bulma ve manuel IP girişi sonraki bir sürümde eklenecek.',
  'settings.section.language': 'Dil',
  'settings.language.current': 'Uygulama dili',
  'settings.language.followsDevice': 'Cihazınızın dilini kullanır (Türkçe veya İngilizce).',
  'settings.section.about': 'Hakkında',
  'settings.about.version': 'Sürüm',
  'settings.about.disclaimer':
    'Bağımsız bir uygulamadır. Toshiba veya Vestel ile bağlantılı değildir, onlar tarafından onaylanmamış veya desteklenmemiştir.',

  'language.name': 'Türkçe',
};