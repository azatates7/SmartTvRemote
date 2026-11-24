# TV Kumanda – Smart Center (SmartTvRemote)

Android (and later iOS) remote for **Smart Center–compatible TVs** (some Toshiba / Vestel models), built with
React Native, Expo SDK 58 and Expo Router. Everything works on the local network: no account, no server,
no analytics.

Independent app. Not affiliated with, endorsed by or sponsored by Toshiba or Vestel.

> Read [`AGENTS.md`](./AGENTS.md) before contributing. It defines the product scope, phases and engineering rules
> (local network only, verify on real hardware before claiming support, capability-aware UI).

## Status

Working on one verified TV: **Toshiba 50UL2163DT (Vestel MB180)**, record TV-001 in
[`docs/compatibility.md`](./docs/compatibility.md). Other models may work but are not verified.
Google Play preparation: [`docs/play-store-plan.md`](./docs/play-store-plan.md).

## Features

| Area | What it does |
|---|---|
| Discovery | Scans the phone's Wi-Fi network (/24) for TVs answering on port 56789; no manual IP entry |
| TV identity | Reads the TV's UDN from `:56790/dd.xml`; if the TV's IP changes after a restart, it is found again and updated instead of being added twice |
| Auto-connect | Reconnects to the last TV when the app starts (until you tap Disconnect) |
| Remote | D-pad, OK, V±/P± (hold to repeat), back, home, exit, number pad, mute, media bar (previous track, play, stop, next track), power with confirmation, haptic feedback |
| More page | Last channel, teletext, menu, source, Web, TV guide |
| Apps | Netflix and Amazon Prime Video via DIAL; YouTube, Disney+ and tabii via their remote keys; search to add other DIAL apps (min. 3 characters) |
| Offline view | Without a connection, Remote and Apps still show the last TV and its apps, with a Connect button; keys show a warning instead of sending |
| Voice commands | Mic on the Remote screen: "sesi 3 artır", "bir sonraki kanal", "kanal 7", "YouTube'u aç", "volume up", "open Netflix"… in the app language (TR/EN). On-device recognition only, Android 13+ |
| Language | Device language (default), Turkish or English — Settings > Language |
| Try a code | Remote > More: send any key code 1000–9999 (power blocked) to find keys on other Smart Center models |
| Temporary tool | Settings > Diagnostics (read-only protocol report). Removed before release |

Protocol details and sources: [`docs/protocol-notes.md`](./docs/protocol-notes.md).

## Project structure

```text
src/
├── app/                  # Screens (Expo Router): index (Home), guide, remote, apps, settings, _layout
├── components/           # UI building blocks (buttons, cards, discovery panel, icons, …)
├── constants/theme.ts    # Dark theme, orange accent, spacing
├── domain/               # Types and pure logic (TV model, private IPv4 parsing, add/update rules)
├── i18n/                 # TR/EN strings, language preference
├── protocols/smart-center/
│   ├── http.ts           # Single guarded HTTP helper (private IPs and known paths only)
│   ├── probe.ts          # GET /apps/SmartCenter
│   ├── send-key.ts       # Key codes + POST <remote><key code='…'/></remote>
│   ├── dial-apps.ts      # DIAL app status / launch, key-launched apps
│   ├── discover.ts       # /24 scan
│   └── device-info.ts    # UDN / model from dd.xml
└── services/             # Saved TVs, connection state + request queue, local storage, haptics
docs/                     # protocol-notes, compatibility, play-store-plan
scripts/                  # tv-probe.ps1, tv-explore.py (manual protocol checks from a PC)
```

## Requirements

- Node.js 22.11+
- JDK 17, Android SDK (platform 37, build-tools 37.0.0, NDK 27.1.12297006)
- A phone and the TV on the **same Wi-Fi network**; the TV's Virtual Remote setting enabled

## Development

```bash
npm install
echo '/// <reference types="expo/types" />' > expo-env.d.ts   # once; normally created by `expo start`
npx tsc --noEmit                                               # type check, no output = OK
npx expo start                                                 # UI work; LAN features need a real device
```

## Building an APK (local, Linux)

```bash
export ANDROID_HOME=$HOME/Android/Sdk
npx expo prebuild --clean            # only after app.json, icons or native packages change
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

- JS/TS-only changes need just `./gradlew assembleRelease`.
- If Gradle cannot find `node`, run `./gradlew --stop` and build again from a terminal where `node` works.
- The release APK is currently signed with the debug key (fine for sideloading). Play uploads need an AAB
  signed with an upload key, see the release plan.

## License

MIT. See [LICENSE](./LICENSE).