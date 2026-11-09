# AGENTS.md — Smart TV Remote

> Project guide for AI coding agents and developers working in this repository.
> Product goal: Build a React Native application inspired by Toshiba Smart Center.
> Initial target: Vestel-platform televisions compatible with local network control.
> This is an independent project and is not affiliated with Toshiba or Vestel.

---

## Confirmed Project Decisions (2026-11-09)

- First target platform: Android.
- First TV ecosystem: Vestel-platform televisions, including compatible Toshiba models.
- Product intent: Personal use first, with a future Google Play release.
- Exact TV model and firmware: Not yet known.
- Development environment: Windows + VS Code + Android Studio.
- Mobile framework: React Native + TypeScript.
- Initial runtime: Expo Development Build, subject to native networking validation.
- Backend: Not required for the initial release.
- Network: Local Wi-Fi.
- Architecture: Adapter-based, extensible for future TV brands.

### Environment Requirements

- Node.js 22.11 or newer.
- JDK 17.
- Android Studio.
- Android SDK.
- Android SDK Build Tools.
- Android Emulator.
- Android Platform Tools.
- Git.
- Visual Studio Code.

### Android Environment Variables

ANDROID_HOME:

%LOCALAPPDATA%\Android\Sdk

Add the following to Windows PATH:

%LOCALAPPDATA%\Android\Sdk\platform-tools

### Android Local Network Permissions

Android 17 (API 37) and later introduces local network
permissions for applications targeting the relevant SDK level.

Evaluate ACCESS_LOCAL_NETWORK and the current Android
permission requirements before implementing TV discovery.

Do not blindly reuse outdated Android permission configurations.

Use a physical Android phone for local network testing.
An emulator is suitable for UI development but is not
a replacement for physical-device Wi-Fi testing.

---

# 1. Mission and Product Principles

Build a reliable mobile remote-control application for Android.

The application should allow users to:

- Discover compatible televisions on the local network.
- Connect to a selected television.
- Control supported TV functions.
- Browse available channels and program information.
- Launch supported TV applications.
- Manage favorite channels and TV devices.

### Non-negotiable Principles

1. Verify compatibility before claiming support.
2. Keep TV communication local.
3. Use capability-aware UI.
4. Never invent TV APIs or command codes.
5. Require intentional interaction for power operations.
6. Explain local network permissions.
7. Store credentials securely.
8. Use TypeScript strict mode.
9. Keep communication protocols separate from UI.
10. Test features on real hardware.

Toshiba is a brand, not a single universal TV platform.

Model year, chassis, firmware, operating system and
region can change the available communication protocol.

---

# 2. Product Scope

## 2.1 MVP — First Usable Release

### TV Connection

- First-run welcome screen.
- Local network permission explanation.
- Discover compatible TVs.
- Display discovered TV information.
- Manual IP address entry.
- Connect to selected TV.
- Save selected TV locally.
- Reconnect functionality.
- Connection status indicators.

### Remote Control

- Directional navigation.
- OK button.
- Back.
- Home.
- Menu.
- Info.
- Volume up/down.
- Mute.
- Channel up/down.
- Numeric keypad.
- Play/pause.
- Stop.
- Rewind.
- Fast forward.
- Power control with confirmation.

Only implement commands verified against the target TV.

### Application Screens

- Home.
- TV Guide.
- Remote Control.
- Applications.
- Settings.

### Settings

- Selected TV.
- TV model and IP.
- Connection status.
- Saved TVs.
- Forget TV.
- Language.
- Application information.
- Diagnostics.

## 2.2 Phase 2 — TV Guide

- Retrieve channel list when supported.
- Display channel number and name.
- Display channel logos when available.
- Display current and next program.
- Program timeline.
- Current-time indicator.
- Channel search.
- Program search.
- Favorite channels.
- Program details.

EPG data must come from a verified TV API or
a separately approved and licensed data provider.

Never display fabricated program schedules.

## 2.3 Phase 3 — Applications

- Retrieve installed applications when supported.
- Display installed applications.
- Launch applications using verified identifiers.
- YouTube shortcut when supported.
- Netflix shortcut when supported.
- Configurable application shortcuts.
- Keyboard input when supported.
- Pointer control when supported.
- Media sharing after separate technical evaluation.

## 2.4 Out of Scope

Unless separately approved:

- Bypassing TV authentication.
- Exploiting TV security weaknesses.
- Cloud-based remote control.
- Public internet TV control.
- Recording broadcast content.
- Claiming universal Toshiba compatibility.
- Redistributing proprietary TV assets.

---

# 3. Compatibility and Protocol Research

## 3.1 First Target: Toshiba / Vestel Smart Center

Official Toshiba Smart Center documentation describes
the requirements for compatible televisions:

- TV and phone must be on the same Wi-Fi network.
- Virtual Remote must be enabled on the TV.
- The television must support the required functionality.

A community reverse-engineered Vestel/Toshiba protocol
documents the following HTTP endpoint:

http://<TV_IP>:56789/apps/SmartCenter

Example request characteristics:

HTTP Method: POST

Port: 56789

Header:

application_name: vestel smart center

Content-Type: application/xml

The protocol uses XML command payloads.

This is an experimental community protocol reference,
not an official universal Toshiba API.

### Required Research

Before implementation:

1. Identify exact TV model.
2. Identify product code.
3. Identify chassis/platform.
4. Identify firmware version.
5. Confirm Virtual Remote is enabled.
6. Confirm same Wi-Fi network.
7. Verify the TV communication endpoint.
8. Test a harmless remote command.
9. Verify response behavior.
10. Document tested model and firmware combinations.

Example XML structure:

<?xml version='1.0' ?>
<remote>
    <key code='XXXX'/>
</remote>

IMPORTANT:

Do not guess the command code represented by XXXX.

Only use command codes verified through protocol
documentation, controlled tests or authorized packet capture.

Do not automatically retry power commands or other
non-idempotent operations.

## 3.2 Future TV Platforms

The architecture must allow future adapters.

Potential platforms:

- Vestel.
- VIDAA.
- Android TV.
- Google TV.
- Other Toshiba platforms.

VIDAA may use MQTT-based communication and pairing.

Android TV and Google TV require separate protocol
and authentication research.

Do not assume all platforms use the same API.

## 3.3 Protocol Abstraction

Create a platform-independent TV adapter interface.

Example:

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

  discover(signal?: AbortSignal):
    Promise<DiscoveredTv[]>;

  connect(
    tv: DiscoveredTv,
    signal?: AbortSignal
  ): Promise<TvConnection>;

  disconnect(): Promise<void>;

  getCapabilities():
    ReadonlySet<TvCapability>;

  sendKey(
    key: RemoteKey,
    options?: { repeat?: boolean }
  ): Promise<void>;

  getChannels?(): Promise<TvChannel[]>;

  getProgramGuide?(
    range: TimeRange
  ): Promise<TvProgram[]>;

  getInstalledApps?(): Promise<TvApp[]>;

  launchApp?(appId: string): Promise<void>;

  getDeviceInfo?(): Promise<TvDeviceInfo>;
}