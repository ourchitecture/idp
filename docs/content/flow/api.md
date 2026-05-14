---
sidebar_position: 7
---

# Flow Insights HTTP API

Expose flow insights through a provider-neutral HTTP surface so Backstage, MCP
clients, and future tools consume the same contract without re-shaping core
signals.

## Endpoints

- `GET /api/flow/insights` — list inferred insights with optional filters.
- `GET /api/flow/insights/{insightId}` — retrieve a detailed view of one insight.
- `POST /api/flow/insights` — infer signals from a normalized provider adapter
  input (compatibility endpoint).

### Filters (list endpoint)

Query parameters are optional and can be combined:

- `provider` — `github` or `gitlab`
- `repo` — substring match against `repository.full_name`
- `team` — substring match against inferred teams
- `service` — substring match against service scope
- `actor` — substring match against actor display names
- `audience` — `owner`, `actor`, or `reviewer` to shape the summary toward that
  role

### Response shape (list)

```json
{
  "generatedAt": "2026-04-22T04:15:00.000Z",
  "filters": { "provider": "github" },
  "total": 2,
  "insights": [
    {
      "insightId": "blocked-on-review-github:blocked_on_review",
      "signalId": "blocked_on_review",
      "title": "Blocked on review",
      "severity": "high",
      "confidence": "high",
      "provider": "github",
      "repository": { "full_name": "example-org/payments-service" },
      "scope": { "service": "example-org/payments-service", "team": "payments-team", "stage": "review" },
      "services": ["example-org/payments-service"],
      "teams": ["payments-team"],
      "actors": ["Alice", "Bob", "Carol"],
      "summary": "Waiting 36h for review: pending Bob, Carol. | Owner focus: Notify assigned reviewers or reassess reviewer assignment.",
      "observedAt": "2026-04-01T10:00:00Z"
    }
  ]
}
```

### Response shape (detail)

```json
{
  "generatedAt": "2026-04-22T04:15:00.000Z",
  "insight": {
    "insightId": "blocked-on-review-gitlab:blocked_on_review",
    "signalId": "blocked_on_review",
    "title": "Blocked on review",
    "severity": "high",
    "confidence": "high",
    "provider": "gitlab",
    "repository": { "full_name": "example-org/payments-service" },
    "scope": { "service": "example-org/payments-service", "team": "payments-team", "stage": "review" },
    "services": ["example-org/payments-service"],
    "teams": ["payments-team"],
    "actors": ["Alice", "Bob", "Carol"],
    "summary": "Waiting 36h for review: pending Bob, Carol. | Owner focus: Notify assigned reviewers or reassess reviewer assignment.",
    "observedAt": "2026-04-01T10:00:00Z",
    "explanation": "Waiting 36h for review: pending Bob, Carol.",
    "recommendedNextAction": "Notify assigned reviewers or reassess reviewer assignment.",
    "relatedEntities": ["example-org/payments-service", "mr-789"],
    "source": {
      "fixtureId": "blocked-on-review-gitlab",
      "scenario": "blocked_on_review"
    }
  }
}
```

GitHub and GitLab-backed insights use the same response shape; only provider and
repository values differ. The role-aware `summary` reflects the `audience`
parameter without changing the underlying signal.

## Flow insights over MCP

The MCP tools expose the same contract as the HTTP API. Arguments map directly
to the query parameters above; responses match the list/detail payloads.

- `list_flow_insights` — arguments: optional `provider`, `repo`, `team`,
  `service`, `actor`, `audience`.  
  **Prompt:** “List flow insights for the payments service as an owner.”  
  **Expected response:** JSON list payload shaped like the HTTP example above.

- `get_flow_insight` — arguments: required `insightId`, optional `audience`.  
  **Prompt:** “Show the details for insight `blocked-on-review-github:blocked_on_review`.”  
  **Expected response:** Detail payload matching the HTTP example above.

- `list_my_blockers` — arguments: required `actor`, optional `provider`,
  `repo`, `team`, `service`. Returns only blocker signals
  (`blocked_on_review`, `waiting_on_evidence`, `aging_implementation`).  
  **Prompt:** “What is blocking Alice right now?”  
  **Expected response:**

  ```json
  {
    "generatedAt": "2026-04-22T04:15:00.000Z",
    "filters": { "actor": "Alice", "audience": "actor" },
    "total": 1,
    "insights": [
      {
        "insightId": "blocked-on-review-github:blocked_on_review",
        "signalId": "blocked_on_review",
        "title": "Blocked on review",
        "provider": "github",
        "services": ["example-org/payments-service"],
        "teams": ["payments-team"],
        "actors": ["Alice", "Bob", "Carol"],
        "summary": "Waiting 36h for review: pending Bob, Carol. | Actor focus: Notify assigned reviewers or reassess reviewer assignment."
      }
    ]
  }
  ```

- `list_service_risk_signals` — arguments: required `service`, optional
  `provider`, `team`. Returns only `risk_aggregation` signals.  
  **Prompt:** “Show risk aggregation signals for `example-org/checkout-service`.”  
  **Expected response:**

  ```json
  {
    "generatedAt": "2026-04-22T04:15:00.000Z",
    "filters": { "service": "example-org/checkout-service" },
    "total": 1,
    "insights": [
      {
        "insightId": "risk-aggregation-github:risk_aggregation",
        "signalId": "risk_aggregation",
        "title": "Aggregated risk by scope",
        "provider": "github",
        "services": ["example-org/checkout-service"],
        "teams": ["checkout-team"],
        "summary": "3 signals within ~48h for example-org/checkout-service | owners checkout-team"
      }
    ]
  }
  ```

## Contract protections

Contract tests assert:

- list endpoint availability and shape
- filtering by provider and service
- blocked-on-review shape equivalence for GitHub and GitLab
- detail endpoint returns explanations and recommended actions

The fixtures in `schema/fixtures/provider-adapter-input/` back both the HTTP API
and the inference engine, keeping responses provider-neutral and explainable.
