# Open-Source Packaging and Licensing

This document defines how Sovra OSS and paid ByteWorthy boilerplates fit together.

## Product packaging model

| Product | Distribution | License | Positioning |
|---|---|---|---|
| Sovra | Public GitHub repo | MIT | Open core platform for multi-tenant AI SaaS |
| Klienta | Commercial distribution | Commercial | Agency-focused vertical built on Sovra |
| Clynova | Commercial distribution | Commercial | Healthcare-focused vertical built on Sovra |

## What MIT covers in Sovra

MIT license in this repo allows:

- commercial and personal use
- modification and redistribution
- private/self-hosted deployment

MIT does not grant:

- rights to proprietary code in separate paid products
- rights to protected marks/branding in other products

## Boundaries between OSS and paid verticals

Sovra should remain fully usable as a standalone foundation.

Paid verticals should:

- extend Sovra with domain modules
- avoid breaking Sovra core contracts
- document added data models and migration steps

## Compatibility contract

To keep upgrade paths stable:

1. Preserve core identifiers (`tenant_id`, `user_id`) across variants.
2. Keep API key and auth semantics consistent.
3. Ship additive schema changes where possible.
4. Document every breaking change in `CHANGELOG.md`.

## Release and upgrade channels

- Sovra OSS: GitHub tags/releases, public changelog.
- Paid verticals: managed release notes and migration packs.

Recommended process:

1. Validate changes in Sovra first.
2. Promote stable core changes to vertical products.
3. Publish migration guidance for each vertical release.

## Security baseline requirements

All packaged variants should inherit:

- least-privilege CI token permissions
- pinned Actions and base images
- code scanning and dependency scanning
- production release gates (`release-readiness`, `security`, `ci`)
