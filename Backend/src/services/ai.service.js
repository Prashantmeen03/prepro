const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const puppeteer = require("puppeteer")

let ai = null
function getAiClient() {
    if (!ai) {
        if (!process.env.GOOGLE_GENAI_API_KEY) {
            throw new Error("GOOGLE_GENAI_API_KEY is not configured in the environment.")
        }
        ai = new GoogleGenAI({
            apiKey: process.env.GOOGLE_GENAI_API_KEY
        })
    }
    return ai
}

const interviewReportSchema = z.object({
    title: z.string().describe("Target job title inferred from the job description"),
    matchScore: z.number().min(0).max(100).describe("An estimated compatibility score between 0 and 100 based on required vs provided skills"),
    compatibilitySummary: z.string().describe("2-3 sentences summarizing the candidate's alignment with the role"),
    candidateStrengths: z.array(z.string()).describe("Key strengths the candidate possesses for this role"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question that can be asked"),
        intention: z.string().describe("What the interviewer evaluates with this question"),
        answer: z.string().describe("Comprehensive model answer and recommended approach")
    })).min(3).describe("Technical questions tailored to the job requirements"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The behavioral or scenario question"),
        intention: z.string().describe("What soft skill or leadership competency is being tested"),
        answer: z.string().describe("STAR-method structured model answer")
    })).min(2).describe("Behavioral interview questions tailored to the candidate and role"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("Specific skill or experience gap identified"),
        severity: z.enum(["low", "medium", "high"]).describe("Severity level of this gap for the target job")
    })).describe("Identified skill or knowledge gaps with severity ratings"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("Day number (e.g. 1 to 7)"),
        focus: z.string().describe("Primary topic or focus area for this preparation day"),
        tasks: z.array(z.string()).describe("Actionable tasks to complete on this day")
    })).min(3).describe("Structured day-by-day preparation schedule"),
    recommendations: z.array(z.string()).describe("Actionable advice to improve interview performance and resume fit")
})

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
    const prompt = `You are a principal technical hiring manager and interview coach.
Analyze the following candidate profile against the target job description and produce a detailed, honest, structured interview preparation strategy.
Treat match scores as estimates, never fabricate qualifications, and preserve realistic expectations.

CANDIDATE RESUME:
${resume || "None provided"}

CANDIDATE SELF DESCRIPTION:
${selfDescription || "None provided"}

TARGET JOB DESCRIPTION:
${jobDescription}
`

    const aiClient = getAiClient()
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash"

    let response
    try {
        response = await aiClient.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: zodToJsonSchema(interviewReportSchema)
            }
        })
    } catch (apiErr) {
        // Fallback to gemini-1.5-flash if 2.5 is unavailable
        if (modelName !== "gemini-1.5-flash") {
            try {
                response = await aiClient.models.generateContent({
                    model: "gemini-1.5-flash",
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: zodToJsonSchema(interviewReportSchema)
                    }
                })
            } catch (fallbackErr) {
                throw new Error(`Gemini AI service error: ${fallbackErr.message || apiErr.message}`)
            }
        } else {
            throw new Error(`Gemini AI service error: ${apiErr.message}`)
        }
    }

    if (!response || !response.text) {
        throw new Error("No response received from Gemini AI.")
    }

    let parsed
    try {
        parsed = JSON.parse(response.text)
    } catch (parseErr) {
        throw new Error("Gemini AI returned invalid JSON output.")
    }

    const validation = interviewReportSchema.safeParse(parsed)
    if (!validation.success) {
        console.warn("AI output schema warning:", validation.error.message)
        // Ensure defaults for critical fields
        return {
            title: parsed.title || "Interview Strategy Report",
            matchScore: typeof parsed.matchScore === "number" ? Math.max(0, Math.min(100, parsed.matchScore)) : 75,
            compatibilitySummary: parsed.compatibilitySummary || "Candidate profile reviewed against target requirements.",
            candidateStrengths: Array.isArray(parsed.candidateStrengths) ? parsed.candidateStrengths : [],
            technicalQuestions: Array.isArray(parsed.technicalQuestions) ? parsed.technicalQuestions : [],
            behavioralQuestions: Array.isArray(parsed.behavioralQuestions) ? parsed.behavioralQuestions : [],
            skillGaps: Array.isArray(parsed.skillGaps) ? parsed.skillGaps : [],
            preparationPlan: Array.isArray(parsed.preparationPlan) ? parsed.preparationPlan : [],
            recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
        }
    }

    return validation.data
}

async function generatePdfFromHtml(htmlContent) {
    let browser = null
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu"
            ]
        })
        const page = await browser.newPage()
        await page.setContent(htmlContent, {
            waitUntil: ["load", "networkidle0"],
            timeout: 30000
        })

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top: "15mm",
                bottom: "15mm",
                left: "15mm",
                right: "15mm"
            }
        })

        return pdfBuffer
    } finally {
        if (browser) {
            await browser.close().catch(() => {})
        }
    }
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {
    const resumePdfSchema = z.object({
        html: z.string().describe("Clean, complete HTML5 string for an ATS-friendly single-column resume with embedded styling")
    })

    const prompt = `You are an executive resume writer and ATS optimization specialist.
Generate a tailored, single-column, ATS-friendly resume in pure clean HTML with inline CSS.

RULES:
1. Output MUST be an ATS-friendly HTML document with clean typography (Helvetica, Arial, or Georgia), standard headings (Summary, Experience, Projects, Skills, Education).
2. The design MUST be single-column, strictly selectable text, clean margins, with no multi-column float tricks or background graphics that break ATS parsers.
3. Align experience points to target requirements without fabricating employers, dates, or degrees.
4. Keep the output strictly contained in a valid JSON object matching the schema with a single "html" property.

CANDIDATE RESUME:
${resume || "None provided"}

CANDIDATE SELF-DESCRIPTION:
${selfDescription || "None provided"}

TARGET JOB DESCRIPTION:
${jobDescription || "Software Engineer"}
`

    const aiClient = getAiClient()
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash"

    let response
    try {
        response = await aiClient.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: zodToJsonSchema(resumePdfSchema)
            }
        })
    } catch (err) {
        throw new Error(`Failed to generate resume content from Gemini: ${err.message}`)
    }

    if (!response || !response.text) {
        throw new Error("Empty response received from Gemini for resume generation.")
    }

    let parsed
    try {
        parsed = JSON.parse(response.text)
    } catch (parseErr) {
        throw new Error("Gemini returned invalid JSON for resume HTML.")
    }

    const html = parsed.html || parsed.content || ""
    if (!html) {
        throw new Error("No HTML content generated in AI resume response.")
    }

    return await generatePdfFromHtml(html)
}

const resumeProfileExtractionSchema = z.object({
    personalInfo: z.object({
        fullName: z.string().describe("Candidate full name if found, otherwise empty string"),
        email: z.string().describe("Email address if found, otherwise empty string"),
        phone: z.string().describe("Phone number if found, otherwise empty string"),
        location: z.string().describe("City, State or Country if found, otherwise empty string"),
        headline: z.string().describe("Professional title or headline e.g. 'Full-Stack Developer'"),
        summary: z.string().describe("Professional summary or bio if present, otherwise empty string")
    }),
    socialProfiles: z.object({
        linkedin: z.string().describe("LinkedIn profile URL or handle if present, otherwise empty string"),
        github: z.string().describe("GitHub profile URL or handle if present, otherwise empty string"),
        leetcode: z.string().describe("LeetCode profile URL if present, otherwise empty string"),
        portfolio: z.string().describe("Portfolio website or blog URL if present, otherwise empty string")
    }),
    skills: z.object({
        programmingLanguages: z.array(z.string()).describe("Programming languages e.g. JavaScript, Python, C++, Java"),
        frontend: z.array(z.string()).describe("Frontend technologies e.g. React, Next.js, HTML5, CSS3, Tailwind"),
        backend: z.array(z.string()).describe("Backend technologies e.g. Node.js, Express, REST APIs, GraphQL"),
        databases: z.array(z.string()).describe("Databases e.g. MongoDB, PostgreSQL, MySQL, Redis"),
        frameworks: z.array(z.string()).describe("Frameworks and libraries"),
        tools: z.array(z.string()).describe("Developer tools e.g. Git, Docker, Postman, Vite, AWS"),
        softSkills: z.array(z.string()).describe("Soft skills e.g. Problem Solving, Team Collaboration")
    }),
    experience: z.array(z.object({
        title: z.string().describe("Job title"),
        company: z.string().describe("Company or organization name"),
        employmentType: z.string().describe("Full-time, Internship, Contract, or empty"),
        startDate: z.string().describe("e.g. 'Jan 2023' or '2022'"),
        endDate: z.string().describe("e.g. 'Present' or 'Dec 2024'"),
        current: z.boolean().describe("true if candidate is currently working there"),
        location: z.string().describe("Location or Remote"),
        responsibilities: z.array(z.string()).describe("Bullet points of duties and contributions"),
        achievements: z.array(z.string()).describe("Quantified accomplishments or awards")
    })),
    projects: z.array(z.object({
        title: z.string().describe("Project title"),
        description: z.string().describe("Concise summary of what the project does"),
        technologies: z.array(z.string()).describe("Tech stack tags used in this project"),
        githubUrl: z.string().describe("GitHub link if found in resume"),
        liveUrl: z.string().describe("Live demo link if found in resume"),
        duration: z.string().describe("Duration or date e.g. '3 months' or '2024'")
    })),
    education: z.array(z.object({
        degree: z.string().describe("Degree e.g. 'Bachelor of Technology in Computer Science'"),
        institution: z.string().describe("University or college name"),
        fieldOfStudy: z.string().describe("Major or specialization"),
        startDate: z.string().describe("Start year or month"),
        graduationDate: z.string().describe("Graduation year or month"),
        grade: z.string().describe("CGPA, GPA, or percentage if stated")
    })),
    certificates: z.array(z.object({
        name: z.string().describe("Certificate name"),
        issuingOrganization: z.string().describe("Issuing entity e.g. AWS, Coursera, Meta"),
        issueDate: z.string().describe("Issue date"),
        expiryDate: z.string().describe("Expiry date if stated"),
        credentialId: z.string().describe("Credential or license ID"),
        verificationUrl: z.string().describe("Verification link if provided in resume")
    })),
    sqlDatabaseSkills: z.array(z.object({
        skill: z.string().describe("Database or SQL concept/tool e.g. MySQL, Joins, PostgreSQL"),
        details: z.string().describe("Brief context of how it was used")
    })),
    achievements: z.array(z.object({
        title: z.string().describe("Award or achievement title"),
        description: z.string().describe("Brief description"),
        date: z.string().describe("Year or date")
    }))
})

async function extractResumeProfileData(rawText) {
    if (!rawText || rawText.trim().length < 15) {
        throw new Error("Resume content is too short or empty for extraction.")
    }

    const prompt = `You are a high-precision resume parsing specialist.
Extract all relevant candidate profile details from the resume text provided below into the exact structured schema.

CRITICAL EXTRACTION RULES:
1. Extract ONLY information that is ACTUALLY PRESENT in the text.
2. NEVER invent experiences, projects, links, skills, certificates, degrees, or contact numbers.
3. If a field or URL is missing or not mentioned, set it to an empty string ("") or empty array ([]).
4. Organize skills into appropriate categories (programmingLanguages, frontend, backend, databases, frameworks, tools, softSkills).
5. For SQL & Database skills, note any database engines (PostgreSQL, MySQL, MongoDB, SQLite) and concepts (Joins, Indexing, Schema Design, Aggregations) specifically mentioned.
6. Chronologically order experiences and projects if dates are present.

RESUME CONTENT:
${rawText}
`

    const aiClient = getAiClient()
    const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash"

    let response
    try {
        response = await aiClient.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: zodToJsonSchema(resumeProfileExtractionSchema)
            }
        })
    } catch (err) {
        // Fallback to gemini-1.5-flash if needed
        if (modelName !== "gemini-1.5-flash") {
            try {
                response = await aiClient.models.generateContent({
                    model: "gemini-1.5-flash",
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: zodToJsonSchema(resumeProfileExtractionSchema)
                    }
                })
            } catch (fallbackErr) {
                throw new Error(`AI Resume Extraction failed: ${fallbackErr.message || err.message}`)
            }
        } else {
            throw new Error(`AI Resume Extraction failed: ${err.message}`)
        }
    }

    if (!response || !response.text) {
        throw new Error("No data returned from AI extraction.")
    }

    let parsed
    try {
        parsed = JSON.parse(response.text)
    } catch (parseErr) {
        throw new Error("AI returned invalid JSON structure during resume extraction.")
    }

    const validation = resumeProfileExtractionSchema.safeParse(parsed)
    if (!validation.success) {
        console.warn("Schema validation warning on extracted resume:", validation.error.message)
        return parsed
    }

    return validation.data
}

async function generateResumePdfFromProfile(profile) {
    const p = profile?.personalInfo || {}
    const s = profile?.socialProfiles || {}
    const skills = profile?.skills || {}
    const experiences = profile?.experience || []
    const projects = profile?.projects || []
    const education = profile?.education || []
    const certificates = profile?.certificates || []
    const sqlSkills = profile?.sqlDatabaseSkills || []

    const allSkills = [
        ...(skills.programmingLanguages || []),
        ...(skills.frontend || []),
        ...(skills.backend || []),
        ...(skills.databases || []),
        ...(skills.frameworks || []),
        ...(skills.tools || [])
    ].filter(Boolean)

    const socialLinks = [
        s.linkedin ? `<a href="${s.linkedin}" style="color:#00796B;text-decoration:none;">LinkedIn</a>` : null,
        s.github ? `<a href="${s.github}" style="color:#00796B;text-decoration:none;">GitHub</a>` : null,
        s.leetcode ? `<a href="${s.leetcode}" style="color:#00796B;text-decoration:none;">LeetCode</a>` : null,
        s.portfolio ? `<a href="${s.portfolio}" style="color:#00796B;text-decoration:none;">Portfolio</a>` : null,
        p.email ? `<a href="mailto:${p.email}" style="color:#00796B;text-decoration:none;">${p.email}</a>` : null,
        p.phone ? `<span>${p.phone}</span>` : null,
        p.location ? `<span>${p.location}</span>` : null
    ].filter(Boolean).join(" &nbsp;|&nbsp; ")

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #111827;
    background: #ffffff;
    line-height: 1.5;
    padding: 30px;
  }
  .header {
    border-bottom: 2px solid #00796B;
    padding-bottom: 12px;
    margin-bottom: 16px;
    text-align: center;
  }
  .name {
    font-size: 24px;
    font-weight: 800;
    color: #111827;
    letter-spacing: -0.02em;
    text-transform: uppercase;
  }
  .headline {
    font-size: 13px;
    font-weight: 600;
    color: #00796B;
    margin-top: 2px;
  }
  .contact {
    font-size: 11px;
    color: #4B5563;
    margin-top: 6px;
  }
  .section {
    margin-bottom: 16px;
  }
  .section-title {
    font-size: 12px;
    font-weight: 800;
    text-transform: uppercase;
    color: #00796B;
    border-bottom: 1px solid #E5E7EB;
    padding-bottom: 3px;
    margin-bottom: 8px;
    letter-spacing: 0.05em;
  }
  .item {
    margin-bottom: 10px;
  }
  .item-header {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    font-weight: 700;
    color: #111827;
  }
  .item-sub {
    font-size: 11px;
    color: #4B5563;
    font-style: italic;
    margin-bottom: 3px;
  }
  .item-desc {
    font-size: 11px;
    color: #374151;
  }
  ul {
    padding-left: 18px;
    margin-top: 4px;
  }
  li {
    font-size: 11px;
    color: #374151;
    margin-bottom: 2px;
  }
  .skills-box {
    font-size: 11px;
    color: #374151;
    line-height: 1.6;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="name">${p.fullName || "Candidate"}</div>
    ${p.headline ? `<div class="headline">${p.headline}</div>` : ""}
    <div class="contact">${socialLinks}</div>
  </div>

  ${p.summary ? `
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <div class="item-desc">${p.summary}</div>
  </div>` : ""}

  ${allSkills.length > 0 ? `
  <div class="section">
    <div class="section-title">Technical Proficiencies</div>
    <div class="skills-box">
      ${skills.programmingLanguages?.length ? `<strong>Languages:</strong> ${skills.programmingLanguages.join(", ")}<br>` : ""}
      ${skills.frontend?.length ? `<strong>Frontend:</strong> ${skills.frontend.join(", ")}<br>` : ""}
      ${skills.backend?.length ? `<strong>Backend:</strong> ${skills.backend.join(", ")}<br>` : ""}
      ${skills.databases?.length ? `<strong>Databases:</strong> ${skills.databases.join(", ")}<br>` : ""}
      ${skills.tools?.length ? `<strong>Developer Tools:</strong> ${skills.tools.join(", ")}<br>` : ""}
      ${skills.softSkills?.length ? `<strong>Core Competencies:</strong> ${skills.softSkills.join(", ")}` : ""}
    </div>
  </div>` : ""}

  ${experiences.length > 0 ? `
  <div class="section">
    <div class="section-title">Work Experience</div>
    ${experiences.map(exp => `
      <div class="item">
        <div class="item-header">
          <span>${exp.title} &mdash; <strong>${exp.company}</strong></span>
          <span>${exp.startDate || ""} ${exp.endDate ? `&ndash; ${exp.endDate}` : ""}</span>
        </div>
        ${exp.location || exp.employmentType ? `<div class="item-sub">${[exp.location, exp.employmentType].filter(Boolean).join(" &bull; ")}</div>` : ""}
        ${exp.responsibilities?.length ? `
          <ul>
            ${exp.responsibilities.map(r => `<li>${r}</li>`).join("")}
          </ul>` : ""}
      </div>
    `).join("")}
  </div>` : ""}

  ${projects.length > 0 ? `
  <div class="section">
    <div class="section-title">Key Projects</div>
    ${projects.map(proj => `
      <div class="item">
        <div class="item-header">
          <span><strong>${proj.title}</strong> ${proj.technologies?.length ? `(${proj.technologies.join(", ")})` : ""}</span>
          ${proj.duration ? `<span>${proj.duration}</span>` : ""}
        </div>
        <div class="item-desc">${proj.description || ""}</div>
        ${proj.githubUrl || proj.liveUrl ? `
          <div class="item-sub">
            ${[
              proj.githubUrl ? `Repository: ${proj.githubUrl}` : null,
              proj.liveUrl ? `Live URL: ${proj.liveUrl}` : null
            ].filter(Boolean).join(" &bull; ")}
          </div>` : ""}
      </div>
    `).join("")}
  </div>` : ""}

  ${education.length > 0 ? `
  <div class="section">
    <div class="section-title">Education</div>
    ${education.map(edu => `
      <div class="item">
        <div class="item-header">
          <span><strong>${edu.degree || edu.fieldOfStudy}</strong> &mdash; ${edu.institution}</span>
          <span>${edu.graduationDate || edu.startDate || ""}</span>
        </div>
        ${edu.grade ? `<div class="item-sub">Academic Standing: ${edu.grade}</div>` : ""}
      </div>
    `).join("")}
  </div>` : ""}

  ${certificates.length > 0 ? `
  <div class="section">
    <div class="section-title">Certifications</div>
    ${certificates.map(cert => `
      <div class="item">
        <div class="item-header">
          <span><strong>${cert.name}</strong> &mdash; ${cert.issuingOrganization}</span>
          ${cert.issueDate ? `<span>${cert.issueDate}</span>` : ""}
        </div>
        ${cert.credentialId ? `<div class="item-sub">Credential ID: ${cert.credentialId}</div>` : ""}
      </div>
    `).join("")}
  </div>` : ""}

  ${sqlSkills.length > 0 ? `
  <div class="section">
    <div class="section-title">Database & SQL Specializations</div>
    <div class="skills-box">
      ${sqlSkills.map(s => `<strong>${s.skill}:</strong> ${s.details || "Demonstrated proficiency"}`).join(" &bull; ")}
    </div>
  </div>` : ""}
</body>
</html>`

    return await generatePdfFromHtml(html)
}

module.exports = {
    generateInterviewReport,
    generateResumePdf,
    generatePdfFromHtml,
    extractResumeProfileData,
    generateResumePdfFromProfile
}