import { lazy, Suspense, useCallback, useState } from "react";
import { ClientOnly, useRouterState } from "@tanstack/react-router";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCinematicMotion } from "./MotionProvider";
import { SceneBoundary } from "./SceneBoundary";
import sculpture from "@/assets/proofchain-sculpture.jpg";

const ChainScene = lazy(() => import("./ChainScene"));
export function SiteCinema() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const { paused, reduced, toggle } = useCinematicMotion();
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const onFailure = useCallback(() => setReady(false), []);
  if (path === "/") return null;
  return (
    <>
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="site-cinema" data-scene-ready={ready || undefined}>
          <img
            src={sculpture}
            alt=""
            className={ready ? "site-cinema-fallback hidden" : "site-cinema-fallback"}
          />
          <SceneBoundary onFailure={onFailure}>
            <ClientOnly>
              <Suspense fallback={null}>
                <ChainScene variant="ambient" paused={paused || reduced} onReady={onReady} />
              </Suspense>
            </ClientOnly>
          </SceneBoundary>
        </div>
      </div>
      <Button
        variant="outline"
        size="icon"
        className="site-motion-control"
        aria-label={paused ? "Play cinematic motion" : "Pause cinematic motion"}
        title={paused ? "Play cinematic motion" : "Pause cinematic motion"}
        onClick={toggle}
      >
        {paused ? <Play /> : <Pause />}
      </Button>
    </>
  );
}
