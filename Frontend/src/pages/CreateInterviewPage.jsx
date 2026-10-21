import React, { useState, useRef } from "react"
import { useNavigate } from "react-router"
import {
  Badge,
  Button,
  Card,
  Field,
  Icon,
  PageHeading,
  StateMessage,
  TextArea,
} from "../components/ui"
import { useInterview } from "../features/interview/hooks/useInterview"

export default function CreateInterviewPage() {
  const navigate = useNavigate()
  const { generateReport, loading } = useInterview()

  const fileInputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [jobDescription, setJobDescription] = useState("")
  const [selfDescription, setSelfDescription] = useState("")
  const [error, setError] = useState("")

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0]
    if (selected) {
      if (selected.type !== "application/pdf" && !selected.name.endsWith(".pdf")) {
        setError("Only PDF resume files are supported.")
        return
      }
      if (selected.size > 4 * 1024 * 1024) {
        setError("Resume files must be 4MB or smaller.")
        return
      }
      setFile(selected)
      setError("")
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) {
      if (dropped.type !== "application/pdf" && !dropped.name.endsWith(".pdf")) {
        setError("Only PDF resume files are supported.")
        return
      }
      if (dropped.size > 4 * 1024 * 1024) {
        setError("Resume files must be 4MB or smaller.")
        return
      }
      setFile(dropped)
      setError("")
    }
  }

  const handleLoadSample = () => {
    setJobDescription(
      "Senior Full-Stack Engineer at TechFlow Inc.\nRequirements:\n- 4+ years experience with React, Node.js, and Express\n- Strong proficiency in MongoDB, schema design, and query optimization\n- Experience designing RESTful APIs and microservice architectures\n- Knowledge of modern cloud deployment, Docker, and CI/CD pipelines\n- Solid communication skills and passion for mentoring junior engineers."
    )
    setSelfDescription(
      "I have 5 years of experience building modern web applications with React, Node.js, Express, and MongoDB. I have designed scalable backend APIs, led feature delivery across agile sprints, and reduced API response times by 35% through caching."
    )
    setError("")
  }

  const handleGenerate = async () => {
    setError("")

    if (!jobDescription.trim()) {
      setError("Please paste the target job description.")
      return
    }

    if (!file && !selfDescription.trim()) {
      setError("Please either upload a resume PDF or provide a brief self-description.")
      return
    }

    try {
      const report = await generateReport({
        jobDescription,
        selfDescription,
        resumeFile: file,
      })

      if (report && report._id) {
        navigate(`/interview/${report._id}`)
      } else {
        setError("Failed to create report. Please try again.")
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to generate strategy.")
    }
  }

  return (
    <div>
      <PageHeading
        eyebrow="AI STRATEGY CREATOR"
        title="Create Interview Strategy"
        description="Upload your resume and paste the target job description. Gemini AI will analyze the requirements and build a personalized study roadmap and question bank."
        action={
          <Button variant="secondary" icon="spark" onClick={handleLoadSample}>
            Fill Sample Job Data
          </Button>
        }
      />

      {/* Stepper Indicator */}
      <div className="stepper">
        <span className="stepper__step stepper__step--active">
          <i>1</i> Role Details
        </span>
        <div className="stepper__line" />
        <span className="stepper__step">
          <i>2</i> AI Analysis
        </span>
        <div className="stepper__line" />
        <span className="stepper__step">
          <i>3</i> Strategy Ready
        </span>
      </div>

      {error && (
        <div style={{ marginBottom: "1.5rem" }}>
          <StateMessage type="error" text={error} />
        </div>
      )}

      <Card style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
        {/* Step 1: Upload Resume */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
            <div>
              <span className="eyebrow">STEP 1</span>
              <h3 style={{ fontSize: "1.2rem", color: "#10242B" }}>Upload Candidate Resume</h3>
              <p style={{ fontSize: "0.86rem", color: "#3D5A64" }}>
                Our backend extracts your work history, skills, and projects using PDF parsing.
              </p>
            </div>
            <Badge tone="cyan">PDF Format</Badge>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            hidden
            onChange={handleFileChange}
          />

          {!file ? (
            <div
              className="dropzone-box"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="dropzone-box__icon">
                <Icon name="upload" size={26} />
              </div>
              <h4 className="dropzone-box__title">
                Click to browse or drag & drop your resume PDF
              </h4>
              <p className="dropzone-box__sub">PDF only · Max 4MB</p>
              <Badge tone="neutral">Standard ATS Parser</Badge>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1.25rem",
                borderRadius: "0.875rem",
                background: "#F4FAF9",
                border: "1px solid rgba(0, 131, 143, 0.3)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div
                  style={{
                    width: "2.5rem",
                    height: "2.5rem",
                    borderRadius: "0.5rem",
                    background: "rgba(0, 131, 143, 0.12)",
                    color: "#00838F",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="file" size={20} />
                </div>
                <div>
                  <strong style={{ color: "#10242B", fontSize: "0.95rem" }}>{file.name}</strong>
                  <p style={{ color: "#64808C", fontSize: "0.78rem" }}>
                    {(file.size / 1024).toFixed(1)} KB · Ready for AI parsing
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Badge tone="teal" icon="check">
                  Attached
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                >
                  Remove
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Target Job Description */}
        <div>
          <span className="eyebrow">STEP 2</span>
          <h3 style={{ fontSize: "1.2rem", color: "#10242B", marginBottom: "0.25rem" }}>
            Target Job Description
          </h3>
          <p style={{ fontSize: "0.86rem", color: "#3D5A64", marginBottom: "0.85rem" }}>
            Paste the requirements, tech stack, and responsibilities from the job listing.
          </p>

          <TextArea
            name="jobDescription"
            rows={7}
            placeholder="Paste job description here (e.g. Senior Frontend Engineer requiring React, TypeScript, GraphQL...)"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            maxLength={6000}
            required
          />
        </div>

        {/* Step 3: Self-Description (Optional / Fallback) */}
        <div>
          <span className="eyebrow">STEP 3 (OPTIONAL)</span>
          <h3 style={{ fontSize: "1.2rem", color: "#10242B", marginBottom: "0.25rem" }}>
            Candidate Self-Description & Focus Areas
          </h3>
          <p style={{ fontSize: "0.86rem", color: "#3D5A64", marginBottom: "0.85rem" }}>
            Highlight your years of experience, primary goals, or areas you feel least confident in.
          </p>

          <TextArea
            name="selfDescription"
            rows={4}
            placeholder="Briefly describe your background, strengths, or specific topics you want to practice..."
            value={selfDescription}
            onChange={(e) => setSelfDescription(e.target.value)}
          />
        </div>

        {/* Generate Action Button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "1rem", borderTop: "1px solid rgba(156, 176, 207, 0.12)" }}>
          <p style={{ fontSize: "0.82rem", color: "#9CB0CF" }}>
            AI-powered strategy generation typically takes 15–30 seconds.
          </p>
          <Button
            variant="primary"
            size="lg"
            icon="spark"
            loading={loading}
            onClick={handleGenerate}
          >
            {loading ? "Analyzing With Gemini AI..." : "Generate Interview Strategy"}
          </Button>
        </div>
      </Card>
    </div>
  )
}
