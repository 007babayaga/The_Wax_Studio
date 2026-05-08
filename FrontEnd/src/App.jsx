import { PulseLoader } from "react-spinners";

const App = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-6 py-16"
      style={{ background: "#1a0a0a", fontFamily: "'Cormorant Garamond', serif" }}>

      {/* Warm glow bg */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 80% 60% at 50% 0%, rgba(160,60,40,0.18) 0%, transparent 70%),
          radial-gradient(ellipse 60% 80% at 80% 100%, rgba(120,30,20,0.15) 0%, transparent 60%)`
      }} />

      {/* Flame icon */}
      <div className="mb-2 text-3xl">🕯️</div>

      {/* Ornament */}
      <div className="mb-1 tracking-widest text-sm" style={{ color: "#8b3a2a" }}>— ✦ —</div>

      {/* Brand name */}
      <h1 className="text-2xl font-bold tracking-[0.22em] uppercase mb-1"
        style={{ fontFamily: "'Playfair Display', serif", color: "#e8c9a0" }}>
        The Wax Studio
      </h1>
      <p className="text-xs tracking-[0.3em] uppercase mb-8"
        style={{ color: "rgba(200,150,100,0.5)" }}>
        Handcrafted · Bespoke · Timeless
      </p>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-16 h-px" style={{ background: "linear-gradient(90deg, transparent, #8b3a2a88, transparent)" }} />
        <div className="w-1.5 h-1.5 rotate-45" style={{ background: "#8b3a2a", opacity: 0.7 }} />
        <div className="w-16 h-px" style={{ background: "linear-gradient(90deg, transparent, #8b3a2a88, transparent)" }} />
      </div>

      {/* Headline */}
      <h2 className="text-3xl text-center italic mb-3 leading-snug"
        style={{ fontFamily: "'Playfair Display', serif", color: "#f0dfc0", fontWeight: 400 }}>
        Our atelier is<br />being prepared
      </h2>

      {/* Subtext */}
      <p className="text-base font-light text-center max-w-sm leading-relaxed mb-8"
        style={{ color: "rgba(200,170,130,0.55)" }}>
        We are carefully crafting every detail — much like our candles, built with patience, intention & care.
      </p>

      {/* Progress bar */}
      <div className="w-80 mb-8">
        <div className="flex justify-between text-xs tracking-widest uppercase mb-2"
          style={{ color: "rgba(180,130,80,0.5)" }}>
          <span>Crafting Progress</span>
          <span>68%</span>
        </div>
        <div className="w-full h-px mb-4 rounded-full" style={{ background: "rgba(139,58,42,0.2)" }}>
          <div className="h-full rounded-full" style={{
            width: "68%",
            background: "linear-gradient(90deg, #8b3a2a, #c97941, #e8c9a0)"
          }} />
        </div>

        {/* Phase pills */}
        <div className="flex gap-1.5 justify-between">
          {[
            { label: "Design", state: "done" },
            { label: "Brand", state: "done" },
            { label: "Dev", state: "active" },
            { label: "Polish", state: "pending" },
            { label: "Launch", state: "pending" },
          ].map(({ label, state }) => (
            <span key={label} className="flex-1 text-center text-[10px] tracking-wider uppercase py-1.5 rounded-sm border"
              style={{
                color: state === "done" ? "#c97941" : state === "active" ? "#e8c9a0" : "rgba(180,130,80,0.3)",
                borderColor: state === "done" ? "rgba(180,100,50,0.3)" : state === "active" ? "rgba(232,201,160,0.35)" : "rgba(180,130,80,0.1)",
                background: state === "done" ? "rgba(139,58,42,0.12)" : state === "active" ? "rgba(232,201,160,0.06)" : "transparent",
              }}>
              {state === "done" ? "✦ " : state === "active" ? "◈ " : ""}{label}
            </span>
          ))}
        </div>
      </div>

      {/* Loader */}
      <PulseLoader color="#c97941" size={8} margin={6} speedMultiplier={0.7} />

      {/* Footer */}
      <div className="mt-8 text-xs tracking-[0.22em] uppercase"
        style={{ color: "rgba(180,130,80,0.3)" }}>
        Illuminating moments · Coming soon
      </div>
    </div>
  );
};

export { App };