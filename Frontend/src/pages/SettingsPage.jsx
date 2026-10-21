import React, { useState, useEffect } from "react"
import { Badge, Button, Card, Icon, PageHeading, StateMessage } from "../components/ui"
import { useAuth } from "../features/auth/hooks/useAuth"
import api from "../services/api"

export default function SettingsPage() {
  const { user } = useAuth()
  const [apiStatus, setApiStatus] = useState("checking")
  const [apiTimestamp, setApiTimestamp] = useState("")
  const [checking, setChecking] = useState(false)
  const [feedback, setFeedback] = useState("")

  const checkBackendHealth = async () => {
    setChecking(true)
    setFeedback("")
    try {
      const res = await api.get("/")
      if (res.data?.status === "online") {
        setApiStatus("online")
        setApiTimestamp(res.data.timestamp || new Date().toISOString())
        setFeedback("Backend server is connected and responsive!")
      } else {
        setApiStatus("warning")
        setFeedback("Backend responded with unexpected status.")
      }
    } catch (err) {
      setApiStatus("offline")
      setFeedback("Unable to reach backend server. Please verify the API is running on port 3000.")
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    checkBackendHealth()
  }, [])

  return (
    <div>
      <PageHeading
        eyebrow="SYSTEM & CONFIGURATION"
        title="Settings & System Diagnostics"
        description="Verify backend connectivity, API health, and application preferences for AI PrepPro."
        action={
          <Button variant="secondary" icon="spark" loading={checking} onClick={checkBackendHealth}>
            Re-check Health
          </Button>
        }
      />

      {feedback && (
        <div style={{ marginBottom: "1.5rem" }}>
          <StateMessage
            type={apiStatus === "online" ? "success" : "error"}
            title={apiStatus === "online" ? "Health Check Passed" : "Health Warning"}
            text={feedback}
          />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Backend Diagnostics Card */}
        <Card elevated>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  width: "2.5rem",
                  height: "2.5rem",
                  borderRadius: "0.5rem",
                  background: apiStatus === "online" ? "rgba(0, 214, 160, 0.15)" : "rgba(255, 77, 109, 0.15)",
                  color: apiStatus === "online" ? "#00D6A0" : "#FF4D6D",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Icon name={apiStatus === "online" ? "check" : "close"} size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.1rem", color: "#10242B", margin: 0 }}>Express API Server</h3>
                <p style={{ fontSize: "0.82rem", color: "#3D5A64", margin: "0.2rem 0 0 0" }}>
                  Endpoint: {import.meta.env.VITE_API_URL || "http://localhost:3000"}
                </p>
              </div>
            </div>

            <Badge tone={apiStatus === "online" ? "teal" : "danger"}>
              {apiStatus === "online" ? "Connected (200 OK)" : "Disconnected"}
            </Badge>
          </div>

          <div style={{ background: "#F4FAF9", border: "1px solid rgba(16, 36, 43, 0.08)", padding: "1rem", borderRadius: "0.5rem", fontSize: "0.85rem", color: "#3D5A64" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span>CORS Credential Support:</span>
              <strong style={{ color: "#00796B" }}>Enabled (withCredentials: true)</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span>Gemini AI Engine:</span>
              <strong style={{ color: "#00838F" }}>gemini-2.5-flash</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Last Heartbeat:</span>
              <strong style={{ color: "#10242B" }}>{apiTimestamp ? new Date(apiTimestamp).toLocaleTimeString() : "Pending"}</strong>
            </div>
          </div>
        </Card>

        {/* Security & Session Card */}
        <Card elevated>
          <h3 style={{ fontSize: "1.1rem", color: "#10242B", marginBottom: "0.75rem" }}>
            Security & Authentication Storage
          </h3>
          <p style={{ fontSize: "0.86rem", color: "#3D5A64", lineHeight: 1.5, marginBottom: "1rem" }}>
            Tokens are protected by HTTP-only and SameSite cookie policies to prevent cross-site scripting (XSS) leaks.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Badge tone="cyan">HTTP-Only Cookie</Badge>
            <Badge tone="purple">SameSite=Lax</Badge>
            <Badge tone="teal">Token Blacklist Active</Badge>
          </div>
        </Card>
      </div>
    </div>
  )
}
