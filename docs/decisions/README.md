# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the Stemix / IDP project.

## Format

All decision records use the [Markdown Any Decision Records (MADR)](https://adr.github.io/madr/) format. See [template.md](template.md) for the standard template.

## Naming Convention

Files follow the pattern `NNNN-title-with-dashes.md`:

- **NNNN**: Zero-padded 4-digit sequence number
- **title-with-dashes**: Lowercase, dash-separated descriptive title

## Process

1. Copy `template.md` to a new file with the next sequence number.
2. Fill in all sections. Set status to `proposed`.
3. Submit a PR referencing the relevant GitHub Issue.
4. After review and approval, update status to `accepted`.

## Index

| ADR | Title | Status | Date |
| --- | --- | --- | --- |
| [0001](0001-intent-driven-architecture.md) | Intent-Driven Architecture | proposed | 2026-03-30 |
