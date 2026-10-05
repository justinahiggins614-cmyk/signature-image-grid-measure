#!/usr/bin/env python3
"""Seed the Measure Archive: deterministic geometric figures, every measurement
exact in standard math, each with a to-scale SVG diagram. No invented numbers —
every value is computed from the figure's parameters."""
import json, math, os, random, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data", "measures")
os.makedirs(DATA, exist_ok=True)

def svg_wrap(body):
    return ('<svg viewBox="0 0 260 180" xmlns="http://www.w3.org/2000/svg" role="img">'
            '<rect x="0" y="0" width="260" height="180" fill="#081627"/>' + body + '</svg>')

def fit(pts):
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    w = max(xs) - min(xs) or 1; h = max(ys) - min(ys) or 1
    s = min(200 / w, 130 / h)
    ox = 130 - (min(xs) + max(xs)) / 2 * s; oy = 95 - (min(ys) + max(ys)) / 2 * s
    return ["%.1f,%.1f" % (x * s + ox, y * s + oy) for x, y in pts]

def poly(pts, label):
    p = fit(pts)
    return ('<polygon points="%s" fill="rgba(55,214,122,.15)" stroke="#37d67a" stroke-width="2"/>'
            '<text x="130" y="172" fill="#9fd0ff" font-size="11" text-anchor="middle">%s</text>') % (" ".join(p), label)

def circ_svg(cx, cy, r, label):
    s = min(200 / (2 * r), 130 / (2 * r))
    R = r * s
    return ('<circle cx="130" cy="90" r="%.1f" fill="rgba(55,214,122,.15)" stroke="#37d67a" stroke-width="2"/>'
            '<line x1="130" y1="90" x2="%s" y2="90" stroke="#ff9d2e" stroke-width="2"/>'
            '<text x="130" y="172" fill="#9fd0ff" font-size="11" text-anchor="middle">%s</text>') % (R, 130 + R, label)

def f(x):
    return ("%.4f" % x).rstrip("0").rstrip(".")

def gen(rng, idx):
    kind = rng.choice(["rt", "rect", "circ", "poly", "iso"])
    rid = "JAH-GRID-%06d" % idx
    if kind == "rt":
        a = round(rng.uniform(3, 20), 2); b = round(rng.uniform(3, 20), 2)
        c = math.hypot(a, b); A = math.degrees(math.asin(a / c))
        return {"id": rid, "name": "Right Triangle %04d" % idx, "shape": "right_triangle",
                "svg": poly([(0, 0), (a, 0), (0, b)], "a=%s  b=%s" % (f(a), f(b))),
                "table": [["Leg a", f(a)], ["Leg b", f(b)], ["Hypotenuse c", f(c)],
                          ["Angle at a", f(A) + "°"], ["Angle at b", f(90 - A) + "°"],
                          ["Area", f(a * b / 2)], ["Perimeter", f(a + b + c)]]}
    if kind == "rect":
        w = round(rng.uniform(4, 24), 2); h = round(rng.uniform(4, 24), 2)
        return {"id": rid, "name": "Rectangle %04d" % idx, "shape": "rectangle",
                "svg": poly([(0, 0), (w, 0), (w, h), (0, h)], "w=%s  h=%s" % (f(w), f(h))),
                "table": [["Width", f(w)], ["Height", f(h)], ["Diagonal", f(math.hypot(w, h))],
                          ["Area", f(w * h)], ["Perimeter", f(2 * (w + h))]]}
    if kind == "circ":
        r = round(rng.uniform(2, 12), 2)
        return {"id": rid, "name": "Circle %04d" % idx, "shape": "circle",
                "svg": circ_svg(0, 0, r, "r=%s" % f(r)),
                "table": [["Radius", f(r)], ["Diameter", f(2 * r)],
                          ["Circumference", f(2 * math.pi * r)], ["Area", f(math.pi * r * r)]]}
    if kind == "poly":
        n = rng.randint(5, 8); s = round(rng.uniform(3, 12), 2)
        ap = s / (2 * math.tan(math.pi / n)); area = n * s * ap / 2
        names = {5: "Pentagon", 6: "Hexagon", 7: "Heptagon", 8: "Octagon"}
        pts = [(math.cos(2 * math.pi * i / n), math.sin(2 * math.pi * i / n)) for i in range(n)]
        return {"id": rid, "name": "%s %04d" % (names[n], idx), "shape": "regular_polygon",
                "svg": poly(pts, "n=%d  side=%s" % (n, f(s))),
                "table": [["Sides", str(n)], ["Side length", f(s)], ["Perimeter", f(n * s)],
                          ["Apothem", f(ap)], ["Area", f(area)],
                          ["Interior angle", f((n - 2) * 180 / n) + "°"]]}
    b = round(rng.uniform(4, 20), 2); h = round(rng.uniform(4, 20), 2)
    side = math.hypot(b / 2, h); va = 2 * math.degrees(math.atan((b / 2) / h))
    return {"id": rid, "name": "Isosceles Triangle %04d" % idx, "shape": "isosceles_triangle",
            "svg": poly([(0, 0), (b, 0), (b / 2, h)], "base=%s  height=%s" % (f(b), f(h))),
            "table": [["Base", f(b)], ["Height", f(h)], ["Equal sides", f(side)],
                      ["Vertex angle", f(va) + "°"], ["Area", f(b * h / 2)],
                      ["Perimeter", f(b + 2 * side)]]}

def write_chunk(recs, n):
    fn = "chunk-%04d.json" % n
    json.dump(recs, open(os.path.join(DATA, fn), "w"), separators=(",", ":"))
    return fn

def main():
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    count = int(sys.argv[2]) if len(sys.argv) > 2 else 240
    chunk_n = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    rng = random.Random(37000 + start)
    recs = [gen(rng, start + i) for i in range(count)]
    fn = write_chunk(recs, chunk_n)
    print("wrote %s: %d records (%s..%s)" % (fn, len(recs), recs[0]["id"], recs[-1]["id"]))

if __name__ == "__main__":
    main()
