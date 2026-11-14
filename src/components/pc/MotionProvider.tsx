import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const MotionContext = createContext({ paused: false, reduced: false, toggle: () => {} });
export const useCinematicMotion = () => useContext(MotionContext);

export function MotionProvider({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return (
    <MotionContext.Provider value={{ paused, reduced, toggle: () => setPaused((v) => !v) }}>
      <div className="cinematic-site" data-motion={paused || reduced ? "paused" : "playing"}>
        {children}
      </div>
    </MotionContext.Provider>
  );
}
