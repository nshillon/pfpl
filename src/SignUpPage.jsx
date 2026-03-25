import { SignUp } from '@clerk/clerk-react'

const appearance = {
  variables: {
    colorBackground: '#263040',
    colorInputBackground: '#2C3848',
    colorText: '#D4E0EC',
    colorTextSecondary: '#A8BDD0',
    colorPrimary: '#4DB8D4',
    colorDanger: '#E07B8A',
    borderRadius: '8px',
    fontFamily: 'Inter, sans-serif',
  },
  elements: {
    card: { background: '#263040', border: '1px solid #374454', boxShadow: 'none' },
    headerTitle: { color: '#D4E0EC', fontFamily: 'Syne, sans-serif', fontWeight: 800 },
    headerSubtitle: { color: '#6B8299' },
    formFieldLabel: { color: '#A8BDD0', fontSize: '11px', fontWeight: 600, letterSpacing: '.08em' },
    formFieldInput: { background: '#2C3848', border: '1px solid #374454', color: '#D4E0EC' },
    footerActionLink: { color: '#4DB8D4' },
    dividerLine: { background: '#374454' },
    dividerText: { color: '#6B8299' },
    socialButtonsBlockButton: { background: '#2C3848', border: '1px solid #374454', color: '#D4E0EC' },
    socialButtonsBlockButtonText: { color: '#D4E0EC' },
  },
}

export default function SignUpPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#2C3848',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
      padding: '24px',
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600&display=swap'); *{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 48, fontWeight: 800, lineHeight: 1, marginBottom: 4 }}>
          <span style={{ color: '#D4E0EC' }}>p</span><span style={{ color: '#4DB8D4' }}>FPL!</span>
        </div>
        <div style={{ fontSize: 9, color: '#6B8299', letterSpacing: '.22em', fontWeight: 600, textTransform: 'uppercase' }}>
          predictive fantasy football
        </div>
      </div>
      <SignUp
        afterSignUpUrl="/app"
        signInUrl="/sign-in"
        appearance={appearance}
      />
    </div>
  )
}
