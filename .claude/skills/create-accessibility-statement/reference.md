# Accessibility Statement Reference

## Slug derivation rules

1. Trim leading/trailing whitespace
2. Lowercase the entire string
3. Replace `&` with `and`
4. Replace spaces and underscores with `-`
5. Remove characters that are not `a-z`, `0-9`, or `-`
6. Collapse consecutive hyphens into one
7. Strip leading/trailing hyphens

### Worked examples

| Business unit name | Slug |
|--------------------|------|
| Consider a recall | `consider-a-recall` |
| Manage people on probation | `manage-people-on-probation` |
| Refer and monitor an intervention | `refer-and-monitor-an-intervention` |

### Spelling note

The existing service `transitional-accomodation` uses a misspelling (`accomodation`). When linking to an **existing** service id, use that id/slug as-is. For **new** services, prefer correct spelling (`accommodation`) unless the service id in `getServicesForUser.ts` dictates otherwise.

## Service map

Services with accessibility statements registered in `getServicesForUser.ts`:

| Service id | accessibilityUrl | Markdown file |
|------------|------------------|---------------|
| `allocate-a-person-on-probation` | `/accessibility/allocate-a-person-on-probation` | `content/accessibility/allocate-a-person-on-probation.md` |
| `consider-a-recall` | `/accessibility/consider-a-recall` | `content/accessibility/consider-a-recall.md` |
| `create-and-vary-a-licence` | `/accessibility/create-and-vary-a-licence` | `content/accessibility/create-and-vary-a-licence.md` |
| `manage-people-on-probation` | `/accessibility/manage-people-on-probation` | `content/accessibility/manage-people-on-probation.md` |
| `prepare-a-case-for-sentence` | `/accessibility/prepare-a-case-for-sentence` | `content/accessibility/prepare-a-case-for-sentence.md` |
| `refer-and-monitor-an-intervention` | `/accessibility/refer-and-monitor-an-intervention` | `content/accessibility/refer-and-monitor-an-intervention.md` |
| `transitional-accomodation` | `/accessibility/transitional-accomodation` | `content/accessibility/transitional-accomodation.md` |
| `workload-measurement-tool` | `/accessibility/workload-measurement-tool` | `content/accessibility/workload-measurement-tool.md` |

Services without accessibility statements (no link needed unless adding one):

- `approved-premises`
- `ndelius`
- `oasys`

## Ollama setup

```bash
# Install Ollama: https://ollama.com
ollama serve

# Default model (Qwen)
ollama pull qwen2.5:7b

# Alternative model (Gemma)
ollama pull gemma3:4b
```

Set the model via environment variable:

```bash
export OLLAMA_MODEL=gemma3:4b
```

## Fallback markdown template

Use this template when Ollama is unavailable. Replace `{title}`, `{slug}`, and `{date}`.

```markdown
# Accessibility statement for {title}

Last reviewed: {date}

This accessibility statement applies to the {title} service, available at [example.hmpps.service.justice.gov.uk](https://example.hmpps.service.justice.gov.uk/).

## Using this service

This service is run by HMPPS Digital Services. We want as many people as possible to be able to use this service.

For example, that means you should be able to:

- change colours, contrast levels and fonts using browser or device settings
- zoom in up to 400% without the text spilling off the screen
- navigate most of the service using a keyboard or speech recognition software
- listen to most of the service using a screen reader (including the most recent versions of JAWS, NVDA and VoiceOver)

We've also made the service text as simple as possible to understand.

[AbilityNet](https://mcmw.abilitynet.org.uk/) has advice on making your device easier to use if you have a disability.

## How accessible this service is

We know some parts of this service are not fully accessible:

- some elements may not be read correctly by screen readers
- some text and icons may not have sufficient contrast
- some documents accessed through the service may be in PDF format and are not accessible

## Feedback and contact information

If you find any problems not listed on this page or think we're not meeting accessibility requirements, contact [team@justice.gov.uk](mailto:team@justice.gov.uk).

If you need information in a different format like accessible PDF, large print, easy read, audio recording or braille, email [team@justice.gov.uk](mailto:team@justice.gov.uk).

We'll consider your request and get back to you in 7 working days.

### Enforcement procedure

The Equality and Human Rights Commission (EHRC) is responsible for enforcing the Public Sector Bodies (Websites and Mobile Applications) (No. 2) Accessibility Regulations 2018 (the 'accessibility regulations').

If you're not happy with how we respond to your complaint, contact the [Equality Advisory and Support Service (EASS)](https://www.equalityadvisoryservice.com/).

## Technical information about this service's accessibility

HMPPS Digital Services is committed to making its services accessible, in accordance with the Public Sector Bodies (Websites and Mobile Applications) (No. 2) Accessibility Regulations 2018.

### Compliance status

This service is partially compliant with the [Web Content Accessibility Guidelines version 2.1 AA standard](https://www.w3.org/TR/WCAG21/), due to the non-compliances listed below.

## Non-accessible content

The content listed below is non-accessible for the following reasons.

### Non-compliance with the accessibility regulations

- Placeholder: describe a known accessibility issue, the WCAG criterion it fails, and planned remediation date.

## Content that's not within the scope of the accessibility regulations

### PDFs and other documents

Some PDFs and Word documents are essential to providing our services. We plan to fix these or replace them with accessible HTML pages.

The accessibility regulations [do not require us to fix PDFs or other documents published before 23 September 2018](http://www.legislation.gov.uk/uksi/2018/952/regulation/4/made) if they're not essential to providing our services.

Any new PDFs or Word documents we publish will meet accessibility standards.

## Preparation of this accessibility statement

This statement was prepared on {date}. It was last reviewed on {date}.

This service was last tested on {date}. The test was carried out internally.

This is a placeholder statement for {title} ({slug}). Replace dummy content with audited accessibility findings before publication.
```
