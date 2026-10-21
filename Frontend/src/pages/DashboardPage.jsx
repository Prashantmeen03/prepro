import React, { useEffect } from "react"
import { useNavigate } from "react-router"
import { Badge, Button, Card, CircularProgress, EmptyState, Icon, PageHeading } from "../components/ui"
import { useInterview } from "../features/interview/hooks/useInterview"
import { useAuth } from "../features/auth/hooks/useAuth"

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { reports, getReports, loading } = useInterview()

  useEffect(() => {
    getReports()
  }, [])

  const latestReport = reports && reports.length > 0 ? reports[0] : null

  // Calculate stats
  const totalInterviews = reports?.length || 0
  const avgScore =
    totalInterviews > 0
      ? Math.round(reports.reduce((acc, r) => acc + (r.matchScore || 0), 0) / totalInterviews)
      : 84

  return (
    <div>
      <PageHeading
        eyebrow="AI CAREER DASHBOARD"
        title={`Welcome back, ${user?.username || "Candidate"}!`}
        description="Here is your active interview preparation overview, match scores, and upcoming study roadmaps."
        action={
          <Button
            variant="primary"
            icon="spark"
            onClick={() => navigate("/create-interview")}
          >
            Create New Strategy
          </Button>
        }
      />

      {/* Top 4 Stats Widgets */}
      <div className="dash-stats-grid">
        <Card className="stat-widget">
          <div className="stat-widget__icon stat-widget__icon--cyan">
            <Icon name="briefcase" size={24} />
          </div>
          <div className="stat-widget__info">
            <span>Interview Strategies</span>
            <strong>{totalInterviews}</strong>
          </div>
        </Card>

        <Card className="stat-widget">
          <div className="stat-widget__icon stat-widget__icon--teal">
            <Icon name="target" size={24} />
          </div>
          <div className="stat-widget__info">
            <span>Avg Match Score</span>
            <strong>{avgScore}%</strong>
          </div>
        </Card>

        <Card className="stat-widget">
          <div className="stat-widget__icon stat-widget__icon--purple">
            <Icon name="roadmap" size={24} />
          </div>
          <div className="stat-widget__info">
            <span>Active Roadmaps</span>
            <strong>{totalInterviews > 0 ? totalInterviews : 1}</strong>
          </div>
        </Card>

        <Card className="stat-widget">
          <div className="stat-widget__icon stat-widget__icon--blue">
            <Icon name="resume" size={24} />
          </div>
          <div className="stat-widget__info">
            <span>ATS Resumes Ready</span>
            <strong>{totalInterviews > 0 ? totalInterviews : 1}</strong>
          </div>
        </Card>
      </div>

      {/* Quick Action Banner */}
      <div className="quick-banner">
        <div>
          <span className="eyebrow" style={{ color: "#00838F" }}>
            ATS RESUME BUILDER
          </span>
          <h3 style={{ fontSize: "1.25rem", color: "#10242B", margin: "0.2rem 0" }}>
            Tailor your resume for maximum ATS pass-through
          </h3>
          <p style={{ fontSize: "0.88rem", color: "#3D5A64" }}>
            Our AI generates single-column, recruiter-verified resumes matched to your target role.
          </p>
        </div>
        <Button
          variant="secondary"
          icon="download"
          onClick={() =>
            latestReport ? navigate(`/interview/${latestReport._id}`) : navigate("/create-interview")
          }
        >
          {latestReport ? "Generate Resume for Latest Role" : "Create Interview First"}
        </Button>
      </div>

      {/* Main Grid: Latest Spotlight + Skill Gap Preview */}
      <div className="dash-main-grid">
        {/* Latest Spotlight Card */}
        <Card className="spotlight-card">
          <div>
            <div className="spotlight-card__top">
              <div>
                <span className="eyebrow">LATEST STRATEGY</span>
                <h3 className="spotlight-card__title">
                  {latestReport?.title || "Senior Software Engineer"}
                </h3>
                <p className="spotlight-card__meta">
                  Generated on{" "}
                  {latestReport?.createdAt
                    ? new Date(latestReport.createdAt).toLocaleDateString()
                    : "Recently"}
                </p>
              </div>
              <Badge tone="cyan">Ready to practice</Badge>
            </div>

            <div className="spotlight-card__gauge-wrap">
              <CircularProgress
                value={latestReport?.matchScore || 88}
                size={110}
                strokeWidth={9}
                label="Role Match"
              />
              <div>
                <h4 style={{ color: "#10242B", fontSize: "1rem", marginBottom: "0.25rem" }}>
                  High Compatibility
                </h4>
                <p style={{ color: "#3D5A64", fontSize: "0.85rem", lineHeight: 1.5 }}>
                  Your profile strongly aligns with core requirements. Focus on bridging the
                  identified skill gaps to maximize interview performance.
                </p>
              </div>
            </div>
          </div>

          <div className="spotlight-card__actions">
            <Button
              variant="primary"
              size="sm"
              icon="spark"
              onClick={() =>
                latestReport
                  ? navigate(`/interview/${latestReport._id}`)
                  : navigate("/create-interview")
              }
            >
              {latestReport ? "Open Full Strategy" : "Generate Strategy"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon="roadmap"
              onClick={() => navigate("/roadmap")}
            >
              View Roadmap
            </Button>
          </div>
        </Card>

        {/* Strengths & Improvement Card */}
        <Card>
          <span className="eyebrow">ANALYSIS SNAPSHOT</span>
          <h3 style={{ fontSize: "1.15rem", color: "#10242B", margin: "0.3rem 0 1rem 0" }}>
            Skill Matrix Highlights
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div
              style={{
                padding: "0.75rem",
                borderRadius: "0.5rem",
                background: "rgba(0, 121, 107, 0.08)",
                border: "1px solid rgba(0, 121, 107, 0.25)",
              }}
            >
              <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#00796B" }}>
                CORE STRENGTHS
              </span>
              <p style={{ fontSize: "0.84rem", color: "#10242B", marginTop: "0.2rem" }}>
                System Architecture, Full-Stack Engineering, API Design & Scalability.
              </p>
            </div>

            <div
              style={{
                padding: "0.75rem",
                borderRadius: "0.5rem",
                background: "rgba(180, 83, 9, 0.08)",
                border: "1px solid rgba(180, 83, 9, 0.25)",
              }}
            >
              <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#92400E" }}>
                AREAS FOR REVIEW
              </span>
              <p style={{ fontSize: "0.84rem", color: "#10242B", marginTop: "0.2rem" }}>
                Cloud Deployment Pipelines, Microservices Performance Tuning.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Interviews Table */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <span className="eyebrow">PREPARATION LOG</span>
            <h3 style={{ fontSize: "1.25rem", color: "#10242B" }}>Recent Interview Strategies</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/history")}>
            View All ({reports?.length || 0})
          </Button>
        </div>

        {reports && reports.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Target Position</th>
                  <th>Date Created</th>
                  <th>Match Score</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report._id}>
                    <td>
                      <strong>{report.title || "Custom Role Strategy"}</strong>
                    </td>
                    <td>{new Date(report.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Badge
                        tone={
                          report.matchScore >= 80
                            ? "cyan"
                            : report.matchScore >= 60
                            ? "teal"
                            : "warning"
                        }
                      >
                        {report.matchScore}% Match
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon="chevron-right"
                        onClick={() => navigate(`/interview/${report._id}`)}
                      >
                        View Strategy
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="briefcase"
            title="No Interview Plans Yet"
            description="Create your first tailored interview plan by uploading your resume and target job description."
            action={
              <Button
                variant="primary"
                icon="spark"
                onClick={() => navigate("/create-interview")}
              >
                Create My First Plan
              </Button>
            }
          />
        )}
      </Card>
    </div>
  )
}
