import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router"
import { Badge, Button, Card, EmptyState, Icon, PageHeading, Field } from "../components/ui"
import { useInterview } from "../features/interview/hooks/useInterview"

export default function QuestionBankPage() {
  const { interviewId } = useParams()
  const navigate = useNavigate()
  const { report, reports, getReports, getReportById, loading } = useInterview()

  const [filterType, setFilterType] = useState("all") // all | technical | behavioral
  const [search, setSearch] = useState("")
  const [selectedReportId, setSelectedReportId] = useState(interviewId || "")
  const [openItems, setOpenItems] = useState({})
  const [copiedId, setCopiedId] = useState(null)

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

  const technical = activeReport?.technicalQuestions || []
  const behavioral = activeReport?.behavioralQuestions || []

  const allQuestions = [
    ...technical.map((q, idx) => ({ ...q, type: "technical", id: `tech-${idx}`, label: `Tech Q${idx + 1}` })),
    ...behavioral.map((q, idx) => ({ ...q, type: "behavioral", id: `beh-${idx}`, label: `Beh Q${idx + 1}` }))
  ]

  const filteredQuestions = allQuestions.filter(q => {
    if (filterType !== "all" && q.type !== filterType) return false
    if (search && !q.question.toLowerCase().includes(search.toLowerCase()) && !q.intention.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const toggleItem = (id) => {
    setOpenItems(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading && !activeReport) {
    return (
      <div style={{ textAlign: "center", padding: "5rem 1rem" }}>
        <span className="spinner" style={{ width: "2.5rem", height: "2.5rem", borderColor: "#00838F", borderTopColor: "transparent" }} />
        <h2 style={{ color: "#10242B", marginTop: "1.5rem" }}>Curating Question Bank...</h2>
        <p style={{ color: "#3D5A64" }}>Analyzing technical and behavioral questions.</p>
      </div>
    )
  }

  if (!activeReport) {
    return (
      <EmptyState
        icon="spark"
        title="No Questions Available"
        description="Create an interview strategy to populate your personalized question bank with AI model answers."
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
        eyebrow="INTELLIGENT REPOSITORY"
        title="Interview Question Bank"
        description={`Interactive technical & behavioral questions curated for: ${activeReport.title || "Your Target Role"}`}
        action={
          <Button variant="primary" icon="spark" onClick={() => navigate("/create-interview")}>
            New Strategy
          </Button>
        }
      />

      {/* Strategy selector and filter bar */}
      <Card elevated style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1, minWidth: "280px" }}>
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
                outline: "none"
              }}
            >
              {reports?.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.title || "Untitled Position"}
                </option>
              ))}
            </select>

            <div style={{ flex: 1 }}>
              <Field
                name="search"
                placeholder="Search questions or skills..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon="search"
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              variant={filterType === "all" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setFilterType("all")}
            >
              All ({allQuestions.length})
            </Button>
            <Button
              variant={filterType === "technical" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setFilterType("technical")}
            >
              Technical ({technical.length})
            </Button>
            <Button
              variant={filterType === "behavioral" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setFilterType("behavioral")}
            >
              Behavioral ({behavioral.length})
            </Button>
          </div>
        </div>
      </Card>

      {/* Questions Accordion List */}
      <div className="q-accordion">
        {filteredQuestions.map((q) => {
          const isOpen = !!openItems[q.id]
          const isTech = q.type === "technical"

          return (
            <div key={q.id} className="q-accordion__item">
              <div className="q-accordion__header" onClick={() => toggleItem(q.id)}>
                <span className={`q-accordion__idx ${!isTech ? "q-accordion__idx--purple" : ""}`}>
                  {q.label}
                </span>
                <span className="q-accordion__title">{q.question}</span>
                <Badge tone={isTech ? "cyan" : "purple"}>
                  {isTech ? "Technical" : "Behavioral"}
                </Badge>
                <span style={{ color: "#9CB0CF", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                  <Icon name="chevron" size={16} />
                </span>
              </div>

              {isOpen && (
                <div className="q-accordion__body">
                  <div className="q-accordion__section">
                    <span style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", color: "#00E5FF", letterSpacing: "0.08em" }}>
                      Interviewer Intent
                    </span>
                    <p style={{ color: "#9CB0CF", fontSize: "0.88rem", marginTop: "0.2rem" }}>
                      {q.intention}
                    </p>
                  </div>

                  <div className="q-accordion__section" style={{ borderTop: "1px solid rgba(16, 36, 43, 0.08)", paddingTop: "0.85rem" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                      <span style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", color: "#00796B", letterSpacing: "0.08em" }}>
                        Model Answer & Framework
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={copiedId === q.id ? "check" : "copy"}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopy(q.answer, q.id)
                        }}
                      >
                        {copiedId === q.id ? "Copied!" : "Copy Answer"}
                      </Button>
                    </div>
                    <p style={{ color: "#2D4752", lineHeight: 1.6, fontSize: "0.92rem" }}>
                      {q.answer}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
