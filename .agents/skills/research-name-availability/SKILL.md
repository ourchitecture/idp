---
name: research-name-availability
version: 1.3.0
description: >
  Researches a proposed name across registries, domains, social handles,
  search, trademarks, and cultural/linguistic associations. Produces a
  scored report with an overall recommendation.
author: "@idp-maintain"
domain: ai
tags: [research, naming, discovery, branding]
inputs:
  - name: name_candidate
    type: string
    required: true
    description: The proposed name to research (e.g., "DevPilot").
  - name: context
    type: string
    required: false
    description: Brief description of what the tool/product does (for conflict scoring).
  - name: issue_number
    type: number
    required: false
    description: Optional GitHub Issue to post the final report.
outputs:
  - name: report
    type: object
    description: Findings — dimension scores, overall score, recommendation, alternatives.
  - name: overall_score
    type: number
    description: 1 (heavily used) to 10 (unique and available).
  - name: recommendation
    type: string
    description: '"strongly-recommend" | "recommend-with-caveats" | "try-again".'
---

# Research Name Availability

GitHub API access (for the optional issue comment) follows
[../../docs/shared/github-api.md](../../docs/shared/github-api.md).

## 1. Existing tools/vendors

Web-search the candidate with qualifiers: `software tool`, `developer tool`,
`open source`, `github`, plus the bare name. Record exact and near matches:
products, companies, OSS projects, SaaS, CLIs.

## 2. Package registries

Check npm, PyPI, GitHub repos, Docker Hub, crates.io (if Rust-relevant).
Note: taken / abandoned / available.

## 3. Domain availability

Check `<name>.com`, `.io`, `.dev`. If primary taken, check `<name>app.com`,
`get<name>.com`, `use<name>.com`. Note active / parked / unused.

## 4. Social handles

GitHub org/user, X/Twitter, LinkedIn, YouTube, Reddit (`r/<name>`), Discord,
Mastodon, Bluesky. Mark each: available / active / inactive / unrelated.

## 5. Trademarks

Search USPTO TESS, EUIPO in software/technology classes (IC 9, 35, 42).
Flag direct conflicts.

## 6. Language and cultural associations

- **Linguistic**: meanings/translations in major languages (Spanish, French,
  German, Mandarin, Japanese, Hindi, Arabic, Portuguese, Korean, Russian);
  phonetic resemblance to undesirable words; slang/urban-dictionary usage.
- **Emotional**: tone (aspirational/technical/aggressive/playful/corporate),
  imagery, existing pop-culture references.
- **Inclusivity**: offensive/exclusionary connotations; colonial/militaristic
  undertones; pronounceability across linguistic backgrounds.

Mark findings: clear / minor concern / significant concern / blocker.

## 7. Domain conflict

If `context` provided: do existing uses overlap the intended domain? Would
users find the right tool or be confused?

## 8. Score 1–10 per dimension

| Dimension | Weight |
| --- | --- |
| Uniqueness | 18% |
| Registry Availability | 13% |
| Domain Availability | 13% |
| Web Presence | 13% |
| Cultural Sentiment | 12% |
| Social Availability | 8% |
| Domain Conflict | 8% (default 5 if no `context`) |
| Memorability | 8% |
| Longevity | 7% |

Any **blocker** finding from §6 caps Cultural Sentiment at 2.

## 9. Recommendation

- **8.0–10.0** → `strongly-recommend`: claim name on registries/domains/handles promptly; note any minor caveats.
- **4.0–7.9** → `recommend-with-caveats`: list concerns, suggest 3–5 alternatives addressing the lowest-scoring dimensions, include one preferred alternative.
- **1.0–3.9** → `try-again`: explain blockers, give 3–5 directional suggestions (e.g., "compound words", "combine X and Y"), encourage a new candidate.

## 10. Report format

```markdown
# Name Research Report: <name_candidate>

## Summary
<1–2 sentences>

## Scores
| Dimension | Score | Notes |
| --- | --- | --- |
| Uniqueness | X/10 | … |
| … | | |
| **Overall** | **X.X/10** | |

## Recommendation: <tier>
<details>

## Key Findings
- …

## Alternatives (if applicable)
- <alt>: <justification>
```

## 11. Post to issue (optional)

If `issue_number` provided, post the full report via `add_issue_comment` or
`gh issue comment`.
