import { Routes, Route } from 'react-router-dom'
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react'
import LandingPage from './LandingPage.jsx'
import SignInPage from './SignInPage.jsx'
import SignUpPage from './SignUpPage.jsx'
import App from './App.jsx'
import AdminPage from './AdminPage.jsx'

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/sign-up" element={<SignUpPage />} />
      <Route
        path="/app"
        element={
          <>
            <SignedIn>
              <App />
            </SignedIn>
            <SignedOut>
              <RedirectToSignIn redirectUrl="/sign-in" />
            </SignedOut>
          </>
        }
      />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  )
}