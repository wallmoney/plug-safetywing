# SafetyWing Wall Money Plugin

SafetyWing is a Wall Money marketplace plugin for preparing nomad insurance orders from inside the portal.

The plugin lets a user choose a SafetyWing plan, review country availability, collect basic member details, and prefill a Wall Money transfer for the selected coverage. It keeps the order draft and latest payment status locally in the portal plugin storage.

## Plugin Metadata

- Plugin ID: `wallmoney-safetywing`
- Marketplace source: `wallmoney/plugin-safetywing`
- Version: `0.2.0`
- Entry: `default`
- Bundle: `bundle.js`
- Icon: `icon.svg`

## User Flow

The plugin is a guided step-by-step flow:

1. Select plan, age, and billing period.
   - Essential supports `4 weeks` and `364 days`.
   - Complete supports `monthly` and `yearly`, with a 12 month commitment.
   - Plan, age, billing, and region/add-ons are controlled with dropdowns.
2. Check country availability and stay limits.
   - The user searches for a country instead of scanning a long country list.
   - The United States, Hong Kong, and Singapore are called out where SafetyWing requires special/add-on coverage.
   - Opens the official SafetyWing country map when the user wants the full live list.
3. Enter account/member details.
   - The draft stores name, email, and residence country locally.
4. Pay with a prefilled Wall Money transfer.
   - The plugin sends a prefilled payment request to the portal.
   - When the portal records a completed payment and redirects back, the plugin shows a congratulations screen.
   - The active plan and coverage date can be shown in the portal info panel.

## Permissions

The plugin declares these user-facing permissions:

- Open official SafetyWing plan and country map links.
- Store the local SafetyWing order draft and payment status.
- Prefill Wall Money transfer details for the selected plan.

The plugin does not require direct access to balances, portfolio amounts, exchange rates, ramps, Fediverse profile, or the user's Core ID.

## Local State

The plugin stores its local draft under:

```text
insurance-state
```

Stored draft fields include:

- `step`
- `plan`
- `term`
- `age`
- `region`
- `countryQuery`
- `member.name`
- `member.email`
- `member.residence`
- `status`
- `planName`
- `activeUntil`
- `updatedAt`

## Portal Integration

The plugin uses the Wall Money plugin host APIs for:

- `storage.get` and `storage.set` to persist the local order draft.
- `ui.navigate` to open SafetyWing plan and map links.
- `payments.openPrefilledPayment` to prepare the Wall Money transfer.
- `events.onPaymentExecuted` to update the local status after payment events.

The info panel action opens:

```text
/marketplace/wallmoney/plugin-safetywing
```

## Files

```text
plugin.json  Plugin manifest consumed by Wall Money marketplace
bundle.js    Plugin runtime bundle and UI schema
icon.svg     Marketplace/plugin icon
README.md    This documentation
```

## Development Checks

Validate the manifest and bundle can load:

```sh
node -e "JSON.parse(require('fs').readFileSync('plugin.json','utf8')); require('./bundle.js'); console.log('plugin ok')"
```

Check whitespace in the repo:

```sh
git diff --check
```

## Current Limitations

- Pricing is encoded in `bundle.js` and should be reviewed when SafetyWing changes public pricing.
- Country availability in the plugin is a curated search sample; the official SafetyWing map remains the source of truth.
- Account details are stored as a local order draft until the real SafetyWing ordering API integration is connected.
- Payment is prepared through Wall Money as a prefilled transfer; final insurance fulfillment still depends on the external SafetyWing process/API.
