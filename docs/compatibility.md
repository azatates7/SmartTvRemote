# Compatibility Matrix

> Only results observed on real hardware go here. Research and candidate codes live in [`protocol-notes.md`](./protocol-notes.md).
> A feature counts as supported only for the exact model + firmware combination where it was tested.

## Supported devices

_None verified yet._

| TV model | Product code | Firmware | Region | Discovery | Verified commands | Last tested | Record |
|----------|--------------|----------|--------|-----------|-------------------|-------------|--------|

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
Tool:                            scripts/tv-probe.ps1 (commit: )

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