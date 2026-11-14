import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import { ExtrudeGeometry, Group, Path, Shape } from "three";

function contour(path: Shape | Path, w: number, h: number, r: number) {
  path.moveTo(-w / 2 + r, -h / 2);
  path.lineTo(w / 2 - r, -h / 2);
  path.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  path.lineTo(w / 2, h / 2 - r);
  path.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  path.lineTo(-w / 2 + r, h / 2);
  path.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  path.lineTo(-w / 2, -h / 2 + r);
  path.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
}

function Links({
  paused,
  reduced,
  tones,
  ready,
  ambient,
}: {
  paused: boolean;
  reduced: boolean;
  tones: [string, string, string];
  ready: () => void;
  ambient: boolean;
}) {
  const group = useRef<Group>(null);
  const elapsed = useRef(0);
  const drawn = useRef(false);
  const geometry = useMemo(() => {
    const shape = new Shape();
    contour(shape, 1.72, 1.4, 0.38);
    const hole = new Path();
    contour(hole, 1.16, 0.84, 0.24);
    shape.holes.push(hole);
    const result = new ExtrudeGeometry(shape, {
      depth: 0.17,
      bevelEnabled: true,
      bevelSegments: 5,
      steps: 1,
      bevelSize: 0.105,
      bevelThickness: 0.105,
      curveSegments: 20,
    });
    result.center();
    return result;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((state, dt) => {
    if (!drawn.current) {
      drawn.current = true;
      ready();
    }
    if (!group.current || paused || reduced) return;
    elapsed.current += Math.min(dt, 0.05);
    group.current.rotation.x =
      0.22 + Math.sin(elapsed.current * 0.3) * 0.16 + state.pointer.y * 0.12;
    group.current.rotation.y +=
      ((ambient ? Math.sin(elapsed.current * 0.18) * 0.45 : state.pointer.x * 0.3) -
        group.current.rotation.y) *
      0.035;
    group.current.rotation.z = -0.16 + Math.sin(elapsed.current * 0.2) * 0.04;
    group.current.position.y = Math.sin(elapsed.current * 0.6) * 0.08;
  });
  return (
    <group ref={group} rotation={[0.22, 0, ambient ? -0.55 : -0.16]} scale={ambient ? 1.05 : 1.4}>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh
          key={i}
          geometry={geometry}
          position={[(i - 2) * 1.22, 0, 0]}
          rotation={[i % 2 ? 1.14 : -0.12, 0, 0]}
        >
          <meshPhysicalMaterial
            color={tones[0]}
            metalness={i % 2 ? 0.95 : 0.15}
            roughness={0.1}
            transmission={i % 2 ? 0 : 0.88}
            thickness={1.2}
            ior={1.45}
            clearcoat={1}
          />
        </mesh>
      ))}
      {!ambient && (
        <group rotation={[0.9, 0.1, 0]}>
          <mesh>
            <torusGeometry args={[4.6, 0.012, 8, 160]} />
            <meshStandardMaterial color={tones[2]} metalness={0.7} roughness={0.2} />
          </mesh>
          <mesh rotation={[0.15, 0.15, 0]}>
            <torusGeometry args={[4.95, 0.009, 8, 160]} />
            <meshStandardMaterial color={tones[1]} metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export default function ChainScene({
  paused,
  onReady,
  variant = "hero",
}: {
  paused: boolean;
  onReady: () => void;
  variant?: "hero" | "ambient";
}) {
  const [tones, setTones] = useState<[string, string, string] | null>(null);
  const [reduced, setReduced] = useState(false);
  const [visible, setVisible] = useState(true);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let inView = true;
    const update = () => setVisible(inView && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry?.isIntersecting ?? false;
      update();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [tones]);
  useEffect(() => {
    const css = getComputedStyle(document.documentElement);
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const colors = ["--foreground", "--primary", "--accent"].map((token) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = css.getPropertyValue(token).trim();
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return `rgb(${r},${g},${b})`;
    });
    const [base, primary, accent] = colors;
    if (base && primary && accent) setTones([base, primary, accent]);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  if (!tones) return null;
  return (
    <div ref={host} className="scene-render-host">
      <Canvas
        camera={{ position: [0, 0, variant === "ambient" ? 13 : 12.8], fov: 39 }}
        dpr={[1, variant === "ambient" ? 1 : 2]}
        frameloop={paused || reduced || !visible ? "demand" : "always"}
        gl={{ alpha: true, antialias: true }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[2, 5, 5]} intensity={3} color={tones[0]} />
        <pointLight position={[-5, 0, 2]} intensity={12} color={tones[1]} />
        <Links
          paused={paused || !visible}
          reduced={reduced}
          tones={tones}
          ready={onReady}
          ambient={variant === "ambient"}
        />
        <Environment resolution={128}>
          <Lightformer color={tones[0]} intensity={4} position={[0, 4, 3]} scale={[10, 3, 1]} />
          <Lightformer
            color={tones[2]}
            intensity={2}
            position={[5, 0, 2]}
            rotation-y={-Math.PI / 2}
            scale={[5, 4, 1]}
          />
          <Lightformer
            color={tones[0]}
            intensity={3}
            position={[-5, 1, 2]}
            rotation-y={Math.PI / 2}
            scale={[5, 5, 1]}
          />
        </Environment>
      </Canvas>
    </div>
  );
}
