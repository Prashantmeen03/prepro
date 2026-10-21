const pdfParse = require("pdf-parse")
const { generateInterviewReport, generateResumePdf } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")
const { z } = require("zod")

const generateReportBodySchema = z.object({
    jobDescription: z.string().trim().min(10, "Job description must be at least 10 characters long"),
    selfDescription: z.string().trim().optional()
})

/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res, next) {
    try {
        const validation = generateReportBodySchema.safeParse(req.body)
        if (!validation.success) {
            return res.status(400).json({
                message: validation.error.errors[0]?.message || "Invalid input parameters",
                errors: validation.error.errors
            })
        }

        const { jobDescription } = validation.data
        const selfDescription = req.body.selfDescription?.trim() || ""

        let resumeText = ""
        if (req.file && req.file.buffer) {
            try {
                const parsedPdf = await (new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))).getText()
                resumeText = parsedPdf?.text?.trim() || ""

                if (!resumeText) {
                    return res.status(400).json({
                        message: "The uploaded PDF appears empty or contains only non-selectable scanned images. Please provide a readable PDF or use self-description."
                    })
                }
            } catch (pdfErr) {
                return res.status(400).json({
                    message: "The uploaded file could not be parsed as a valid PDF resume. Please verify the file format."
                })
            }
        }

        if (!resumeText && !selfDescription) {
            return res.status(400).json({
                message: "Either a valid resume PDF or a self-description is required to generate your interview strategy."
            })
        }

        const aiStrategy = await generateInterviewReport({
            resume: resumeText,
            selfDescription,
            jobDescription
        })

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeText,
            selfDescription,
            jobDescription,
            ...aiStrategy
        })

        res.status(201).json({
            message: "Interview report generated successfully.",
            interviewReport
        })
    } catch (err) {
        next(err)
    }
}

/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res, next) {
    try {
        const { interviewId } = req.params

        const interviewReport = await interviewReportModel.findOne({
            _id: interviewId,
            user: req.user.id
        })

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found or access denied."
            })
        }

        res.status(200).json({
            message: "Interview report fetched successfully.",
            interviewReport
        })
    } catch (err) {
        next(err)
    }
}

/** 
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res, next) {
    try {
        const interviewReports = await interviewReportModel
            .find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

        res.status(200).json({
            message: "Interview reports fetched successfully.",
            interviewReports
        })
    } catch (err) {
        next(err)
    }
}

/**
 * @description Controller to generate resume PDF based on user selected report.
 */
async function generateResumePdfController(req, res, next) {
    try {
        const { interviewReportId } = req.params

        // Strict authorization check: user must own this report
        const interviewReport = await interviewReportModel.findOne({
            _id: interviewReportId,
            user: req.user.id
        })

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found or you do not have permission to access it."
            })
        }

        const { resume, jobDescription, selfDescription } = interviewReport

        const pdfBuffer = await generateResumePdf({
            resume: resume || "",
            jobDescription: jobDescription || "",
            selfDescription: selfDescription || ""
        })

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`,
            "Content-Length": pdfBuffer.length
        })

        res.send(pdfBuffer)
    } catch (err) {
        next(err)
    }
}

module.exports = {
    generateInterViewReportController,
    getInterviewReportByIdController,
    getAllInterviewReportsController,
    generateResumePdfController
}