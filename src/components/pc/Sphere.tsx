import { useEffect, useRef } from "react";

/** Original interactive intelligence sphere: rotating point lattice with pointer tilt (canvas, no WebGL dependency). */
export function Sphere({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    const css = getComputedStyle(document.documentElement);
    const cols = ["--primary", "--accent", "--violet"].map((v) =>
      css
        .getPropertyValue(v)
        .trim()
        .replace(/^oklch\(|\)$/g, ""),
    );
    const N = 700,
      pts = Array.from({ length: N }, (_, i) => {
        const y = 1 - (i / (N - 1)) * 2,
          r = Math.sqrt(1 - y * y),
          th = i * 2.399963;
        return [Math.cos(th) * r, y, Math.sin(th) * r, i % 3] as const;
      });
    let tx = 0,
      ty = 0,
      a = 0,
      raf = 0;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const move = (e: PointerEvent) => {
      const b = c.getBoundingClientRect();
      tx = ((e.clientX - b.left) / b.width - 0.5) * 0.8;
      ty = ((e.clientY - b.top) / b.height - 0.5) * 0.8;
    };
    window.addEventListener("pointermove", move);
    const draw = () => {
      const d = devicePixelRatio,
        w = c.clientWidth,
        h = c.clientHeight;
      c.width = w * d;
      c.height = h * d;
      ctx.scale(d, d);
      ctx.clearRect(0, 0, w, h);
      const R = Math.min(w, h) * 0.42;
      a += reduce ? 0 : 0.003;
      const ca = Math.cos(a + tx),
        sa = Math.sin(a + tx),
        cb = Math.cos(ty),
        sb = Math.sin(ty);
      for (const [x, y, z, k] of pts) {
        const x1 = x * ca - z * sa,
          z1 = x * sa + z * ca,
          y1 = y * cb - z1 * sb,
          z2 = y * sb + z1 * cb;
        const s = (z2 + 1.6) / 2.6;
        ctx.fillStyle = `oklch(${cols[k]} / ${0.15 + s * 0.85})`;
        ctx.beginPath();
        ctx.arc(w / 2 + x1 * R, h / 2 + y1 * R, 0.6 + s * 1.6, 0, 7);
        ctx.fill();
      }
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
