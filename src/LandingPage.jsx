import { useNavigate } from 'react-router-dom'

const C = {
  bg: '#2C3848',
  nav: '#232F3E',
  panel: '#263040',
  border: '#374454',
  accent: '#4DB8D4',
  green: '#5BC99A',
  text: '#D4E0EC',
  secondary: '#A8BDD0',
  muted: '#6B8299',
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div style={{ fontSize: 32 }}>{icon}</div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: C.text }}>{title}</div>
      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{desc}</div>
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Inter, sans-serif', color: C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800;900&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes glow { 0%,100% { box-shadow:0 0 20px #4DB8D430 } 50% { box-shadow:0 0 35px #4DB8D488 } }
      `}</style>

      {/* Navbar */}
      <nav style={{
        background: C.nav,
        borderBottom: `1px solid ${C.border}`,
        height: 60,
        padding: '0 48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
            <span style={{ color: C.text }}>p</span><span style={{ color: C.accent }}>FPL!</span>
          </div>
          <div style={{ fontSize: 8, color: C.muted, letterSpacing: '.22em', fontWeight: 600, textTransform: 'uppercase' }}>
            predictive fantasy football
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => navigate('/sign-in')}
            style={{
              background: 'transparent',
              border: `1px solid ${C.border}`,
              color: C.secondary,
              borderRadius: 8,
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/sign-up')}
            style={{
              background: C.accent,
              border: 'none',
              color: '#1A2633',
              borderRadius: 8,
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Syne, sans-serif',
              letterSpacing: '.04em',
            }}
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        padding: '96px 48px 80px',
        textAlign: 'center',
        animation: 'fadeUp .7s ease',
        maxWidth: 900,
        margin: '0 auto',
      }}>
        <div style={{
          display: 'inline-block',
          background: `${C.accent}18`,
          border: `1px solid ${C.accent}44`,
          borderRadius: 20,
          padding: '4px 14px',
          fontSize: 11,
          color: C.accent,
          fontWeight: 700,
          letterSpacing: '.12em',
          textTransform: 'uppercase',
          marginBottom: 28,
        }}>
          AI-Powered FPL Analytics
        </div>
        <h1 style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: 'clamp(40px, 6vw, 72px)',
          fontWeight: 900,
          color: C.text,
          lineHeight: 1.05,
          marginBottom: 24,
          letterSpacing: '-.02em',
        }}>
          Outsmart Your<br />
          <span style={{ color: C.accent }}>Gameweek</span>
        </h1>
        <p style={{
          fontSize: 'clamp(15px, 2vw, 18px)',
          color: C.muted,
          lineHeight: 1.7,
          maxWidth: 580,
          margin: '0 auto 40px',
        }}>
          AI-powered FPL predictions, transfers and captain picks — built on live data, free to use.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/sign-up')}
            style={{
              background: C.accent,
              border: 'none',
              color: '#1A2633',
              borderRadius: 10,
              padding: '14px 32px',
              fontSize: 15,
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'Syne, sans-serif',
              letterSpacing: '.06em',
              animation: 'glow 2.5s ease infinite',
            }}
          >
            START FOR FREE →
          </button>
          <button
            onClick={() => navigate('/sign-in')}
            style={{
              background: 'transparent',
              border: `1px solid ${C.border}`,
              color: C.secondary,
              borderRadius: 10,
              padding: '14px 32px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Sign In
          </button>
        </div>
      </section>

      {/* Stats strip */}
      <section style={{
        background: C.nav,
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
        padding: '20px 48px',
        display: 'flex',
        justifyContent: 'center',
        gap: 0,
        flexWrap: 'wrap',
      }}>
        {[
          ['11.2M+', 'FPL Players'],
          ['Free', 'To Use'],
          ['AI-Powered', 'Analytics'],
          ['Live', 'Data'],
        ].map(([val, label], i, arr) => (
          <div key={label} style={{
            textAlign: 'center',
            padding: '8px 48px',
            borderRight: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
          }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 24, fontWeight: 800, color: C.accent, lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4, fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section style={{ padding: '80px 48px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 800, color: C.text, marginBottom: 12 }}>
            Everything you need to win
          </div>
          <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
            Built for serious FPL managers who want data-driven decisions.
          </div>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: 16,
        }}>
          <FeatureCard
            icon="⚽"
            title="Squad Analysis"
            desc="See your full squad on a live pitch with predicted points, FDR ratings and fitness indicators."
          />
          <FeatureCard
            icon="🔄"
            title="AI Transfers"
            desc="Get smart transfer suggestions based on fixtures, form, xGI and value — ranked by projected gain."
          />
          <FeatureCard
            icon="👑"
            title="Captain Picks"
            desc="Confidence-ranked captain recommendations driven by predicted score models and ownership data."
          />
          <FeatureCard
            icon="🏆"
            title="League Compare"
            desc="Live standings for all your leagues with rank movement, head-to-head stats and manager comparisons."
          />
        </div>
      </section>

      {/* CTA */}
      <section style={{
        background: C.nav,
        borderTop: `1px solid ${C.border}`,
        padding: '80px 48px',
        textAlign: 'center',
      }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 36, fontWeight: 800, color: C.text, marginBottom: 16, lineHeight: 1.15 }}>
          Start winning your<br /><span style={{ color: C.accent }}>mini-league today</span>
        </div>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 36, lineHeight: 1.6 }}>
          Free to use. No credit card. Just your FPL Team ID.
        </div>
        <button
          onClick={() => navigate('/sign-up')}
          style={{
            background: C.accent,
            border: 'none',
            color: '#1A2633',
            borderRadius: 10,
            padding: '16px 40px',
            fontSize: 16,
            fontWeight: 800,
            cursor: 'pointer',
            fontFamily: 'Syne, sans-serif',
            letterSpacing: '.06em',
            animation: 'glow 2.5s ease infinite',
          }}
        >
          GET STARTED — IT'S FREE →
        </button>
      </section>

      {/* Footer */}
      <footer style={{
        background: C.bg,
        borderTop: `1px solid ${C.border}`,
        padding: '24px 48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700 }}>
          <span style={{ color: C.text }}>p</span><span style={{ color: C.accent }}>FPL!</span>
          <span style={{ fontSize: 11, color: C.muted, fontFamily: 'Inter, sans-serif', fontWeight: 400, marginLeft: 8 }}>predictivefpl.com</span>
        </div>
        <div style={{ fontSize: 11, color: C.muted }}>
          © {new Date().getFullYear()} pFPL. Not affiliated with the Premier League or FPL.
        </div>
      </footer>
    </div>
  )
}
