# SmartTvRemote

Cross-platform (Android + iOS) mobile remote for Smart TVs, built with React Native, Expo SDK 58 and Expo Router.

Initial target: Toshiba / Vestel Smart Center–compatible TVs, subject to per-model and per-firmware verification. Not affiliated with Toshiba or Vestel.

> Read [`AGENTS.md`](./AGENTS.md) before contributing. It defines the product scope, delivery phases and engineering rules.

## Status

Phase 0 (repository and device reconnaissance). TV protocol support is **not yet verified** on any model.

## Requirements

- Node.js 22.11+
- JDK 17, Android Studio, Android SDK / Platform Tools (local Android builds)
- macOS + Xcode for local iOS builds, or a validated cloud build workflow

## Getting started

```bash
npm install
npx expo start
```

Native LAN features (discovery, TV commands) must be tested with a **Development Build** on a physical device on the same Wi-Fi as the TV. Expo Go and emulators are fine for UI work only.

## License

MIT. See [LICENSE](./LICENSE).