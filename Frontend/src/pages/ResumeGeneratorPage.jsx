import React, { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router"
import {
  Badge,
  Button,
  Card,
  CircularProgress,
  ConfirmDialog,
  EmptyState,
  Field,
  Icon,
  Modal,
  PageHeading,
  StateMessage,
  TextArea,
} from "../components/ui"
import api from "../services/api"
import { useAuth } from "../features/auth/hooks/useAuth"

// Skill categories definition
const SKILL_CATEGORIES = [
  { key: "programmingLanguages", label: "Programming Languages", icon: "code" },
  { key: "frontendTechnologies", label: "Frontend Technologies", icon: "spark" },
  { key: "backendTechnologies", label: "Backend Technologies", icon: "database" },
  { key: "databasesAndSql", label: "Databases & SQL", icon: "database" },
  { key: "frameworksAndLibraries", label: "Frameworks & Libraries", icon: "target" },
  { key: "developerTools", label: "Developer Tools", icon: "settings" },
  { key: "softSkills", label: "Soft Skills", icon: "user" },
]

export default function ResumeGeneratorPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInputRef = useRef(null)

  // Profile data & loading state
  const [profile, setProfile] = useState(null)
  const [completionPercentage, setCompletionPercentage] = useState(0)
  const [missingFields, setMissingFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [statusMsg, setStatusMsg] = useState(null) // { type: "success"|"error", title, text }

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [showRawResume, setShowRawResume] = useState(false)

  // Preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false)

  // Active edit modal state: { type: string, mode: "edit"|"add", index?: number, formData: any }
  const [activeModal, setActiveModal] = useState(null)

  // Confirmation dialog state
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    loading: false,
  })

  // ── Fetch Profile on Mount ────────────────────────────────────────────────
  const fetchProfile = async () => {
    try {
      setLoading(true)
      const res = await api.get("/api/resume/profile")
      if (res.data?.profile) {
        setProfile(res.data.profile)
        setCompletionPercentage(res.data.completionPercentage || 0)
        setMissingFields(res.data.missingFields || [])
      }
    } catch (err) {
      console.error("Failed to fetch resume profile:", err)
      setStatusMsg({
        type: "error",
        title: "Load Error",
        text: err.response?.data?.message || "Failed to load resume profile data.",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  // ── File Selection & Upload ───────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      validateAndSelectFile(file)
    }
  }

  const validateAndSelectFile = (file) => {
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    const ext = file.name.split(".").pop().toLowerCase()

    if (!validTypes.includes(file.type) && ext !== "pdf" && ext !== "docx") {
      setStatusMsg({
        type: "error",
        title: "Unsupported File Format",
        text: "Please upload a valid PDF or DOCX file (up to 4MB).",
      })
      return
    }

    if (file.size > 4 * 1024 * 1024) {
      setStatusMsg({
        type: "error",
        title: "File Too Large",
        text: "Maximum file size is 4MB. Please upload a smaller file.",
      })
      return
    }

    setSelectedFile(file)
    setStatusMsg({
      type: "info",
      title: "File Ready",
      text: `Selected "${file.name}" (${(file.size / 1024).toFixed(1)} KB). Click "Extract Resume Data" to analyze with AI.`,
    })
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      validateAndSelectFile(file)
    }
  }

  // ── Upload & Extract Data via Backend ─────────────────────────────────────
  const handleExtractResume = async () => {
    if (!selectedFile) {
      setStatusMsg({
        type: "error",
        title: "No File Selected",
        text: "Please browse or drag and drop a PDF or DOCX resume first.",
      })
      return
    }

    const formData = new FormData()
    formData.append("resume", selectedFile)

    setParsing(true)
    setStatusMsg(null)

    try {
      const res = await api.post("/api/resume/upload", formData)

      if (res.data?.profile) {
        setProfile(res.data.profile)
        setCompletionPercentage(res.data.completionPercentage || 0)
        setMissingFields(res.data.missingFields || [])
        setSelectedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ""

        setStatusMsg({
          type: "success",
          title: "Extraction Successful",
          text: "AI has parsed your resume and populated your profile cards. You can edit any details below.",
        })
      }
    } catch (err) {
      console.error("Resume extraction failed:", err)
      setStatusMsg({
        type: "error",
        title: "Extraction Failed",
        text: err.response?.data?.message || "Failed to parse and extract resume data.",
      })
    } finally {
      setParsing(false)
    }
  }

  // ── Remove Resume File ────────────────────────────────────────────────────
  const handleRemoveResumeFile = () => {
    setConfirmState({
      isOpen: true,
      title: "Remove Resume File",
      message:
        "Are you sure you want to remove the uploaded resume file? Your extracted profile information will remain saved.",
      onConfirm: async () => {
        try {
          setConfirmState((prev) => ({ ...prev, loading: true }))
          await api.delete("/api/resume/file")
          setProfile((prev) => ({ ...prev, resumeFile: null }))
          setSelectedFile(null)
          setStatusMsg({
            type: "info",
            title: "Resume File Removed",
            text: "The uploaded resume file reference has been removed.",
          })
        } catch (err) {
          setStatusMsg({
            type: "error",
            title: "Delete Failed",
            text: err.response?.data?.message || "Failed to remove resume file.",
          })
        } finally {
          setConfirmState({ isOpen: false, title: "", message: "", onConfirm: null, loading: false })
        }
      },
      loading: false,
    })
  }

  // ── Persist Profile Updates ───────────────────────────────────────────────
  const saveProfileUpdates = async (updatedProfile, successMessage = "Profile updated successfully.") => {
    setSaving(true)
    try {
      const res = await api.put("/api/resume/profile", updatedProfile)
      if (res.data?.profile) {
        setProfile(res.data.profile)
        setCompletionPercentage(res.data.completionPercentage || 0)
        setMissingFields(res.data.missingFields || [])
        setStatusMsg({
          type: "success",
          title: "Saved",
          text: successMessage,
        })
        setActiveModal(null)
      }
    } catch (err) {
      console.error("Failed to save profile updates:", err)
      setStatusMsg({
        type: "error",
        title: "Save Failed",
        text: err.response?.data?.message || "Failed to save profile changes.",
      })
    } finally {
      setSaving(false)
    }
  }

  // ── PDF Export via Backend Puppeteer ───────────────────────────────────────
  const handleExportPdf = async () => {
    setDownloadingPdf(true)
    try {
      const res = await api.get("/api/resume/pdf", {
        responseType: "blob",
      })

      const blob = new Blob([res.data], { type: "application/pdf" })
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      const candidateName = profile?.personalInfo?.fullName?.replace(/\s+/g, "_") || "Candidate"
      link.download = `${candidateName}_ATS_Resume.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)

      setStatusMsg({
        type: "success",
        title: "Download Started",
        text: "Your ATS-compliant resume PDF has been compiled and downloaded.",
      })
    } catch (err) {
      console.error("PDF download failed:", err)
      setStatusMsg({
        type: "error",
        title: "Export Failed",
        text: "Failed to generate resume PDF. Please verify your profile details and try again.",
      })
    } finally {
      setDownloadingPdf(false)
    }
  }

  // ── Helper Avatar Initials ────────────────────────────────────────────────
  const getInitials = (name) => {
    if (!name) return "AP"
    const parts = name.trim().split(" ")
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  // ── Loading Skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "5rem 1rem" }}>
        <span
          className="spinner"
          style={{ width: "2.5rem", height: "2.5rem", borderColor: "#00838F", borderTopColor: "transparent" }}
        />
        <h2 style={{ color: "#10242B", marginTop: "1.5rem" }}>Loading Resume Profile...</h2>
        <p style={{ color: "#3D5A64" }}>Connecting to your profile database.</p>
      </div>
    )
  }

  const pInfo = profile?.personalInfo || {}
  const social = profile?.socialLinks || {}
  const skills = profile?.skills || {}
  const experiences = profile?.workExperience || []
  const projects = profile?.projects || []
  const education = profile?.education || []
  const certificates = profile?.certificates || []
  const sqlSkills = profile?.sqlAndDatabaseSkills || []
  const achievements = profile?.achievements || []
  const resumeFile = profile?.resumeFile

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", paddingBottom: "3rem" }}>
      {/* ── Page Heading ────────────────────────────────────────────────────── */}
      <PageHeading
        eyebrow="AI PROFILE & ATS ANALYZER"
        title="My Resume Profile"
        description="Upload your resume to extract candidate intelligence into structured cards, analyze ATS readiness, and manage your credentials."
        action={
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Button
              variant="outline"
              icon="eye"
              size="sm"
              onClick={() => setPreviewModalOpen(true)}
            >
              Preview ATS Resume
            </Button>
            <Button
              variant="primary"
              icon="download"
              size="sm"
              loading={downloadingPdf}
              onClick={handleExportPdf}
            >
              Download PDF
            </Button>
          </div>
        }
      />

      {/* ── Status Message Banner ───────────────────────────────────────────── */}
      {statusMsg && (
        <div style={{ position: "relative" }}>
          <StateMessage type={statusMsg.type} title={statusMsg.title} text={statusMsg.text} />
          <button
            onClick={() => setStatusMsg(null)}
            style={{
              position: "absolute",
              right: "0.85rem",
              top: "50%",
              transform: "translateY(-50%)",
              background: "transparent",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              opacity: 0.8,
            }}
            aria-label="Dismiss message"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {/* ── 1. Resume Upload & Extraction Card ──────────────────────────────── */}
      <Card elevated>
        <div className="section-header">
          <div className="section-header__title">
            <span className="section-header__icon">
              <Icon name="upload" size={18} />
            </span>
            <span>Resume Upload & AI Extraction</span>
          </div>
          {resumeFile?.originalName && (
            <Badge tone="teal" icon="check">
              Active File: {resumeFile.originalName}
            </Badge>
          )}
        </div>

        {/* Drag and drop zone */}
        <div
          className={`resume-dropzone ${isDragging ? "resume-dropzone--drag" : ""}`}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          <div className="resume-dropzone__icon">
            <Icon name="file" size={26} />
          </div>

          <div>
            <h4 style={{ color: "#10242B", fontSize: "1.05rem", marginBottom: "0.35rem" }}>
              {selectedFile
                ? `Selected: ${selectedFile.name}`
                : resumeFile?.originalName
                ? `Uploaded: ${resumeFile.originalName}`
                : "Drag & drop your resume here, or browse"}
            </h4>
            <p style={{ color: "#3D5A64", fontSize: "0.84rem" }}>
              Supports PDF or DOCX documents (up to 4MB). AI extracts your experience, education, skills, and links.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }} onClick={(e) => e.stopPropagation()}>
            <Button
              variant="secondary"
              size="sm"
              icon="search"
              onClick={() => fileInputRef.current?.click()}
            >
              Browse File
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon="spark"
              loading={parsing}
              disabled={!selectedFile}
              onClick={handleExtractResume}
            >
              {parsing ? "Parsing with Gemini..." : "Extract Resume Data"}
            </Button>
          </div>
        </div>

        {/* Upload metadata and actions */}
        {(selectedFile || resumeFile?.originalName) && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              marginTop: "1.25rem",
              padding: "0.85rem 1rem",
              background: "#F4FAF9",
              borderRadius: "0.75rem",
              border: "1px solid rgba(16, 36, 43, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Icon name="file" size={20} />
              <div>
                <strong style={{ color: "#10242B", fontSize: "0.88rem" }}>
                  {selectedFile?.name || resumeFile?.originalName}
                </strong>
                <div style={{ color: "#64808C", fontSize: "0.75rem" }}>
                  Size:{" "}
                  {selectedFile
                    ? `${(selectedFile.size / 1024).toFixed(1)} KB`
                    : resumeFile?.fileSize
                    ? `${(resumeFile.fileSize / 1024).toFixed(1)} KB`
                    : "Standard"}{" "}
                  • Status: {parsing ? "Parsing..." : selectedFile ? "Pending Extraction" : "Extracted"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              {resumeFile?.rawText && (
                <Button
                  variant="outline"
                  size="sm"
                  icon="eye"
                  onClick={() => setShowRawResume(!showRawResume)}
                >
                  {showRawResume ? "Hide Raw Text" : "View Extracted Text"}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                icon="refresh"
                onClick={() => fileInputRef.current?.click()}
              >
                Replace Resume
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon="trash"
                onClick={handleRemoveResumeFile}
              >
                Remove
              </Button>
            </div>
          </div>
        )}

        {/* Raw text preview collapsible */}
        {showRawResume && resumeFile?.rawText && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              background: "#F8FCFB",
              borderRadius: "0.75rem",
              border: "1px solid rgba(16, 36, 43, 0.1)",
              maxHeight: "220px",
              overflowY: "auto",
              fontSize: "0.82rem",
              color: "#3D5A64",
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
            }}
          >
            {resumeFile.rawText}
          </div>
        )}
      </Card>

      {/* ── 2. Profile Overview Card ────────────────────────────────────────── */}
      <Card elevated>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "2rem",
            alignItems: "center",
          }}
        >
          {/* Avatar and personal summary */}
          <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
            <div
              style={{
                width: "4.75rem",
                height: "4.75rem",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #00838F 0%, #00B4D8 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                fontSize: "1.75rem",
                fontWeight: 800,
                border: "3px solid rgba(0, 131, 143, 0.25)",
                boxShadow: "0 4px 16px rgba(0, 131, 143, 0.25)",
                flexShrink: 0,
              }}
            >
              {getInitials(pInfo.fullName || user?.username)}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <h2 style={{ fontSize: "1.45rem", fontWeight: 800, color: "#10242B", margin: 0 }}>
                {pInfo.fullName || user?.username || "Candidate Profile"}
              </h2>
              <span style={{ color: "#00838F", fontWeight: 600, fontSize: "0.95rem" }}>
                {pInfo.professionalHeadline || "Professional Headline Not Set"}
              </span>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.85rem",
                  fontSize: "0.82rem",
                  color: "#3D5A64",
                  marginTop: "0.5rem",
                }}
              >
                {pInfo.email && (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Icon name="mail" size={14} /> {pInfo.email}
                  </span>
                )}
                {pInfo.phone && (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Icon name="phone" size={14} /> {pInfo.phone}
                  </span>
                )}
                {pInfo.location && (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Icon name="map-pin" size={14} /> {pInfo.location}
                  </span>
                )}
              </div>

              <span style={{ fontSize: "0.74rem", color: "#64808C", marginTop: "0.4rem" }}>
                Last Updated:{" "}
                {profile?.updatedAt
                  ? new Date(profile.updatedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "Recently"}
              </span>
            </div>
          </div>

          {/* Completion tracker and actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.5rem",
              background: "#F4FAF9",
              padding: "1.25rem",
              borderRadius: "1rem",
              border: "1px solid rgba(16, 36, 43, 0.08)",
            }}
          >
            <CircularProgress value={completionPercentage} size={95} strokeWidth={8} label="Profile" />

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: "0.92rem", color: "#10242B" }}>Profile Strength</strong>
                <Badge tone={completionPercentage >= 80 ? "teal" : completionPercentage >= 50 ? "cyan" : "warning"}>
                  {completionPercentage >= 80 ? "Complete" : completionPercentage >= 50 ? "Good" : "Needs Work"}
                </Badge>
              </div>

              {missingFields.length > 0 ? (
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#64808C" }}>Recommended additions:</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.35rem" }}>
                    {missingFields.slice(0, 3).map((f) => (
                      <span
                        key={f}
                        style={{
                          fontSize: "0.7rem",
                          padding: "0.15rem 0.45rem",
                          borderRadius: "4px",
                          background: "rgba(255, 176, 32, 0.15)",
                          color: "#B45309",
                          border: "1px solid rgba(180, 83, 9, 0.25)",
                        }}
                      >
                        + {f}
                      </span>
                    ))}
                    {missingFields.length > 3 && (
                      <span style={{ fontSize: "0.7rem", color: "#64808C" }}>
                        +{missingFields.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: "0.78rem", color: "#00796B" }}>
                  All key sections are populated and ready for ATS export!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Overview Action Toolbar */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
            marginTop: "1.5rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid rgba(16, 36, 43, 0.08)",
          }}
        >
          <Button
            variant="primary"
            size="sm"
            icon="edit"
            onClick={() =>
              setActiveModal({
                type: "personalInfo",
                mode: "edit",
                formData: { ...pInfo },
              })
            }
          >
            Edit Profile
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon="eye"
            onClick={() => setPreviewModalOpen(true)}
          >
            Preview ATS Resume
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon="download"
            loading={downloadingPdf}
            onClick={handleExportPdf}
          >
            Download Resume PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon="refresh"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" })
              fileInputRef.current?.click()
            }}
          >
            Re-upload Resume
          </Button>
        </div>
      </Card>

      {/* ── 3. Individual Information Cards ─────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {/* A. Personal Information Card */}
        <Card elevated>
          <div className="section-header">
            <div className="section-header__title">
              <span className="section-header__icon">
                <Icon name="user" size={18} />
              </span>
              <span>Personal Information</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon="edit"
              onClick={() =>
                setActiveModal({
                  type: "personalInfo",
                  mode: "edit",
                  formData: { ...pInfo },
                })
              }
            >
              Edit
            </Button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.88rem" }}>
            <div>
              <span style={{ fontSize: "0.74rem", color: "#CBD8D4", textTransform: "uppercase" }}>Full Name</span>
              <div style={{ color: "#FFFFFF", fontWeight: 600 }}>{pInfo.fullName || "—"}</div>
            </div>
            <div>
              <span style={{ fontSize: "0.74rem", color: "#CBD8D4", textTransform: "uppercase" }}>Headline</span>
              <div style={{ color: "#FFFFFF" }}>{pInfo.professionalHeadline || "—"}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <span style={{ fontSize: "0.74rem", color: "#CBD8D4", textTransform: "uppercase" }}>Email</span>
                <div style={{ color: "#FFFFFF" }}>{pInfo.email || "—"}</div>
              </div>
              <div>
                <span style={{ fontSize: "0.74rem", color: "#CBD8D4", textTransform: "uppercase" }}>Phone</span>
                <div style={{ color: "#FFFFFF" }}>{pInfo.phone || "—"}</div>
              </div>
            </div>
            <div>
              <span style={{ fontSize: "0.74rem", color: "#CBD8D4", textTransform: "uppercase" }}>Location</span>
              <div style={{ color: "#FFFFFF" }}>{pInfo.location || "—"}</div>
            </div>
            <div>
              <span style={{ fontSize: "0.74rem", color: "#CBD8D4", textTransform: "uppercase" }}>Professional Summary</span>
              <p style={{ color: "#E8F2EF", fontSize: "0.84rem", lineHeight: "1.5", marginTop: "0.25rem" }}>
                {pInfo.summary || "No professional summary added yet."}
              </p>
            </div>
          </div>
        </Card>

        {/* B. Social & Developer Profiles Card */}
        <Card elevated>
          <div className="section-header">
            <div className="section-header__title">
              <span className="section-header__icon">
                <Icon name="link" size={18} />
              </span>
              <span>Social & Developer Profiles</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon="edit"
              onClick={() =>
                setActiveModal({
                  type: "socialLinks",
                  mode: "edit",
                  formData: { ...social },
                })
              }
            >
              Edit
            </Button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {/* LinkedIn */}
            <div className="item-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Icon name="linkedin" size={18} />
                <div>
                  <strong style={{ fontSize: "0.85rem", color: "#FFFFFF" }}>LinkedIn</strong>
                  <div style={{ fontSize: "0.75rem", color: "#CBD8D4" }}>
                    {social.linkedin ? (
                      <span style={{ wordBreak: "break-all" }}>{social.linkedin}</span>
                    ) : (
                      "No profile linked"
                    )}
                  </div>
                </div>
              </div>
              {social.linkedin ? (
                <a
                  href={social.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn--outline btn--sm"
                  style={{ textDecoration: "none" }}
                >
                  <Icon name="external-link" size={14} /> Open
                </a>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  icon="plus"
                  onClick={() =>
                    setActiveModal({
                      type: "socialLinks",
                      mode: "edit",
                      formData: { ...social },
                    })
                  }
                >
                  Add
                </Button>
              )}
            </div>

            {/* GitHub */}
            <div className="item-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Icon name="github" size={18} />
                <div>
                  <strong style={{ fontSize: "0.85rem", color: "#FFFFFF" }}>GitHub</strong>
                  <div style={{ fontSize: "0.75rem", color: "#CBD8D4" }}>
                    {social.github ? (
                      <span style={{ wordBreak: "break-all" }}>{social.github}</span>
                    ) : (
                      "No repository profile linked"
                    )}
                  </div>
                </div>
              </div>
              {social.github ? (
                <a
                  href={social.github}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn--outline btn--sm"
                  style={{ textDecoration: "none" }}
                >
                  <Icon name="external-link" size={14} /> Open
                </a>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  icon="plus"
                  onClick={() =>
                    setActiveModal({
                      type: "socialLinks",
                      mode: "edit",
                      formData: { ...social },
                    })
                  }
                >
                  Add
                </Button>
              )}
            </div>

            {/* LeetCode */}
            <div className="item-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Icon name="code" size={18} />
                <div>
                  <strong style={{ fontSize: "0.85rem", color: "#FFFFFF" }}>LeetCode</strong>
                  <div style={{ fontSize: "0.75rem", color: "#CBD8D4" }}>
                    {social.leetcode ? (
                      <span style={{ wordBreak: "break-all" }}>{social.leetcode}</span>
                    ) : (
                      "No coding profile linked"
                    )}
                  </div>
                </div>
              </div>
              {social.leetcode ? (
                <a
                  href={social.leetcode}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn--outline btn--sm"
                  style={{ textDecoration: "none" }}
                >
                  <Icon name="external-link" size={14} /> Open
                </a>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  icon="plus"
                  onClick={() =>
                    setActiveModal({
                      type: "socialLinks",
                      mode: "edit",
                      formData: { ...social },
                    })
                  }
                >
                  Add
                </Button>
              )}
            </div>

            {/* Portfolio */}
            <div className="item-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Icon name="globe" size={18} />
                <div>
                  <strong style={{ fontSize: "0.85rem", color: "#FFFFFF" }}>Portfolio Website</strong>
                  <div style={{ fontSize: "0.75rem", color: "#CBD8D4" }}>
                    {social.portfolio ? (
                      <span style={{ wordBreak: "break-all" }}>{social.portfolio}</span>
                    ) : (
                      "No personal website linked"
                    )}
                  </div>
                </div>
              </div>
              {social.portfolio ? (
                <a
                  href={social.portfolio}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn--outline btn--sm"
                  style={{ textDecoration: "none" }}
                >
                  <Icon name="external-link" size={14} /> Open
                </a>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  icon="plus"
                  onClick={() =>
                    setActiveModal({
                      type: "socialLinks",
                      mode: "edit",
                      formData: { ...social },
                    })
                  }
                >
                  Add
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* ── C. Skills (Categorized Tags) ────────────────────────────────────── */}
      <Card elevated>
        <div className="section-header">
          <div className="section-header__title">
            <span className="section-header__icon">
              <Icon name="target" size={18} />
            </span>
            <span>Technical & Soft Skills</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon="edit"
            onClick={() =>
              setActiveModal({
                type: "skills",
                mode: "edit",
                formData: { ...skills },
              })
            }
          >
            Manage Skills
          </Button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
          {SKILL_CATEGORIES.map((cat) => {
            const list = skills[cat.key] || []
            return (
              <div
                key={cat.key}
                style={{
                  background: "rgba(0, 0, 0, 0.14)",
                  padding: "1rem",
                  borderRadius: "0.875rem",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.65rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <Icon name={cat.icon} size={15} />
                    <strong style={{ fontSize: "0.85rem", color: "#FFFFFF" }}>{cat.label}</strong>
                  </div>
                  <Badge tone="cyan">{list.length}</Badge>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {list.length > 0 ? (
                    list.map((tag, idx) => (
                      <span key={idx} className="skill-tag">
                        {tag}
                        <span
                          className="skill-tag__remove"
                          onClick={() => {
                            const updatedList = list.filter((_, i) => i !== idx)
                            saveProfileUpdates(
                              {
                                ...profile,
                                skills: {
                                  ...skills,
                                  [cat.key]: updatedList,
                                },
                              },
                              `Removed "${tag}" from ${cat.label}`
                            )
                          }}
                          title="Remove skill"
                        >
                          <Icon name="close" size={12} />
                        </span>
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: "0.78rem", color: "#CBD8D4", fontStyle: "italic" }}>
                      No skills added in this category.
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* ── D. Work Experience & Internships ─────────────────────────────────── */}
      <Card elevated>
        <div className="section-header">
          <div className="section-header__title">
            <span className="section-header__icon">
              <Icon name="briefcase" size={18} />
            </span>
            <span>Work Experience & Internships</span>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon="plus"
            onClick={() =>
              setActiveModal({
                type: "experience",
                mode: "add",
                formData: {
                  jobTitle: "",
                  company: "",
                  employmentType: "Full-time",
                  startDate: "",
                  endDate: "",
                  current: false,
                  location: "",
                  responsibilities: [],
                  achievements: [],
                },
              })
            }
          >
            Add Experience
          </Button>
        </div>

        {experiences.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {experiences.map((exp, idx) => (
              <div key={idx} className="item-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
                      {exp.jobTitle}
                    </h3>
                    <div style={{ color: "#00E5FF", fontWeight: 600, fontSize: "0.9rem", marginTop: "0.2rem" }}>
                      {exp.company} {exp.employmentType && `• ${exp.employmentType}`}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#CBD8D4", marginTop: "0.25rem" }}>
                      {exp.startDate || "Start"} — {exp.current ? "Present" : exp.endDate || "End"}{" "}
                      {exp.location && `• ${exp.location}`}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <Button
                      variant="outline"
                      size="sm"
                      icon="edit"
                      onClick={() =>
                        setActiveModal({
                          type: "experience",
                          mode: "edit",
                          index: idx,
                          formData: { ...exp },
                        })
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon="trash"
                      onClick={() => {
                        setConfirmState({
                          isOpen: true,
                          title: "Delete Work Experience",
                          message: `Are you sure you want to remove your experience at ${exp.company}?`,
                          onConfirm: async () => {
                            const updated = experiences.filter((_, i) => i !== idx)
                            await saveProfileUpdates({ ...profile, workExperience: updated }, "Experience deleted.")
                            setConfirmState({ isOpen: false, title: "", message: "", onConfirm: null, loading: false })
                          },
                        })
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                {exp.responsibilities?.length > 0 && (
                  <ul style={{ paddingLeft: "1.25rem", marginTop: "0.75rem", fontSize: "0.84rem", color: "#E8F2EF" }}>
                    {exp.responsibilities.map((r, rIdx) => (
                      <li key={rIdx} style={{ marginBottom: "0.25rem" }}>
                        {r}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="briefcase"
            title="No Work Experience Added"
            description="Add your professional roles, full-time positions, or internships to highlight your background to interviewers."
            action={
              <Button
                variant="primary"
                size="sm"
                icon="plus"
                onClick={() =>
                  setActiveModal({
                    type: "experience",
                    mode: "add",
                    formData: {
                      jobTitle: "",
                      company: "",
                      employmentType: "Full-time",
                      startDate: "",
                      endDate: "",
                      current: false,
                      location: "",
                      responsibilities: [],
                      achievements: [],
                    },
                  })
                }
              >
                Add Experience
              </Button>
            }
          />
        )}
      </Card>

      {/* ── E. Projects ─────────────────────────────────────────────────────── */}
      <Card elevated>
        <div className="section-header">
          <div className="section-header__title">
            <span className="section-header__icon">
              <Icon name="code" size={18} />
            </span>
            <span>Projects & Portfolio Work</span>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon="plus"
            onClick={() =>
              setActiveModal({
                type: "project",
                mode: "add",
                formData: {
                  title: "",
                  description: "",
                  technologies: [],
                  githubUrl: "",
                  liveUrl: "",
                  duration: "",
                },
              })
            }
          >
            Add Project
          </Button>
        </div>

        {projects.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
            {projects.map((proj, idx) => (
              <div key={idx} className="item-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.35rem" }}>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
                      {proj.title}
                    </h3>
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <Button
                        variant="outline"
                        size="sm"
                        icon="edit"
                        onClick={() =>
                          setActiveModal({
                            type: "project",
                            mode: "edit",
                            index: idx,
                            formData: { ...proj },
                          })
                        }
                      />
                      <Button
                        variant="danger"
                        size="sm"
                        icon="trash"
                        onClick={() => {
                          setConfirmState({
                            isOpen: true,
                            title: "Delete Project",
                            message: `Are you sure you want to delete "${proj.title}"?`,
                            onConfirm: async () => {
                              const updated = projects.filter((_, i) => i !== idx)
                              await saveProfileUpdates({ ...profile, projects: updated }, "Project deleted.")
                              setConfirmState({ isOpen: false, title: "", message: "", onConfirm: null, loading: false })
                            },
                          })
                        }}
                      />
                    </div>
                  </div>

                  {proj.duration && (
                    <span style={{ fontSize: "0.75rem", color: "#CBD8D4", display: "block", marginBottom: "0.5rem" }}>
                      Duration: {proj.duration}
                    </span>
                  )}

                  <p style={{ fontSize: "0.84rem", color: "#E8F2EF", lineHeight: "1.5", marginBottom: "0.75rem" }}>
                    {proj.description}
                  </p>

                  {proj.technologies?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.75rem" }}>
                      {proj.technologies.map((t, tIdx) => (
                        <span
                          key={tIdx}
                          style={{
                            fontSize: "0.72rem",
                            padding: "0.15rem 0.5rem",
                            borderRadius: "4px",
                            background: "rgba(0, 229, 255, 0.14)",
                            color: "#00E5FF",
                            border: "1px solid rgba(0, 229, 255, 0.25)",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "0.5rem", paddingTop: "0.65rem", borderTop: "1px solid rgba(255, 255, 255, 0.12)" }}>
                  {proj.githubUrl && (
                    <a
                      href={proj.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn--outline btn--sm"
                      style={{ textDecoration: "none" }}
                    >
                      <Icon name="github" size={13} /> Code
                    </a>
                  )}
                  {proj.liveUrl && (
                    <a
                      href={proj.liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn--primary btn--sm"
                      style={{ textDecoration: "none" }}
                    >
                      <Icon name="external-link" size={13} /> Live Demo
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="code"
            title="No Projects Added"
            description="Feature the applications, full-stack tools, or open-source projects you have engineered."
            action={
              <Button
                variant="primary"
                size="sm"
                icon="plus"
                onClick={() =>
                  setActiveModal({
                    type: "project",
                    mode: "add",
                    formData: {
                      title: "",
                      description: "",
                      technologies: [],
                      githubUrl: "",
                      liveUrl: "",
                      duration: "",
                    },
                  })
                }
              >
                Add Project
              </Button>
            }
          />
        )}
      </Card>

      {/* ── Two-Column: Education & Certificates ───────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
        {/* F. Education Card */}
        <Card elevated>
          <div className="section-header">
            <div className="section-header__title">
              <span className="section-header__icon">
                <Icon name="education" size={18} />
              </span>
              <span>Education</span>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon="plus"
              onClick={() =>
                setActiveModal({
                  type: "education",
                  mode: "add",
                  formData: {
                    degree: "",
                    institution: "",
                    fieldOfStudy: "",
                    startDate: "",
                    graduationDate: "",
                    grade: "",
                  },
                })
              }
            >
              Add Education
            </Button>
          </div>

          {education.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {education.map((edu, idx) => (
                <div key={idx} className="item-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h4 style={{ fontSize: "0.98rem", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
                        {edu.degree} {edu.fieldOfStudy && `in ${edu.fieldOfStudy}`}
                      </h4>
                      <div style={{ color: "#00E5FF", fontWeight: 600, fontSize: "0.85rem", marginTop: "0.2rem" }}>
                        {edu.institution}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "#CBD8D4", marginTop: "0.2rem" }}>
                        {edu.startDate || "Start"} — {edu.graduationDate || "Graduation"}{" "}
                        {edu.grade && `• Grade: ${edu.grade}`}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <Button
                        variant="outline"
                        size="sm"
                        icon="edit"
                        onClick={() =>
                          setActiveModal({
                            type: "education",
                            mode: "edit",
                            index: idx,
                            formData: { ...edu },
                          })
                        }
                      />
                      <Button
                        variant="danger"
                        size="sm"
                        icon="trash"
                        onClick={() => {
                          setConfirmState({
                            isOpen: true,
                            title: "Delete Education Entry",
                            message: `Are you sure you want to remove ${edu.degree}?`,
                            onConfirm: async () => {
                              const updated = education.filter((_, i) => i !== idx)
                              await saveProfileUpdates({ ...profile, education: updated }, "Education entry removed.")
                              setConfirmState({ isOpen: false, title: "", message: "", onConfirm: null, loading: false })
                            },
                          })
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="education"
              title="No Education Listed"
              description="Record your university degrees, diplomas, or academic credentials."
              action={
                <Button
                  variant="primary"
                  size="sm"
                  icon="plus"
                  onClick={() =>
                    setActiveModal({
                      type: "education",
                      mode: "add",
                      formData: {
                        degree: "",
                        institution: "",
                        fieldOfStudy: "",
                        startDate: "",
                        graduationDate: "",
                        grade: "",
                      },
                    })
                  }
                >
                  Add Education
                </Button>
              }
            />
          )}
        </Card>

        {/* G. Certificates Card */}
        <Card elevated>
          <div className="section-header">
            <div className="section-header__title">
              <span className="section-header__icon">
                <Icon name="award" size={18} />
              </span>
              <span>Certificates & Credentials</span>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon="plus"
              onClick={() =>
                setActiveModal({
                  type: "certificate",
                  mode: "add",
                  formData: {
                    name: "",
                    issuingOrganization: "",
                    issueDate: "",
                    expiryDate: "",
                    credentialId: "",
                    verificationUrl: "",
                  },
                })
              }
            >
              Add Certificate
            </Button>
          </div>

          {certificates.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {certificates.map((cert, idx) => (
                <div key={idx} className="item-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h4 style={{ fontSize: "0.98rem", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
                        {cert.name}
                      </h4>
                      <div style={{ color: "#00E5FF", fontWeight: 600, fontSize: "0.85rem", marginTop: "0.2rem" }}>
                        {cert.issuingOrganization}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "#CBD8D4", marginTop: "0.2rem" }}>
                        Issued: {cert.issueDate || "N/A"}{" "}
                        {cert.credentialId && `• ID: ${cert.credentialId}`}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      {cert.verificationUrl && (
                        <a
                          href={cert.verificationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn--outline btn--sm"
                          style={{ textDecoration: "none" }}
                          title="Verify Credential"
                        >
                          <Icon name="external-link" size={13} />
                        </a>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        icon="edit"
                        onClick={() =>
                          setActiveModal({
                            type: "certificate",
                            mode: "edit",
                            index: idx,
                            formData: { ...cert },
                          })
                        }
                      />
                      <Button
                        variant="danger"
                        size="sm"
                        icon="trash"
                        onClick={() => {
                          setConfirmState({
                            isOpen: true,
                            title: "Delete Certificate",
                            message: `Are you sure you want to remove "${cert.name}"?`,
                            onConfirm: async () => {
                              const updated = certificates.filter((_, i) => i !== idx)
                              await saveProfileUpdates({ ...profile, certificates: updated }, "Certificate removed.")
                              setConfirmState({ isOpen: false, title: "", message: "", onConfirm: null, loading: false })
                            },
                          })
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="award"
              title="No Certificates Added"
              description="Add your AWS, Google Cloud, Meta, or industry-recognized certifications."
              action={
                <Button
                  variant="primary"
                  size="sm"
                  icon="plus"
                  onClick={() =>
                    setActiveModal({
                      type: "certificate",
                      mode: "add",
                      formData: {
                        name: "",
                        issuingOrganization: "",
                        issueDate: "",
                        expiryDate: "",
                        credentialId: "",
                        verificationUrl: "",
                      },
                    })
                  }
                >
                  Add Certificate
                </Button>
              }
            />
          )}
        </Card>
      </div>

      {/* ── Two-Column: H. SQL & Database Skills and I. Achievements ─────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
        {/* H. Dedicated SQL & Database Skills Card */}
        <Card elevated>
          <div className="section-header">
            <div className="section-header__title">
              <span className="section-header__icon">
                <Icon name="database" size={18} />
              </span>
              <span>SQL & Database Technologies</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon="plus"
              onClick={() => {
                const newSkill = prompt("Enter SQL skill or database technology:")
                if (newSkill && newSkill.trim()) {
                  const updated = Array.from(new Set([...sqlSkills, newSkill.trim()]))
                  saveProfileUpdates({ ...profile, sqlAndDatabaseSkills: updated }, `Added database skill: ${newSkill}`)
                }
              }}
            >
              Add Skill
            </Button>
          </div>

          <p style={{ fontSize: "0.82rem", color: "#CBD8D4", marginBottom: "0.85rem" }}>
            Specific database engines, query optimization, indexing, and schema design skills detected or verified:
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
            {sqlSkills.length > 0 ? (
              sqlSkills.map((item, idx) => (
                <span key={idx} className="skill-tag">
                  <Icon name="database" size={12} />
                  {item}
                  <span
                    className="skill-tag__remove"
                    onClick={() => {
                      const updated = sqlSkills.filter((_, i) => i !== idx)
                      saveProfileUpdates(
                        { ...profile, sqlAndDatabaseSkills: updated },
                        `Removed "${item}" from database skills.`
                      )
                    }}
                    title="Remove skill"
                  >
                    <Icon name="close" size={12} />
                  </span>
                </span>
              ))
            ) : (
              <span style={{ fontSize: "0.84rem", color: "#CBD8D4", fontStyle: "italic" }}>
                No database skills specified yet. Click "+ Add Skill" or upload a resume mentioning SQL/MongoDB.
              </span>
            )}
          </div>
        </Card>

        {/* I. Achievements & Additional Information Card */}
        <Card elevated>
          <div className="section-header">
            <div className="section-header__title">
              <span className="section-header__icon">
                <Icon name="spark" size={18} />
              </span>
              <span>Achievements & Honors</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon="plus"
              onClick={() => {
                const text = prompt("Enter achievement, award, or extracurricular honor:")
                if (text && text.trim()) {
                  const updated = [...achievements, text.trim()]
                  saveProfileUpdates({ ...profile, achievements: updated }, "Achievement added.")
                }
              }}
            >
              Add Achievement
            </Button>
          </div>

          {achievements.length > 0 ? (
            <ul style={{ paddingLeft: "1.25rem", margin: 0, fontSize: "0.85rem", color: "#E8F2EF" }}>
              {achievements.map((ach, idx) => (
                <li key={idx} style={{ marginBottom: "0.6rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                    <span>{ach}</span>
                    <button
                      onClick={() => {
                        const updated = achievements.filter((_, i) => i !== idx)
                        saveProfileUpdates({ ...profile, achievements: updated }, "Achievement removed.")
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#FF8597",
                        cursor: "pointer",
                        opacity: 0.7,
                      }}
                      title="Remove achievement"
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon="spark"
              title="No Achievements Listed"
              description="Add hackathon wins, honors, scholarships, coding contest ranks, or leadership awards."
              action={
                <Button
                  variant="primary"
                  size="sm"
                  icon="plus"
                  onClick={() => {
                    const text = prompt("Enter achievement, award, or honor:")
                    if (text && text.trim()) {
                      const updated = [...achievements, text.trim()]
                      saveProfileUpdates({ ...profile, achievements: updated }, "Achievement added.")
                    }
                  }}
                >
                  Add Achievement
                </Button>
              }
            />
          )}
        </Card>
      </div>

      {/* ── 4. Dynamic Edit / Add Section Modal ──────────────────────────────── */}
      {activeModal && (
        <Modal
          isOpen={Boolean(activeModal)}
          onClose={() => setActiveModal(null)}
          title={
            activeModal.type === "personalInfo"
              ? "Edit Personal Information"
              : activeModal.type === "socialLinks"
              ? "Edit Social & Developer Profiles"
              : activeModal.type === "skills"
              ? "Manage Skills Categories"
              : activeModal.type === "experience"
              ? `${activeModal.mode === "add" ? "Add" : "Edit"} Work Experience`
              : activeModal.type === "project"
              ? `${activeModal.mode === "add" ? "Add" : "Edit"} Project`
              : activeModal.type === "education"
              ? `${activeModal.mode === "add" ? "Add" : "Edit"} Education`
              : `${activeModal.mode === "add" ? "Add" : "Edit"} Certificate`
          }
          footer={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", width: "100%" }}>
              <Button variant="outline" size="sm" onClick={() => setActiveModal(null)} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon="check"
                loading={saving}
                onClick={async () => {
                  const m = activeModal
                  let updated = { ...profile }

                  if (m.type === "personalInfo") {
                    updated.personalInfo = m.formData
                  } else if (m.type === "socialLinks") {
                    updated.socialLinks = m.formData
                  } else if (m.type === "skills") {
                    updated.skills = m.formData
                  } else if (m.type === "experience") {
                    const list = [...(profile.workExperience || [])]
                    if (m.mode === "add") list.unshift(m.formData)
                    else list[m.index] = m.formData
                    updated.workExperience = list
                  } else if (m.type === "project") {
                    const list = [...(profile.projects || [])]
                    if (m.mode === "add") list.unshift(m.formData)
                    else list[m.index] = m.formData
                    updated.projects = list
                  } else if (m.type === "education") {
                    const list = [...(profile.education || [])]
                    if (m.mode === "add") list.unshift(m.formData)
                    else list[m.index] = m.formData
                    updated.education = list
                  } else if (m.type === "certificate") {
                    const list = [...(profile.certificates || [])]
                    if (m.mode === "add") list.unshift(m.formData)
                    else list[m.index] = m.formData
                    updated.certificates = list
                  }

                  await saveProfileUpdates(updated)
                }}
              >
                Save Changes
              </Button>
            </div>
          }
        >
          {/* Personal Info Form */}
          {activeModal.type === "personalInfo" && (
            <>
              <Field
                label="Full Name"
                name="fullName"
                value={activeModal.formData.fullName || ""}
                onChange={(e) =>
                  setActiveModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, fullName: e.target.value },
                  }))
                }
                placeholder="e.g. John Doe"
                required
              />
              <Field
                label="Professional Headline"
                name="headline"
                value={activeModal.formData.professionalHeadline || ""}
                onChange={(e) =>
                  setActiveModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, professionalHeadline: e.target.value },
                  }))
                }
                placeholder="e.g. Senior Full-Stack Engineer"
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <Field
                  label="Email"
                  name="email"
                  type="email"
                  value={activeModal.formData.email || ""}
                  onChange={(e) =>
                    setActiveModal((prev) => ({
                      ...prev,
                      formData: { ...prev.formData, email: e.target.value },
                    }))
                  }
                  placeholder="name@example.com"
                />
                <Field
                  label="Phone"
                  name="phone"
                  value={activeModal.formData.phone || ""}
                  onChange={(e) =>
                    setActiveModal((prev) => ({
                      ...prev,
                      formData: { ...prev.formData, phone: e.target.value },
                    }))
                  }
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <Field
                label="Location"
                name="location"
                value={activeModal.formData.location || ""}
                onChange={(e) =>
                  setActiveModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, location: e.target.value },
                  }))
                }
                placeholder="City, Country"
              />
              <TextArea
                label="Professional Summary"
                name="summary"
                rows={4}
                value={activeModal.formData.summary || ""}
                onChange={(e) =>
                  setActiveModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, summary: e.target.value },
                  }))
                }
                placeholder="Brief summary of your professional expertise, leadership, and engineering achievements..."
              />
            </>
          )}

          {/* Social Links Form */}
          {activeModal.type === "socialLinks" && (
            <>
              <Field
                label="LinkedIn Profile URL"
                name="linkedin"
                icon="linkedin"
                value={activeModal.formData.linkedin || ""}
                onChange={(e) =>
                  setActiveModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, linkedin: e.target.value },
                  }))
                }
                placeholder="https://linkedin.com/in/username"
              />
              <Field
                label="GitHub Profile URL"
                name="github"
                icon="github"
                value={activeModal.formData.github || ""}
                onChange={(e) =>
                  setActiveModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, github: e.target.value },
                  }))
                }
                placeholder="https://github.com/username"
              />
              <Field
                label="LeetCode Profile URL"
                name="leetcode"
                icon="code"
                value={activeModal.formData.leetcode || ""}
                onChange={(e) =>
                  setActiveModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, leetcode: e.target.value },
                  }))
                }
                placeholder="https://leetcode.com/username"
              />
              <Field
                label="Portfolio / Personal Website"
                name="portfolio"
                icon="globe"
                value={activeModal.formData.portfolio || ""}
                onChange={(e) =>
                  setActiveModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, portfolio: e.target.value },
                  }))
                }
                placeholder="https://myportfolio.dev"
              />
            </>
          )}

          {/* Skills Form */}
          {activeModal.type === "skills" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {SKILL_CATEGORIES.map((cat) => (
                <Field
                  key={cat.key}
                  label={cat.label}
                  name={cat.key}
                  hint="Comma-separated values"
                  value={(activeModal.formData[cat.key] || []).join(", ")}
                  onChange={(e) => {
                    const raw = e.target.value
                    const arrayVal = raw
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                    setActiveModal((prev) => ({
                      ...prev,
                      formData: { ...prev.formData, [cat.key]: arrayVal },
                    }))
                  }}
                  placeholder="e.g. React, Node.js, TypeScript"
                />
              ))}
            </div>
          )}

          {/* Experience Form */}
          {activeModal.type === "experience" && (
            <>
              <Field
                label="Job Title"
                name="jobTitle"
                value={activeModal.formData.jobTitle || ""}
                onChange={(e) =>
                  setActiveModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, jobTitle: e.target.value },
                  }))
                }
                placeholder="e.g. Software Engineer"
                required
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <Field
                  label="Company"
                  name="company"
                  value={activeModal.formData.company || ""}
                  onChange={(e) =>
                    setActiveModal((prev) => ({
                      ...prev,
                      formData: { ...prev.formData, company: e.target.value },
                    }))
                  }
                  placeholder="Company name"
                  required
                />
                <Field
                  label="Employment Type"
                  name="employmentType"
                  value={activeModal.formData.employmentType || "Full-time"}
                  onChange={(e) =>
                    setActiveModal((prev) => ({
                      ...prev,
                      formData: { ...prev.formData, employmentType: e.target.value },
                    }))
                  }
                  placeholder="Full-time, Internship, Contract"
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <Field
                  label="Start Date"
                  name="startDate"
                  value={activeModal.formData.startDate || ""}
                  onChange={(e) =>
                    setActiveModal((prev) => ({
                      ...prev,
                      formData: { ...prev.formData, startDate: e.target.value },
                    }))
                  }
                  placeholder="e.g. Jan 2022"
                />
                <Field
                  label="End Date"
                  name="endDate"
                  disabled={activeModal.formData.current}
                  value={activeModal.formData.current ? "Present" : activeModal.formData.endDate || ""}
                  onChange={(e) =>
                    setActiveModal((prev) => ({
                      ...prev,
                      formData: { ...prev.formData, endDate: e.target.value },
                    }))
                  }
                  placeholder="e.g. Dec 2024"
                />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#FFFFFF" }}>
                <input
                  type="checkbox"
                  checked={Boolean(activeModal.formData.current)}
                  onChange={(e) =>
                    setActiveModal((prev) => ({
                      ...prev,
                      formData: { ...prev.formData, current: e.target.checked },
                    }))
                  }
                />
                Currently working in this role
              </label>
              <Field
                label="Location"
                name="location"
                value={activeModal.formData.location || ""}
                onChange={(e) =>
                  setActiveModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, location: e.target.value },
                  }))
                }
                placeholder="City, Country / Remote"
              />
              <TextArea
                label="Key Responsibilities & Achievements"
                name="responsibilities"
                hint="One bullet point per line"
                rows={4}
                value={(activeModal.formData.responsibilities || []).join("\n")}
                onChange={(e) => {
                  const lines = e.target.value.split("\n").filter(Boolean)
                  setActiveModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, responsibilities: lines },
                  }))
                }}
                placeholder="Built scalable REST APIs...&#10;Reduced latency by 35%...&#10;Collaborated with cross-functional teams..."
              />
            </>
          )}

          {/* Project Form */}
          {activeModal.type === "project" && (
            <>
              <Field
                label="Project Title"
                name="title"
                value={activeModal.formData.title || ""}
                onChange={(e) =>
                  setActiveModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, title: e.target.value },
                  }))
                }
                placeholder="e.g. AI Mock Interview Platform"
                required
              />
              <Field
                label="Duration / Timeline"
                name="duration"
                value={activeModal.formData.duration || ""}
                onChange={(e) =>
                  setActiveModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, duration: e.target.value },
                  }))
                }
                placeholder="e.g. 3 months / Jan 2024 – Present"
              />
              <TextArea
                label="Project Description"
                name="description"
                rows={3}
                value={activeModal.formData.description || ""}
                onChange={(e) =>
                  setActiveModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, description: e.target.value },
                  }))
                }
                placeholder="Describe the application architecture, main problem solved, and key features..."
                required
              />
              <Field
                label="Technologies Used"
                name="technologies"
                hint="Comma-separated"
                value={(activeModal.formData.technologies || []).join(", ")}
                onChange={(e) => {
                  const arr = e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                  setActiveModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, technologies: arr },
                  }))
                }}
                placeholder="React, Node.js, Express, MongoDB, Tailwind"
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <Field
                  label="GitHub Repo URL"
                  name="githubUrl"
                  value={activeModal.formData.githubUrl || ""}
                  onChange={(e) =>
                    setActiveModal((prev) => ({
                      ...prev,
                      formData: { ...prev.formData, githubUrl: e.target.value },
                    }))
                  }
                  placeholder="https://github.com/..."
                />
                <Field
                  label="Live Demo URL"
                  name="liveUrl"
                  value={activeModal.formData.liveUrl || ""}
                  onChange={(e) =>
                    setActiveModal((prev) => ({
                      ...prev,
                      formData: { ...prev.formData, liveUrl: e.target.value },
                    }))
                  }
                  placeholder="https://..."
                />
              </div>
            </>
          )}

          {/* Education Form */}
          {activeModal.type === "education" && (
            <>
              <Field
                label="Degree / Qualification"
                name="degree"
                value={activeModal.formData.degree || ""}
                onChange={(e) =>
                  setActiveModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, degree: e.target.value },
                  }))
                }
                placeholder="e.g. Bachelor of Technology"
                required
              />
              <Field
                label="Institution / University"
                name="institution"
                value={activeModal.formData.institution || ""}
                onChange={(e) =>
                  setActiveModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, institution: e.target.value },
                  }))
                }
                placeholder="e.g. University of California, Berkeley"
                required
              />
              <Field
                label="Field of Study"
                name="fieldOfStudy"
                value={activeModal.formData.fieldOfStudy || ""}
                onChange={(e) =>
                  setActiveModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, fieldOfStudy: e.target.value },
                  }))
                }
                placeholder="e.g. Computer Science and Engineering"
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <Field
                  label="Start Date"
                  name="startDate"
                  value={activeModal.formData.startDate || ""}
                  onChange={(e) =>
                    setActiveModal((prev) => ({
                      ...prev,
                      formData: { ...prev.formData, startDate: e.target.value },
                    }))
                  }
                  placeholder="e.g. 2020"
                />
                <Field
                  label="Graduation Date"
                  name="graduationDate"
                  value={activeModal.formData.graduationDate || ""}
                  onChange={(e) =>
                    setActiveModal((prev) => ({
                      ...prev,
                      formData: { ...prev.formData, graduationDate: e.target.value },
                    }))
                  }
                  placeholder="e.g. 2024"
                />
              </div>
              <Field
                label="Grade / CGPA"
                name="grade"
                value={activeModal.formData.grade || ""}
                onChange={(e) =>
                  setActiveModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, grade: e.target.value },
                  }))
                }
                placeholder="e.g. 3.8 / 4.0 or 8.9 CGPA"
              />
            </>
          )}

          {/* Certificate Form */}
          {activeModal.type === "certificate" && (
            <>
              <Field
                label="Certificate Name"
                name="name"
                value={activeModal.formData.name || ""}
                onChange={(e) =>
                  setActiveModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, name: e.target.value },
                  }))
                }
                placeholder="e.g. AWS Certified Solutions Architect"
                required
              />
              <Field
                label="Issuing Organization"
                name="issuingOrganization"
                value={activeModal.formData.issuingOrganization || ""}
                onChange={(e) =>
                  setActiveModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, issuingOrganization: e.target.value },
                  }))
                }
                placeholder="e.g. Amazon Web Services"
                required
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <Field
                  label="Issue Date"
                  name="issueDate"
                  value={activeModal.formData.issueDate || ""}
                  onChange={(e) =>
                    setActiveModal((prev) => ({
                      ...prev,
                      formData: { ...prev.formData, issueDate: e.target.value },
                    }))
                  }
                  placeholder="e.g. Mar 2024"
                />
                <Field
                  label="Expiry Date"
                  name="expiryDate"
                  value={activeModal.formData.expiryDate || ""}
                  onChange={(e) =>
                    setActiveModal((prev) => ({
                      ...prev,
                      formData: { ...prev.formData, expiryDate: e.target.value },
                    }))
                  }
                  placeholder="e.g. Mar 2027 or Never"
                />
              </div>
              <Field
                label="Credential ID"
                name="credentialId"
                value={activeModal.formData.credentialId || ""}
                onChange={(e) =>
                  setActiveModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, credentialId: e.target.value },
                  }))
                }
                placeholder="e.g. AWS-12345678"
              />
              <Field
                label="Credential Verification URL"
                name="verificationUrl"
                value={activeModal.formData.verificationUrl || ""}
                onChange={(e) =>
                  setActiveModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, verificationUrl: e.target.value },
                  }))
                }
                placeholder="https://verify.cert.com/..."
              />
            </>
          )}
        </Modal>
      )}

      {/* ── 5. ATS Resume Live Preview Modal ─────────────────────────────────── */}
      {previewModalOpen && (
        <Modal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          title="ATS-Compliant Live Resume Preview"
          maxWidth="850px"
          footer={
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <span style={{ fontSize: "0.8rem", color: "#CBD8D4" }}>
                Single-column, machine-readable ATS standard.
              </span>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <Button variant="outline" size="sm" onClick={() => setPreviewModalOpen(false)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon="download"
                  loading={downloadingPdf}
                  onClick={handleExportPdf}
                >
                  Download PDF
                </Button>
              </div>
            </div>
          }
        >
          <div className="ats-paper-preview">
            <h1>{pInfo.fullName || user?.username || "Candidate Name"}</h1>
            <div className="ats-subhead">
              {pInfo.email && <span>{pInfo.email}</span>}
              {pInfo.phone && <span>• {pInfo.phone}</span>}
              {pInfo.location && <span>• {pInfo.location}</span>}
              {social.linkedin && <span>• {social.linkedin}</span>}
              {social.github && <span>• {social.github}</span>}
              {social.portfolio && <span>• {social.portfolio}</span>}
            </div>

            {pInfo.summary && (
              <section>
                <h2>Professional Summary</h2>
                <p>{pInfo.summary}</p>
              </section>
            )}

            {/* Skills */}
            {(skills.programmingLanguages?.length > 0 ||
              skills.frontendTechnologies?.length > 0 ||
              skills.backendTechnologies?.length > 0 ||
              sqlSkills?.length > 0) && (
              <section>
                <h2>Technical Skills</h2>
                <p style={{ margin: "0.25rem 0" }}>
                  {skills.programmingLanguages?.length > 0 && (
                    <span>
                      <strong>Languages: </strong>
                      {skills.programmingLanguages.join(", ")}
                      <br />
                    </span>
                  )}
                  {skills.frontendTechnologies?.length > 0 && (
                    <span>
                      <strong>Frontend: </strong>
                      {skills.frontendTechnologies.join(", ")}
                      <br />
                    </span>
                  )}
                  {skills.backendTechnologies?.length > 0 && (
                    <span>
                      <strong>Backend & Frameworks: </strong>
                      {[...(skills.backendTechnologies || []), ...(skills.frameworksAndLibraries || [])].join(", ")}
                      <br />
                    </span>
                  )}
                  {sqlSkills?.length > 0 && (
                    <span>
                      <strong>Databases & SQL: </strong>
                      {sqlSkills.join(", ")}
                      <br />
                    </span>
                  )}
                  {skills.developerTools?.length > 0 && (
                    <span>
                      <strong>Tools: </strong>
                      {skills.developerTools.join(", ")}
                    </span>
                  )}
                </p>
              </section>
            )}

            {/* Work Experience */}
            {experiences.length > 0 && (
              <section>
                <h2>Work Experience</h2>
                {experiences.map((exp, idx) => (
                  <div key={idx} style={{ marginBottom: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                      <span>{exp.jobTitle} — {exp.company}</span>
                      <span style={{ fontSize: "0.85rem", color: "#6B7280" }}>
                        {exp.startDate} – {exp.current ? "Present" : exp.endDate}
                      </span>
                    </div>
                    {exp.responsibilities?.length > 0 && (
                      <ul>
                        {exp.responsibilities.map((r, rIdx) => (
                          <li key={rIdx}>{r}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </section>
            )}

            {/* Projects */}
            {projects.length > 0 && (
              <section>
                <h2>Featured Projects</h2>
                {projects.map((proj, idx) => (
                  <div key={idx} style={{ marginBottom: "0.85rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                      <span>{proj.title}</span>
                      {proj.duration && <span style={{ fontSize: "0.85rem", color: "#6B7280" }}>{proj.duration}</span>}
                    </div>
                    <p style={{ margin: "0.2rem 0" }}>{proj.description}</p>
                    {proj.technologies?.length > 0 && (
                      <p style={{ fontSize: "0.8rem", color: "#4B5563" }}>
                        <strong>Technologies: </strong>
                        {proj.technologies.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </section>
            )}

            {/* Education */}
            {education.length > 0 && (
              <section>
                <h2>Education</h2>
                {education.map((edu, idx) => (
                  <div key={idx} style={{ marginBottom: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <strong>
                        {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ""}
                      </strong>
                      <span style={{ fontSize: "0.85rem", color: "#6B7280" }}>
                        {edu.startDate} – {edu.graduationDate}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "#4B5563" }}>
                      {edu.institution} {edu.grade ? `• Grade: ${edu.grade}` : ""}
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Certificates */}
            {certificates.length > 0 && (
              <section>
                <h2>Certifications</h2>
                <ul>
                  {certificates.map((cert, idx) => (
                    <li key={idx}>
                      <strong>{cert.name}</strong> — {cert.issuingOrganization}{" "}
                      {cert.issueDate ? `(${cert.issueDate})` : ""}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </Modal>
      )}

      {/* ── 6. Confirmation Dialog ───────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState({ isOpen: false, title: "", message: "", onConfirm: null, loading: false })}
        loading={confirmState.loading}
      />
    </div>
  )
}
