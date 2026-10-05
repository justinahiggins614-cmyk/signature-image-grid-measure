#!/usr/bin/env python3
"""2h drip for The Signature Image Grid and Measure (Website 37).

Appends +120 deterministic measurement records (exact computed figures +
to-scale SVG diagrams), rebuilds the archive index, restamps counts,
commits + pushes. Silent unless failing. Never invents numbers.
"""
import json, os, subprocess, sys
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
GOAL = 1_000_000

def sh(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True)

def main():
    sp = "data/state.json"
    st = json.load(open(sp)) if os.path.exists(sp) else {"next_index": 241, "next_chunk": 3}
    sys.path.insert(0, "code")
    import seed_measures
    import random
    rng = random.Random(37000 + st["next_index"])
    recs = [seed_measures.gen(rng, st["next_index"] + i) for i in range(120)]
    fn = seed_measures.write_chunk(recs, st["next_chunk"])
    st["next_index"] += 120; st["next_chunk"] += 1
    json.dump(st, open(sp, "w"), indent=1)
    idx = json.load(open("data/index.json"))
    idx["chunks"].append(fn); idx["total"] += 120
    json.dump(idx, open("data/index.json", "w"), indent=1)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    mp = "measure-manifest.json"
    m = json.load(open(mp)); m["total_records"] = idx["total"]; m["updated"] = now
    m["remaining_to_goal"] = GOAL - idx["total"]
    m["progress"] = "%d / 1000000 MEASUREMENTS" % idx["total"]
    json.dump(m, open(mp, "w"), indent=1)
    ap = "api.json"
    if os.path.exists(ap):
        a = json.load(open(ap)); a["records"] = idx["total"]; a["updated"] = now
        json.dump(a, open(ap, "w"), indent=1)
    size = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk("data") for f in fs)
    if size > 800 * 1024 * 1024:
        print("GUARD: data over 800MB, not pushing"); sys.exit(2)
    r = sh('git add -A && git -c user.name="JAH System" -c user.email="jah@grid.local" '
           'commit -qm "Grid drip: +120 measurements (%d total)" && git push -q origin master' % idx["total"])
    if r.returncode != 0:
        print("push failed: " + r.stderr[:300]); sys.exit(1)
    print("drip done: +120 measurements, %d total" % idx["total"])

if __name__ == "__main__":
    main()
