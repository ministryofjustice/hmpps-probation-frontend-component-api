---
name: create-accessibility-statement
description: >-
  Scaffolds a new HMPPS accessibility statement: adds a route in contentRoutes.ts,
  creates content/accessibility/{slug}.md, and links it in getServicesForUser.ts.
  Use when adding a new business unit accessibility statement, accessibility route,
  or accessibility markdown page.
disable-model-invocation: true
---

# Create Accessibility Statement

Scaffold a new accessibility statement for an HMPPS probation business unit.

## Prerequisites

- Run all commands from the **repository root**
- Ollama installed and running (`ollama serve`) for statement generation
- Pull a model first: `ollama pull qwen2.5:7b` (or `gemma3:4b`)

## Workflow

Copy this checklist and track progress:

```
Task Progress:
- [ ] Step 1: Collect business unit name and derive identifiers
- [ ] Step 2: Confirm derived values with user
- [ ] Step 3: Generate markdown via Ollama script
- [ ] Step 4: Register route in contentRoutes.ts
- [ ] Step 5: Link service in getServicesForUser.ts (if match exists)
- [ ] Step 6: Verify changes
```

### Step 1 — Collect and derive names

If the user did not provide a business unit name, ask:

> What is the name of the business unit? (e.g. "Consider a recall", "Manage people on probation")

Derive these values from the business unit name:

| Field | Rule |
|-------|------|
| `slug` | Lowercase, trim, replace spaces and `&` with `-`, collapse repeated hyphens, strip characters except `a-z`, `0-9`, and `-` |
| `route` | `accessibility/{slug}` |
| `title` | Title-case for the H1 (e.g. "Consider a Recall") |
| `file` | `content/accessibility/{slug}.md` |
| `url` | `/accessibility/{slug}` |

**Slug examples** (see [reference.md](reference.md) for full rules):

- "Consider a recall" → `consider-a-recall`
- "Manage people on probation" → `manage-people-on-probation`
- "Refer and monitor an intervention" → `refer-and-monitor-an-intervention`

**Before proceeding**, check that `content/accessibility/{slug}.md` does not already exist and that `accessibility/{slug}` is not already in `server/routes/contentRoutes.ts`. If either exists, stop and tell the user.

### Step 2 — Confirm with user

Show the derived values and **wait for explicit confirmation** before editing any files:

```
Business unit: {name}
Slug:          {slug}
Route:         {route}
Page title:    Accessibility statement for {title}
Markdown file: {file}
Service URL:   {url}
```

If the user rejects or corrects any value, re-derive and confirm again.

### Step 3 — Generate dummy statement

Run the Ollama script from the repo root:

```bash
.claude/skills/create-accessibility-statement/scripts/generate-statement.sh \
  --name "{business unit name}" \
  --slug "{slug}" \
  --title "{title}" \
  --output "{file}"
```

Optional: set `OLLAMA_MODEL=gemma3:4b` to use Gemma instead of the default Qwen model.

**If Ollama fails**, use the static fallback template in [reference.md](reference.md). Replace `{title}`, `{slug}`, and `{date}` (today's date, e.g. `2 July 2026`) and write the file manually.

Review the generated markdown. It must start with `# Accessibility statement for {title}` and follow the GOV.UK structure of existing statements.

### Step 4 — Register route

Open [server/routes/contentRoutes.ts](server/routes/contentRoutes.ts).

Add `'accessibility/{slug}'` to the `Array.of(...)` block (lines 26–37). Keep accessibility entries grouped together and sorted **alphabetically by slug** among `accessibility/` entries.

Example insertion for slug `my-new-service`:

```typescript
'accessibility/my-new-service',
```

Do not modify cookies-policy or privacy-policy entries.

### Step 5 — Link service (when match exists)

Open [server/services/utils/getServicesForUser.ts](server/services/utils/getServicesForUser.ts).

Search for a matching service:

1. **Primary:** `id === slug`
2. **Fallback:** `heading` matches business unit name case-insensitively
3. If multiple heading matches, ask the user which service to link
4. If no match, **do not** add a new service — report that the route and markdown were created but the `/accessibility` hub will not list this statement until a service is registered

When a match is found, set or update:

```typescript
accessibilityHeading: '{title or existing heading casing}',
accessibilityUrl: '/accessibility/{slug}',
```

Use the existing service `heading` casing for `accessibilityHeading` when it differs slightly from the derived title (e.g. service heading "Consider a recall" → accessibilityHeading "Consider a Recall").

### Step 6 — Verify

Confirm:

- [ ] `{file}` exists and begins with `# Accessibility statement for {title}`
- [ ] `'accessibility/{slug}'` appears in `contentRoutes.ts`
- [ ] If a service was matched, `accessibilityUrl` and `accessibilityHeading` are set in `getServicesForUser.ts`

Summarize all changes to the user. Suggest a manual check:

```bash
npm run start:dev
```

Then visit `/accessibility/{slug}` in the browser.

## Additional resources

- Naming rules, service map, fallback template: [reference.md](reference.md)
- Example statements: `content/accessibility/consider-a-recall.md`, `content/accessibility/manage-people-on-probation.md`
