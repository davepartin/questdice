#!/bin/sh
# tools/curve.mjs for every class in parallel, one merged report: the damage curve, rounds per fight, lowest health, big moments, gear.
#   SKILL=normal STYLE=wise sh tools/curve-all.sh [acts=3] [campaigns per class=3]      (TRIALS fights a step, default 4)
ACTS=${1:-3}; N=${2:-3}; D=$(mktemp -d)
for c in knight ranger wizard dwarf bard; do SIM_SAMPLES=${SIM_SAMPLES:-5} OUT=$D/$c.json node tools/curve.mjs $ACTS $N $c & done; wait
node tools/curve.mjs merge $D
rm -rf $D
