# hmpps-probation-frontend-component-api

[![repo standards badge](https://img.shields.io/endpoint?labelColor=231f20&color=005ea5&style=flat&label=MoJ%20Compliant&url=https%3A%2F%2Foperations-engineering-reports-prod.cloud-platform.service.justice.gov.uk%2Fapi%2Fv1%2Fcompliant_public_repositories%2Fendpoint%2Fhmpps-probation-frontend-component-api&logo=data:image/png;base64,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)](https://operations-engineering-reports-prod.cloud-platform.service.justice.gov.uk/public-report/hmpps-probation-frontend-component-api)
[![Docker Repository on ghcr](https://img.shields.io/badge/ghcr.io-repository-2496ED.svg?logo=docker)](https://ghcr.io/ministryofjustice/hmpps-probation-frontend-component-api)

Shared Probation Digital Services (PDS) header, footer and policy pages for HMPPS probation applications.

Other services fetch HTML (plus CSS and JS URLs) from this API and inject them into their own layouts, so navigation and legal content stay consistent. This repo also hosts the markdown for cookies, privacy and accessibility pages, and a local CMS so you can edit those documents without fighting git diffs.

## What it provides

Two ways to consume components:

| Path | Who it is for | Auth | Response |
| --- | --- | --- | --- |
| `/api/components` | Other applications (via the [NPM package](https://www.npmjs.com/package/@ministryofjustice/hmpps-probation-frontend-components) or a direct HTTP call) | User token on the `x-user-token` header | JSON with stringified HTML, CSS and JS |
| `/{component}` e.g. `/header`, `/footer` | Local development and visual checks | HMPPS Auth (same as other probation apps) | Full HTML page with assets |

Request one or more components: `/api/components?component=header` or `/api/components?component=header&component=footer`.

Available components: **PDS header** and **PDS footer**.

Markdown under `content/` is rendered as GOV.UK-styled pages (index, cookies, privacy, per-service accessibility statements). Routes are registered in `server/routes/contentRoutes.ts`; the file `content/cookies-policy.md` is served at `/cookies-policy`.

## Architecture (local)

`make dev-up` starts:

- **app** — this Express/Nunjucks service (default `http://localhost:3001`)
- **hmpps-auth** and **hmpps-auth-proxy** — login and token issuance
- **redis** — session store and template cache
- **delius** — WireMock stubs used by Auth in local/dev
- **editor** — [Flatnotes](https://github.com/dullage/flatnotes) CMS bound to the `content/` folder

The NPM package (or a consuming app) calls `/api/components`. Browsers hitting this service for preview or policy pages go through HMPPS Auth like any other probation UI.

## Run locally

You need Docker and NPM.

```bash
cp .env.example .env   # if you do not already have .env
docker compose -f docker-compose.deps.yml up -d --build
npm ci
npm run start:dev
```

Wait until the `app` healthcheck passes. Then:

| What | URL |
| --- | --- |
| This service | http://localhost:3001 |
| Swagger | http://localhost:3001/swagger |
| Header / footer preview | http://localhost:3001/header and `/footer` |
| Local CMS (Flatnotes) | http://localhost:9080 |
| HMPPS Auth (via proxy) | http://localhost:9091/auth |

Sign in with local Auth users:

| username          | Password | Associated Roles |
| :---------------- | :------: | ----: |
| Pbernard.beaks    |   secret | "LICENCE_ACO", "PROBATION", "MAKE_RECALL_DECISION_SPO" |
| gerard.mason      |   secret | "LICENCE_ACO", "LICENCE_CA", "LICENCE_DM", "MAKE_RECALL_DECISION", "MAKE_RECALL_DECISION_PPCS", "MAKE_RECALL_DECISION_SPO", "MANAGE_A_WORKFORCE_ALLOCATE", "MANAGE_SUPERVISIONS", "MARD_DUTY_MANAGER", "MARD_RESIDENT_WORKER", "PREPARE_A_CASE", "LICENCE_READONLY", "LICENCE_RO", "NOMIS_BATCHLOAD", "WORKLOAD_MEASUREMENT" |
| jean-luc.picard   |   secret | "ACCREDITED_PROGRAMME_COMMUNITY_PROGRAMME_TEAM" |
| `<username>` |  `<password>`   | `<roles>` |


Stop everything with `docker compose down -v` to tear down all project containers.

### Useful Commands

| Command | What it does |
| --- | --- |
| `docker compose up -d --build` | Build and start the stack in development mode |
| `docker compose -f docker-compose.deps.yml up -d --build` | start application dependencies only |
| `docker compose down -v` | Stop the development stack |
| `npm run test` | Unit tests inside the app container |
| `npm run lint` / `npm run lint-fix` | ESLint |
| `npm run clean` | Stop containers and delete `dist`, `node_modules`, `test_results` |

See [readme/building_and_running.md](readme/building_and_running.md) for the same commands in more detail.

### Run fully within Docker Compose

```bash
docker compose up -d --build
```

## Edit documents in the local CMS

Policy and accessibility copy lives as markdown in `content/`. The **editor** container (Flatnotes) mounts that directory so you can edit in a browser.

1. Start the stack (`docker compose up -d --build`).
2. Open **http://localhost:9080**. Auth is off locally (`FLATNOTES_AUTH_TYPE=none` in `docker-compose.deps.yml`).
3. Open an existing note (for example `cookies-policy` or files under `accessibility/`).
4. Edit and save. Files are written straight into `content/` on your machine.
5. Refresh the matching page on the app (for example http://localhost:3001/cookies-policy) after signing in. The app reads markdown from disk on each request, so you do not need to rebuild.
6. Commit and push the changes into a PR

Notes:

- **Filename = URL.** `content/privacy-policy.md` is `/privacy-policy`. Nested files use the folder path, e.g. `content/accessibility/consider-a-recall.md` is `/accessibility/consider-a-recall`.
- **New pages are not automatic.** Adding a markdown file is not enough: register a matching `GET` route in `server/routes/contentRoutes.ts` (see the `Array.of(...)` list).
- **GOV.UK classes** are applied when markdown is rendered (headings, lists, tables, links). Prefer simple markdown; check the live page after saving.
- Flatnotes may create metadata under `content/` (for example `.metadata/` or `.flatnotes`). Keep CMS-only noise out of PRs if it is not needed.
- Do not commit secrets. Local Flatnotes credentials in compose are dummy values.

You can also edit `content/**/*.md` in the IDE; that is the same files the CMS writes.

## Use the components in another app

Preferred: [@ministryofjustice/hmpps-probation-frontend-components](https://www.npmjs.com/package/@ministryofjustice/hmpps-probation-frontend-components). See [readme/incorporating.md](readme/incorporating.md).

If you cannot use the package, see [readme/incorporating_manually.md](readme/incorporating_manually.md). Discuss in `#moj-design-system-support` on Slack first.

Hosted Swagger:

- [Dev](https://probation-frontend-components-dev.hmpps.service.justice.gov.uk/swagger)
- [Preprod](https://probation-frontend-components-preprod.hmpps.service.justice.gov.uk/swagger)
- [Prod](https://probation-frontend-components.hmpps.service.justice.gov.uk/swagger)

## Tests

```bash
npm run test
```

Integration / Cypress (from the repo, with the app running as your Cypress config expects):

```bash
npm run int-test      # headless
npm run int-test-ui   # Cypress UI
```

## Further reading

1. [Incorporating components](readme/incorporating.md)
2. [Building and running](readme/building_and_running.md)
3. [Incorporating manually](readme/incorporating_manually.md)
