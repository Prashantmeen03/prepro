const mongoose = require("mongoose")

const experienceSchema = new mongoose.Schema({
    title: { type: String, default: "" },
    company: { type: String, default: "" },
    employmentType: { type: String, default: "" },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    current: { type: Boolean, default: false },
    location: { type: String, default: "" },
    responsibilities: [{ type: String }],
    achievements: [{ type: String }]
}, { _id: true })

const projectSchema = new mongoose.Schema({
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    technologies: [{ type: String }],
    githubUrl: { type: String, default: "" },
    liveUrl: { type: String, default: "" },
    duration: { type: String, default: "" }
}, { _id: true })

const educationSchema = new mongoose.Schema({
    degree: { type: String, default: "" },
    institution: { type: String, default: "" },
    fieldOfStudy: { type: String, default: "" },
    startDate: { type: String, default: "" },
    graduationDate: { type: String, default: "" },
    grade: { type: String, default: "" }
}, { _id: true })

const certificateSchema = new mongoose.Schema({
    name: { type: String, default: "" },
    issuingOrganization: { type: String, default: "" },
    issueDate: { type: String, default: "" },
    expiryDate: { type: String, default: "" },
    credentialId: { type: String, default: "" },
    verificationUrl: { type: String, default: "" }
}, { _id: true })

const sqlSkillSchema = new mongoose.Schema({
    skill: { type: String, default: "" },
    details: { type: String, default: "" }
}, { _id: true })

const achievementSchema = new mongoose.Schema({
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    date: { type: String, default: "" }
}, { _id: true })

const resumeProfileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true
    },
    personalInfo: {
        fullName: { type: String, default: "" },
        email: { type: String, default: "" },
        phone: { type: String, default: "" },
        location: { type: String, default: "" },
        headline: { type: String, default: "" },
        summary: { type: String, default: "" }
    },
    socialProfiles: {
        linkedin: { type: String, default: "" },
        github: { type: String, default: "" },
        leetcode: { type: String, default: "" },
        portfolio: { type: String, default: "" }
    },
    skills: {
        programmingLanguages: [{ type: String }],
        frontend: [{ type: String }],
        backend: [{ type: String }],
        databases: [{ type: String }],
        frameworks: [{ type: String }],
        tools: [{ type: String }],
        softSkills: [{ type: String }]
    },
    experience: [experienceSchema],
    projects: [projectSchema],
    education: [educationSchema],
    certificates: [certificateSchema],
    sqlDatabaseSkills: [sqlSkillSchema],
    achievements: [achievementSchema],
    resumeFile: {
        fileName: { type: String, default: "" },
        fileSize: { type: Number, default: 0 },
        fileType: { type: String, default: "" },
        rawText: { type: String, default: "" },
        uploadedAt: { type: Date }
    }
}, { timestamps: true })

const ResumeProfile = mongoose.model("ResumeProfile", resumeProfileSchema)

module.exports = ResumeProfile
