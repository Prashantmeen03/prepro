import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router"
import { Badge, Button, Card, EmptyState, Icon, PageHeading } from "../components/ui"
import { useInterview } from "../features/interview/hooks/useInterview"

export default function SkillGapPage() {
  const { interviewId } = useParams()
  const navigate = useNavigate()
  const { report, reports, getReports, getReportById, loading } = useInterview()

  const [selectedReportId, setSelectedReportId] = useState(interviewId || "")

  useEffect(() => {
    getReports()
    if (interviewId) {
      getReportById(interviewId)
      setSelectedReportId(interviewId)
    }
  }, [interviewId])

  useEffect(() => {
    if (!selectedReportId && reports?.length > 0) {
      setSelectedReportId(reports[0]._id)
    }
  }, [reports, selectedReportId])

  useEffect(() => {
    if (selectedReportId && selectedReportId !== report?._id) {
      getReportById(selectedReportId)
    }
  }, [selectedReportId])

  const activeReport = (report?._id === selectedReportId ? report : null) || reports?.find(r => r._id === selectedReportId) || reports?.[0]

  const gaps = activeReport?.skillGaps || []
  const highGaps = gaps.filter(g => g.severity === "high")
  const midGaps = gaps.filter(g => g.severity === "medium")
  const lowGaps = gaps.filter(g => g.severity === "low")

  if (loading && !activeReport) {
    return (
      <div style={{ textAlign: "center", padding: "5rem 1rem" }}>
        <span className="spinner" style={{ width: "2.5rem", height: "2.5rem", borderColor: "#00838F", borderTopColor: "transparent" }} />
        <h2 style={{ color: "#10242B", marginTop: "1.5rem" }}>Analyzing Skill Discrepancies...</h2>
        <p style={{ color: "#3D5A64" }}>Evaluating candidate capabilities against target job requirements.</p>
      </div>
    )
  }

  if (!activeReport) {
    return (
      <EmptyState
        icon="target"
        title="No Skill Gap Analysis Found"
        description="Generate an interview preparation report to view candidate strength vs skill gap metrics."
        action={
          <Button variant="primary" icon="spark" onClick={() => navigate("/create-interview")}>
            Generate Strategy
          </Button>
        }
      />
    )
  }

  return (
    <div>
      <PageHeading
        eyebrow="CAPABILITY BENCHMARK"
        title="Skill Gap & Competency Analysis"
        description={`Diagnostic breakdown of required skills vs candidate profile for: ${activeReport.title || "Target Role"}`}
        action={
          <Button variant="primary" icon="spark" onClick={() => navigate("/create-interview")}>
            New Strategy
          </Button>
        }
      />

      {/* Target Selector */}
      <Card elevated style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#00838F", textTransform: "uppercase" }}>
              Active Evaluation
            </span>
            <div style={{ marginTop: "0.35rem" }}>
              <select
                value={selectedReportId}
                onChange={(e) => setSelectedReportId(e.target.value)}
                style={{
                  background: "#FFFFFF",
                  color: "#10242B",
                  border: "1px solid rgba(16, 36, 43, 0.15)",
                  padding: "0.6rem 1rem",
                  borderRadius: "0.5rem",
                  fontSize: "0.88rem",
                  outline: "none",
                  minWidth: "260px"
                }}
              >
                {reports?.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.title || "Untitled Position"} ({r.matchScore}% Match)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Badge tone="danger">{highGaps.length} High Severity</Badge>
            <Badge tone="warning">{midGaps.length} Medium</Badge>
            <Badge tone="teal">{lowGaps.length} Low</Badge>
          </div>
        </div>
      </Card>

      {/* Strengths & Overview Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
        <Card elevated>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
            <span style={{ color: "#00796B" }}><Icon name="check" size={20} /></span>
            <h3 style={{ fontSize: "1.15rem", color: "#10242B", margin: 0 }}>Candidate Strengths</h3>
          </div>
          {activeReport.candidateStrengths?.length > 0 ? (
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {activeReport.candidateStrengths.map((str, idx) => (
                <li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", fontSize: "0.88rem", color: "#10242B" }}>
                  <span style={{ color: "#00796B", marginTop: "2px" }}>✓</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "#3D5A64", fontSize: "0.88rem" }}>
              {activeReport.compatibilitySummary || "Candidate demonstrates solid foundational capabilities matching key criteria."}
            </p>
          )}
        </Card>

        <Card elevated>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
            <span style={{ color: "#00838F" }}><Icon name="spark" size={20} /></span>
            <h3 style={{ fontSize: "1.15rem", color: "#10242B", margin: 0 }}>Strategic Recommendations</h3>
          </div>
          {activeReport.recommendations?.length > 0 ? (
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {activeReport.recommendations.map((rec, idx) => (
                <li key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", fontSize: "0.88rem", color: "#3D5A64" }}>
                  <span style={{ color: "#00838F", marginTop: "2px" }}>•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "#3D5A64", fontSize: "0.88rem" }}>
              Focus study sessions on High Severity gaps first to maximize interview callback likelihood.
            </p>
          )}
        </Card>
      </div>

      {/* Severity Categorized Gap Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* High Severity */}
        {highGaps.length > 0 && (
          <Card style={{ borderLeft: "4px solid #D32F2F" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <Badge tone="danger">High Priority</Badge>
              <h4 style={{ fontSize: "1.05rem", color: "#10242B", margin: 0 }}>Critical Skill Gaps</h4>
            </div>
            <p style={{ fontSize: "0.84rem", color: "#3D5A64", marginBottom: "1rem" }}>
              These competencies are essential for the target role and directly influence interviewer assessment.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
              {highGaps.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(211, 47, 47, 0.08)",
                    border: "1px solid rgba(211, 47, 47, 0.25)",
                    padding: "0.6rem 1rem",
                    borderRadius: "0.5rem",
                    color: "#B91C1C",
                    fontSize: "0.9rem",
                    fontWeight: 600
                  }}
                >
                  {item.skill}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Medium Severity */}
        {midGaps.length > 0 && (
          <Card style={{ borderLeft: "4px solid #B45309" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <Badge tone="warning">Moderate Priority</Badge>
              <h4 style={{ fontSize: "1.05rem", color: "#10242B", margin: 0 }}>Secondary Competency Gaps</h4>
            </div>
            <p style={{ fontSize: "0.84rem", color: "#3D5A64", marginBottom: "1rem" }}>
              Important secondary tools or architectures that will enhance your score during technical deep-dives.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
              {midGaps.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(180, 83, 9, 0.08)",
                    border: "1px solid rgba(180, 83, 9, 0.25)",
                    padding: "0.6rem 1rem",
                    borderRadius: "0.5rem",
                    color: "#92400E",
                    fontSize: "0.9rem",
                    fontWeight: 600
                  }}
                >
                  {item.skill}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Low Severity */}
        {lowGaps.length > 0 && (
          <Card style={{ borderLeft: "4px solid #00796B" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <Badge tone="teal">Nice-to-Have</Badge>
              <h4 style={{ fontSize: "1.05rem", color: "#10242B", margin: 0 }}>Supplemental Proficiencies</h4>
            </div>
            <p style={{ fontSize: "0.84rem", color: "#3D5A64", marginBottom: "1rem" }}>
              Nice-to-have tools or methodologies that give you a competitive edge over other candidates.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
              {lowGaps.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(0, 121, 107, 0.08)",
                    border: "1px solid rgba(0, 121, 107, 0.25)",
                    padding: "0.6rem 1rem",
                    borderRadius: "0.5rem",
                    color: "#006356",
                    fontSize: "0.9rem",
                    fontWeight: 600
                  }}
                >
                  {item.skill}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
