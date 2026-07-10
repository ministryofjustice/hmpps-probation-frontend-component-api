#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

NAME=""
SLUG=""
TITLE=""
OUTPUT=""
MODEL="${OLLAMA_MODEL:-qwen2.5:7b}"
REFERENCE="${REFERENCE:-$REPO_ROOT/content/accessibility/consider-a-recall.md}"

usage() {
  cat <<EOF
Usage: $(basename "$0") --name NAME --slug SLUG --title TITLE --output PATH

Generate a dummy HMPPS accessibility statement markdown file using a local Ollama model.

Required:
  --name NAME       Business unit name (e.g. "Consider a recall")
  --slug SLUG       URL slug (e.g. "consider-a-recall")
  --title TITLE     Page title for H1 (e.g. "Consider a Recall")
  --output PATH     Output markdown file path (e.g. content/accessibility/foo.md)

Optional:
  --model MODEL     Ollama model (default: qwen2.5:7b, or OLLAMA_MODEL env var)
  --reference PATH  Reference statement for style (default: consider-a-recall.md)

Environment:
  OLLAMA_MODEL      Override default model (e.g. gemma3:4b)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name)
      NAME="$2"
      shift 2
      ;;
    --slug)
      SLUG="$2"
      shift 2
      ;;
    --title)
      TITLE="$2"
      shift 2
      ;;
    --output)
      OUTPUT="$2"
      shift 2
      ;;
    --model)
      MODEL="$2"
      shift 2
      ;;
    --reference)
      REFERENCE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Error: unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$NAME" || -z "$SLUG" || -z "$TITLE" || -z "$OUTPUT" ]]; then
  echo "Error: --name, --slug, --title, and --output are required." >&2
  usage >&2
  exit 1
fi

if ! command -v ollama >/dev/null 2>&1; then
  echo "Error: ollama is not installed or not on PATH." >&2
  echo "Install from https://ollama.com and ensure 'ollama serve' is running." >&2
  exit 1
fi

if ! ollama list >/dev/null 2>&1; then
  echo "Error: cannot reach Ollama. Is 'ollama serve' running?" >&2
  exit 1
fi

if [[ ! -f "$REFERENCE" ]]; then
  echo "Error: reference file not found: $REFERENCE" >&2
  exit 1
fi

REFERENCE_CONTENT="$(cat "$REFERENCE")"
TODAY="$(date '+%-d %B %Y')"
EXPECTED_H1="# Accessibility statement for ${TITLE}"

# Resolve output path relative to repo root when not absolute
if [[ "$OUTPUT" != /* ]]; then
  OUTPUT="$REPO_ROOT/$OUTPUT"
fi

OUTPUT_DIR="$(dirname "$OUTPUT")"
mkdir -p "$OUTPUT_DIR"

PROMPT="$(cat <<EOF
You are writing a placeholder accessibility statement for an HMPPS probation digital service.

Business unit name: ${NAME}
URL slug: ${SLUG}
Page title: ${TITLE}
Today's date: ${TODAY}

Write a complete dummy GOV.UK-style accessibility statement in Markdown. This is a scaffold for developers — use generic placeholder content, not real audit findings.

Requirements:
- Start with exactly: ${EXPECTED_H1}
- Include "Last reviewed: ${TODAY}" near the top
- Reference the service as "${NAME}" and use placeholder URL https://example.hmpps.service.justice.gov.uk/
- Use placeholder contact email team@justice.gov.uk
- Include these sections (use ## headings): Using this service (or equivalent intro), How accessible this service is, Feedback and contact information, Technical information about this service's accessibility, Compliance status, Non-accessible content, Preparation of this accessibility statement
- Include standard GOV.UK accessibility boilerplate (AbilityNet link, EHRC, EASS, WCAG 2.1 or 2.2 partial compliance)
- Use 1-2 generic placeholder WCAG non-compliance examples (not copied from the reference)
- End with a note that this is a placeholder statement to be replaced with audited content
- Output ONLY the markdown document. No preamble, no code fences, no explanation.

Match the tone and structure of this existing statement:

---
${REFERENCE_CONTENT}
---
EOF
)"

echo "Generating accessibility statement with model: ${MODEL}" >&2

GENERATED="$(ollama run "$MODEL" -- "$PROMPT")"

if [[ -z "${GENERATED//[[:space:]]/}" ]]; then
  echo "Error: Ollama returned empty output." >&2
  exit 1
fi

# Strip markdown code fences if the model wrapped output
GENERATED="$(printf '%s\n' "$GENERATED" | sed '/^```/d')"

if ! printf '%s\n' "$GENERATED" | head -n 1 | grep -qF "$EXPECTED_H1"; then
  echo "Warning: output does not start with expected H1: ${EXPECTED_H1}" >&2
  echo "Prepending correct H1." >&2
  GENERATED="${EXPECTED_H1}

${GENERATED}"
fi

printf '%s\n' "$GENERATED" > "$OUTPUT"

echo "Wrote accessibility statement to: $OUTPUT" >&2
