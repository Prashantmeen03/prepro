import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router"
import { Badge, Button, Card, EmptyState, Icon, PageHeading, Field } from "../components/ui"
import { useInterview } from "../features/interview/hooks/useInterview"

export default function InterviewHistoryPage() {
  const navigate = useNavigate()
  const { reports, getReports, loading } = useInterview()
  const [search, setSearch] = useState("")

  useEffect(() => {
    getReports()
  }, [])

  const filteredReports = reports?.filter((r) =>
    (r.title || "").toLowerCase().includes(search.toLowerCase())
  ) || []

  if (loading && !reports?.length) {
    return (
      <div style={{ textAlign: "center", padding: "5rem 1rem" }}>
        <span className="spinner" style={{ width: "2.5rem", height: "2.5rem", borderColor: "#00838F", borderTopColor: "transparent" }} />
        <h2 style={{ color: "#10242B", marginTop: "1.5rem" }}>Loading Interview History...</h2>
        <p style={{ color: "#3D5A64" }}>Fetching your saved strategies from the database.</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeading
        eyebrow="PORTFOLIO ARCHIVE"
        title="Interview Strategy History"
        description="Review, resume, and download reports and ATS resumes from your past interview preparation sessions."
        action={
          <Button variant="primary" icon="spark" onClick={() => navigate("/create-interview")}>
            New Strategy
          </Button>
        }
      />

      {/* Search Bar */}
      <Card elevated style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <Field
              name="search"
              placeholder="Filter past interviews by job title or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon="search"
            />
          </div>
          <Badge tone="cyan">{filteredReports.length} {filteredReports.length === 1 ? "Session" : "Sessions"}</Badge>
        </div>
      </Card>

      {filteredReports.length === 0 ? (
        <EmptyState
          icon="history"
          title={search ? "No Matching Interviews Found" : "No Past Interviews Yet"}
          description={
            search
              ? `No interview preparation strategies matched "${search}".`
              : "Generate your first AI interview preparation strategy to track your progress here."
          }
          action={
            <Button variant="primary" icon="spark" onClick={() => navigate("/create-interview")}>
              Create Strategy
            </Button>
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filteredReports.map((item) => {
            const scoreTone = item.matchScore >= 80 ? "cyan" : item.matchScore >= 60 ? "teal" : "warning"
            const formattedDate = new Date(item.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric"
            })

            return (
              <Card
                key={item._id}
                interactive
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "1.5rem"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", minWidth: "260px" }}>
                  <div
                    style={{
                      width: "3.25rem",
                      height: "3.25rem",
                      borderRadius: "0.625rem",
                      background: "rgba(0, 131, 143, 0.12)",
                      color: "#00838F",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}
                  >
                    <Icon name="briefcase" size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#10242B", margin: 0 }}>
                      {item.title || "Untitled Position"}
                    </h3>
                    <p style={{ fontSize: "0.82rem", color: "#3D5A64", margin: "0.25rem 0 0 0" }}>
                      Created on {formattedDate}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "0.72rem", color: "#64808C", textTransform: "uppercase", fontWeight: 700 }}>
                      Match Score
                    </span>
                    <div>
                      <Badge tone={scoreTone}>{item.matchScore}% Match</Badge>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon="spark"
                      onClick={() => navigate(`/report/${item._id}`)}
                    >
                      View Report
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon="resume"
                      onClick={() => navigate(`/resume/${item._id}`)}
                    >
                      Resume PDF
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
