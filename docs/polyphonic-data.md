# Polyphonic character data · editorial workflow

Write It currently indexes one legacy pronunciation (`p`) per character.
This project adds verified alternative readings without pretending that a raw
dictionary's combined English gloss can be assigned to one particular reading.

## Sources of truth

- `content/polyphonic-curated.json`: **human-review queue**, with child-friendly
  original explanations, per-reading examples and a reference URL. A status of
  `draft` means proposed content, **not verified for publication**.
- `static/zi/data/characters.json`: the existing lightweight search dictionary.
  Approved entries gain `ps` (pronunciation list); `p` remains for old clients.
- `static/zi/data/polyphonic.json`: only entries marked `approved`, split by
  reading. It is fetched on detail views, not during search.
- An optional source `../minimaxi/Data/dictionary.txt`: enables audit-only
  discovery of alternative pronunciation candidates. **No inferred readings
  from this file are auto-published.**

There are **30 editorial candidates** in the initial file. Only the five
first pass examples (缝、长、行、重、乐) are marked approved after reviewing the
reading distinctions against [汉典](https://www.zdic.net/); other entries
intentionally remain drafts pending explicit editorial verification.

## Commands

```sh
python3 scripts/build-polyphonic.py --validate
python3 -m unittest discover -s tests -p test_polyphonic.py
python3 scripts/build-polyphonic.py --audit-dictionary ../minimaxi/Data/dictionary.txt
python3 scripts/build-polyphonic.py --write
python3 scripts/build-polyphonic.py --check
```

Run `--write` only when preparing a new, version-pinned static dataset.
Full `npm run data` also applies approved overlays after rebuilding raw
character files. If the original data source isn't available, `--write`
still works with the committed `characters.json`, because only approved
curated readings are published.

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
