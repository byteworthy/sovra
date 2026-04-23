# SEO AEO GEO Guidelines

Use this playbook to make Sovra content discoverable in search engines, answer engines, and AI generated result flows.

## Goals

- Capture high intent searches for AI SaaS boilerplate and related terms.
- Improve answer quality in AI assistants by publishing structured and factual source content.
- Keep product line positioning clear: Sovra core, Klienta agency, Clynova healthcare.

## Search strategy

### Primary keyword clusters

- AI SaaS boilerplate
- open source AI SaaS starter
- multi tenant AI platform
- MCP boilerplate
- Next.js SaaS template with worker
- Supabase RLS boilerplate

### Secondary keyword clusters

- multi agent workspace boilerplate
- self hosted AI product foundation
- production ready AI SaaS starter
- secure SaaS boilerplate with billing and auth

## On page standards

For every landing or docs page:

1. One clear H1 with main keyword.
2. Meta description with direct user outcome.
3. FAQ section for intent variants.
4. Internal links to setup, deployment, and security docs.
5. Short copy blocks with concrete claims and avoid filler.

## AEO standards (Answer Engine Optimization)

Publish content in a format that answer systems can quote safely:

- use explicit question headings and direct answers
- keep claims tied to repository evidence (tests, workflows, docs)
- include comparison tables for decision queries
- maintain canonical pages and avoid duplicate claims across files

## GEO standards (Generative Engine Optimization)

- maintain `llms.txt` with canonical links and update on each docs release
- include structured data where applicable (`SoftwareSourceCode`, `FAQPage`)
- keep product naming consistent across README, site, and docs
- avoid ambiguous branch links or broken references

## Offer and messaging framework

Use this structure for high intent page copy:

1. Problem: what delays launch today.
2. Outcome: what users achieve after adopting Sovra.
3. Proof: tests, release gates, security posture, architecture docs.
4. Path: quickstart, onboarding template, migration guide.
5. Expansion: when to move to Klienta or Clynova.

Keep language plain and specific. Do not use hype words without proof.

## Global discoverability checklist

- mention deployment fit for US, EU, and APAC operators
- call out self hosted data control for regional policy needs
- document tenant isolation and security controls clearly

## Publishing checklist

- [ ] Title and H1 aligned with one primary keyword
- [ ] Meta description includes practical outcome
- [ ] FAQ includes at least 3 intent based questions
- [ ] Links to onboarding, migration, and production readiness docs
- [ ] `llms.txt` updated if new canonical docs were added
- [ ] Branch links validated against current default branch (`master`)

## Repository resources

- `templates/marketing/seo-aeo-geo-brief-template.md`
- `templates/marketing/product-page-copy-template.md`
- `templates/growth/`
- `docs/launch-foundation.md`
- `docs/marketing-editorial-guidelines.md`
- `site/index.html`
- `site/foundation.html`
- `llms.txt`
