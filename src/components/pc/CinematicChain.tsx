import { lazy, Suspense, useCallback, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import sculpture from "@/assets/proofchain-sculpture.jpg";
import { SceneBoundary } from "./SceneBoundary";
import { useCinematicMotion } from "./MotionProvider";

const ChainScene = lazy(() => import("./ChainScene"));

export function CinematicChain() {
  const [ready, setReady] = useState(false);
  const { paused, reduced, toggle } = useCinematicMotion();
  const onReady = useCallback(() => setReady(true), []);
  const onFailure = useCallback(() => setReady(false), []);
  return (
    <div className="cinematic-chain" data-scene-ready={ready || undefined}>
      <img
        src={sculpture}
        alt="Interlocking optical glass and platinum verification chain"
        width={1536}
        height={1024}
        className={ready ? "chain-photo chain-photo-hidden" : "chain-photo"}
      />
      <div
        className={ready ? "chain-canvas chain-canvas-ready" : "chain-canvas"}
        aria-hidden="true"
      >
        <SceneBoundary onFailure={onFailure}>
          <ClientOnly>
            <Suspense fallback={null}>
              <ChainScene paused={paused || reduced} onReady={onReady} />
            </Suspense>
          </ClientOnly>
        </SceneBoundary>
      </div>
      {ready && (
        <Button
          variant="outline"
          size="icon"
          className="chain-motion-control"
          aria-label={paused ? "Play visual motion" : "Pause visual motion"}
          title={paused ? "Play visual motion" : "Pause visual motion"}
          onClick={toggle}
        >
          {paused ? <Play /> : <Pause />}
        </Button>
      )}
    </div>
  );
}
