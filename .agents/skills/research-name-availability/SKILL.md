---
name: research-name-availability
version: 1.2.0
description: >
  Researches a proposed tooling or product name to assess its availability
  and viability. Checks for existing tools, vendors, open-source projects,
  package registries, social media handles, domain names, general internet
  presence, and language and cultural associations. Produces a scored report
  across multiple dimensions with an overall recommendation.
  Use when evaluating a new name idea for a tool, service, or product.
author: "@idp-maintain"
domain: ai
tags:
  - research
  - naming
  - discovery
  - branding
inputs:
  - name: name_candidate
    type: string
    required: true
    description: >
      The proposed name to research (e.g., "DevPilot", "CodeForge").
  - name: context
    type: string
    required: false
    description: >
      Brief description of what the tool or product does. Helps assess
      whether existing uses of the name conflict in the same domain.
  - name: issue_number
    type: number
    required: false
    description: >
      GitHub Issue number to report findings to. If provided, the final
      report is posted as a comment on the issue.
outputs:
  - name: report
    type: object
    description: >
      Structured findings report including dimension scores, overall score,
      recommendation level, and suggested alternatives (if applicable).
  - name: overall_score
    type: number
    description: >
      Overall availability score from 1 (name is heavily used, avoid) to
      10 (name appears unique and available).
  - name: recommendation
    type: string
    description: >
      One of: "strongly-recommend", "recommend-with-caveats", "try-again".
---

# Research Name Availability

Evaluate a proposed tooling or product name for uniqueness, availability, and viability across the public internet, developer ecosystems, and package registries.

## Step 1: Search for Existing Tools and Vendors

Search the web for the candidate name in the context of software tooling and technology:

- Search for `"<name_candidate>" software tool` and `"<name_candidate>" developer tool`
- Search for `"<name_candidate>" open source` and `"<name_candidate>" github`
- Search for the candidate name on its own to assess general web presence

Record every meaningful match: product names, company names, open-source projects, SaaS tools, or CLI utilities that share the exact name or a very close variation.

## Step 2: Search Package Registries

Check whether the name is already taken on major package registries and namespaces:

- **npm**: Search for `<name_candidate>` on the npm registry
- **PyPI**: Search for `<name_candidate>` on PyPI
- **GitHub**: Search for repositories named `<name_candidate>`
- **Docker Hub**: Search for images named `<name_candidate>`
- **crates.io**: Search for `<name_candidate>` if relevant to Rust ecosystem

Note whether the name is taken, abandoned, or available on each.

## Step 3: Check Domain Availability

Check whether key domain names are registered or active:

- **Primary domains**: Check `<name_candidate>.com`, `<name_candidate>.io`, `<name_candidate>.dev`
- **Hyphenated variants**: Check `<name_candidate>app.com`, `get<name_candidate>.com`, `use<name_candidate>.com` if the primary domains are taken
- **Active vs. parked**: For each registered domain, note whether it hosts an active site, is parked/for-sale, or returns no content

Record which domains are available, parked, or actively used.

## Step 4: Check Social Media Handle Availability

Search for the candidate name as a handle or username on major platforms:

- **GitHub**: Check if the organization or user `<name_candidate>` exists (separate from repository search in Step 2)
- **X / Twitter**: Search for `@<name_candidate>` handle availability and existing usage
- **LinkedIn**: Search for company pages using `<name_candidate>`
- **YouTube**: Search for channels named `<name_candidate>`
- **Reddit**: Check if `r/<name_candidate>` exists as a subreddit
- **Discord**: Search for public servers named `<name_candidate>`
- **Mastodon / Bluesky**: Search for `<name_candidate>` handles on federated platforms

For each platform, note whether the handle is:

- **Available** -- Not registered
- **Active** -- Registered and actively posting/maintained
- **Inactive** -- Registered but dormant (no recent activity)
- **Unrelated** -- Registered but used for an unrelated purpose

## Step 5: Check Trademark and Legal Presence

- **Trademark databases**: Search for `<name_candidate>` in the software/technology class (e.g., USPTO TESS, EUIPO)
- **Note any obvious conflicts**: Registered trademarks in International Classes 9 (software), 35 (SaaS), or 42 (technology services) are direct blockers

## Step 6: Research Language and Cultural Associations

Assess how the candidate name might be perceived emotionally, linguistically, and culturally:

### Linguistic analysis

- **Meaning in other languages**: Search for `"<name_candidate>" meaning` and `"<name_candidate>" translation` to check whether the name has meanings in major world languages (Spanish, French, German, Mandarin, Japanese, Hindi, Arabic, Portuguese, Korean, Russian). Flag any negative, offensive, or embarrassing meanings.
- **Phonetic associations**: Consider what the name sounds like when spoken aloud. Does it resemble any words with negative connotations in English or other major languages? Could it be misheard as something undesirable?
- **Slang and informal usage**: Search for `"<name_candidate>" slang` and `"<name_candidate>" urban dictionary` to check for informal or colloquial meanings that could undermine the brand.

### Emotional and psychological associations

- **Sentiment and tone**: What feelings does the name evoke? Consider whether it sounds: positive/aspirational, neutral/technical, aggressive/hostile, playful/casual, serious/corporate. Note the emotional register.
- **Visual and conceptual imagery**: What mental images or concepts does the name naturally call to mind? Are those associations aligned with the intended product, or do they pull in an unrelated or undesirable direction?
- **Existing cultural references**: Search for `"<name_candidate>"` in the context of movies, books, music, mythology, historical events, or pop culture. Note any strong associations that could color perception of the name (positively or negatively).

### Inclusivity and sensitivity

- **Offensive or exclusionary connotations**: Could the name be interpreted as insensitive to any cultural, ethnic, religious, or social group? Consider both direct meanings and phonetic resemblance.
- **Colonial, militaristic, or loaded terminology**: Does the name carry undertones associated with historical harm, power dynamics, or contentious political themes?
- **Accessibility**: Is the name pronounceable across a range of linguistic backgrounds? Could non-native English speakers easily say and remember it?

For each area, note whether the finding is:

- **Clear** -- No concerning associations found
- **Minor concern** -- An association exists but is unlikely to cause issues (e.g., a rare meaning in one language)
- **Significant concern** -- A strong negative association that could affect adoption or brand perception
- **Blocker** -- An offensive or deeply problematic meaning that disqualifies the name

## Step 7: Assess Domain Conflict

If `context` was provided, evaluate whether existing uses of the name conflict with the intended purpose:

- Are existing tools in the same domain (e.g., another developer portal using the same name)?
- Are existing uses in completely unrelated fields (e.g., a restaurant, a band)?
- Would users searching for this name find the right tool, or be confused by existing results?

## Step 8: Score Each Dimension

Rate each dimension on a scale of 1 (worst) to 10 (best):

| Dimension | What it measures | Score |
| --- | --- | --- |
| **Uniqueness** | How distinct the name is in the software/tooling space. 10 = no existing tools use this name. 1 = a well-known tool already uses it. | 1-10 |
| **Registry Availability** | Whether the name is available on package registries (npm, PyPI, Docker Hub, etc.). 10 = available everywhere. 1 = taken on all major registries. | 1-10 |
| **Domain Availability** | Whether key domain names (.com, .io, .dev) are available. 10 = primary domains available. 1 = all domains taken by active sites. | 1-10 |
| **Social Availability** | Whether the name is available as a handle on major social and community platforms (GitHub org, X, LinkedIn, YouTube, Reddit, Discord). 10 = available on all platforms. 1 = taken and active everywhere. | 1-10 |
| **Web Presence** | How crowded the search results are. 10 = no meaningful results. 1 = dominated by an existing product. | 1-10 |
| **Domain Conflict** | Whether existing uses conflict with the intended domain. 10 = no domain overlap. 1 = direct competitor uses the name. Only scored if `context` is provided; default to 5 otherwise. | 1-10 |
| **Cultural Sentiment** | How the name is perceived across languages, cultures, and emotional associations. 10 = universally positive or neutral, no problematic meanings in any major language. 1 = offensive or deeply negative connotations found. Any "Blocker" finding from Step 6 caps this score at 2. | 1-10 |
| **Memorability** | How easy the name is to remember, spell, pronounce, and search for. 10 = short, distinctive, easy. 1 = easily confused, hard to spell, generic. | 1-10 |
| **Longevity** | Whether the name avoids trends, version-specific terms, or hype cycles that may age poorly. 10 = timeless. 1 = will feel dated quickly. | 1-10 |

Calculate the **overall score** as the weighted average:

- Uniqueness: 18%
- Registry Availability: 13%
- Domain Availability: 13%
- Social Availability: 8%
- Web Presence: 13%
- Domain Conflict: 8%
- Cultural Sentiment: 12%
- Memorability: 8%
- Longevity: 7%

## Step 9: Determine Recommendation

Based on the overall score:

### Score 8.0 - 10.0: Strongly Recommend

The name appears highly available and viable. Output:

- Recommendation: `strongly-recommend`
- Summary of why the name scores well
- Any minor caveats to be aware of (e.g., a single low-traffic project on one registry)
- Suggest claiming the name on key registries, domains, and social handles promptly

### Score 4.0 - 7.9: Recommend with Caveats

The name has some availability concerns but is not disqualified. Output:

- Recommendation: `recommend-with-caveats`
- Summary of the specific conflicts or concerns found
- Research and suggest 3-5 alternative names that are likely to score higher, based on the patterns that made this name lose points (e.g., if uniqueness was low, suggest more distinctive variations)
- Provide a recommended alternative with a brief justification
- Also suggest the user try again with a fresh idea if none of the alternatives resonate

### Score 1.0 - 3.9: Try Again

The name has significant conflicts or is already well-established by another entity. Output:

- Recommendation: `try-again`
- Summary of the blocking conflicts found
- Explain specifically what makes the name unavailable (existing tool, trademark, dominant search presence)
- Provide 3-5 basic directional suggestions for name characteristics that would score well (e.g., "consider compound words", "try a name that combines [concept] with [concept]")
- Encourage the user to brainstorm a new candidate and re-run the skill

## Step 10: Format the Report

Compile the findings into a structured report:

```markdown
# Name Research Report: <name_candidate>

## Summary
<1-2 sentence overall assessment>

## Scores

| Dimension | Score | Notes |
| --- | --- | --- |
| Uniqueness | X/10 | <brief note> |
| Registry Availability | X/10 | <brief note> |
| Domain Availability | X/10 | <brief note> |
| Social Availability | X/10 | <brief note> |
| Web Presence | X/10 | <brief note> |
| Domain Conflict | X/10 | <brief note> |
| Cultural Sentiment | X/10 | <brief note> |
| Memorability | X/10 | <brief note> |
| Longevity | X/10 | <brief note> |
| **Overall** | **X.X/10** | |

## Recommendation: <strongly-recommend | recommend-with-caveats | try-again>

<Detailed recommendation based on the score tier above>

## Key Findings
- <finding 1>
- <finding 2>
- ...

## Alternatives (if applicable)
- <alternative 1>: <justification>
- <alternative 2>: <justification>
- ...
```

## Step 11: Report to GitHub Issue (conditional)

If `issue_number` was provided, use the GitHub MCP `add_issue_comment` tool to post the full report as a comment on the issue. Skip this step if no issue number was given.
