import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  FileSearch,
  FlaskConical,
  Bug,
  Wrench,
  ShieldCheck,
  FileText,
  Sparkles,
  Link2,
  Check,
  ChevronRight,
  Bot,
  Radar,
  Github,
  Gauge,
  Globe2,
  HeartPulse,
  Award,
  ShieldAlert,
  Blocks,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CinematicChain } from "@/components/pc/CinematicChain";
import { Globe } from "@/components/pc/Globe";
import { useCinematicMotion } from "@/components/pc/MotionProvider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ProofChain.AI — Evidence-based project auditing" },
      {
        name: "description",
        content:
          "Gemini extracts progress claims, real tests verify them, with traceable findings and reviewable fix proposals.",
      },
      { property: "og:title", content: "ProofChain.AI — Evidence-based project auditing" },
      {
        property: "og:description",
        content:
          "Verify software progress claims with evidence and real tests, then fix and retest.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const steps = [
  {
    icon: FileSearch,
    t: "Claims, decoded.",
    d: "Turn progress reports into specific, testable claims. No vague promises.",
  },
  {
    icon: FlaskConical,
    t: "Evidence, executed.",
    d: "Authorized HTTP checks expose broken links, API failures and known layout issues.",
  },
  {
    icon: Bug,
    t: "The truth, surfaced.",
    d: "Verified. Contradicted. Unsupported. Every finding traces back to evidence.",
  },
  {
    icon: Wrench,
    t: "Inspect. Review. Improve.",
    d: "Review evidence-based findings and download proposed fixes for your team.",
  },
  {
    icon: ShieldCheck,
    t: "Review release readiness.",
    d: "A release verdict grounded in executed checks. Never an AI opinion.",
  },
  {
    icon: FileText,
    t: "Proof you can share.",
    d: "A downloadable PDF or JSON audit trail, from the first claim to the final verdict.",
  },
];

const capabilities = [
  { icon: Bot, t: "Gemini Claim Analysis" },
  { icon: Radar, t: "Claim Contradiction Review" },
  { icon: Github, t: "GitHub Repository Integration" },
  { icon: Gauge, t: "Real-Time Progress Verification Dashboard" },
  { icon: Globe2, t: "Authorized HTTP Website Checks" },
  { icon: HeartPulse, t: "Reviewable Fix Proposals" },
  { icon: Award, t: "Evidence-Based Trust Score" },
  { icon: ShieldAlert, t: "Project-Scoped Audit Investigator" },
  { icon: Blocks, t: "SHA-256 Evidence Fingerprints" },
  { icon: TrendingDown, t: "Weighted Milestone Assessments" },
];

function Capabilities() {
  const reduced = useReducedMotion();
  const { paused, reduced: motionReduced } = useCinematicMotion();
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (paused || motionReduced) return;
    const id = setInterval(() => setActive((v) => (v + 1) % capabilities.length), 2200);
    return () => clearInterval(id);
  }, [paused, motionReduced]);
  return (
    <section className="capabilities-section scroll-mt-24">
      <div className="section-heading">
        <div>
          <p className="section-kicker">ONE SYSTEM. TEN CAPABILITIES.</p>
          <h2>
            An evidence network
            <br />
            <span className="text-primary">for every milestone.</span>
          </h2>
        </div>
        <p>
          Every capability runs on the same loop:
          <br />
          claim, test, evidence, verdict.
        </p>
      </div>
      <div className="capabilities-grid">
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8 }}
          className="globe-wrap dimensional-item"
        >
          <Globe className="h-full w-full" activeIndex={active} />
          <p className="globe-caption font-mono text-[10px] text-muted-foreground">
            CLAIMS · EVIDENCE · ASSESSMENT
          </p>
        </motion.div>
        <ol className="capabilities-list">
          {capabilities.map((c, i) => (
            <motion.li
              key={c.t}
              initial={reduced ? false : { opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.04, duration: 0.45 }}
            >
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                className={`capability-row ${i === active ? "is-active" : ""}`}
              >
                <span className="font-mono text-[10px] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <c.icon className="size-4 shrink-0" />
                <span className="capability-name">{c.t}</span>
                <span className="capability-pulse" aria-hidden="true" />
              </button>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Landing() {
  const reduced = useReducedMotion();
  return (
    <div className="landing-page min-h-screen overflow-x-clip">
      <header className="landing-nav">
        <Link to="/" className="flex items-center gap-2 text-base font-semibold">
          <span className="brand-mark">
            <Link2 className="size-4" />
          </span>
          ProofChain<span className="text-muted-foreground">.AI</span>
        </Link>
        <nav
          aria-label="Main navigation"
          className="hidden items-center gap-8 text-xs text-muted-foreground md:flex"
        >
          <a href="#verification" className="hover:text-foreground">
            Verification
          </a>
          <a href="#proof" className="hover:text-foreground">
            The evidence
          </a>
        </nav>
        <Button asChild variant="outline" size="sm">
          <Link to="/dashboard">
            Dashboard <ArrowUpRight />
          </Link>
        </Button>
      </header>
      <section className="landing-hero">
        <div className="template-type-wall" aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i}>PROOFCHAIN PROOFCHAIN</span>
          ))}
        </div>
        <motion.div
          className="hero-copy"
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
        >
          <span className="hero-eyebrow">
            <Sparkles className="size-3.5 text-primary" /> INDEPENDENT SOFTWARE VERIFICATION
          </span>
          <h1 className="hero-title">
            ProofChain<span className="text-primary">.AI</span>
          </h1>
          <h2 className="hero-promise">
            Less promise. <span className="text-muted-foreground">More proof.</span>
          </h2>
          <p className="hero-description">
            Verify project progress with evidence.
            <br className="hidden sm:block" /> Real tests. Traceable evidence. Confidence to ship.
          </p>
          <div className="hero-actions">
            <Button asChild variant="hero" size="lg">
              <Link to="/projects/new">
                Create your project <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/dashboard">
                Launch Dashboard <ChevronRight />
              </Link>
            </Button>
          </div>
          <p className="mt-4 font-mono text-[10px] text-muted-foreground">
            POWERED BY GOOGLE GEMINI · VERIFIED BY TESTS
          </p>
        </motion.div>
        <CinematicChain />
        <div className="hero-caption">
          <span className="flex items-center gap-2">
            <span className="template-cross" aria-hidden="true">
              ×
            </span>{" "}
            CLAIMS REQUIRE PROOF.
          </span>
          <span className="hidden sm:block">CLAIM → TEST → EVIDENCE → VERDICT</span>
        </div>
      </section>
      <section id="verification" className="verification-section scroll-mt-24">
        <div className="section-heading">
          <div>
            <p className="section-kicker">THE VERIFICATION CHAIN</p>
            <h2>
              Every claim.
              <br />
              <span className="text-muted-foreground">Accounted for.</span>
            </h2>
          </div>
          <p>
            “100% done” isn't proof.
            <br />
            An unbroken trail of evidence is.
          </p>
        </div>
        <div className="verification-grid">
          {steps.map((s, i) => (
            <motion.div
              key={s.t}
              initial={reduced ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ delay: i * 0.05, duration: 0.55 }}
              className="verification-item dimensional-item"
            >
              <div className="flex items-center justify-between">
                <s.icon
                  className={
                    i % 3 === 0
                      ? "size-5 text-primary"
                      : i % 3 === 1
                        ? "size-5 text-accent"
                        : "size-5 text-violet"
                  }
                />
                <span className="font-mono text-[10px] text-muted-foreground">0{i + 1}</span>
              </div>
              <h3 className="mt-8 text-lg font-semibold">{s.t}</h3>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            </motion.div>
          ))}
        </div>
      </section>
      <Capabilities />
      <section id="proof" className="proof-section scroll-mt-24">
        <div className="section-heading">
          <div>
            <p className="section-kicker">BUILT ON EVIDENCE. NOT OPINION.</p>
            <h2>
              Trust is good.
              <br />
              <span className="text-primary">Verification is better.</span>
            </h2>
          </div>
          <ShieldCheck className="size-12 text-primary" />
        </div>
        <div className="grid gap-6 text-sm text-muted-foreground sm:grid-cols-3">
          {[
            "Verdicts backed by executed tests",
            "Human review of proposed fixes",
            "Every finding has an audit trail",
          ].map((t) => (
            <div key={t} className="flex items-center gap-3">
              <Check className="size-4 shrink-0 text-primary" />
              {t}
            </div>
          ))}
        </div>
        <Button asChild variant="hero" size="lg" className="mt-12 rounded-full">
          <Link to="/projects/new">
            Start your first audit <ArrowRight />
          </Link>
        </Button>
      </section>
      <footer className="landing-footer">
        <Link to="/" className="font-semibold text-foreground">
          ProofChain.AI
        </Link>
        <span>AI intelligence. Real accountability.</span>
        <span className="font-mono text-[10px]">CLAIMS REQUIRE PROOF.</span>
      </footer>
    </div>
  );
}
