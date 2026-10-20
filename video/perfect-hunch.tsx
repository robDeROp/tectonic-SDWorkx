import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  Easing,
  Html5Audio,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
} from "remotion";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  FileCheck2,
  FileText,
  FolderOpen,
  GitBranch,
  Link2,
  LockKeyhole,
  Mail,
  MessageSquare,
  MousePointer2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { HunchMark } from "../components/hunch";
import { DURATION, FPS, timeline } from "./story";

const C = {
  cream: "#FFF8EF",
  white: "#FFFFFF",
  ink: "#12343B",
  muted: "#4F666B",
  line: "#E6D5BE",
  coral: "#FF7A50",
  coralSoft: "#FFE4D9",
  yellow: "#FFC53D",
  yellowSoft: "#FFF1C9",
  teal: "#1F8A87",
  tealSoft: "#D7F1EC",
  berry: "#C04A88",
  berrySoft: "#FBE2EF",
};

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

function ramp(frame: number, start: number, end: number) {
  return interpolate(frame, [start, end], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });
}

function enter(frame: number, delay = 0) {
  return spring({
    frame: frame - delay,
    fps: FPS,
    config: { damping: 24, stiffness: 110, mass: 0.9 },
  });
}

function Reveal({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const value = enter(frame, delay);
  return (
    <div
      style={{
        opacity: interpolate(frame, [delay, delay + 14], [0, 1], clamp),
        transform: `translateY(${(1 - value) * 35}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Logo({
  size = 54,
  light = false,
}: {
  size?: number;
  light?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.15 }}>
      <HunchMark size={size * 1.18} />
      <span
        className="display"
        style={{
          fontSize: size,
          letterSpacing: -size * 0.055,
          lineHeight: 1,
          color: light ? C.cream : C.ink,
        }}
      >
        hunch
      </span>
    </div>
  );
}

function Pill({
  children,
  color = C.teal,
  background = C.tealSoft,
  style,
}: {
  children: ReactNode;
  color?: string;
  background?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        borderRadius: 99,
        padding: "10px 19px",
        background,
        color,
        fontSize: 23,
        fontWeight: 650,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Tile({
  children,
  color = C.teal,
  background = C.tealSoft,
  size = 62,
}: {
  children: ReactNode;
  color?: string;
  background?: string;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.25,
        background,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

function Scene({
  children,
  index,
  dark = false,
}: {
  children: ReactNode;
  index: number;
  dark?: boolean;
}) {
  const frame = useCurrentFrame();
  const chapter = timeline[index];
  const opacity =
    index === timeline.length - 1
      ? interpolate(frame, [0, 12], [0, 1], clamp)
      : interpolate(
          frame,
          [0, 12, chapter.duration - 12, chapter.duration],
          [0, 1, 1, 0],
          clamp,
        );
  return (
    <AbsoluteFill
      style={{
        background: dark ? C.ink : C.cream,
        color: dark ? C.cream : C.ink,
        opacity,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: dark ? 0.07 : 0.12,
          backgroundImage: `radial-gradient(${dark ? C.cream : C.ink} 1px, transparent 1px)`,
          backgroundSize: "30px 30px",
          maskImage: "linear-gradient(to bottom, transparent 12%, black 90%)",
        }}
      />
      <div style={{ position: "absolute", top: 55, left: 108 }}>
        <Logo light={dark} />
      </div>
      <div
        className="eyebrow"
        style={{
          position: "absolute",
          top: 75,
          right: 112,
          color: dark ? "#ABC6C8" : C.muted,
        }}
      >
        {index === 0 || index === 7
          ? "Create the perfect hunch"
          : `0${index} / ${chapter.label}`}
      </div>
      {children}
      <div
        style={{
          position: "absolute",
          left: 112,
          right: 112,
          bottom: 57,
          display: "flex",
          alignItems: "center",
          gap: 24,
          fontSize: 20,
          color: dark ? "#ABC6C8" : C.muted,
        }}
      >
        <span style={{ width: 350, flexShrink: 0 }}>
          {index === 0
            ? "A Hunch product vision"
            : "Find it. Understand it. Trust it."}
        </span>
        <div style={{ display: "flex", flex: 1, gap: 8 }}>
          {timeline.map((item, i) => (
            <div
              key={item.id}
              style={{
                height: 3,
                flex: item.seconds,
                borderRadius: 3,
                background: dark ? "#355159" : C.line,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${i < index ? 100 : i > index ? 0 : (frame / chapter.duration) * 100}%`,
                  height: "100%",
                  background: C.coral,
                }}
              />
            </div>
          ))}
        </div>
        <span style={{ minWidth: 32, textAlign: "right" }}>
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
    </AbsoluteFill>
  );
}

function Heading({
  children,
  subtitle,
  light = false,
}: {
  children: ReactNode;
  subtitle?: ReactNode;
  light?: boolean;
}) {
  return (
    <Reveal style={{ position: "absolute", top: 175, left: 112, right: 112 }}>
      <h2 style={{ fontSize: 84, lineHeight: 1.08, letterSpacing: -3.5 }}>
        {children}
      </h2>
      {subtitle && (
        <p
          style={{
            marginTop: 23,
            fontSize: 31,
            color: light ? "#ABC6C8" : C.muted,
          }}
        >
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}

function Intro() {
  const f = useCurrentFrame();
  const prompt = "How do we handle departure holiday pay?";
  const typed = prompt.slice(0, Math.floor(ramp(f, 40, 123) * prompt.length));
  return (
    <Scene index={0}>
      <div
        style={{
          position: "absolute",
          width: 680,
          height: 680,
          borderRadius: "50%",
          background: C.yellowSoft,
          top: 198,
          right: 58,
          transform: `scale(${0.85 + enter(f, 6) * 0.15})`,
        }}
      />
      <Reveal style={{ position: "absolute", left: 112, top: 250 }}>
        <p className="eyebrow" style={{ color: C.teal, marginBottom: 28 }}>
          Every great answer starts here
        </p>
        <h1 style={{ fontSize: 126, lineHeight: 1.03, letterSpacing: -6 }}>
          Create the
          <br />
          perfect <span style={{ color: C.coral }}>hunch.</span>
        </h1>
      </Reveal>
      <Reveal delay={18} style={{ position: "absolute", left: 112, top: 580 }}>
        <p style={{ fontSize: 35, color: C.muted }}>
          One question. All the context to move forward.
        </p>
      </Reveal>
      <Reveal delay={28} style={{ position: "absolute", left: 112, top: 695 }}>
        <div
          className="card"
          style={{
            width: 1000,
            height: 120,
            display: "flex",
            alignItems: "center",
            padding: "0 28px",
            gap: 22,
          }}
        >
          <Sparkles color={C.teal} size={34} />
          <span style={{ flex: 1, fontSize: 29 }}>
            {typed}
            {f < 132 && (
              <span style={{ opacity: Math.floor(f / 10) % 2, color: C.coral }}>
                |
              </span>
            )}
          </span>
          <Tile background={f > 133 ? C.coral : C.yellowSoft} color={C.ink}>
            {f > 143 ? <Check size={30} /> : <ArrowRight size={30} />}
          </Tile>
        </div>
      </Reveal>
      <Reveal delay={10} style={{ position: "absolute", top: 220, right: 110 }}>
        <Img
          src={staticFile("hunch-mascot-1-happy.png")}
          style={{
            width: 600,
            height: 600,
            objectFit: "contain",
            transform: `translateY(${Math.sin(f / 24) * 9}px) rotate(${Math.sin(f / 40) * 2}deg)`,
          }}
        />
      </Reveal>
      <Reveal
        delay={136}
        style={{ position: "absolute", right: 232, top: 821 }}
      >
        <Pill>
          <Check size={24} /> Let’s connect the dots.
        </Pill>
      </Reveal>
    </Scene>
  );
}

const sources = [
  {
    name: "Microsoft Teams",
    short: "T",
    color: "#6264A7",
    soft: "#EDEDF8",
    from: "Payroll team · General",
    text: "Anyone know how departure holiday pay works?",
    action: "Turn a conversation into a hunch",
    Icon: MessageSquare,
  },
  {
    name: "Outlook",
    short: "O",
    color: "#0875C9",
    soft: "#E2F1FF",
    from: "New message · Customer question",
    text: "Could you help me with an employee’s final payslip?",
    action: "Start directly from an email",
    Icon: Mail,
  },
  {
    name: "Hunch",
    short: "",
    color: C.coral,
    soft: C.coralSoft,
    from: "Your workspace · New hunch",
    text: "What should I check when an employee leaves?",
    action: "Or simply ask in Hunch",
    Icon: Sparkles,
  },
];

function Capture() {
  const f = useCurrentFrame();
  return (
    <Scene index={1}>
      <Heading subtitle="Start in Teams, Outlook, or Hunch itself.">
        Great questions start anywhere.
      </Heading>
      {sources.map((source, i) => (
        <Reveal
          key={source.name}
          delay={20 + i * 24}
          style={{ position: "absolute", left: 112 + i * 578, top: 375 }}
        >
          <div
            className="card"
            style={{
              width: 540,
              height: 395,
              padding: 32,
              transform: `translateY(${-8 * Math.sin((f - i * 20) / 48)}px)`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <Tile background={source.soft} color={source.color} size={68}>
                {i === 2 ? (
                  <HunchMark size={52} />
                ) : (
                  <b style={{ fontSize: 38 }}>{source.short}</b>
                )}
              </Tile>
              <h3 style={{ fontSize: 32 }}>{source.name}</h3>
            </div>
            <p style={{ fontSize: 22, color: C.muted, marginTop: 30 }}>
              {source.from}
            </p>
            <p
              style={{
                fontSize: 32,
                fontWeight: 550,
                marginTop: 17,
                lineHeight: 1.32,
              }}
            >
              {source.text}
            </p>
            <div
              style={{
                position: "absolute",
                left: 32,
                right: 32,
                bottom: 30,
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: source.color,
                fontSize: 23,
                fontWeight: 650,
              }}
            >
              <source.Icon size={25} /> {source.action}
            </div>
          </div>
          <div
            style={{
              marginTop: 22,
              textAlign: "center",
              color: C.coral,
              opacity: ramp(f, 100 + i * 12, 120 + i * 12),
            }}
          >
            <ArrowDown size={38} />
          </div>
        </Reveal>
      ))}
      <Reveal
        delay={132}
        style={{
          position: "absolute",
          top: 860,
          width: "100%",
          textAlign: "center",
        }}
      >
        <Pill
          color={C.ink}
          background={C.yellowSoft}
          style={{ fontSize: 29, padding: "14px 34px" }}
        >
          <HunchMark size={37} /> One question. One connected hunch.
        </Pill>
      </Reveal>
    </Scene>
  );
}

const nodes = [
  {
    x: 136,
    y: 410,
    title: "Documents",
    detail: "Guides, policies & working files",
    score: 96,
    color: C.teal,
    soft: C.tealSoft,
    Icon: FileText,
  },
  {
    x: 1300,
    y: 410,
    title: "People",
    detail: "Colleagues who know the topic",
    score: 94,
    color: C.berry,
    soft: C.berrySoft,
    Icon: Users,
  },
  {
    x: 136,
    y: 735,
    title: "Related hunches",
    detail: "Questions already explored",
    score: 91,
    color: C.coral,
    soft: C.coralSoft,
    Icon: GitBranch,
  },
  {
    x: 1300,
    y: 735,
    title: "Conversations",
    detail: "The reasoning behind the answer",
    score: 88,
    color: "#9A6900",
    soft: C.yellowSoft,
    Icon: MessageSquare,
  },
];

function Connect() {
  const f = useCurrentFrame();
  return (
    <Scene index={2} dark>
      <Heading
        light
        subtitle="Relevant documents, contacts, conversations, and other hunches come together."
      >
        The right context. Connected.
      </Heading>
      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", inset: 0 }}
      >
        {nodes.map((node, i) => {
          const right = i % 2 === 1;
          const x1 = right ? 1188 : 732;
          const x2 = right ? node.x : node.x + 484;
          const y2 = node.y + 82;
          const path = `M ${x1} 630 C ${right ? 1260 : 660} 630, ${right ? 1220 : 700} ${y2}, ${x2} ${y2}`;
          const progress = ramp(f, 22 + i * 15, 63 + i * 15);
          return (
            <g key={node.title}>
              <path d={path} stroke="#36575C" strokeWidth={3} fill="none" />
              <path
                d={path}
                pathLength={1}
                stroke={node.color}
                strokeWidth={4}
                strokeDasharray={1}
                strokeDashoffset={1 - progress}
                fill="none"
              />
              <circle
                cx={x2}
                cy={y2}
                r={7}
                fill={node.color}
                opacity={progress}
              />
            </g>
          );
        })}
      </svg>
      <Reveal delay={8} style={{ position: "absolute", left: 732, top: 525 }}>
        <div
          style={{
            width: 456,
            height: 210,
            padding: "24px 32px",
            borderRadius: 30,
            background: C.cream,
            color: C.ink,
            boxShadow: "0 0 0 15px #28474E",
            textAlign: "center",
          }}
        >
          <Pill color={C.ink} background={C.yellowSoft}>
            <Sparkles size={22} /> HN–024
          </Pill>
          <h3 style={{ fontSize: 33, marginTop: 15 }}>Departure holiday pay</h3>
          <p style={{ fontSize: 23, marginTop: 9, color: C.muted }}>
            Your question, with context.
          </p>
        </div>
      </Reveal>
      {nodes.map((node, i) => (
        <Reveal
          key={node.title}
          delay={42 + i * 17}
          style={{ position: "absolute", left: node.x, top: node.y }}
        >
          <div
            style={{
              width: 484,
              minHeight: 164,
              background: "#1E424A",
              border: "1px solid #3B5B61",
              borderRadius: 25,
              padding: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Tile color={node.color} background={node.soft} size={52}>
                <node.Icon size={27} />
              </Tile>
              <h3 style={{ fontSize: 29, flex: 1 }}>{node.title}</h3>
              <span style={{ fontSize: 28, color: node.soft, fontWeight: 700 }}>
                {Math.round(node.score * ramp(f, 80 + i * 17, 136 + i * 17))}%
              </span>
            </div>
            <p style={{ fontSize: 22, color: "#C4D6D6", marginTop: 21 }}>
              {node.detail}
            </p>
          </div>
        </Reveal>
      ))}
    </Scene>
  );
}

function ScoreBar({
  score,
  delay = 0,
  color = C.teal,
}: {
  score: number;
  delay?: number;
  color?: string;
}) {
  const f = useCurrentFrame();
  const progress = ramp(f, delay, delay + 60);
  return (
    <div style={{ width: 220 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 22,
          marginBottom: 10,
        }}
      >
        <span style={{ color: C.muted }}>Relevance</span>
        <b style={{ color }}>{Math.round(score * progress)}%</b>
      </div>
      <div style={{ height: 9, background: C.tealSoft, borderRadius: 8 }}>
        <div
          style={{
            width: `${score * progress}%`,
            background: color,
            height: "100%",
            borderRadius: 8,
          }}
        />
      </div>
    </div>
  );
}

function Understand() {
  return (
    <Scene index={3}>
      <Heading subtitle="See what matters, who can help, and where the context comes from.">
        Relevance, made visible.
      </Heading>
      <Reveal delay={16} style={{ position: "absolute", left: 112, top: 365 }}>
        <div
          className="card"
          style={{
            width: 1696,
            height: 530,
            display: "flex",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: 490,
              padding: 40,
              background: C.ink,
              color: C.cream,
            }}
          >
            <Pill background="#355159" color={C.yellow}>
              <Sparkles size={23} /> HN–024
            </Pill>
            <h3
              style={{
                fontSize: 48,
                lineHeight: 1.12,
                marginTop: 30,
                letterSpacing: -1.5,
              }}
            >
              Departure
              <br />
              holiday pay
            </h3>
            <p style={{ color: "#ABC6C8", fontSize: 26, marginTop: 22 }}>
              The context behind your customer’s question.
            </p>
            <div
              style={{
                marginTop: 39,
                borderTop: "1px solid #426068",
                paddingTop: 25,
                display: "flex",
                gap: 14,
                alignItems: "center",
                fontSize: 25,
              }}
            >
              <CheckCheck color={C.yellow} size={30} /> Ready to explore
            </div>
          </div>
          <div style={{ flex: 1, padding: "30px 38px" }}>
            <div
              style={{
                display: "flex",
                gap: 34,
                fontSize: 26,
                borderBottom: `1px solid ${C.line}`,
                paddingBottom: 20,
              }}
            >
              <b style={{ color: C.teal }}>
                Documents <span style={{ fontSize: 20 }}>3</span>
              </b>
              <span style={{ color: C.muted }}>People</span>
              <span style={{ color: C.muted }}>Related hunches</span>
            </div>
            {[
              [
                "Departure holiday-pay guide",
                "SharePoint · Payroll Belgium",
                96,
              ],
              ["Final payslip policy", "Team documents · Updated today", 89],
              [
                "Employee departure checklist",
                "Knowledge library · HR operations",
                72,
              ],
            ].map(([title, subtitle, score], i) => (
              <Reveal key={title} delay={30 + i * 20}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    padding: "25px 0",
                    borderBottom: i < 2 ? `1px solid ${C.line}` : "none",
                  }}
                >
                  <Tile size={58}>
                    <FileText size={29} />
                  </Tile>
                  <div style={{ flex: 1 }}>
                    <b style={{ fontSize: 27 }}>{title}</b>
                    <p style={{ fontSize: 21, color: C.muted, marginTop: 7 }}>
                      {subtitle}
                    </p>
                  </div>
                  <ScoreBar score={Number(score)} delay={38 + i * 22} />
                </div>
              </Reveal>
            ))}
            <Reveal delay={135}>
              <p
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  color: C.teal,
                  fontSize: 22,
                }}
              >
                <Search size={23} /> Every connection has a source you can
                inspect.
              </p>
            </Reveal>
          </div>
        </div>
      </Reveal>
      <Reveal
        delay={150}
        style={{
          position: "absolute",
          left: 112,
          right: 112,
          top: 920,
          textAlign: "right",
          color: C.muted,
          fontSize: 20,
        }}
      >
        Illustrative relevance scores
      </Reveal>
    </Scene>
  );
}

function Evolve() {
  const f = useCurrentFrame();
  const update = ramp(f, 122, 174);
  const score = Math.round(84 + update * 12);
  return (
    <Scene index={4}>
      <Heading subtitle="The documents you work on are automatically linked. Their relevance is scored again.">
        Your work moves. Context keeps up.
      </Heading>
      <Reveal delay={15} style={{ position: "absolute", left: 145, top: 375 }}>
        <div
          className="card"
          style={{
            width: 710,
            height: 500,
            padding: 36,
            transform: `rotate(${-1.6 + ramp(f, 18, 80) * 0.8}deg)`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              paddingBottom: 26,
              borderBottom: `1px solid ${C.line}`,
            }}
          >
            <Tile size={55}>
              <FileText size={29} />
            </Tile>
            <div>
              <b style={{ fontSize: 27 }}>Departure guide.docx</b>
              <p style={{ fontSize: 20, color: C.muted }}>
                Your connected document workspace
              </p>
            </div>
          </div>
          <h3 style={{ fontSize: 36, marginTop: 28 }}>Departure holiday pay</h3>
          <div
            style={{
              width: "95%",
              height: 13,
              background: "#E8EEEB",
              marginTop: 30,
              borderRadius: 6,
            }}
          />
          <div
            style={{
              width: "83%",
              height: 13,
              background: "#E8EEEB",
              marginTop: 17,
              borderRadius: 6,
            }}
          />
          <div
            style={{
              width: "90%",
              height: 13,
              background: "#E8EEEB",
              marginTop: 17,
              borderRadius: 6,
            }}
          />
          <div
            style={{
              height: 80,
              marginTop: 26,
              borderRadius: 12,
              background: C.tealSoft,
              padding: "20px 18px",
              opacity: ramp(f, 50, 90),
              overflow: "hidden",
            }}
          >
            <p
              style={{
                fontSize: 25,
                whiteSpace: "nowrap",
                clipPath: `inset(0 ${(1 - ramp(f, 55, 108)) * 100}% 0 0)`,
              }}
            >
              Updated guidance for the final payslip.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              marginTop: 26,
              color: C.teal,
              fontSize: 23,
              opacity: ramp(f, 98, 114),
            }}
          >
            <CheckCheck size={25} /> Changes saved
          </div>
        </div>
      </Reveal>
      <div
        style={{
          position: "absolute",
          left: 900,
          top: 576,
          color: C.teal,
          opacity: ramp(f, 100, 120),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 11,
                height: 11,
                borderRadius: "50%",
                background: C.teal,
                opacity: 0.3 + 0.7 * Math.max(0, Math.sin(f / 8 - i)),
              }}
            />
          ))}
          <ArrowRight size={42} />
        </div>
      </div>
      <Reveal delay={35} style={{ position: "absolute", left: 1070, top: 390 }}>
        <div className="card" style={{ width: 670, height: 470, padding: 36 }}>
          <Pill color={C.ink} background={C.yellowSoft}>
            <HunchMark size={28} /> HN–024 · Departure holiday pay
          </Pill>
          <h3 style={{ fontSize: 42, marginTop: 30 }}>Always in context.</h3>
          <div
            style={{
              display: "flex",
              gap: 14,
              alignItems: "center",
              marginTop: 27,
              fontSize: 27,
              opacity: ramp(f, 105, 125),
            }}
          >
            <Link2 size={30} color={C.teal} /> Document linked automatically
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 26,
              marginTop: 28,
            }}
          >
            <div
              className="display"
              style={{ fontSize: 86, letterSpacing: -4, color: C.teal }}
            >
              {score}
              <span style={{ fontSize: 45 }}>%</span>
            </div>
            <div style={{ color: C.muted, fontSize: 25 }}>
              Relevance
              <br />
              <span style={{ color: C.teal, opacity: update }}>
                ↑ Updated from 84%
              </span>
            </div>
            <RefreshCw
              size={36}
              color={C.teal}
              style={{
                marginLeft: "auto",
                transform: `rotate(${update * 360}deg)`,
              }}
            />
          </div>
          <div
            style={{
              height: 10,
              background: C.tealSoft,
              borderRadius: 8,
              marginTop: 13,
            }}
          >
            <div
              style={{
                width: `${score}%`,
                background: C.teal,
                height: 10,
                borderRadius: 8,
              }}
            />
          </div>
          <p
            style={{
              marginTop: 26,
              fontSize: 22,
              color: C.muted,
              opacity: ramp(f, 185, 205),
            }}
          >
            Connected hunches receive the updated context.
          </p>
        </div>
      </Reveal>
    </Scene>
  );
}

function Permissions() {
  const f = useCurrentFrame();
  return (
    <Scene index={5} dark>
      <Reveal style={{ position: "absolute", top: 225, left: 112 }}>
        <p className="eyebrow" style={{ color: "#9DD8CD", marginBottom: 32 }}>
          Connected, with boundaries
        </p>
        <h2 style={{ fontSize: 100, letterSpacing: -4, lineHeight: 1.07 }}>
          More context.
          <br />
          <span style={{ color: C.yellow }}>Same permissions.</span>
        </h2>
        <p
          style={{
            width: 780,
            fontSize: 32,
            color: "#BCD0D1",
            marginTop: 40,
            lineHeight: 1.5,
          }}
        >
          Access rights stay with your existing
          <br />
          document systems.
        </p>
        <Reveal delay={90} style={{ marginTop: 43 }}>
          <Pill background="#294B50" color="#B8E6DA" style={{ fontSize: 25 }}>
            <ShieldCheck size={29} /> Context respects who can see what.
          </Pill>
        </Reveal>
      </Reveal>
      <Reveal delay={15} style={{ position: "absolute", top: 290, right: 145 }}>
        <div
          style={{
            width: 680,
            height: 580,
            borderRadius: 36,
            background: "#1C4148",
            border: "1px solid #3B5B61",
            padding: 42,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 19,
              paddingBottom: 31,
              borderBottom: "1px solid #3B5B61",
            }}
          >
            <Tile background={C.tealSoft} color={C.teal} size={76}>
              <LockKeyhole size={40} />
            </Tile>
            <div>
              <h3 style={{ fontSize: 34 }}>Source permissions</h3>
              <p style={{ fontSize: 23, color: "#BCD0D1", marginTop: 6 }}>
                SharePoint · Payroll Belgium
              </p>
            </div>
          </div>
          {[
            ["Payroll team", "Can view", true],
            ["Document owner", "Can edit", true],
            ["Outside this group", "No access", false],
          ].map(([label, status, allowed], i) => (
            <Reveal key={String(label)} delay={40 + i * 22}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 17,
                  height: 101,
                  borderBottom: "1px solid #3B5B61",
                  fontSize: 26,
                }}
              >
                <Users size={30} color="#BCD0D1" />
                <span style={{ flex: 1 }}>{label}</span>
                <span
                  style={{
                    fontSize: 23,
                    color: allowed ? "#9DD8CD" : "#BCD0D1",
                  }}
                >
                  {status}
                </span>
                {allowed ? (
                  <Check size={26} color="#9DD8CD" />
                ) : (
                  <LockKeyhole size={24} color={C.yellow} />
                )}
              </div>
            </Reveal>
          ))}
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              color: C.yellow,
              marginTop: 29,
              fontSize: 23,
              opacity: ramp(f, 118, 139),
            }}
          >
            <ShieldCheck size={27} /> Existing access rules are preserved.
          </div>
        </div>
      </Reveal>
    </Scene>
  );
}

function Share() {
  const f = useCurrentFrame();
  const reviewed = f >= 170;
  return (
    <Scene index={6}>
      <Heading subtitle="Hunch proposes where useful documents belong. You review the next step.">
        Good work deserves a shared home.
      </Heading>
      <Reveal delay={15} style={{ position: "absolute", left: 112, top: 385 }}>
        <div className="card" style={{ width: 1110, height: 510, padding: 39 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 13,
              color: C.teal,
              fontSize: 25,
              fontWeight: 650,
            }}
          >
            <Sparkles size={29} /> Suggested next action
          </div>
          <h3 style={{ fontSize: 44, letterSpacing: -1.2, marginTop: 21 }}>
            Share the updated departure guide
          </h3>
          <p
            style={{
              fontSize: 28,
              color: C.muted,
              marginTop: 16,
              maxWidth: 900,
            }}
          >
            Make this knowledge available to the team that needs it.
          </p>
          <div
            style={{
              display: "flex",
              gap: 22,
              alignItems: "center",
              marginTop: 33,
            }}
          >
            <div
              style={{
                flex: 1,
                background: C.tealSoft,
                borderRadius: 18,
                padding: 22,
                display: "flex",
                gap: 16,
                alignItems: "center",
              }}
            >
              <FileCheck2 size={35} color={C.teal} />
              <div>
                <b style={{ fontSize: 25 }}>Departure guide.docx</b>
                <p style={{ fontSize: 21, color: C.muted, marginTop: 4 }}>
                  Updated & linked to HN–024
                </p>
              </div>
            </div>
            <ArrowRight size={33} color={C.teal} />
            <div
              style={{
                flex: 1,
                background: "#E7F2F3",
                borderRadius: 18,
                padding: 22,
                display: "flex",
                gap: 16,
                alignItems: "center",
              }}
            >
              <FolderOpen size={35} color={C.teal} />
              <div>
                <b style={{ fontSize: 25 }}>Team SharePoint</b>
                <p style={{ fontSize: 21, color: C.muted, marginTop: 4 }}>
                  Payroll Belgium / Knowledge
                </p>
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              marginTop: 34,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: reviewed ? C.tealSoft : C.coral,
                padding: "16px 25px",
                borderRadius: 14,
                fontSize: 26,
                fontWeight: 650,
                color: reviewed ? C.teal : C.ink,
                transform: `scale(${1 - Math.sin(ramp(f, 160, 175) * Math.PI) * 0.035})`,
              }}
            >
              {reviewed ? <CheckCheck size={27} /> : <ArrowUpRight size={27} />}
              {reviewed ? "Ready for your approval" : "Review suggestion"}
            </div>
            <span style={{ color: C.muted, fontSize: 22 }}>
              <LockKeyhole size={20} /> Permissions checked
            </span>
          </div>
        </div>
      </Reveal>
      <Reveal delay={48} style={{ position: "absolute", left: 1280, top: 410 }}>
        <div style={{ width: 520, padding: 32 }}>
          <Tile size={85} background={C.yellowSoft} color={C.ink}>
            <Users size={43} />
          </Tile>
          <h3
            style={{
              fontSize: 48,
              lineHeight: 1.13,
              marginTop: 28,
              letterSpacing: -1.5,
            }}
          >
            Less searching.
            <br />
            More shared
            <br />
            understanding.
          </h3>
          <p
            style={{
              color: C.muted,
              fontSize: 28,
              marginTop: 27,
              lineHeight: 1.45,
            }}
          >
            The next person starts
            <br />
            with the context you built.
          </p>
        </div>
      </Reveal>
      {f >= 110 && f < 190 && (
        <div
          style={{
            position: "absolute",
            top: 830 - ramp(f, 110, 156) * 16,
            left: 1000 - ramp(f, 110, 156) * 555,
            opacity: interpolate(f, [110, 122, 178, 190], [0, 1, 1, 0], clamp),
          }}
        >
          <MousePointer2
            size={44}
            fill={C.ink}
            color={C.white}
            strokeWidth={1.5}
            style={{ transform: "rotate(-12deg)" }}
          />
        </div>
      )}
    </Scene>
  );
}

function Closing() {
  const f = useCurrentFrame();
  return (
    <Scene index={7}>
      <div
        style={{
          position: "absolute",
          width: 760,
          height: 760,
          background: C.yellowSoft,
          borderRadius: "50%",
          right: -60,
          top: 170,
        }}
      />
      <Reveal style={{ position: "absolute", left: 112, top: 225 }}>
        <p className="eyebrow" style={{ color: C.teal, marginBottom: 32 }}>
          From one question to shared knowledge
        </p>
        <h2 style={{ fontSize: 124, letterSpacing: -5.5, lineHeight: 1.03 }}>
          Create the
          <br />
          perfect <span style={{ color: C.coral }}>hunch.</span>
        </h2>
        <p style={{ fontSize: 34, color: C.muted, marginTop: 35 }}>
          Find it. Understand it. Trust it.
        </p>
      </Reveal>
      <Reveal delay={26} style={{ position: "absolute", left: 112, top: 655 }}>
        <div style={{ display: "flex", gap: 14 }}>
          {[
            ["Capture", MessageSquare],
            ["Connect", GitBranch],
            ["Understand", Sparkles],
            ["Share", Users],
          ].map(([label, Icon], i) => {
            const Glyph = Icon as typeof Users;
            return (
              <Reveal key={String(label)} delay={35 + i * 14}>
                <Pill
                  color={C.ink}
                  background={i === 3 ? C.tealSoft : C.white}
                  style={{
                    border: `1px solid ${C.line}`,
                    fontSize: 25,
                    padding: "15px 21px",
                  }}
                >
                  <Glyph size={25} /> {String(label)}
                </Pill>
              </Reveal>
            );
          })}
        </div>
      </Reveal>
      <Reveal delay={10} style={{ position: "absolute", top: 220, right: 100 }}>
        <Img
          src={staticFile("hunch-mascot-1-happy.png")}
          style={{
            width: 600,
            height: 600,
            transform: `translateY(${Math.sin(f / 30) * 8}px) rotate(${Math.sin(f / 45) * 2}deg)`,
          }}
        />
      </Reveal>
      <Reveal delay={87} style={{ position: "absolute", left: 112, top: 801 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 20,
            padding: "20px 29px",
            borderRadius: 17,
            background: C.ink,
            color: C.cream,
            fontSize: 30,
            fontWeight: 650,
          }}
        >
          It starts with your next question{" "}
          <ArrowRight size={31} color={C.coral} />
        </div>
      </Reveal>
    </Scene>
  );
}

const scenes = [
  Intro,
  Capture,
  Connect,
  Understand,
  Evolve,
  Permissions,
  Share,
  Closing,
];

export function PerfectHunch({ music = true }: { music?: boolean }) {
  const [fontHandle] = useState(() => delayRender("Loading Hunch brand fonts"));
  useEffect(() => {
    Promise.all([
      document.fonts.load('750 100px "Bricolage Grotesque Variable"'),
      document.fonts.load('400 30px "Figtree Variable"'),
      document.fonts.load('650 30px "Figtree Variable"'),
    ])
      .then(() => continueRender(fontHandle))
      .catch(cancelRender);
  }, [fontHandle]);

  return (
    <AbsoluteFill className="hunch-film" style={{ background: C.cream }}>
      {music && (
        <Html5Audio
          src={staticFile("hunch-video/soundtrack.wav")}
          volume={(frame) =>
            interpolate(
              frame,
              [0, 45, DURATION - 75, DURATION],
              [0, 0.55, 0.55, 0],
              clamp,
            )
          }
        />
      )}
      {timeline.map((chapter, i) => {
        const Component = scenes[i];
        return (
          <Sequence
            key={chapter.id}
            name={chapter.label}
            from={chapter.from}
            durationInFrames={chapter.duration}
          >
            <Component />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
