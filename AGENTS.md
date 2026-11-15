# AGENTS.md — Smart TV Remote

> Project guide for AI coding agents and developers working in this repository.
> Product goal: Build an independent React Native application inspired by the user-provided Toshiba Smart Center screenshots.
> Initial TV target: Toshiba / Vestel Smart Center compatible televisions, subject to model and firmware verification.
> This project is not affiliated with Toshiba or Vestel.

---

## Confirmed Project Decisions (2026-11-12)

- Mobile platforms: Android and iOS from one React Native codebase.
- First TV ecosystem: Toshiba / Vestel Smart Center-compatible TVs; do not infer that all Toshiba TVs share this platform.
- Product intent: Personal use first, with a possible later Google Play and Apple App Store release.
- Development environment: Windows + VS Code; Android builds locally, iOS builds require macOS/Xcode or an appropriate cloud build service.
- Mobile framework: React Native + TypeScript; current repository is an Expo Router project using Expo SDK 58 and React Native 0.88.1. Confirm compatibility and native-module support before changing the runtime.
- Initial runtime: Expo Development Build, subject to native local-network discovery and transport validation. Expo Go is not the acceptance target for native networking features.
- Backend: Not required for the initial release.
- Network: TV control should remain on the user's local network.
- Architecture: Adapter-based, capability-driven and extensible to other TV platforms.
- Exact TV model/product code, chassis, firmware and region: Not yet known. Treat protocol support as unverified until tested on a real target TV.
- User-provided screenshots are visual/product references only. They are not implementation instructions or evidence that every pictured feature is available through the TV protocol.

### Environment Requirements

- Node.js 22.11 or newer.
- JDK 17 and Android Studio for local Android builds.
- Android SDK, Build Tools, Emulator and Platform Tools.
- Git and Visual Studio Code.
- macOS with Xcode for local iOS builds/signing, or a validated cloud build workflow. Windows alone cannot produce a locally signed iOS app.
- Apple Developer and Google Play developer accounts only when preparing store publication.

### Android Environment Variables

ANDROID_HOME:

%LOCALAPPDATA%\Android\Sdk

Add the following to Windows PATH:

%LOCALAPPDATA%\Android\Sdk\platform-tools

### Local Network and Platform Permissions

- Android local-network permission behavior changes by OS/API level. Check the current Android SDK behavior and Expo config plugin support when implementing discovery; do not blindly copy obsolete permission declarations.
- iOS local network access requires the appropriate usage description and Bonjour service declarations when Bonjour is used. Explain the permission in context and request it only when the user starts discovery or connection.
- iOS multicast discovery may require the relevant multicast entitlement/capability and Apple approval. Prefer a discovery method that does not require restricted multicast where feasible; verify on physical devices.
- Handle denied/restricted permissions gracefully and provide manual IP entry where technically possible.
- Test networking on physical Android and iOS devices on the same Wi-Fi as the TV. Simulators/emulators are useful for UI work, not sufficient for LAN acceptance.
- Do not request broad permissions unrelated to a user-visible feature. Do not collect Wi-Fi credentials.

---

# 1. Mission and Product Principles

Build a reliable cross-platform mobile remote for supported TVs. The initial product direction, based on the supplied screenshots, includes:

- Home/dashboard and saved TV status.
- TV guide with channel/program timeline where a verified source exists.
- Remote controls: navigation, volume/channel, keypad and playback where supported.
- TV applications list and launch shortcuts where supported.
- Settings for TV selection, channel list, language, diagnostics and about.
- Discovery, connection, reconnect and manual IP entry.

### Non-negotiable Principles

1. Verify compatibility before claiming support; publish tested model/firmware evidence.
2. Keep TV communication local by default. Do not add a cloud relay without a separately approved product decision and security review.
3. Use capability-aware UI: hide or disable unsupported functions and explain why.
4. Never invent TV APIs, endpoint behavior, command codes, app identifiers, channel schedules or logos.
5. Require deliberate confirmation for power and other potentially disruptive actions; never automatically retry non-idempotent commands.
6. Explain local-network permission prompts at the point of use and provide recovery paths.
7. Store pairing secrets/tokens, if any, using platform secure storage; never log secrets.
8. Use TypeScript strict mode and keep protocol/network code separate from UI.
9. Make accessibility, readable touch targets, localization and error states part of feature completion.
10. Test features on real hardware and record exact device/firmware results.
11. Respect TV authentication and platform security. Do not bypass pairing or security controls.
12. Treat screenshots as visual inspiration; do not copy proprietary logos, artwork or trademarks into distributed assets without rights.

Toshiba is a brand, not a single universal TV platform. Model year, chassis, firmware, operating system and region can change the available protocol and capabilities.

---

# 2. Product Scope and Delivery Phases

## Phase 0 — Repository and Device Reconnaissance (do first)

1. Inspect the existing Expo Router project, `package.json`, app configuration, TypeScript settings, routes and installed dependencies before editing architecture.
2. Record the exact target TV model, product code, chassis/platform, region and firmware from the TV's About/System screen.
3. Confirm Virtual Remote / mobile control is enabled in TV settings, and test with the official Smart Center app if available.
4. Confirm phone and TV share the same LAN; note guest-network/client-isolation settings.
5. Research model-specific protocol support from primary/official documentation first, then clearly label community findings as unverified.
6. Create a compatibility record with date, phone OS, TV model/firmware, discovery method, commands tested, results and limitations.
7. Decide Expo managed/prebuild versus a custom native module only after checking discovery and HTTP transport requirements on both platforms.

**Exit criteria:** A target TV and a safe, repeatable method to identify/reach it are known, or a documented blocker exists. Do not claim protocol support before this gate.

## Phase 1 — Cross-platform Foundation

- Keep navigation and shared UI in the common React Native codebase.
- Add app theme/design tokens inspired by the supplied dark screenshots (near-black surfaces, restrained green accent, high-contrast text); do not reproduce the Toshiba wordmark or proprietary artwork.
- Establish route structure for Home, Guide, Remote, Apps and Settings, with connection state visible consistently.
- Define domain types, adapter boundary, capability model, error taxonomy, logging policy and local persistence.
- Persist saved TV metadata and user preferences locally. Keep credentials in secure storage if protocol pairing ever requires them.
- Add loading, empty, offline, permission-denied, unsupported-feature and recoverable-error states.
- Make all primary controls accessible by VoiceOver/TalkBack with labels, roles, focus order and adequate touch targets.
- Support Turkish and English from the start; use localization keys rather than embedding user-facing strings in protocol/UI logic.

## Phase 2 — First Verified Remote MVP

### TV Connection

- First-run explanation and just-in-time local-network permission flow.
- Discover compatible TVs using a verified method; show useful identity and avoid duplicate results.
- Manual IP address entry and connection check.
- Select/save/forget TVs, reconnect and clearly show connecting/connected/disconnected states.
- Validate malformed addresses, timeouts, unreachable hosts, permission denial and cancellation.

### Remote Control

Implement only command mappings verified for the target model/firmware:

- Directional navigation, OK, Back, Home, Menu and Info.
- Volume up/down, mute, channel up/down and numeric keypad.
- Play/pause, stop, rewind and fast forward if supported.
- Power only with an explicit confirmation and verified behavior.
- Prevent duplicate/stale taps and provide bounded timeouts. Retry only commands proven safe/idempotent.

### MVP acceptance

- A physical Android and iOS phone can discover or manually connect to the documented target TV on the same Wi-Fi.
- A small set of harmless commands works repeatedly and failures are visible to the user.
- Unsupported controls are not presented as working.
- No TV traffic is sent to a remote backend.

## Phase 3 — Channels and TV Guide

- Retrieve channel list only through a verified TV API or an explicitly approved/licensed provider.
- Show channel number/name and logos only when supplied with permission or otherwise properly licensed.
- Show current/next programs, timeline, current-time marker, channel/program search, favorites and program details only when reliable data is available.
- Handle time zones, daylight-saving changes, stale data and missing schedules.
- Never fabricate EPG data or scrape protected services without authorization.

## Phase 4 — Applications and Additional Controls

- Retrieve installed apps only if supported by the verified protocol.
- Launch apps using verified identifiers and handle unavailable apps.
- Add YouTube/Netflix shortcuts only after validating platform support and trademark/store asset rules.
- Add keyboard input, pointer/air-mouse and media sharing only after separate technical, permission, privacy and UX evaluation.

## Phase 5 — Hardening and Store Readiness

- Compatibility matrix and regression pass on every available supported model/firmware.
- Review privacy/data safety disclosures, privacy policy, support contact, screenshots, age rating and store metadata.
- Verify Apple App Store Review Guidelines and Google Play policies for local-network access, background behavior, permissions, branding and data collection at publication time.
- Produce signed Android AAB and iOS archive/TestFlight build; protect signing keys and credentials.
- Validate fresh install, upgrade, permission denial/regrant, offline network, router isolation, app background/foreground and device rotation/accessibility.
- Complete store listing and release only after the user explicitly approves publication.

## Out of Scope Unless Separately Decided

- Bypassing TV authentication or pairing.
- Exploiting TV security weaknesses.
- Cloud-based/public-internet remote control.
- Recording broadcast content.
- Claiming universal Toshiba compatibility.
- Redistributing proprietary TV assets or EPG data without rights.

---

# 3. Compatibility and Protocol Research

## 3.1 First Target: Toshiba / Vestel Smart Center

Official Toshiba Smart Center documentation describes requirements for compatible televisions, including same Wi-Fi network and Virtual Remote enabled. These conditions do not establish support for every TV model.

A community reverse-engineered Vestel/Toshiba protocol documents this candidate HTTP endpoint:

`http://<TV_IP>:56789/apps/SmartCenter`

Example request characteristics reported by that community reference:

- HTTP POST, port 56789.
- Header `application_name: vestel smart center`.
- Content type `application/xml`.
- XML command payload.

This is an experimental community reference, not an official or universal Toshiba API. Verify against the actual TV before implementation. Plain HTTP may expose commands on the LAN; document the threat model and do not send secrets over it.

Community sources disagree on body format (quoted vs unquoted key code), headers and path; a read-only `GET` on the same endpoint is reported to return DIAL status XML. See `docs/protocol-notes.md` for the source comparison and candidate codes, and record real-TV results in `docs/compatibility.md`.

Example XML shape only:

```xml
<?xml version="1.0" ?>
<remote>
  <key code="VERIFIED_CODE" />
</remote>
```

Do not guess command codes or assume response semantics. Use only codes verified from trustworthy protocol documentation, controlled testing or authorized packet capture. Do not automatically retry power commands or other non-idempotent operations.

### Required device research

1. Identify exact TV model and product code.
2. Identify chassis/platform, firmware and region.
3. Confirm Virtual Remote is enabled.
4. Confirm phone and TV share the same Wi-Fi/LAN.
5. Verify endpoint and discovery behavior on that specific set.
6. Test a harmless command and response/timeout behavior.
7. Record each verified command and its side effects.
8. Document tested model/firmware combinations and unsupported functions.

## 3.2 Future TV Platforms

Potential later adapters: other Vestel models, VIDAA, Android TV/Google TV and other Toshiba platforms. Each requires independent protocol, pairing/authentication, discovery and app-launch research. Do not infer compatibility from brand alone.

## 3.3 Protocol Abstraction

Keep network operations behind a platform-independent adapter. Evolve types as actual requirements are learned; the following is a design sketch, not a mandate to implement every optional method immediately:

```typescript
export type TvCapability =
  | 'power'
  | 'navigation'
  | 'volume'
  | 'mute'
  | 'channel'
  | 'numericKeypad'
  | 'mediaPlayback'
  | 'keyboard'
  | 'pointer'
  | 'channelList'
  | 'programGuide'
  | 'installedApps'
  | 'launchApp'
  | 'mediaShare';

export interface DiscoveredTv {
  id: string;
  name: string;
  ipAddress: string;
  port?: number;
  manufacturer?: string;
  model?: string;
  platform?: string;
  protocolId: string;
}

export interface TvConnection {
  tv: DiscoveredTv;
  connectedAt: number;
}

export interface TvAdapter {
  readonly id: string;
  discover(signal?: AbortSignal): Promise<DiscoveredTv[]>;
  connect(tv: DiscoveredTv, signal?: AbortSignal): Promise<TvConnection>;
  disconnect(): Promise<void>;
  getCapabilities(): ReadonlySet<TvCapability>;
  sendKey(key: RemoteKey, options?: { repeat?: boolean }): Promise<void>;
  getChannels?(): Promise<TvChannel[]>;
  getProgramGuide?(range: TimeRange): Promise<TvProgram[]>;
  getInstalledApps?(): Promise<TvApp[]>;
  launchApp?(appId: string): Promise<void>;
  getDeviceInfo?(): Promise<TvDeviceInfo>;
}
```

Keep protocol-specific parsing, HTTP transport and command mapping inside the adapter. UI components must not know XML, ports or vendor command codes. Map low-level errors into stable user-facing categories without exposing internal secrets.

---

# 4. Repository and Engineering Workflow

1. Read this guide and inspect the relevant existing files before making changes.
2. Preserve the existing Expo Router structure unless a concrete limitation justifies migration.
3. Prefer small, reviewable changes; update configuration and documentation when behavior changes.
4. Keep secrets, local device data and signing material out of source control.
5. Avoid adding dependencies without confirming Expo SDK 58 / React Native 0.88 compatibility and native iOS/Android support.
6. Do not use Expo Go as proof that native LAN features work; use development builds on physical devices.
7. For a feature, document its user flow, platform permissions, TV capability requirement, failure behavior and acceptance evidence.
8. Run validation appropriate to the change (typecheck/lint/build/device smoke test) and report exactly what ran. Do not claim a physical-TV test unless one occurred.
9. Keep compatibility claims and test evidence in a maintained project document as the matrix grows.
10. Do not publish, submit to stores, incur paid service costs or contact third parties without explicit authorization.

## Suggested Repository Areas (adapt to current structure)

- `src/app/`: Expo Router screens/routes.
- `src/features/`: Home, discovery, remote, guide, apps and settings flows.
- `src/domain/`: TV, channel, program, app and capability types.
- `src/protocols/`: adapter interface and verified platform implementations.
- `src/services/`: discovery, connection lifecycle and local persistence.
- `src/theme/` or `src/constants/`: shared design tokens.
- `docs/compatibility.md`: device/firmware test matrix and evidence.

Do not create this structure wholesale before reviewing the existing starter app and agreeing the first vertical slice.

---

# 5. Initial Plan to Review Before Implementation

1. **Inventory:** inspect current repository/routes/configuration and identify template code to replace.
2. **Device facts:** obtain target TV model/product code/chassis/firmware/region and verify the official Smart Center app can control it.
3. **Protocol spike:** research and validate discovery plus one harmless command on the physical TV; record evidence and platform permission constraints for Android and iOS.
4. **Architecture decision:** confirm Expo Development Build can support the verified transport/discovery needs; choose a native module only where necessary.
5. **UX foundation:** implement the five-tab/screen information architecture reflected in the references, using original visual assets and Turkish/English localization.
6. **Connection vertical slice:** permission explanation → discovery/manual IP → select TV → status/reconnect.
7. **Remote vertical slice:** implement only the first verified controls and power confirmation; test on both mobile platforms against the target TV.
8. **Guide/apps:** proceed only if verified APIs and lawful data sources exist; otherwise show clear unsupported/empty states.
9. **Personal-use hardening:** reliability, accessibility, diagnostics, privacy and compatibility matrix.
10. **Store preparation:** app identity/branding, privacy disclosures, support materials, signed builds and policy review; submit only after explicit release approval.

### Definition of Done for Each Feature

- Works on Android and iOS, or platform limitations are explicitly documented.
- Permission rationale and denial/recovery flow are complete.
- TV/protocol capability and compatibility evidence are recorded.
- Loading, empty, timeout, offline and error states are handled.
- Accessibility labels and localization are present.
- Appropriate checks were run and results reported accurately.
- No unsupported compatibility, EPG or app-launch claims are made.