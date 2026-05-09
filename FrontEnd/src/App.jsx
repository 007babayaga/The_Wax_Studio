import { useState, useEffect, useCallback } from "react";
import { PulseLoader } from "react-spinners";

const G = {
  // Warm Candle Light Palette
  amber: "#f4a261",
  deepAmber: "#e76f51",
  warmGold: "#f8d7da",
  cream: "#fdf6e3",
  charcoal: "#2d1b14",
  warmGray: "#8b7355",
  softBrown: "#a68a64",
  waxBeige: "#f5f5dc",
  shadowBrown: "rgba(45,27,20,0.3)",
  // Realistic Neutrals
  offWhite: "#fafafa",
  nearBlack: "#1a0f07",
};

const App = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setStatus("error");
      return;
    }
    setStatus("submitting");
    await new Promise(r => setTimeout(r, 1500));
    setStatus("success");
    setEmail("");
  }, [email]);

  if (!mounted) return null;

  return (
    <div className="studio-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@300;400;500;600&display=swap');
        
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Inter',system-ui,sans-serif;background:#0f0907;overflow-x:hidden}
        
        .studio-page{
          min-height:100vh;
          background:linear-gradient(135deg,#1a0f07 0%,#2d1b14 25%,#3a2a1f 75%,#2d1b14 100%);
          position:relative;
          overflow:hidden;
        }
        
        /* Subtle texture */
        .studio-page::before{
          content:'';position:fixed;
          inset:0;
          background-image:
            radial-gradient(1px 1px at 20px 30px, rgba(244,162,97,0.1), transparent),
            radial-gradient(1px 1px at 40px 70px, rgba(232,111,81,0.08), transparent),
            radial-gradient(0.5px 0.5px at 90px 40px, rgba(248,215,218,0.06), transparent);
          background-size:60px 50px;
          pointer-events:none;
          z-index:0;
        }
        
        /* Hero */
        .studio-hero{
          position:relative;
          z-index:2;
          padding:80px 24px 120px;
          max-width:800px;
          margin:0 auto;
          text-align:center;
        }
        
        .studio-badge{
          display:inline-flex;align-items:center;
          gap:8px;
          background:rgba(244,162,97,0.15);
          border:1px solid rgba(244,162,97,0.3);
          color:${G.amber};
          font-size:12px;font-weight:500;
          letter-spacing:0.15em;
          text-transform:uppercase;
          padding:10px 20px;
          border-radius:24px;
          margin-bottom:40px;
          box-shadow:0 4px 20px rgba(244,162,97,0.2);
        }
        .studio-badge-dot{
          width:6px;height:6px;
          border-radius:50%;
          background:${G.amber};
          animation:studioFlicker 3s ease-in-out infinite;
        }
        @keyframes studioFlicker{
          0%,100%{opacity:1}
          50%{opacity:0.4}
        }
        
        .studio-flame{
          width:100px;height:100px;
          margin:0 auto 32px;
          font-size:64px;
          filter:drop-shadow(0 8px 24px rgba(244,162,97,0.6));
          animation:studioFlameDance 4s ease-in-out infinite;
        }
        @keyframes studioFlameDance{
          0%,100%{transform:scale(1) rotate(-1deg)}
          25%{transform:scale(1.05) rotate(1deg)}
          75%{transform:scale(0.98) rotate(-0.5deg)}
        }
        
        .studio-name{
          font-family:'Playfair Display',serif;
          font-size:clamp(36px,8vw,52px);
          font-weight:500;
          color:${G.warmGold};
          margin-bottom:12px;
          letter-spacing:-0.02em;
          line-height:1.1;
          text-shadow:0 4px 16px rgba(244,162,97,0.3);
        }
        
        .studio-tagline{
          font-size:13px;
          color:rgba(248,215,218,0.8);
          letter-spacing:0.2em;
          text-transform:uppercase;
          margin-bottom:36px;
          font-weight:400;
        }
        
        .studio-lead{
          font-family:'Playfair Display',serif;
          font-style:italic;
          font-size:clamp(20px,4vw,26px);
          color:${G.warmGold};
          line-height:1.6;
          max-width:600px;
          margin:0 auto;
          font-weight:400;
          text-shadow:0 2px 12px rgba(0,0,0,0.5);
        }
        .studio-lead strong{
          font-style:normal;
          color:${G.amber};
          font-weight:500;
        }
        
        /* Content */
        .studio-content{
          position:relative;
          z-index:2;
          max-width:900px;
          margin:0 auto;
          padding:0 24px 80px;
          margin-top:-60px;
        }
        
        /* Cards */
        .studio-card{
          background:linear-gradient(145deg,rgba(255,255,255,0.08),rgba(253,246,227,0.06));
          backdrop-filter:blur(16px);
          border:1px solid rgba(244,162,97,0.15);
          border-radius:24px;
          padding:36px;
          margin-bottom:28px;
          transition:all 0.4s cubic-bezier(0.25,0.46,0.45,0.94);
          box-shadow:0 20px 60px rgba(45,27,20,0.4);
        }
        .studio-card:hover{
          transform:translateY(-8px);
          box-shadow:0 32px 80px rgba(244,162,97,0.25);
          border-color:rgba(244,162,97,0.3);
        }
        
        .studio-section-title{
          font-size:13px;
          color:${G.amber};
          font-weight:500;
          letter-spacing:0.15em;
          text-transform:uppercase;
          margin-bottom:24px;
        }
        
        /* Progress */
        .studio-progress-header{
          display:flex;justify-content:space-between;
          align-items:baseline;
          margin-bottom:20px;
        }
        .studio-progress-label{
          font-size:18px;
          color:${G.offWhite};
          font-weight:500;
        }
        .studio-progress-num{
          font-size:26px;
          color:${G.amber};
          font-weight:600;
        }
        
        .studio-progress-bar{
          height:10px;
          background:rgba(253,246,227,0.15);
          border-radius:10px;
          position:relative;
          overflow:hidden;
          margin-bottom:24px;
        }
        .studio-progress-fill{
          height:100%;
          width:68%;
          background:linear-gradient(90deg,${G.amber},${G.deepAmber});
          border-radius:10px;
          position:relative;
          box-shadow:0 0 16px rgba(244,162,97,0.6);
        }
        .studio-progress-glow{
          position:absolute;
          right:-8px;top:-2px;
          width:16px;height:14px;
          background:${G.amber};
          border-radius:50%;
          box-shadow:0 0 12px ${G.amber};
          animation:studioGlowPulse 2.5s ease-in-out infinite;
        }
        @keyframes studioGlowPulse{
          0%,100%{opacity:0.8;transform:scale(1)}
          50%{opacity:1;transform:scale(1.2)}
        }
        
        .studio-phases{
          display:flex;
          gap:12px;
          background:rgba(253,246,227,0.08);
          padding:16px;
          border-radius:16px;
        }
        .studio-phase{
          flex:1;
          padding:12px 8px;
          text-align:center;
          font-size:11px;
          font-weight:500;
          text-transform:uppercase;
          letter-spacing:0.1em;
          border-radius:12px;
          transition:all 0.3s ease;
        }
        .studio-phase-complete{
          background:${G.amber};
          color:${G.charcoal};
        }
        .studio-phase-active{
          background:linear-gradient(135deg,${G.amber},${G.deepAmber});
          color:white;
          box-shadow:0 4px 16px rgba(244,162,97,0.4);
        }
        .studio-phase-pending{
          color:${G.warmGray};
          background:rgba(166,138,100,0.1);
        }
        
        /* Features */
        .studio-features{
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
          gap:20px;
          margin:20px 0;
        }
        .studio-feature{
          text-align:center;
          padding:24px 16px;
          border-radius:20px;
          background:rgba(253,246,227,0.1);
          border:1px solid rgba(244,162,97,0.1);
          transition:all 0.3s ease;
        }
        .studio-feature:hover{
          background:rgba(244,162,97,0.1);
          border-color:rgba(244,162,97,0.3);
          transform:translateY(-4px);
        }
        .studio-feature-icon{
          font-size:36px;
          margin-bottom:16px;
          display:block;
          filter:drop-shadow(0 4px 12px rgba(244,162,97,0.4));
        }
        .studio-feature-title{
          font-size:14px;
          color:${G.offWhite};
          font-weight:500;
          margin-bottom:8px;
        }
        .studio-feature-text{
          font-size:12px;
          color:${G.warmGray};
          line-height:1.5;
        }
        
        /* Story */
        .studio-story{
          background:linear-gradient(135deg,rgba(244,162,97,0.08),rgba(232,111,81,0.06));
          border:1px solid rgba(244,162,97,0.15);
          text-align:center;
          padding:40px 32px;
          position:relative;
          overflow:hidden;
        }
        .studio-story::before{
          content:'';
          position:absolute;
          width:120px;height:120px;
          background:rgba(244,162,97,0.1);
          border-radius:50%;
          top:-40px;right:-40px;
          filter:blur(40px);
        }
        .studio-story-title{
          font-family:'Playfair Display',serif;
          font-size:22px;
          color:${G.offWhite};
          margin-bottom:16px;
          font-weight:400;
          font-style:italic;
        }
        .studio-story-text{
          max-width:500px;
          margin:0 auto;
          color:${G.warmGray};
          line-height:1.65;
        }
        .studio-tags{
          display:flex;
          flex-wrap:wrap;
          gap:12px;
          justify-content:center;
          margin-top:24px;
        }
        .studio-tag{
          background:rgba(253,246,227,0.2);
          color:${G.amber};
          padding:8px 20px;
          border-radius:20px;
          font-size:11px;
          font-weight:500;
          border:1px solid rgba(244,162,97,0.3);
        }
        
        /* Signup */
        .studio-signup-title{
          font-size:24px;
          color:${G.offWhite};
          font-weight:500;
          margin-bottom:12px;
        }
        .studio-signup-text{
          color:${G.warmGray};
          margin-bottom:32px;
          line-height:1.6;
          font-size:15px;
        }
        
        .studio-form{
          position:relative;
        }
        .studio-input-group{
          display:flex;
          background:rgba(255,255,255,0.1);
          backdrop-filter:blur(12px);
          border:1px solid rgba(244,162,97,0.2);
          border-radius:16px;
          overflow:hidden;
          transition:all 0.3s ease;
          margin-bottom:12px;
        }
        .studio-input-group:focus-within{
          border-color:${G.amber};
          box-shadow:0 8px 32px rgba(244,162,97,0.3);
        }
        .studio-email{
          flex:1;
          padding:18px 24px;
          background:transparent;
          border:none;
          outline:none;
          color:${G.offWhite};
          font-size:16px;
          font-weight:400;
        }
        .studio-email::placeholder{
          color:${G.warmGray};
        }
        .studio-button{
          padding:18px 32px;
          background:linear-gradient(135deg,${G.amber},${G.deepAmber});
          color:${G.charcoal};
          border:none;
          font-size:15px;
          font-weight:600;
          border-radius:0 14px 14px 0;
          cursor:pointer;
          transition:all 0.3s ease;
          letter-spacing:0.05em;
          text-transform:uppercase;
          white-space:nowrap;
        }
        .studio-button:hover{
          background:linear-gradient(135deg,${G.deepAmber},${G.amber});
          transform:translateY(-2px);
          box-shadow:0 12px 32px rgba(244,162,97,0.4);
        }
        .studio-button:disabled{
          opacity:0.7;
          cursor:not-allowed;
        }
        
        .studio-success{
          background:linear-gradient(135deg,${G.waxBeige},${G.warmGold});
          border:1px solid rgba(244,162,97,0.4);
          color:${G.charcoal};
          padding:24px 32px;
          border-radius:16px;
          text-align:center;
          font-weight:500;
          box-shadow:0 8px 32px rgba(244,162,97,0.2);
          animation:studioSlideUp 0.5s ease-out;
        }
        @keyframes studioSlideUp{
          from{opacity:0;transform:translateY(20px)}
          to{opacity:1;transform:translateY(0)}
        }
        .studio-success-icon{
          font-size:24px;
          margin-bottom:12px;
          display:block;
        }
        
        .studio-error{
          color:#f4a261;
          font-size:13px;
          margin-top:12px;
          text-align:center;
          font-weight:500;
        }
        
        /* Footer */
        .studio-footer{
          text-align:center;
          padding:40px 24px;
          color:${G.warmGray};
          font-size:12px;
          font-weight:500;
          letter-spacing:0.15em;
          text-transform:uppercase;
        }
        .studio-dots{
          display:flex;
          gap:8px;
          justify-content:center;
          margin-bottom:16px;
        }
        .studio-dot{
          width:8px;height:8px;
          border-radius:50%;
          background:${G.amber};
          opacity:0.6;
          animation:studioDotFade 2s ease-in-out infinite;
        }
        .studio-dot:nth-child(2){animation-delay:0.3s}
        .studio-dot:nth-child(3){animation-delay:0.6s}
        @keyframes studioDotFade{
          0%,100%{opacity:0.6}
          50%{opacity:1}
        }
        
        @media(max-width:768px){
          .studio-hero{padding:60px 20px 100px}
          .studio-content{padding:0 20px 60px;margin-top:-50px}
          .studio-features{grid-template-columns:1fr}
          .studio-story{padding:28px 24px}
        }
      `}</style>

      {/* Hero */}
      <section className="studio-hero">
        <div className="studio-badge">
          <span className="studio-badge-dot"></span>
          Coming Soon
        </div>
        <div className="studio-flame">🕯️</div>
        <h1 className="studio-name">The Wax Studio</h1>
        <p className="studio-tagline">Handcrafted · Bespoke · Timeless</p>
        <p className="studio-lead">
          Small batch <strong>luxury candles</strong> hand-poured with rare scents and natural waxes.
        </p>
      </section>

      {/* Content */}
      <main className="studio-content">
        {/* Progress */}
        <section className="studio-card">
          <div className="studio-section-title">Crafting Progress</div>
          <div className="studio-progress-header">
            <div className="studio-progress-label">Studio Preparation</div>
            <span className="studio-progress-num">68%</span>
          </div>
          <div className="studio-progress-bar">
            <div className="studio-progress-fill">
              <div className="studio-progress-glow"></div>
            </div>
          </div>
          <div className="studio-phases">
            {[
              {name:"Scent", status:"complete"},
              {name:"Branding", status:"complete"},
              {name:"Development", status:"active"},
              {name:"Polish", status:"pending"},
              {name:"Launch", status:"pending"}
            ].map((phase,i)=>(
              <div key={i} className={`studio-phase studio-phase-${phase.status}`}>
                {phase.status==="complete"?"✓":phase.status==="active"?"▸":"○"} {phase.name}
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="studio-card">
          <div className="studio-features">
            <div className="studio-feature">
              <span className="studio-feature-icon">🪔</span>
              <h3 className="studio-feature-title">Rare Scents</h3>
              <p className="studio-feature-text">Small batch fragrance blends</p>
            </div>
            <div className="studio-feature">
              <span className="studio-feature-icon">🌿</span>
              <h3 className="studio-feature-title">Natural Wax</h3>
              <p className="studio-feature-text">100% clean burning soy & coconut</p>
            </div>
            <div className="studio-feature">
              <span className="studio-feature-icon">💎</span>
              <h3 className="studio-feature-title">Custom Vessels</h3>
              <p className="studio-feature-text">Handmade ceramic containers</p>
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="studio-story">
          <h2 className="studio-story-title">The Craft</h2>
          <p className="studio-story-text">
            Every candle begins with intention. We source rare materials, blend by hand, and pour with care — creating moments that linger.
          </p>
          <div className="studio-tags">
            <span className="studio-tag">Handmade</span>
            <span className="studio-tag">Small Batch</span>
            <span className="studio-tag">Natural</span>
            <span className="studio-tag">Sustainable</span>
          </div>
        </section>

        {/* Signup */}
        <section className="studio-card">
          <div className="studio-signup-title">Be First In Line</div>
          <p className="studio-signup-text">
            Get notified when we launch. First access to new scents and limited releases.
          </p>
          
          {status === "success" ? (
            <div className="studio-success">
              <span className="studio-success-icon">✓</span>
              You're in! We'll send word when the first candles are ready.
            </div>
          ) : (
            <form className="studio-form" onSubmit={handleSubmit}>
              <div className="studio-input-group">
                <input
                  className="studio-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "submitting"}
                />
                <button 
                  className="studio-button" 
                  type="submit" 
                  disabled={status === "submitting"}
                >
                  {status === "submitting" ? <PulseLoader color="#2d1b14" size={6} /> : "Notify Me"}
                </button>
              </div>
              {status === "error" && (
                <div className="studio-error">Please use a valid email address</div>
              )}
            </form>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="studio-footer">
        <div className="studio-dots">
          <span className="studio-dot"></span>
          <span className="studio-dot"></span>
          <span className="studio-dot"></span>
        </div>
        Burning Bright · Coming Soon
      </footer>
    </div>
  );
};

export { App };