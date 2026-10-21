# Third-party notices and data provenance

Write It distributes an original browser application together with data obtained
from third-party sources. The licenses of those sources remain independent from
any license the author chooses for Write It's own TypeScript/CSS/UI code.

| Component | Use in this project | Upstream terms |
| --- | --- | --- |
| [Hanzi Writer](https://github.com/chanind/hanzi-writer) | JS animations and stroke-practice implementation | MIT, reproduced in [licenses/HANZI-WRITER-MIT.txt](licenses/HANZI-WRITER-MIT.txt) |
| [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) / [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) graphical data | Stroke vectors, medians, handwriting-related geometry | Arphic Public License, reproduced in [licenses/ARPHICPL.TXT](licenses/ARPHICPL.TXT) |
| [Make Me a Hanzi dictionary.txt](https://github.com/skishore/makemeahanzi) | Supplemental pronunciations, definitions, radicals, IDS decomposition | LGPL v3 or later, with source notices in [licenses/MAKEMEAHANZI-LGPL.txt](licenses/MAKEMEAHANZI-LGPL.txt) |

Source license references:
- [Make Me a Hanzi COPYING](https://github.com/skishore/makemeahanzi/blob/master/COPYING)
- [hanzi-writer-data ARPHICPL.TXT](https://github.com/chanind/hanzi-writer-data/blob/master/ARPHICPL.TXT)
- [Hanzi Writer LICENSE](https://github.com/chanind/hanzi-writer/blob/master/LICENSE)

## Processing and redistribution

The public [scripts/build-data.py](scripts/build-data.py) converts data from the
separate `minimaxi` iOS project into `static/zi/data/`. In particular, this
pipeline supplements a local SQLite character table with dictionary entries,
derives display metadata from IDS expressions, drops `radStrokes` from stroke
payloads, and repackages individual stroke data into 24 JSON packs containing
up to 400 characters each. The compiled datasets are distributed through the
version-tagged `write-it` repository and the jsDelivr CDN.

The original datasets' license requirements do **not** disappear after
conversion, bundling or CDN distribution. Retain the original notices and
license texts when redistributing derived data. If you change or republish the
datasets, review the relevant requirements for marking modified files, offering
corresponding source data, and providing attribution.

## Scope of this notice

The `minimaxi` source data is supplied separately and its entire provenance
has not been independently audited in this repository. This notice lists
known upstream dependencies; it is **not** a legal opinion or a certification
that every dataset-specific redistribution condition has been met.

The author has not yet declared a top-level license for Write It's own
application code. The MIT license above applies to Hanzi Writer, **not
automatically to all of Write It**.
