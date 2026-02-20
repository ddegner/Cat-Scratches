# App Store Connect Submission Runbook (iOS + macOS)

Use this when a new version is already built and uploaded to App Store Connect and you want both platforms submitted with automatic release.

## Scope

1. Platform targets: `IOS` and `MAC_OS`
2. Release mode: `AFTER_APPROVAL` (automatic release)
3. API workflow: `reviewSubmissions` + `reviewSubmissionItems`

## Prerequisites

1. Upload both builds first (iOS and macOS) from Xcode Organizer or CLI export/upload flow.
2. Confirm both builds are `VALID` in App Store Connect.
3. Keychain entries exist:
   - `ASC_KEY_ID_CATSCRATCHES`
   - `ASC_ISSUER_ID_CATSCRATCHES`
   - `ASC_AUTHSTRING_2FCY9973VV`
4. Tools installed: `xcrun`, `curl`, `jq`, `rg`.

## Generate JWT token from Keychain

```bash
KEY_ID="$(security find-generic-password -a "$USER" -s ASC_KEY_ID_CATSCRATCHES -w)"
ISSUER_ID="$(security find-generic-password -a "$USER" -s ASC_ISSUER_ID_CATSCRATCHES -w)"
AUTH_STRING="$(security find-generic-password -a "$USER" -s ASC_AUTHSTRING_2FCY9973VV -w)"

TOKEN="$(
  xcrun altool --generate-jwt \
    --apiKey "$KEY_ID" \
    --apiIssuer "$ISSUER_ID" \
    --auth-string "$AUTH_STRING" 2>&1 \
    | rg -o '[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+' \
    | tail -n1
)"
```

## Required IDs per release

1. `APP_ID` (Cat Scratches app id): `6749605278`
2. `VERSION_STRING` (example): `2.1.1`
3. `IOS_BUILD_ID` and `MAC_BUILD_ID` for the uploaded builds
4. Optional: `WHATS_NEW_TEXT` for `en-US`

## API helper

```bash
api() {
  local method="$1"; shift
  local url="$1"; shift
  local data="${1:-}"
  if [ -n "$data" ]; then
    curl -sS -X "$method" "$url" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data"
  else
    curl -sS -X "$method" "$url" \
      -H "Authorization: Bearer $TOKEN"
  fi
}
```

## Submission flow

1. List current `appStoreVersions` for app and create missing `VERSION_STRING` records for `IOS` and `MAC_OS`.
2. Patch both appStoreVersions to `releaseType: AFTER_APPROVAL`.
3. Attach build relationships:
   - `PATCH /v1/appStoreVersions/{id}/relationships/build`
4. Set encryption flag on both builds:
   - `PATCH /v1/builds/{id}` with `usesNonExemptEncryption=false`
5. Ensure `en-US` localization exists and set `whatsNew`:
   - `GET /v1/appStoreVersions/{id}/appStoreVersionLocalizations`
   - `PATCH` or `POST` localization
6. Create review submissions (one per platform):
   - `POST /v1/reviewSubmissions` with relationship to app
7. Create review submission items:
   - `POST /v1/reviewSubmissionItems` with relationships:
     - `reviewSubmission`
     - `appStoreVersion`
8. Submit each review submission:
   - `PATCH /v1/reviewSubmissions/{id}` with `submitted=true`
9. Verify final state:
   - `GET /v1/appStoreVersions/{id}`
   - expected: `appStoreState = WAITING_FOR_REVIEW`
   - expected: `releaseType = AFTER_APPROVAL`

## Minimal endpoint reference

1. `GET /v1/apps/{appId}/appStoreVersions`
2. `POST /v1/appStoreVersions`
3. `PATCH /v1/appStoreVersions/{id}`
4. `PATCH /v1/appStoreVersions/{id}/relationships/build`
5. `PATCH /v1/builds/{id}`
6. `GET /v1/appStoreVersions/{id}/appStoreVersionLocalizations`
7. `POST /v1/appStoreVersionLocalizations`
8. `PATCH /v1/appStoreVersionLocalizations/{id}`
9. `POST /v1/reviewSubmissions`
10. `POST /v1/reviewSubmissionItems`
11. `PATCH /v1/reviewSubmissions/{id}` with `submitted=true`

## Notes

1. `appStoreVersionSubmissions` create is not used in this workflow.
2. If review item creation fails with encryption errors, patch `usesNonExemptEncryption` first, then retry.
3. Keep iOS and macOS versions aligned to the same `VERSION_STRING` and build number when possible.
