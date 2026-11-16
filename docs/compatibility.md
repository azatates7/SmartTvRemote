# Compatibility Matrix

> Only results observed on real hardware go here. Research and candidate codes live in [`protocol-notes.md`](./protocol-notes.md).
> A feature counts as supported only for the exact model + firmware combination where it was tested.

## Supported devices

| TV model | Product code | Firmware | Region | Discovery | Verified commands | Last tested | Record |
|----------|--------------|----------|--------|-----------|-------------------|-------------|--------|
| _TBD_ | _TBD_ | _TBD_ | TR | Wi-Fi /24 scan: found | `GET` status only; no keys yet | 2026-11-16 | TV-001 |

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