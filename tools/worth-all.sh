#!/bin/sh
# tools/worth.mjs for every class in parallel, one merged table.   STYLE=wise sh tools/worth-all.sh [fights a snapshot=60] [campaigns a class=1]
T=${1:-60}; N=${2:-1}; D=${KEEP:-$(mktemp -d)}; mkdir -p $D
for c in knight ranger wizard dwarf bard; do LOOK=${LOOK:-4} SIM_SAMPLES=${SIM_SAMPLES:-5} OUT=$D/$c.json node tools/worth.mjs $T $N $c 2>/dev/null & done; wait
node tools/worth.mjs merge $D
[ -z "$KEEP" ] && rm -rf $D
