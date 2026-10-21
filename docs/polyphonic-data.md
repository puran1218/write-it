# Polyphonic character data · editorial workflow

Write It currently indexes one legacy pronunciation (`p`) per character.
This project adds verified alternative readings without pretending that a raw
dictionary's combined English gloss can be assigned to one particular reading.

## Full-corpus reading audit

The previous Make Me a Hanzi dictionary has 9,574 rows but only **8** rows
contain multiple explicit readings. It is *not* enough to generate a complete
multi-reading index. We use the pinned
[mozillazg/pinyin-data v0.15.0](https://github.com/mozillazg/pinyin-data/tree/v0.15.0)
snapshots in `sources/pinyin-data-v0.15.0/`:

- `pinyin.txt`: broad merged pronunciation **candidates**. It can contain
  historical, regional, literary, surname-only and very uncommon readings.
  Its alternatives must not all be presented as everyday Mandarin readings.
- `kTGHZ2013.txt`: independently distinguishable **modern-dictionary reference**
  tier, based on Unicode Unihan's `kTGHZ2013` data derived from the
  *Dictionary of General Standard Chinese Characters*. It can still contain
  uncommon readings. It is not a curated child-level meaning/word mapping.

For the 9,565 searchable characters: **3,459** have multiple candidates in the
merged source; **582** have multiple readings in the modern-dictionary reference.
Those 582 get a discoverable `ps` list in the planned data-v2 index. The remaining
merged-only candidates stay **audit-only** until reviewed. These counts represent
this corpus and pinned source, not every Chinese polyphonic character.

The machine-generated [inventory](../reports/polyphonic-audit.json) contains
readings and provenance for every candidate; a human-friendly
[summary](../reports/polyphonic-audit.md) accompanies it. A `reference` status
means evidence of readings, not that the child-facing explanation is approved.
An `editorial` status tracks complete meaning/word content separately.

## Sources of truth

- `content/polyphonic-curated.json`: **editorial queue**. Only five entries
  (缝、长、行、重、乐) have approved child-friendly meanings and example words;
  the other 25 are drafts. Changing their review status does not add any
  unreviewed historical readings from the merged dictionary.
- `characters.json`: stable legacy field `p` plus a `ps` list only where
  the reference tier confirms multiple readings. The source list is ordered
  with any approved teaching readings first.
- `polyphonic.json`: only complete approved editorial groups, not hundreds
  of invented definitions. Detail views show uncurated readings with an
  honest "examples are being prepared" fallback.
- `reports/polyphonic-audit.json`: all broad merged-source candidates with
  explicit provenance, reference support and editorial status.

## Commands

```sh
python3 scripts/build-polyphonic.py --validate
python3 scripts/build-polyphonic.py --audit
python3 scripts/build-polyphonic.py --write-audit
python3 scripts/build-polyphonic.py --check-audit
python3 -m unittest discover -s tests -p test_polyphonic.py
python3 scripts/build-polyphonic.py --write  # release dataset only
python3 scripts/build-polyphonic.py --check  # CI drift check after release
```

The full audit is **reproducible without network access or a local minimaxi
checkout**. The two pinned source files are committed so CI can detect drift.
The generated index only adds `ps` to `characters.json`; it does not alter
the original `p` and mixed English `d` retained for legacy compatibility.
`build-data.py` reapplies the approved/reference overlay after a full rebuild.

Before moving a draft to approved:
1. Verify the modern Mandarin reading with a reliable reference (avoid treating
   historical, literary, surname-only or place-name readings as universally common).
2. Check **each** child-facing explanation and each example word, particularly
   tones and neutral tones such as `de` and `yi`.
3. Confirm word tokens align one-to-one with characters and the correct occurrence
   of the selected polyphonic character.
4. Keep original documentation for any sourced factual statements. Do not copy
   long copyrighted dictionary explanations or examples.
5. Run the content validator and browser smoke tests; examine the generated diff.

**Rollout:** PR 1 introduces the pipeline and queue, PR 2 renders approved
reading groups, PR 3 publishes the `data-v2` snapshot and companion Micro.blog
plug-in. The immutable CDN tag must be created only after the source commit
containing the final dataset has been merged and verified. Until then, the
live site stays on `data-v1`.

## Out of scope

Automatic pronunciation disambiguation for sentences, forced TTS readings for
isolated characters, bulk approval of unverified dictionary candidates, changes
to stroke packs/handwriting index, and a new back-end service.
