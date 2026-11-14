import { useEffect, useRef } from "react";
import { useCinematicMotion } from "./MotionProvider";

/** Rotating wireframe globe: latitude/longitude lattice with glowing node points (canvas, no WebGL dependency). */
export function Globe({
  className,
  activeIndex = 0,
}: {
  className?: string;
  activeIndex?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { paused, reduced } = useCinematicMotion();
  const state = useRef({ paused, reduced, activeIndex });
  state.current = { paused, reduced, activeIndex };

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    const css = getComputedStyle(document.documentElement);
    const tone = (v: string) =>
      css
        .getPropertyValue(v)
        .trim()
        .replace(/^oklch\(|\)$/g, "");
    const cols = {
      line: tone("--border"),
      node: tone("--foreground"),
      hot: tone("--primary"),
      accent: tone("--accent"),
    };

    // Node lattice: 10 meridians x 7 parallels, one highlighted band per active capability.
    const MER = 12,
      PAR = 9;
    const nodes: [number, number, number, number][] = [];
    for (let p = 1; p < PAR; p++) {
      const phi = (p / PAR) * Math.PI - Math.PI / 2;
      for (let m = 0; m < MER; m++) {
        const lam = (m / MER) * Math.PI * 2;
        nodes.push([
          Math.cos(phi) * Math.cos(lam),
          Math.sin(phi),
          Math.cos(phi) * Math.sin(lam),
          m,
        ]);
      }
    }
    let a = 0,
      tx = 0,
      ty = 0,
      raf = 0;
    const move = (e: PointerEvent) => {
      const b = c.getBoundingClientRect();
      tx = ((e.clientX - b.left) / b.width - 0.5) * 0.5;
      ty = ((e.clientY - b.top) / b.height - 0.5) * 0.5;
    };
    window.addEventListener("pointermove", move);

    const project = (x: number, y: number, z: number) => {
      const ca = Math.cos(a + tx),
        sa = Math.sin(a + tx),
        cb = Math.cos(0.35 + ty),
        sb = Math.sin(0.35 + ty);
      const x1 = x * ca - z * sa,
        z1 = x * sa + z * ca;
      const y1 = y * cb - z1 * sb,
        z2 = y * sb + z1 * cb;
      return [x1, y1, z2] as const;
    };

    const draw = () => {
      const { paused: p, reduced: r, activeIndex: hot } = state.current;
      const d = devicePixelRatio,
        w = c.clientWidth,
        h = c.clientHeight;
      if (c.width !== w * d || c.height !== h * d) {
        c.width = w * d;
        c.height = h * d;
      }
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const R = Math.min(w, h) * 0.4,
        cx = w / 2,
        cy = h / 2;
      if (!p && !r) a += 0.004;

      // Graticule: parallels
      ctx.lineWidth = 1;
      for (let p2 = 1; p2 < PAR; p2++) {
        const phi = (p2 / PAR) * Math.PI - Math.PI / 2;
        ctx.beginPath();
        for (let s = 0; s <= 72; s++) {
          const lam = (s / 72) * Math.PI * 2;
          const [x, y, z] = project(
            Math.cos(phi) * Math.cos(lam),
            Math.sin(phi),
            Math.cos(phi) * Math.sin(lam),
          );
          if (z < -0.15) {
            if (s === 0) ctx.moveTo(cx + x * R, cy + y * R);
            else ctx.lineTo(cx + x * R, cy + y * R);
          }
        }
        ctx.strokeStyle = `oklch(${cols.node} / 0.22)`;
        ctx.stroke();
      }
      // Graticule: meridians
      for (let m = 0; m < MER; m++) {
        const lam = (m / MER) * Math.PI * 2;
        ctx.beginPath();
        let started = false;
        for (let s = 0; s <= 48; s++) {
          const phi = (s / 48) * Math.PI - Math.PI / 2;
          const [x, y, z] = project(
            Math.cos(phi) * Math.cos(lam),
            Math.sin(phi),
            Math.cos(phi) * Math.sin(lam),
          );
          if (z < -0.15) {
            if (started) ctx.lineTo(cx + x * R, cy + y * R);
            else ctx.moveTo(cx + x * R, cy + y * R);
            started = true;
          }
        }
        ctx.strokeStyle =
          m === hot % MER ? `oklch(${cols.hot} / 0.7)` : `oklch(${cols.node} / 0.16)`;
        ctx.stroke();
      }
      // Nodes
      for (const [x0, y0, z0, m] of nodes) {
        const [x, y, z] = project(x0, y0, z0);
        if (z > -0.12) continue;
        const s = (z + 1.4) / 2.4;
        const isHot = m === hot % MER;
        ctx.fillStyle = isHot
          ? `oklch(${cols.hot} / ${0.45 + s * 0.55})`
          : `oklch(${cols.node} / ${0.18 + s * 0.5})`;
        ctx.beginPath();
        ctx.arc(cx + x * R, cy + y * R, isHot ? 1.6 + s * 2.6 : 0.7 + s * 1.4, 0, 7);
        ctx.fill();
      }
      // Orbit ring
      ctx.beginPath();
      ctx.ellipse(cx, cy, R * 1.22, R * 0.34, -0.35, 0, 7);
      ctx.strokeStyle = `oklch(${cols.accent} / 0.35)`;
      ctx.stroke();
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
