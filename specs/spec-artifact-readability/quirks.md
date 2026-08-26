# Quirks — Spec Artifact Readability

> Written in the shape this spec designs.

| # | Quirk | Trigger | Severity | Mitigated |
|---|---|---|---|---|
| Q1 | A template that says nothing about a convention a test enforces | citing `Q<n>` in a spec whose `quirks.md` never numbered its headings | medium | yes — `## Q<n> — Title` becomes canonical and checked |
| Q2 | Prose is the format chosen when the reader is undecided | writing a concern file with four different consumers in mind | high | yes — the table layer picks a shape all three scanning consumers share |
| Q3 | A fact with two homes goes missing from the one you read | `api.md` types beside a `fields.md` Description column | high | yes — meaning on the type, journey in the table |
| Q4 | Migration can silently convert rationale into assertion | splitting ADR prose into short labelled fields | high | partial — two PRs bound the batch size; nothing detects a lost *why* |

## Q1 — A template silent on a convention a test enforces

**Discovered:** 2026-08-26, measuring the corpus for #60

**Symptom:** eight of twelve `quirks.md` files carry no `Q<n>` headings, and the four that do use two different formats.
**Trigger:** `durable-citations.test.mjs` checks that every cited `Q<n>` resolves to a `## Q<n>` heading, while `templates.md` says only `## {Quirk Title}`.
**Cause:** the test guards the citation direction only. An un-numbered quirk is never cited, so it never fails — the convention is enforced where it is used and unstated where it is written.
**Mitigation:** the template now carries the canonical form, and a structural check asserts it.

The session that added the second format variant did so an hour before writing this file, having read the template and found no guidance. That is the failure mode exactly: a rule enforced in one direction teaches nobody.

## Q2 — Prose is what you write when the reader is undecided

**Discovered:** 2026-08-26

**Symptom:** `decisions.md` is 93% prose and still hard to read; making it shorter would not have fixed it.
**Trigger:** one artifact with four consumers — a human scanning, a human reloading context, `preflight` drift-checking, an agent loading it as context.
**Cause:** prose is the lowest common denominator across incompatible readers. It is what a writer defaults to when no single reader has been chosen, and it serves each of them equally badly.
**Mitigation:** none of the readers is dropped; a table layer is added that three of the four can use, leaving prose to the one job that genuinely needs narrative.

Worth generalising: *if an artifact reads badly and shortening it would not help, the problem is that nobody decided who it was for.*

## Q3 — Two homes, and the reader opens the wrong one

**Discovered:** 2026-08-26, reported as docket #61

**Symptom:** a type in `api.md` with no explanation of its fields, while the explanation exists in `fields.md`.
**Trigger:** reading a type to find out what a field means.
**Cause:** the templates gave one fact two homes and put the description in the one nobody opens. Neither file is wrong on its own, which is why it survived unnoticed for the life of the template.
**Mitigation:** the type carries meaning, the table carries the journey — a division with no overlap, so there is no second home to drift from.

## Q4 — Migration can turn rationale into assertion

**Discovered:** 2026-08-26, while sizing #8's no-grandfathering decision

**Symptom:** a migrated decision that states what was decided and reads as authoritative, having quietly lost why.
**Trigger:** splitting an ADR prose block into `Decided` / `Because` / alternatives under time pressure, across 151 items.
**Cause:** the new shape rewards brevity, and a paragraph of reasoning compresses into a one-line `Because` more easily than it survives into one. Nothing in the structure distinguishes a decision that was reasoned from one that was merely recorded.
**Mitigation:** **partial.** Two PRs bound each review batch to a readable size. There is no automated check — a lost *why* is not structurally detectable, which is precisely why the alternatives table is mandatory: an empty one is visible in a way missing prose is not.

This is the known risk of the whole change, recorded before the migration starts rather than after.
