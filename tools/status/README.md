# Status Publisher

This tool exists so the same live IDP status contract can be published outside
the interactive portal runtime. It fetches `GET /api/portal/summary` from a
running BFF and writes static JSON and HTML artifacts that can be hosted
independently.

## Run

From the repository root:

```bash
tsx tools/status/publish-status.ts
```

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `IDP_BFF_URL` | `http://127.0.0.1:8000` | Base URL for the BFF that serves `/api/portal/summary` |
| `STATUS_PUBLISH_DIR` | `.tmp/status-site` | Output directory for the generated artifacts |

## Output

- `status.json` — machine-readable snapshot matching the live status contract
- `index.html` — simple static status page rendered from the same snapshot
