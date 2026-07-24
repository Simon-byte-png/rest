# Apple Rest Decision Handoff

Status: phase 1 protocol ready; Apple device and HTTPS staging verification
remain manual.  
Owner: W1 / P2

## Runtime matrix

| Request | Trigger | Continuous field | Estimated |
|---|---|---|---:|
| iOS App | `device_activity_threshold` | `estimated_continuous_app_usage_minutes` | true |
| Mac App | `macos_usage_checkpoint` | `continuous_app_usage_minutes` | false |
| Mac website | `macos_website_checkpoint` | `continuous_usage_minutes` | false |
| Legacy | legacy trigger, including deprecated `macos_rule` | `continuous_screen_minutes` | false |

`macos_rules` is not a Contract value. Current Apple code does not send
`macos_rule`.

The three current shapes normalize to one Provider context:

```text
source: platform + triggerSource + app|website
monitoredContext: user label + label source + hostname + privacy flags
usage: dailyMinutes + continuousMinutes + continuousIsEstimated
```

No raw App identity, full URL, URL path/query, search term, or page title is
available to the Provider.

## HTTP behavior

| Result | Behavior |
|---|---|
| `200`, `should_offer_rest=true` | Apple may notify or apply Shield according to local settings |
| `200`, `should_offer_rest=false` | Apple continues observing |
| `400` | malformed/unknown/mixed fields, unsafe privacy flag, or Header/body ID mismatch |
| `403` | supplied Demo Token is disabled or invalid |
| `409` | unsupported Contract version, or request ID reused with different content |
| `503` | Rest Decision Provider unavailable; body is ErrorResponse, never RestSuggestion |

The backend never activates Shield and never returns or changes the next
checkpoint.

An identical retry with the same `request_id` returns the stored compatible
decision. A different payload with that ID returns `409 INVALID_REQUEST` with
`details.reason=REQUEST_ID_REUSED`.

## Hostname rules

- trim, lowercase, and remove one leading `www.`;
- keep `m.` and every other subdomain distinct;
- reject scheme, path, query, fragment, userinfo, port, empty labels, and
  invalid DNS label syntax;
- `label_source=user` requires a non-empty user label;
- `label_source=domain` accepts an omitted or explicit-null user label.

## Configuration

Required/default server variables:

```text
HOST=127.0.0.1
PORT=3000
HUSH_DEMO_MODE=false
HUSH_DEMO_TOKEN=
HUSH_REST_DECISION_PROVIDER=canned
```

Use `HUSH_REST_DECISION_PROVIDER=unavailable` only to exercise the immediate
503 path. It does not call a network service.

Normal requests do not need a Demo Token. A request selects Demo only when:

```text
HUSH_DEMO_MODE=true
HUSH_DEMO_TOKEN=<at least 8 characters>
X-Hush-Demo-Token=<matching value>
```

No token selects Normal even while Demo is enabled. Current Swift checkpoint
code does not send the Demo header, so it uses Normal Canned in this phase.
Normal Canned and Demo Canned both return `X-Hush-Data-Origin: mock`.

## Start and health

With the repository-standard Node 20 and pnpm 9 toolchain:

```powershell
Set-Location .\server
$env:HOST = "127.0.0.1"
$env:PORT = "3000"
$env:HUSH_REST_DECISION_PROVIDER = "canned"
pnpm dev
```

Health:

```powershell
curl.exe -i http://127.0.0.1:3000/v1/health
```

For a temporary trusted-LAN protocol smoke:

```powershell
$env:HOST = "0.0.0.0"
pnpm dev
```

The address format is `http://<windows-lan-ipv4>:3000`. Allow only the chosen
TCP port on the Private Windows Firewall profile and remove the temporary
rule afterward. Do not change the default HOST.

The current Apple clients require an HTTPS origin, so their Base URL must be:

```text
https://<staging-host>
```

Do not append `/v1/rest/evaluate`; the clients append that path.  
HTTPS staging pending.

## curl examples

Run from the repository root. Each fixture's `request_id` matches its Header.
Omit `X-Hush-Demo-Token` for Normal.

### iOS App (Canned false)

```powershell
curl.exe -i -X POST http://127.0.0.1:3000/v1/rest/evaluate `
  -H "Content-Type: application/json" `
  -H "X-Request-ID: req_usage_ios_current_001" `
  -H "X-Client-Version: 1.0.0-smoke" `
  -H "X-Contract-Version: 1.0" `
  --data-binary "@contracts/fixtures/usage-summary-device-activity-ios.json"
```

### Mac App (Canned true)

```powershell
curl.exe -i -X POST http://127.0.0.1:3000/v1/rest/evaluate `
  -H "Content-Type: application/json" `
  -H "X-Request-ID: req_usage_macos_app_001" `
  -H "X-Client-Version: 1.0.0-smoke" `
  -H "X-Contract-Version: 1.0" `
  --data-binary "@contracts/fixtures/usage-summary-macos-app.json"
```

### Mac website

```powershell
curl.exe -i -X POST http://127.0.0.1:3000/v1/rest/evaluate `
  -H "Content-Type: application/json" `
  -H "X-Request-ID: req_usage_macos_website_user_001" `
  -H "X-Client-Version: 1.0.0-smoke" `
  -H "X-Contract-Version: 1.0" `
  --data-binary "@contracts/fixtures/usage-summary-macos-website-user-label.json"
```

### Demo

Add this header only when the server Demo variables match:

```powershell
-H "X-Hush-Demo-Token: <private-runtime-token>"
```

Never commit or print the runtime token.

### Provider unavailable (503)

Restart locally with:

```powershell
$env:HUSH_REST_DECISION_PROVIDER = "unavailable"
pnpm dev
```

Then repeat the iOS request. Expected: HTTP 503, the three response headers,
and an ErrorResponse whose `details.reason` is
`REST_DECISION_PROVIDER_UNAVAILABLE`; no `should_offer_rest` field.

## PowerShell smoke

Normal:

```powershell
.\scripts\smoke-apple-rest-decision.ps1 `
  -BaseUrl "http://127.0.0.1:3000" `
  -Mode Normal `
  -Payload All
```

Demo:

```powershell
.\scripts\smoke-apple-rest-decision.ps1 `
  -BaseUrl "http://127.0.0.1:3000" `
  -Mode Demo `
  -DemoToken "<private-runtime-token>" `
  -Payload All
```

The script prints status, request ID, decision, message, and data origin. It
validates `X-Request-ID`, `X-Contract-Version`, and
`X-Hush-Data-Origin`; any non-2xx response exits non-zero.

## Apple handoff

Set an HTTPS Base URL and keep the currently implemented headers:

```text
Content-Type: application/json
X-Request-ID: <same as body request_id>
X-Client-Version: 1.0.0
X-Contract-Version: 1.0
```

The current 5-second timeout is the integration budget. On timeout, 503, or
undecodable JSON, do not notify and do not apply Shield.

No confirmed Swift payload or response Codable field needs to change. The
current app cannot select Demo without a future Header-only change; a Demo
Token is not required for Normal.

Manual remaining checks:

1. deploy or provide the real HTTPS staging Base URL;
2. run `/v1/health` and all three checkpoint types against staging;
3. verify true, false, timeout, 503, and malformed-response behavior on a real
   iPhone and Mac;
4. confirm local notification/Shield policy remains entirely Apple-owned.
