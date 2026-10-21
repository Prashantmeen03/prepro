import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router"
import {
  Badge,
  Button,
  Card,
  CircularProgress,
  EmptyState,
  Icon,
  PageHeading,
} from "../components/ui"
import { useInterview } from "../features/interview/hooks/useInterview"

export default function ReportPage() {
  const { interviewId } = useParams()
  const navigate = useNavigate()
  const { report, reports, getReportById, getReports, getResumePdf, loading } = useInterview()

  const [activeTab, setActiveTab] = useState("overview")
  const [openQuestions, setOpenQuestions] = useState({})
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    if (interviewId) {
      getReportById(interviewId)
    } else {
      getReports()
    }
  }, [interviewId])

  // If no interviewId in URL but we have previous reports, load the latest report
  const currentReport = report || (reports && reports.length > 0 ? reports[0] : null)

  const toggleQuestion = (index) => {
    setOpenQuestions((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  const handleCopyAnswer = (text, index) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleDownloadPdf = async () => {
    const idToDownload = interviewId || currentReport?._id
    if (!idToDownload) return

    setDownloading(true)
    try {
      await getResumePdf(idToDownload)
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "5rem 1rem" }}>
        <span className="spinner" style={{ width: "2.5rem", height: "2.5rem", borderColor: "#00838F", borderTopColor: "transparent" }} />
        <h2 style={{ color: "#10242B", marginTop: "1.5rem" }}>Synthesizing Interview Strategy...</h2>
        <p style={{ color: "#3D5A64" }}>Gemini AI is analyzing questions, skills, and model answers.</p>
      </div>
    )
  }

  if (!currentReport) {
    return (
      <EmptyState
        icon="spark"
        title="No Interview Report Found"
        description="You have not created an interview preparation strategy yet. Generate one now with your resume."
        action={
          <Button variant="primary" icon="spark" onClick={() => navigate("/create-interview")}>
            Create Strategy
          </Button>
        }
      />
    )
  }

  const score = currentReport.matchScore || 85
  const technicalList = currentReport.technicalQuestions || []
  const behavioralList = currentReport.behavioralQuestions || []
  const roadmapDays = currentReport.preparationPlan || []
  const skillGaps = currentReport.skillGaps || []

  return (
    <div>
      <PageHeading
        eyebrow="AI INTERVIEW STRATEGY"
        title={currentReport.title || "Custom Interview Plan"}
        description="Comprehensive role preparation guide, mock questions with interviewer intentions, and ATS-tailored resume."
        action={
          <Button
            variant="primary"
            icon="download"
            loading={downloading}
            onClick={handleDownloadPdf}
          >
            Download ATS Resume PDF
          </Button>
        }
      />

      {/* Navigation Tabs */}
      <div className="report-tabs">
        <button
          className={`report-tabs__btn ${activeTab === "overview" ? "report-tabs__btn--active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <Icon name="dashboard" size={16} /> Overview & Score
        </button>
        <button
          className={`report-tabs__btn ${activeTab === "technical" ? "report-tabs__btn--active" : ""}`}
          onClick={() => setActiveTab("technical")}
        >
          <Icon name="spark" size={16} /> Technical ({technicalList.length})
        </button>
        <button
          className={`report-tabs__btn ${activeTab === "behavioral" ? "report-tabs__btn--active" : ""}`}
          onClick={() => setActiveTab("behavioral")}
        >
          <Icon name="user" size={16} /> Behavioral ({behavioralList.length})
        </button>
        <button
          className={`report-tabs__btn ${activeTab === "roadmap" ? "report-tabs__btn--active" : ""}`}
          onClick={() => setActiveTab("roadmap")}
        >
          <Icon name="roadmap" size={16} /> Prep Roadmap ({roadmapDays.length} Days)
        </button>
        <button
          className={`report-tabs__btn ${activeTab === "skills" ? "report-tabs__btn--active" : ""}`}
          onClick={() => setActiveTab("skills")}
        >
          <Icon name="target" size={16} /> Skill Gaps ({skillGaps.length})
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.5rem" }}>
          <Card style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "2.5rem 1.5rem" }}>
            <CircularProgress value={score} size={150} strokeWidth={12} label="Compatibility" />
            <h3 style={{ color: "#10242B", marginTop: "1.25rem", fontSize: "1.2rem" }}>
              {score >= 80 ? "High Match Candidate" : score >= 60 ? "Moderate Match" : "Significant Skill Gaps"}
            </h3>
            <p style={{ color: "#3D5A64", fontSize: "0.86rem", marginTop: "0.4rem", lineHeight: 1.5 }}>
              Calculated using semantic matching between your experience and the target job responsibilities.
            </p>
          </Card>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <Card>
              <span className="eyebrow">EXECUTIVE SUMMARY</span>
              <h3 style={{ fontSize: "1.15rem", color: "#10242B", marginBottom: "0.6rem" }}>
                Interview Strategy Focus
              </h3>
              <p style={{ color: "#3D5A64", fontSize: "0.92rem", lineHeight: 1.6 }}>
                Based on the requirements of <strong>{currentReport.title || "this position"}</strong>,
                interviewers will heavily focus on architectural decision-making, production reliability,
                and your ability to communicate trade-offs under real-world pressure.
              </p>
            </Card>

            <Card>
              <span className="eyebrow">ACTIONABLE NEXT STEPS</span>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem" }}>
                <li style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.88rem", color: "#10242B" }}>
                  <Badge tone="teal" icon="check">1</Badge>
                  Practice the <strong>{technicalList.length} Technical Questions</strong> using model answers.
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.88rem", color: "#10242B" }}>
                  <Badge tone="cyan" icon="check">2</Badge>
                  Structure your responses for the <strong>{behavioralList.length} Behavioral Questions</strong> using the STAR method.
                </li>
                <li style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.88rem", color: "#10242B" }}>
                  <Badge tone="purple" icon="check">3</Badge>
                  Follow the <strong>{roadmapDays.length}-Day Roadmap</strong> to eliminate critical skill gaps.
                </li>
              </ul>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Technical Questions */}
      {activeTab === "technical" && (
        <div className="q-accordion">
          {technicalList.map((item, idx) => {
            const isOpen = openQuestions[idx] !== undefined ? openQuestions[idx] : idx === 0
            return (
              <div key={idx} className="q-accordion__item">
                <div className="q-accordion__header" onClick={() => toggleQuestion(idx)}>
                  <span className="q-accordion__idx">Q{idx + 1}</span>
                  <p className="q-accordion__title">{item.question}</p>
                  <Icon
                    name="chevron"
                    size={18}
                    style={{
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                      color: "#9CB0CF",
                    }}
                  />
                </div>

                {isOpen && (
                  <div className="q-accordion__body">
                    <div className="q-accordion__section">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Badge tone="purple">Interviewer Intention</Badge>
                      </div>
                      <p style={{ color: "#9CB0CF", fontSize: "0.88rem" }}>{item.intention}</p>
                    </div>

                    <div className="q-accordion__section" style={{ borderTop: "1px solid rgba(16, 36, 43, 0.08)", paddingTop: "0.85rem" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Badge tone="teal">Model Answer & Strategy</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon="copy"
                          onClick={() => handleCopyAnswer(item.answer, idx)}
                        >
                          {copiedIndex === idx ? "Copied!" : "Copy Answer"}
                        </Button>
                      </div>
                      <p style={{ color: "#2D4752", lineHeight: 1.6, fontSize: "0.92rem", marginTop: "0.4rem" }}>
                        {item.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Tab 3: Behavioral Questions */}
      {activeTab === "behavioral" && (
        <div className="q-accordion">
          {behavioralList.map((item, idx) => {
            const isOpen = openQuestions[`b_${idx}`] !== undefined ? openQuestions[`b_${idx}`] : true
            return (
              <div key={idx} className="q-accordion__item">
                <div className="q-accordion__header" onClick={() => toggleQuestion(`b_${idx}`)}>
                  <span className="q-accordion__idx" style={{ color: "#8B5CF6", background: "rgba(139, 92, 246, 0.12)" }}>
                    B{idx + 1}
                  </span>
                  <p className="q-accordion__title">{item.question}</p>
                  <Icon
                    name="chevron"
                    size={18}
                    style={{
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                      color: "#9CB0CF",
                    }}
                  />
                </div>

                {isOpen && (
                  <div className="q-accordion__body">
                    <div className="q-accordion__section">
                      <Badge tone="blue">Interviewer Evaluation Criteria</Badge>
                      <p style={{ color: "#3D5A64", fontSize: "0.88rem", marginTop: "0.4rem" }}>
                        {item.intention}
                      </p>
                    </div>

                    <div className="q-accordion__section" style={{ borderTop: "1px solid rgba(16, 36, 43, 0.08)", paddingTop: "0.85rem" }}>
                      <Badge tone="cyan">STAR Structured Answer</Badge>
                      <p style={{ color: "#2D4752", lineHeight: 1.6, fontSize: "0.92rem", marginTop: "0.4rem" }}>
                        {item.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Tab 4: Roadmap */}
      {activeTab === "roadmap" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {roadmapDays.map((day) => (
            <Card key={day.day}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.85rem" }}>
                <Badge tone="cyan">Day {day.day}</Badge>
                <h3 style={{ fontSize: "1.1rem", color: "#10242B" }}>{day.focus}</h3>
              </div>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {day.tasks.map((task, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.6rem",
                      fontSize: "0.9rem",
                      color: "#3D5A64",
                    }}
                  >
                    <span style={{ color: "#00838F", marginTop: "0.2rem" }}>•</span>
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 5: Skill Gaps */}
      {activeTab === "skills" && (
        <Card>
          <span className="eyebrow">SKILL GAP MATRIX</span>
          <h3 style={{ fontSize: "1.2rem", color: "#10242B", marginBottom: "1rem" }}>
            Identified Competency Gaps
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            {skillGaps.map((gap, i) => {
              const tone =
                gap.severity === "high"
                  ? "danger"
                  : gap.severity === "medium"
                  ? "warning"
                  : "teal"
              return (
                <div
                  key={i}
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "0.75rem",
                    background: "#F4FAF9",
                    border: "1px solid rgba(16, 36, 43, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  <span style={{ color: "#10242B", fontWeight: 600, fontSize: "0.92rem" }}>
                    {gap.skill}
                  </span>
                  <Badge tone={tone}>{gap.severity}</Badge>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
