import React, { useEffect } from "react"
import { useNavigate } from "react-router"
import { Badge, Button, Card, Icon, PageHeading } from "../components/ui"
import { useAuth } from "../features/auth/hooks/useAuth"
import { useInterview } from "../features/interview/hooks/useInterview"

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, handleLogout } = useAuth()
  const { reports, getReports } = useInterview()

  useEffect(() => {
    getReports()
  }, [])

  const totalReports = reports?.length || 0
  const avgScore =
    totalReports > 0
      ? Math.round(reports.reduce((acc, r) => acc + (r.matchScore || 0), 0) / totalReports)
      : 82

  const onLogout = async () => {
    await handleLogout()
    navigate("/login")
  }

  return (
    <div>
      <PageHeading
        eyebrow="CANDIDATE PROFILE"
        title="Account & Professional Profile"
        description="Manage your AI PrepPro profile credentials, interview milestones, and application statistics."
        action={
          <Button variant="danger" icon="logout" onClick={onLogout}>
            Log out
          </Button>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem", alignItems: "start" }}>
        {/* User Badge Card */}
        <Card elevated style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
          <div
            style={{
              width: "5rem",
              height: "5rem",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #00838F, #6D28D9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
              fontWeight: 800,
              color: "#FFFFFF",
              margin: "0 auto 1.25rem auto",
              boxShadow: "0 4px 16px rgba(0, 131, 143, 0.25)"
            }}
          >
            {(user?.username?.[0] || "U").toUpperCase()}
          </div>
          <h2 style={{ fontSize: "1.4rem", color: "#10242B", marginBottom: "0.25rem" }}>
            {user?.username || "Candidate"}
          </h2>
          <p style={{ color: "#3D5A64", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
            {user?.email || "candidate@example.com"}
          </p>
          <Badge tone="cyan">Active Candidate</Badge>

          <div style={{ borderTop: "1px solid rgba(16, 36, 43, 0.08)", marginTop: "1.75rem", paddingTop: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-around" }}>
              <div>
                <span style={{ fontSize: "0.72rem", color: "#64808C", textTransform: "uppercase", fontWeight: 700 }}>Strategies</span>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#10242B" }}>{totalReports}</div>
              </div>
              <div>
                <span style={{ fontSize: "0.72rem", color: "#64808C", textTransform: "uppercase", fontWeight: 700 }}>Avg Score</span>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#00838F" }}>{avgScore}%</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Details & Fast Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <Card elevated>
            <h3 style={{ fontSize: "1.1rem", color: "#10242B", marginBottom: "1rem" }}>
              Account Information
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "#64808C", textTransform: "uppercase", fontWeight: 700 }}>Username</label>
                <div style={{ fontSize: "0.95rem", color: "#10242B", marginTop: "0.25rem", padding: "0.6rem 0.8rem", background: "#F4FAF9", border: "1px solid rgba(16, 36, 43, 0.08)", borderRadius: "0.5rem" }}>
                  {user?.username || "—"}
                </div>
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "#64808C", textTransform: "uppercase", fontWeight: 700 }}>Email Address</label>
                <div style={{ fontSize: "0.95rem", color: "#10242B", marginTop: "0.25rem", padding: "0.6rem 0.8rem", background: "#F4FAF9", border: "1px solid rgba(16, 36, 43, 0.08)", borderRadius: "0.5rem" }}>
                  {user?.email || "—"}
                </div>
              </div>
            </div>
          </Card>

          <Card elevated>
            <h3 style={{ fontSize: "1.1rem", color: "#10242B", marginBottom: "1rem" }}>
              Quick Navigation
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              <Button variant="secondary" icon="briefcase" onClick={() => navigate("/create-interview")}>
                Create Strategy
              </Button>
              <Button variant="secondary" icon="resume" onClick={() => navigate("/resume")}>
                Generate ATS Resume
              </Button>
              <Button variant="secondary" icon="history" onClick={() => navigate("/history")}>
                Past Sessions
              </Button>
              <Button variant="secondary" icon="spark" onClick={() => navigate("/questions")}>
                Question Bank
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
