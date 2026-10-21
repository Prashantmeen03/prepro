import { getAllInterviewReports, generateInterviewReport, getInterviewReportById, generateResumePdf } from "../services/interview.api"
import { useContext, useEffect } from "react"
import { InterviewContext } from "../interview.context"
import { useParams } from "react-router"


export const useInterview = () => {
    const context = useContext(InterviewContext)
    const { interviewId } = useParams()

    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }

    const { loading, setLoading, error, setError, report, setReport, reports, setReports } = context

    const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
        setLoading(true)
        setError(null)
        try {
            const response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile })
            if (response?.interviewReport) {
                setReport(response.interviewReport)
                setReports(prev => [response.interviewReport, ...(prev || [])])
            }
            return response?.interviewReport || null
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "Failed to generate interview report"
            setError(msg)
            throw new Error(msg)
        } finally {
            setLoading(false)
        }
    }

    const getReportById = async (id) => {
        const targetId = id || interviewId
        if (!targetId) return null
        setLoading(true)
        setError(null)
        try {
            const response = await getInterviewReportById(targetId)
            if (response?.interviewReport) {
                setReport(response.interviewReport)
            }
            return response?.interviewReport || null
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "Failed to fetch interview report"
            setError(msg)
            return null
        } finally {
            setLoading(false)
        }
    }

    const getReports = async () => {
        setLoading(true)
        setError(null)
        try {
            const response = await getAllInterviewReports()
            if (Array.isArray(response?.interviewReports)) {
                setReports(response.interviewReports)
            }
            return response?.interviewReports || []
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "Failed to fetch interview history"
            setError(msg)
            return []
        } finally {
            setLoading(false)
        }
    }

    const getResumePdf = async (interviewReportId) => {
        setLoading(true)
        setError(null)
        try {
            const response = await generateResumePdf({ interviewReportId })
            const url = window.URL.createObjectURL(new Blob([response], { type: "application/pdf" }))
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `resume_${interviewReportId}.pdf`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
            return true
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "Failed to download ATS resume PDF"
            setError(msg)
            throw new Error(msg)
        } finally {
            setLoading(false)
        }
    }

    return { loading, error, setError, report, reports, generateReport, getReportById, getReports, getResumePdf }
}