# TV Kumanda – Smart Center (SmartTvRemote)

Android (and later iOS) remote for **Smart Center–compatible TVs** (some Toshiba / Vestel models), built with
React Native, Expo SDK 58 and Expo Router. Everything works on the local network: no account, no server,
no analytics.

Independent app. Not affiliated with, endorsed by or sponsored by Toshiba or Vestel.

> Read [`AGENTS.md`](./AGENTS.md) before contributing. It defines the product scope and engineering rules
> (local network only, verify on real hardware before claiming support, capability-aware UI).
> **§6 "Current State"** is the short, up-to-date summary of what exists, the decisions taken and how to add
> keys, apps, texts or native code without breaking the structure. Update it with every change.

## Status

Working on one verified TV: **Toshiba 50UL2163DT (Vestel MB180)**, record TV-001 in
[`docs/compatibility.md`](./docs/compatibility.md). Other models may work but are not verified.
Google Play preparation: [`docs/play-store-plan.md`](./docs/play-store-plan.md), store texts and graphics:
[`docs/store-listing.md`](./docs/store-listing.md) and `store/`.

## Features

| Area | What it does |
|---|---|
| Discovery | Scans the phone's Wi-Fi network (/24) for TVs answering on port 56789; no manual IP entry |
| TV identity | Reads the TV's UDN from `:56790/dd.xml`; if the TV's IP changes after a restart, it is found again and updated instead of being added twice |
| Turn on TV | "Turn on TV" (Home card, Remote header, Apps) for the last TV when nothing is connected, or after the TV could not be reached. Sends a Wake-on-LAN packet (MAC from the TV's UDN), waits up to 40 s, then connects; on failure shows each step (MAC, packets sent, wait, network scan). Android only; needs the TV's "Wake on WLAN/LAN" setting. Not yet proven on TV-001. Local Expo module in `modules/wake-on-lan` |
| Auto-connect | Reconnects to the last TV when the app starts (until you tap Disconnect). If the TV answers but Smart Center is still starting, retries for ~8 s |
| Remote | D-pad, OK, V±/P± (hold to repeat), back, home, exit, number pad, mute, media bar (previous track, play, stop, next track), power with confirmation, haptic feedback. Swipe left/right to switch between Remote and More |
| More page | Last channel, teletext, menu, source, Web, TV guide, Try a code |
| Apps | Netflix and Amazon Prime Video via DIAL; YouTube, Disney+ and tabii via their remote keys; search to add other DIAL apps (min. 3 characters). "Open on the TV" is shown only when the TV reports the app as running |
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
├── domain/               # Pure logic: TV types, private IPv4, add/update rules, voice-command parser, UDN → MAC
├── i18n/                 # TR/EN strings, language preference
├── protocols/smart-center/
│   ├── http.ts           # Single guarded HTTP helper (private IPs and known paths only)
│   ├── probe.ts          # GET /apps/SmartCenter
│   ├── send-key.ts       # Key codes + POST <remote><key code='…'/></remote>
│   ├── dial-apps.ts      # DIAL app status / launch, key-launched apps
│   ├── app-catalog.ts    # App search (Turkish-aware matching)
│   ├── discover.ts       # /24 scan
│   ├── device-info.ts    # UDN / model from dd.xml
│   └── diagnostics.ts    # TEMPORARY read-only report
└── services/             # Connection state + request queue (connection-context), saved TVs, local storage,
                          # haptics, voice recognition
modules/wake-on-lan/      # Local Expo module (Kotlin, Android): Wake-on-LAN magic packet
store/                    # Play icon (512) and feature graphics (TR/EN)
docs/                     # protocol-notes, compatibility, play-store-plan, store-listing
scripts/                  # tv-probe.ps1, tv-explore.py (manual protocol checks from a PC)
eas.json                  # EAS Build profiles: preview (APK), production (AAB)
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

## Building

### EAS Build (recommended for Play)

EAS creates and keeps the upload key; `android/` is generated on the build server from `app.json`.

```bash
npx eas-cli@latest build -p android --profile preview      # APK to install on the phone
npx eas-cli@latest build -p android --profile production   # AAB for Google Play
npx eas-cli@latest credentials -p android                  # download a backup of the upload key
```

Commit `modules/` and every change before building: EAS uploads what git tracks.

### Local APK (Linux)

```bash
export ANDROID_HOME=$HOME/Android/Sdk
npx expo prebuild --clean            # only after app.json, icons or native packages change
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

- JS/TS-only changes need just `./gradlew assembleRelease`.
- `app.json`, icons, a new native package (e.g. `expo-speech-recognition`) or `modules/` changes need
  `npx expo prebuild --clean` first; it deletes `android/local.properties`, so re-create it.
- If Gradle cannot find `node`, run `./gradlew --stop` and build again from a terminal where `node` works.
- The local release APK is signed with the debug key (fine for sideloading). Play uploads use the EAS
  production AAB, see the release plan.

## Privacy

No account, no ads, no analytics, no server. The app only talks to private addresses on the local network;
voice commands are recognised on the device. Policy: https://azatates.com/privacy/smart-tv-remote.html

## License

MIT. See [LICENSE](./LICENSE).