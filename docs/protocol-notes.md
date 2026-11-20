# Protocol Notes — Toshiba / Vestel Smart Center

> Status: **research only, nothing verified on a real TV yet.**
> Every code, path and header below comes from community sources (reverse engineering / hobby projects).
> Nothing here may be used in app code until it is confirmed on the target TV and recorded in [`compatibility.md`](./compatibility.md).

Last reviewed: 2026-11-13

## 1. Official information

Official sources (the Toshiba TV Smart Center store listing, by Vestel Elektronik) only list user-side requirements:

- TV connected to the internet
- "Virtual Remote" turned on in the TV settings
- Phone on the same Wi-Fi network as the TV

No official public API, port or command list was found.

## 2. Community sources reviewed

| ID | Source | What it does |
|----|--------|--------------|
| S1 | [ha-vestel-toshiba-tv](https://github.com/mutlutekir/ha-vestel-toshiba-tv) (Home Assistant integration, 2026) | `GET`/`POST http://<ip>:56789/apps/SmartCenter` |
| S2 | [pyvesteltv](https://github.com/T3m3z/pyvesteltv) (Python library, older) | SSDP/DIAL discovery → `POST <Application-URL>vr/remote` |
| S3 | [Bash gist using wget](https://gist.github.com/b04f47b2fa81ca77b04884d01ab3fb65) | `POST http://<ip>:56789/apps/SmartCenter` |
| S4 | [shkspr.mobi — Telnet control of Toshiba Smart TVs](https://shkspr.mobi/blog/2018/11/telnet-control-of-toshiba-smart-tvs/) | Key codes decompiled from the official Android app |

## 3. Candidate endpoint

`http://<TV_IP>:56789/apps/SmartCenter`

- **`GET`** (S1): returns DIAL application-status XML (namespace `urn:dial-multiscreen-org:schemas:dial`, `<name>` and `<state>` elements). This is a **read-only probe with no side effects**, so it is the safe first test and the candidate for "connection check".
- **`POST`** (S1, S3): sends a key as an XML body.

### Where the sources disagree (must be resolved by testing)

| Topic | S1 | S2 | S3 | Note |
|-------|----|----|----|------|
| Path | `/apps/SmartCenter` | `<DIAL Application-URL>vr/remote` | `/apps/SmartCenter` | Two different endpoints exist in the wild |
| Body | `<remote><key code=1016 /></remote>` (**unquoted**, no XML declaration) | `<?xml version="1.0" ?><remote><key code="1016"/></remote>` | same as S2 with single quotes | S1 says the TV "does not like quotes"; S2/S3 use quotes |
| Content-Type | `application/xml` | not set | `text/plain; charset=ISO-8859-1` | — |
| Connection | `close` (S1 says the TV's server can hang otherwise) | default | `keep-alive` | Prefer `close` until proven otherwise |
| `application_name` header | not used | not used | not used | AGENTS.md §3.1 mentions it; no reviewed source uses it |

**Resolved by capture (TV-001, 2026-11-18, PCAPdroid on the official Android app):** the official app sends the S3 form.

```text
POST /apps/SmartCenter HTTP/1.1
application_name: toshiba smart center
Content-Type: text/plain; charset=ISO-8859-1
Connection: Keep-Alive
Content-Length: 57

<?xml version='1.0' ?><remote><key code='1048'/></remote>

HTTP/1.1 200 OK
Content-Type: text/plain
Location: http://<TV_IP>:56789/apps/SmartCenter/run
```

- The app now sends this body and Content-Type. It keeps `Connection: close` and does not send
  `application_name` (the unquoted form worked without it, and the header carries a vendor name).
- Each key is a new TCP connection in the capture, so `close` costs nothing.
- Other traffic from the official app in the same capture:
  - SSDP M-SEARCH to 239.255.255.250:1900 every time it opens; **no reply received** (0 bytes).
  - ICMP ping to the TV every 5 s (reachability check).
  - **TCP 7681 on the TV**, plain HTTP, ~150 KB received each time the app opens, open 10–40 s.
    Port 7681 is a common WebSocket port; likely the channel list / guide. Payload not captured yet.
  - Cloud: `epgimg.s3.eu-west-1.amazonaws.com` (channel logos) and
    `top-tv-channels-endpoint-…run.app` (HTTPS). Out of scope: the app is local-network only.

## 4. Candidate key codes (unverified)

| Key | Code | Sources | Notes |
|-----|------|---------|-------|
| 0–9 | 1000–1009 | S1 | S3 builds channel numbers from digits too |
| Back | 1010 | S1 | |
| Power (toggle) | 1012 | S1, S2, S3, S4 | **Disruptive.** Confirmation required, never auto-retry. May not wake a TV whose Wi-Fi is off in standby (reported for one Vestel set) |
| Mute (toggle) | 1013 | S1, S2, S3 | |
| Volume + | 1016 | S1, S2, S3 | Good harmless first test |
| Volume − | 1017 | S1, S2, S3 | |
| Down | 1019 | S1 | |
| Up | 1020 | S1 | |
| Left | 1021 | S1 | |
| Right | 1022 | S1 | |
| Play | 1025 | S1 | |
| Previous track | 1027 | S2 | |
| Next track | 1028 | S2 | |
| Channel + | 1032 | S1, S2, S3 | |
| Channel − | 1033 | S1, S2, S3 | |
| Exit | 1037 | S1 | |
| Home | **1046 or 1048** | S4: 1046, S1: 1048 | **Conflict.** Test both |
| Stop | 1049 | S1 | |
| OK | 1053 | S1 | S1 also maps "channel list" to 1053, so one of them is likely wrong |
| Source | 1056 | S1, S2 | |
| Favorites | 1062 | S1 | |
| Internet / portal | 1065 | S1 | |
| Menu | 1066 | S1 | |

Codes confirmed by **three or more independent sources**: 1012, 1013, 1016, 1017, 1032, 1033.

## 5. Discovery options

| Option | How | Mobile cost |
|--------|-----|-------------|
| A. Manual IP | User enters IP; app sends `GET /apps/SmartCenter` | No special native module. Needs local-network permission (iOS) and cleartext HTTP allowed |
| B. Subnet probe | Send `GET :56789/apps/SmartCenter` with a short timeout to each host in the phone's /24 subnet (S1 does this) | Needs the phone's own IP (e.g. `expo-network`). No multicast, so no iOS multicast entitlement. About 254 short requests per scan |
| C. SSDP / DIAL | UDP multicast `M-SEARCH` to `239.255.255.250:1900`, `ST: urn:dial-multiscreen-org:service:dial:1` (S2) | Needs a native UDP module, and on iOS the restricted multicast entitlement (requires Apple approval) |

**Status (2026-11-15):** B is implemented as the primary flow (`src/protocols/smart-center/discover.ts`, /24 only, 32 parallel probes, 1.2 s timeout each); A remains as a fallback. Neither is verified on a real TV yet.

**Original proposal:** A first, then B. Defer C unless A and B prove insufficient. This matches the AGENTS.md guidance to prefer discovery that avoids restricted multicast.

## 5b. App launching via DIAL (verified on TV-001, 2026-11-18)

Results: Netflix and `AmazonInstantVideo` launch (POST → 201). YouTube answers **403** (the TV refuses
DIAL access; the app does not try to bypass this). Unknown names answer 404, so there is no catch-all.
The device description's `Application-URL` is `http://<TV_IP>:56789/apps/`, the base already used.

Original notes:

TV-001 answers as a **DIAL 2.2** server (`/apps/SmartCenter`), so standard DIAL REST should apply to other apps:

- `GET /apps/<name>` → status XML (`<state>running|stopped</state>`), `404` if the app is not available. Read-only.
- `POST /apps/<name>` (empty `text/plain` body) → launches the app, `201 Created` expected.
- Names tried by the app (public DIAL registry): `YouTube`, `Netflix`, `AmazonInstantVideo` (Prime Video).
- TOD: no public DIAL name found; the app tries `TOD`, `TODTV`, `TOD_TV`, `tod` in order (GET only) and launches with the first that answers 200. TV+ and other local apps: names must be found on the TV before adding them.
- Implementation: `src/protocols/smart-center/dial-apps.ts`. Paths are restricted to `/apps/[A-Za-z0-9._-]{1,64}`.

**YouTube (TV-001, 2026-11-20):** DIAL `GET /apps/YouTube` answers 403, but remote key **1062** opens
YouTube. `DIAL_APPS` gives YouTube `launchKey: 'youtube'`: when DIAL answers 403 the app is listed as
available and launched with that key. On a TV where the key does something else this would be wrong,
so it only applies when the TV reports YouTube (403), never on 404.

## 5c. Device identity (location verified on TV-001, 2026-11-18: `:56790/dd.xml`)

DHCP can give the TV a new IP after a restart, so the IP is not an identity.
UPnP/DIAL device descriptions carry a stable `<UDN>` (`uuid:…`) plus `friendlyName` / `modelName`.

- The description URL is normally announced via SSDP `LOCATION` (UDP), which the app does not use.
  `src/protocols/smart-center/device-info.ts` tries `:56790/dd.xml`, `:56789/dd.xml`,
  `:56790/description.xml`, `:56790/` (GET only) and keeps the first response with a valid UDN.
- `scripts/tv-explore.py <TV_IP>` (Python, stdlib) sends one SSDP M-SEARCH and prints the real
  `LOCATION` and description; use it to correct the candidate list.
- Rules (`src/domain/saved-tvs.ts`): same UDN → update address, never a second entry; a saved TV with
  a different UDN at the same IP has a stale address; records without UDN gain one on the next
  successful connection.
- On connect, if the TV does not answer at its saved address and its UDN is known, the app scans
  the /24 network for the same UDN and reconnects at the new address.
- Without a UDN the app cannot tell TVs apart; the discovery panel then asks the user
  ("This is the new address of …"). A DHCP reservation in the router avoids the problem entirely.

## 6. Platform transport implications

- Traffic is **plain HTTP**. Configured in `app.json` (2026-11-15), verified with `expo prebuild` output only (not yet on a device):
  - **Android 9+** blocks cleartext HTTP by default in release builds → `expo-build-properties` `android.usesCleartextTraffic: true`.
    Android's network security config cannot scope cleartext to IP ranges, so the allowance is app-wide.
    Mitigation: the app only ever contacts private IPv4 addresses (`src/domain/ip-address.ts`).
  - **iOS** App Transport Security blocks plain HTTP by default → `NSAppTransportSecurity.NSAllowsLocalNetworking: true` (local addresses only).
  - **iOS 14+** local network permission prompt → `NSLocalNetworkUsageDescription` (English in `app.json`, Turkish in `locales/tr.json`).
  - Not added yet: `NSBonjourServices` and the multicast entitlement. Neither is needed for manual IP or subnet probing (§5 options A/B).
- **Threat model:** any device on the same LAN can send the same commands. The protocol shows no authentication in any reviewed source. Never send secrets over it.
- A React Native `fetch` with an `AbortController` timeout should be enough for transport, so no native module is expected for options A/B. Confirm this on a device.

## 7. Open questions for the Phase 0 test

1. Does `GET /apps/SmartCenter` answer on the target TV? What is the exact XML?
2. Which POST body format does the TV accept: quoted, unquoted, or both?
3. Is any header required (`Content-Type`, `application_name`)?
4. What HTTP status comes back for a valid key, an invalid key, and when the TV is in standby?
5. Home: 1046 or 1048? OK vs channel list: what does 1053 actually do?
6. Does the server hang with keep-alive connections?
7. Does the endpoint respond while the TV is in standby? Does Power wake it?