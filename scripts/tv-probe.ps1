<#
.SYNOPSIS
  Phase 0 probe for Toshiba / Vestel Smart Center TVs (see docs/protocol-notes.md).

.DESCRIPTION
  Sends ONE request per run to a TV on the local network and prints the raw result,
  so it can be copied into docs/compatibility.md.

  Safety rules (from AGENTS.md):
    - Local network only: the IP must be a private (RFC 1918) address.
    - Exactly one request per run, bounded timeout, never retried.
    - Power (1012) is blocked unless -AllowPower is given AND confirmed interactively.

.EXAMPLE
  # 1) Read-only check, no side effects on the TV
  .\scripts\tv-probe.ps1 -Ip 192.168.1.50

.EXAMPLE
  # 2) One harmless key: volume up, using the unquoted body format
  .\scripts\tv-probe.ps1 -Ip 192.168.1.50 -Key VolumeUp -Format Unquoted

.EXAMPLE
  # 3) Raw code test, e.g. resolving the Home 1046 / 1048 conflict
  .\scripts\tv-probe.ps1 -Ip 192.168.1.50 -Code 1046 -Format Unquoted
#>
[CmdletBinding(DefaultParameterSetName = 'Probe')]
param(
    [Parameter(Mandatory = $true)]
    [string]$Ip,

    [ValidateRange(1, 65535)]
    [int]$Port = 56789,

    [Parameter(ParameterSetName = 'Key', Mandatory = $true)]
    [ValidateSet('VolumeUp', 'VolumeDown', 'Mute')]
    [string]$Key,

    [Parameter(ParameterSetName = 'Code', Mandatory = $true)]
    [ValidateRange(1000, 1099)]
    [int]$Code,

    [Parameter(ParameterSetName = 'Key')]
    [Parameter(ParameterSetName = 'Code')]
    [ValidateSet('Unquoted', 'DoubleQuoted', 'SingleQuoted')]
    [string]$Format = 'Unquoted',

    [Parameter(ParameterSetName = 'Code')]
    [switch]$AllowPower,

    [ValidateRange(1, 10)]
    [int]$TimeoutSec = 3
)

$ErrorActionPreference = 'Stop'

# --- Local-network guard -------------------------------------------------------
$parsed = $null
if (-not [System.Net.IPAddress]::TryParse($Ip, [ref]$parsed) -or
    $parsed.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) {
    throw "Invalid IPv4 address: '$Ip'"
}
$b = $parsed.GetAddressBytes()
$isPrivate = ($b[0] -eq 10) -or
             ($b[0] -eq 172 -and $b[1] -ge 16 -and $b[1] -le 31) -or
             ($b[0] -eq 192 -and $b[1] -eq 168)
if (-not $isPrivate) {
    throw "Refusing non-private address '$Ip'. TV control must stay on the local network."
}

$url = "http://${Ip}:${Port}/apps/SmartCenter"

# --- Build request -------------------------------------------------------------
$keyCodes = @{ VolumeUp = 1016; VolumeDown = 1017; Mute = 1013 }   # unverified, see protocol-notes.md

if ($PSCmdlet.ParameterSetName -eq 'Probe') {
    $method = 'GET'
    $body = $null
}
else {
    $keyCode = if ($PSCmdlet.ParameterSetName -eq 'Key') { $keyCodes[$Key] } else { $Code }

    if ($keyCode -eq 1012) {
        if (-not $AllowPower) {
            throw 'Code 1012 (Power) is blocked. Re-run with -AllowPower if you really want to test it.'
        }
        $answer = Read-Host 'This toggles TV power. Type POWER to send it once'
        if ($answer -cne 'POWER') { Write-Host 'Cancelled.'; exit 1 }
    }

    $method = 'POST'
    $body = switch ($Format) {
        'Unquoted'     { "<remote><key code=$keyCode /></remote>" }
        'DoubleQuoted' { "<?xml version=`"1.0`" ?><remote><key code=`"$keyCode`"/></remote>" }
        'SingleQuoted' { "<?xml version='1.0' ?><remote><key code='$keyCode'/></remote>" }
    }
}

# --- Send exactly once ---------------------------------------------------------
Write-Host "Date      : $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))"
Write-Host "Request   : $method $url"
if ($body) { Write-Host "Body      : $body" }

$params = @{
    Uri              = $url
    Method           = $method
    TimeoutSec       = $TimeoutSec
    DisableKeepAlive = $true
    UseBasicParsing  = $true
}
if ($body) {
    $params.Body = $body
    $params.ContentType = 'application/xml'
}

$sw = [System.Diagnostics.Stopwatch]::StartNew()
try {
    $resp = Invoke-WebRequest @params
    $sw.Stop()
    Write-Host "HTTP      : $([int]$resp.StatusCode)"
    Write-Host "Elapsed   : $($sw.ElapsedMilliseconds) ms"
    Write-Host 'Response  :'
    Write-Output $resp.Content
}
catch {
    $sw.Stop()
    $status = $null
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    Write-Host "Elapsed   : $($sw.ElapsedMilliseconds) ms"
    if ($status) {
        Write-Host "HTTP      : $status (error status)"
    }
    else {
        Write-Host "No HTTP response: $($_.Exception.Message)"
        Write-Host 'Check: TV is on, Virtual Remote is enabled, same Wi-Fi, correct IP, no client isolation.'
    }
    exit 2
}