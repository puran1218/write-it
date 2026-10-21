# Polyphonic pronunciation inventory

Source: mozillazg/pinyin-data v0.15.0
(https://github.com/mozillazg/pinyin-data/tree/v0.15.0).
Candidate source: pinyin.txt. Modern dictionary reference: kTGHZ2013.txt.

Counts refer only to existing Write It characters, not all Hanzi.
Merged candidate pronunciations may include historical, rare or
specialised readings and must not be auto-published.

| Metric | Count |
| --- | ---: |
| dictionaryCharacters | 9565 |
| mergedSourceCharacters | 9562 |
| referenceSourceCharacters | 6866 |
| multiReadingCandidates | 3459 |
| referenceMultiReadingCharacters | 582 |
| indexedMultiReadingCharacters | 582 |
| needsReviewCandidates | 2877 |
| editoriallyApprovedCharacters | 5 |
| legacyPrimaryOutsideIndex | 8 |

The complete per-character inventory with both source readings and
status flags is in polyphonic-audit.json.

reference = modern-dictionary reference has multiple readings.
needs-review = variant appears in merged source only.
editorial = separate reviewed child-friendly meaning/example status.

Only reference-backed multiple readings and separately approved
editorial overrides are copied to characters.json.ps.
The merged-only candidates stay in this audit report.
