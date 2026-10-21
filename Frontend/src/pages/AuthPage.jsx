import React, { useEffect, useState } from "react"
import { useNavigate, useLocation } from "react-router"
import { Button, Field, Icon, Logo, StateMessage } from "../components/ui"
import { useAuth } from "../features/auth/hooks/useAuth"

export default function AuthPage({ initialMode = "login" }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, handleLogin, handleRegister, authError, loading: authLoading } = useAuth()

  // Determine mode from prop or path
  const [mode, setMode] = useState(
    location.pathname === "/register" ? "register" : initialMode
  )
  const isLogin = mode === "login"

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user && !authLoading) navigate("/", { replace: true })
  }, [user, authLoading, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setNotice("")

    if (!email || !password || (!isLogin && !username)) {
      setError("Please fill in all required fields.")
      return
    }

    setLoading(true)
    try {
      if (isLogin) {
        await handleLogin({ email, password })
      } else {
        const result = await handleRegister({ username, email, password })
        if (result.requiresConfirmation) {
          setNotice(result.message)
          setMode("login")
          return
        }
      }
      navigate("/")
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Authentication failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      {/* Left Showcase Banner */}
      <section className="auth-showcase">
        <Logo />
        <div className="auth-showcase__content">
          <span className="eyebrow">AI-POWERED INTERVIEW COACH</span>
          <h1>
            Prepare smarter.<br />
            <em>Interview stronger.</em>
          </h1>
          <p>
            Transform any job description into a high-impact interview preparation strategy,
            expert answers, and an ATS-tailored resume in seconds.
          </p>

          <div className="auth-showcase__stats">
            <div className="stat-item">
              <strong>94%</strong>
              <span>Interview confidence boost</span>
            </div>
            <div className="stat-item">
              <strong>3.4x</strong>
              <span>Higher callback rate</span>
            </div>
          </div>
        </div>

        <div className="auth-showcase__glow" />
      </section>

      {/* Right Form Wrap */}
      <section className="auth-form-wrap">
        <div className="auth-form-box">
          <div className="auth-form-box__header">
            <span className="eyebrow">
              {isLogin ? "WELCOME BACK" : "START FREE TODAY"}
            </span>
            <h2>{isLogin ? "Sign in to AI PrepPro" : "Create your account"}</h2>
            <p>
              {isLogin
                ? "Enter your credentials to access your interview strategies."
                : "Join thousands of job seekers preparing with AI."}
            </p>
          </div>

          {error && <StateMessage type="error" text={error} />}
          {authError && !error && <StateMessage type="error" text={authError} />}
          {notice && <StateMessage type="success" text={notice} />}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <Field
                label="Username"
                name="username"
                icon="user"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            )}

            <Field
              label="Email Address"
              name="email"
              type="email"
              icon="mail"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div style={{ position: "relative" }}>
              <Field
                label="Password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "0.85rem",
                  top: "2.15rem",
                  background: "none",
                  border: "none",
                  color: "#64808C",
                  cursor: "pointer",
                }}
                aria-label="Toggle password visibility"
              >
                <Icon name={showPassword ? "eye-off" : "eye"} size={16} />
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading || authLoading}
              icon="spark"
            >
              {isLogin ? "Sign in to Dashboard" : "Create My Account"}
            </Button>
          </form>

          <p style={{ fontSize: "0.88rem", color: "#3D5A64", textAlign: "center" }}>
            {isLogin ? "Don't have an account yet?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setError("")
                setMode(isLogin ? "register" : "login")
              }}
              style={{
                background: "none",
                border: "none",
                color: "#00838F",
                fontWeight: "700",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              {isLogin ? "Sign up now" : "Log in"}
            </button>
          </p>
        </div>
      </section>
    </div>
  )
}
