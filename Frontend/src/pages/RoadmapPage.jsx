import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router"
import { Badge, Button, Card, EmptyState, Icon, PageHeading } from "../components/ui"
import { useInterview } from "../features/interview/hooks/useInterview"

export default function RoadmapPage() {
  const { interviewId } = useParams()
  const navigate = useNavigate()
  const { report, reports, getReports, getReportById, loading } = useInterview()

  const [selectedReportId, setSelectedReportId] = useState(interviewId || "")
  const [completedTasks, setCompletedTasks] = useState({})

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
  const plan = activeReport?.preparationPlan || []

  // Total tasks calculation
  const totalTasksCount = plan.reduce((acc, d) => acc + (d.tasks?.length || 0), 0)
  const completedCount = Object.values(completedTasks).filter(Boolean).length
  const progressPct = totalTasksCount > 0 ? Math.round((completedCount / totalTasksCount) * 100) : 0

  const toggleTask = (taskId) => {
    setCompletedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }))
  }

  if (loading && !activeReport) {
    return (
      <div style={{ textAlign: "center", padding: "5rem 1rem" }}>
        <span className="spinner" style={{ width: "2.5rem", height: "2.5rem", borderColor: "#00838F", borderTopColor: "transparent" }} />
        <h2 style={{ color: "#10242B", marginTop: "1.5rem" }}>Building Preparation Timeline...</h2>
        <p style={{ color: "#3D5A64" }}>Generating day-by-day study roadmap.</p>
      </div>
    )
  }

  if (!activeReport) {
    return (
      <EmptyState
        icon="roadmap"
        title="No Preparation Roadmap Found"
        description="Create an interview strategy to generate a day-by-day actionable study plan."
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
        eyebrow="STRATEGIC TIMELINE"
        title="Interview Preparation Roadmap"
        description={`Day-by-day milestone roadmap tailored for: ${activeReport.title || "Your Target Role"}`}
        action={
          <Button variant="primary" icon="spark" onClick={() => navigate("/create-interview")}>
            New Strategy
          </Button>
        }
      />

      {/* Progress & Strategy Selector Bar */}
      <Card elevated style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1.5rem" }}>
          <div style={{ minWidth: "260px" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#00838F", textTransform: "uppercase" }}>
              Selected Session
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
                  width: "100%",
                  maxWidth: "320px"
                }}
              >
                {reports?.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.title || "Untitled Position"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flex: 1, justifyContent: "flex-end", minWidth: "240px" }}>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "0.75rem", color: "#64808C", textTransform: "uppercase", fontWeight: 700 }}>
                Completion Tracker
              </span>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#00796B" }}>
                {completedCount} of {totalTasksCount} Tasks ({progressPct}%)
              </div>
            </div>
            <div style={{ width: "120px", height: "8px", background: "rgba(16, 36, 43, 0.1)", borderRadius: "999px", overflow: "hidden" }}>
              <div style={{ width: `${progressPct}%`, height: "100%", background: "linear-gradient(90deg, #00838F, #00796B)", transition: "width 0.3s ease" }} />
            </div>
          </div>
        </div>
      </Card>

      {/* Timeline List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {plan.map((dayItem, dayIdx) => (
          <Card key={dayIdx} elevated style={{ borderLeft: "4px solid #00838F" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Badge tone="cyan">Day {dayItem.day}</Badge>
                <h3 style={{ fontSize: "1.2rem", color: "#10242B", margin: 0, fontWeight: 700 }}>
                  {dayItem.focus}
                </h3>
              </div>
              <span style={{ fontSize: "0.82rem", color: "#64808C" }}>
                {dayItem.tasks?.length || 0} Key Milestones
              </span>
            </div>

            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {dayItem.tasks?.map((task, tIdx) => {
                const taskId = `day-${dayItem.day}-task-${tIdx}`
                const isDone = !!completedTasks[taskId]

                return (
                  <li
                    key={tIdx}
                    onClick={() => toggleTask(taskId)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.85rem",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.5rem",
                      background: isDone ? "rgba(0, 121, 107, 0.08)" : "#F4FAF9",
                      border: isDone ? "1px solid rgba(0, 121, 107, 0.25)" : "1px solid rgba(16, 36, 43, 0.08)",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    <div
                      style={{
                        width: "1.25rem",
                        height: "1.25rem",
                        borderRadius: "0.25rem",
                        border: isDone ? "2px solid #00796B" : "2px solid #64808C",
                        background: isDone ? "#00796B" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#FFFFFF",
                        flexShrink: 0,
                        marginTop: "2px"
                      }}
                    >
                      {isDone && <Icon name="check" size={12} />}
                    </div>
                    <span
                      style={{
                        fontSize: "0.9rem",
                        color: isDone ? "#64808C" : "#10242B",
                        textDecoration: isDone ? "line-through" : "none",
                        lineHeight: 1.5
                      }}
                    >
                      {task}
                    </span>
                  </li>
                )
              })}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  )
}
