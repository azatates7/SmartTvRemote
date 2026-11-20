# Compatibility Matrix

> Only results observed on real hardware go here. Research and candidate codes live in [`protocol-notes.md`](./protocol-notes.md).
> A feature counts as supported only for the exact model + firmware combination where it was tested.

## Supported devices

| TV model | Product code | Firmware | Region | Discovery | Verified commands | Last tested | Record |
|----------|--------------|----------|--------|-----------|-------------------|-------------|--------|
| Toshiba 50UL2163DT (Vestel MB180) | _TBD_ | _TBD_ | TR | Wi-Fi /24 scan: found; UDN at `:56790/dd.xml` | Keys (Format A); Netflix, Prime Video via DIAL | 2026-11-18 | TV-001 |

---

## Test records

Copy the template below once per test session. Do not edit old records; add new ones.

### Record template

```text
Record ID:        TV-001
Date:             YYYY-MM-DD
Tester:

-- TV (from Settings > System / About) --
Brand:
Model:
Product code:
Chassis / platform:
Software / firmware version:
Region / country setting:
Virtual Remote enabled:          yes / no
Official Smart Center app works: yes / no / not tried   (app version: )

-- Network --
Router / Wi-Fi band:
Same network as TV:              yes / no
Guest network or client isolation: yes / no / unknown
TV IP address:                   (local only, e.g. 192.168.1.x)

-- Client used for the test --
Device / OS:                     (e.g. Windows 11 PC, PowerShell 7.x)
Tool:                            scripts/tv-probe.ps1 / in-app Home > Check connection (commit: )

-- Results --
GET /apps/SmartCenter
  HTTP status:
  Response body (trim to essentials):
  TV state at the time:          on / standby

POST key tests (one row per attempt):
  | Key | Code | Body format | HTTP status | What the TV did | Side effects |
  |-----|------|-------------|-------------|-----------------|--------------|

-- Conclusions --
Working body format:
Required headers:
Unsupported / no reaction:
Limitations / notes:
```

---

### TV-001

```text
Record ID:        TV-001
Date:             2026-11-16
Tester:           project owner

-- TV --
Brand / Model / Product code / Firmware:  TBD (to be read from Settings > About)
Region / country setting:                 Turkey (assumed)
Virtual Remote enabled:                   yes

-- Network --
Same network as TV:  yes
TV IP address:       192.168.1.100

-- Client --
Device / OS:  Android phone, release APK (debug-signed)
Tool:         in-app Home > Check connection

-- Results --
GET /apps/SmartCenter
  HTTP status:  200
  Elapsed:      86 ms
  TV state:     on
  Response body:
    <?xml version="1.0" encoding="UTF-8"?>
    <service xmlns="urn:dial-multiscreen-org:schemas:dial" dialVer="2.2">
      <name>SmartCenter</name>
      <options allowStop="false"/>
      <state>running</state>
      <link rel="run" href="run"/>
      <additionalData></additionalData>
    </service>

POST key tests:   not yet run

-- Conclusions --
Smart Center DIAL service is present and running on this TV (DIAL 2.2).
Same-network discovery (/24 scan) found the TV.
Key body format, headers and key codes: still open (protocol-notes.md §7, questions 2–6).
```

#### TV-001 — follow-up 2026-11-18 (in-app diagnostics + manual tests)

```text
TV IP:            192.168.1.108 (DHCP; was .100 / .107 / .112 on earlier days)
Device description: GET :56790/dd.xml -> 200
  UDN:            uuid:00000000-0000-0000-0000-909877e434b0
  friendlyName:   TOSHIBA_50UL2163DT_2
  manufacturer:   VESTEL
  modelName:      MB180
  Application-URL: http://<TV_IP>:56789/apps/   (same base the app already uses)

Keys:             POST /apps/SmartCenter, body format A (unquoted) works:
                  <remote><key code=1016 /></remote>
                  Reported working by the tester; per-key list still to confirm
                  (Home 1046 vs 1048, OK vs channel list on 1053, exit, play, stop, digits).
                  Added 2026-11-18, not yet tested: menu 1066, source 1056, favorites 1062,
                  portal 1065, previous 1027, next 1028.

DIAL apps:        GET /apps/NoSuchApp_9f3k2 -> 404 (no catch-all)
                  Netflix            GET 200 (stopped)  POST 201 -> app opened
                  AmazonInstantVideo GET 200            POST 201 -> app opened
                  YouTube            GET 403 (TV refuses DIAL access)
                  TOD guesses, TV+ guesses -> 404

Open:             How the official app opens YouTube (likely a remote key code).
                  Channel list / guide endpoint.
```

#### TV-001 — official app capture 2026-11-18 (PCAPdroid, TV at 192.168.1.109)

```text
Key request:      POST /apps/SmartCenter
                  Content-Type: text/plain; charset=ISO-8859-1
                  <?xml version='1.0' ?><remote><key code='1048'/></remote>
                  -> 200 OK, Location: .../apps/SmartCenter/run
                  App switched to this body/Content-Type on 2026-11-19; retest needed.
SSDP:             M-SEARCH sent, no reply.
Port 7681:        HTTP, ~150 KB per app start; probably channel list (payload not yet seen).
```