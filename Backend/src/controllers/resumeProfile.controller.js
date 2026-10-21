const ResumeProfile = require("../models/resumeProfile.model")
const aiService = require("../services/ai.service")
const pdfParse = require("pdf-parse")
const mammoth = require("mammoth")

function calculateCompletion(profile) {
    if (!profile) return { percentage: 0, missingFields: ["Personal Information", "Experience", "Skills", "Education"] }

    let score = 0
    const missing = []

    // 1. Personal Info (30% total)
    if (profile.personalInfo?.fullName?.trim()) score += 10
    else missing.push("Full Name")

    if (profile.personalInfo?.email?.trim() || profile.personalInfo?.phone?.trim()) score += 10
    else missing.push("Contact Email/Phone")

    if (profile.personalInfo?.headline?.trim() || profile.personalInfo?.summary?.trim()) score += 10
    else missing.push("Professional Headline or Summary")

    // 2. Experience (20%)
    if (Array.isArray(profile.experience) && profile.experience.length > 0) score += 20
    else missing.push("Work Experience / Internships")

    // 3. Projects (15%)
    if (Array.isArray(profile.projects) && profile.projects.length > 0) score += 15
    else missing.push("Key Projects")

    // 4. Education (15%)
    if (Array.isArray(profile.education) && profile.education.length > 0) score += 15
    else missing.push("Education Details")

    // 5. Skills (10%)
    const allSkills = [
        ...(profile.skills?.programmingLanguages || []),
        ...(profile.skills?.frontend || []),
        ...(profile.skills?.backend || []),
        ...(profile.skills?.databases || []),
        ...(profile.skills?.tools || []),
        ...(profile.skills?.frameworks || [])
    ]
    if (allSkills.length >= 3) score += 10
    else missing.push("Technical Skills (At least 3)")

    // 6. Social Profiles (5%)
    if (profile.socialProfiles?.linkedin || profile.socialProfiles?.github || profile.socialProfiles?.portfolio) score += 5
    else missing.push("Social Links (LinkedIn / GitHub / Portfolio)")

    // 7. Certifications or DB Skills (5%)
    if ((profile.certificates && profile.certificates.length > 0) || (profile.sqlDatabaseSkills && profile.sqlDatabaseSkills.length > 0)) score += 5
    else missing.push("Certifications or Database Specializations")

    return {
        percentage: Math.min(100, score),
        missingFields: missing
    }
}

async function getResumeProfileController(req, res) {
    try {
        let profile = await ResumeProfile.findOne({ user: req.user.id })

        if (!profile) {
            // Initialize empty default profile for current user
            profile = await ResumeProfile.create({
                user: req.user.id,
                personalInfo: {
                    fullName: req.user.username || "",
                    email: req.user.email || ""
                }
            })
        }

        const completion = calculateCompletion(profile)

        res.status(200).json({
            profile,
            completionPercentage: completion.percentage,
            missingFields: completion.missingFields
        })
    } catch (err) {
        res.status(500).json({ message: "Failed to retrieve resume profile: " + err.message })
    }
}

async function updateResumeProfileController(req, res) {
    try {
        const allowedSections = [
            "personalInfo",
            "socialProfiles",
            "skills",
            "experience",
            "projects",
            "education",
            "certificates",
            "sqlDatabaseSkills",
            "achievements"
        ]

        const updateData = {}
        for (const key of allowedSections) {
            if (req.body[key] !== undefined) {
                updateData[key] = req.body[key]
            }
        }

        const profile = await ResumeProfile.findOneAndUpdate(
            { user: req.user.id },
            { $set: updateData },
            { new: true, upsert: true, runValidators: true }
        )

        const completion = calculateCompletion(profile)

        res.status(200).json({
            message: "Profile updated successfully.",
            profile,
            completionPercentage: completion.percentage,
            missingFields: completion.missingFields
        })
    } catch (err) {
        res.status(500).json({ message: "Failed to update profile: " + err.message })
    }
}

async function uploadAndExtractResumeController(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No resume file uploaded. Please select a PDF or DOCX file." })
        }

        let rawText = ""
        const originalName = (req.file.originalname || "").toLowerCase()
        const mime = req.file.mimetype || ""

        if (mime === "application/pdf" || originalName.endsWith(".pdf")) {
            const parsedPdf = await pdfParse(req.file.buffer)
            rawText = parsedPdf.text || ""
        } else if (originalName.endsWith(".docx") || mime.includes("wordprocessingml") || originalName.endsWith(".doc")) {
            const parsedDocx = await mammoth.extractRawText({ buffer: req.file.buffer })
            rawText = parsedDocx.value || ""
        } else {
            return res.status(400).json({ message: "Unsupported file type. Please upload a PDF or DOCX resume." })
        }

        if (!rawText || rawText.trim().length < 20) {
            return res.status(400).json({
                message: "Unable to extract readable text from the file. Please ensure the document is not an image scan without OCR."
            })
        }

        // Call Gemini AI for high-precision extraction
        const extracted = await aiService.extractResumeProfileData(rawText)

        // Merge or set onto user's ResumeProfile
        const profile = await ResumeProfile.findOneAndUpdate(
            { user: req.user.id },
            {
                $set: {
                    personalInfo: extracted.personalInfo || {},
                    socialProfiles: extracted.socialProfiles || {},
                    skills: extracted.skills || {},
                    experience: extracted.experience || [],
                    projects: extracted.projects || [],
                    education: extracted.education || [],
                    certificates: extracted.certificates || [],
                    sqlDatabaseSkills: extracted.sqlDatabaseSkills || [],
                    achievements: extracted.achievements || [],
                    resumeFile: {
                        fileName: req.file.originalname,
                        fileSize: req.file.size,
                        fileType: req.file.mimetype,
                        rawText: rawText.slice(0, 5000), // store preview sample
                        uploadedAt: new Date()
                    }
                }
            },
            { new: true, upsert: true }
        )

        const completion = calculateCompletion(profile)

        res.status(200).json({
            message: "Resume extracted and profile populated successfully!",
            profile,
            completionPercentage: completion.percentage,
            missingFields: completion.missingFields
        })
    } catch (err) {
        res.status(500).json({ message: "Resume parsing failed: " + err.message })
    }
}

async function deleteResumeFileController(req, res) {
    try {
        const profile = await ResumeProfile.findOneAndUpdate(
            { user: req.user.id },
            {
                $unset: { resumeFile: 1 }
            },
            { new: true }
        )

        res.status(200).json({
            message: "Resume file reference removed.",
            profile
        })
    } catch (err) {
        res.status(500).json({ message: "Failed to remove file: " + err.message })
    }
}

async function exportResumePdfController(req, res) {
    try {
        const profile = await ResumeProfile.findOne({ user: req.user.id })
        if (!profile) {
            return res.status(404).json({ message: "No profile data found to export." })
        }

        const pdfBuffer = await aiService.generateResumePdfFromProfile(profile)

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": 'inline; filename="My_Resume_Profile.pdf"',
            "Content-Length": pdfBuffer.length
        })

        res.end(pdfBuffer)
    } catch (err) {
        res.status(500).json({ message: "Failed to generate PDF: " + err.message })
    }
}

module.exports = {
    getResumeProfileController,
    updateResumeProfileController,
    uploadAndExtractResumeController,
    deleteResumeFileController,
    exportResumePdfController
}
