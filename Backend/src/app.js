const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")

const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}))

app.get("/", (req, res) => {
    res.json({
        status: "online",
        message: "Backend server is running successfully!",
        timestamp: new Date().toISOString()
    })
})

/* require all the routes here */
const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")
const resumeProfileRouter = require("./routes/resumeProfile.routes")

/* using all the routes here */
app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)
app.use("/api/resume", resumeProfileRouter)

// 404 Handler for undefined routes
app.use((req, res) => {
    res.status(404).json({
        message: `Endpoint not found: ${req.method} ${req.originalUrl}`
    })
})

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
    // Multer file size error
    if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
            message: "File upload size exceeded. Maximum allowed size is 5MB."
        })
    }

    // Multer custom file type error
    if (err.code === "INVALID_FILE_TYPE") {
        return res.status(400).json({
            message: err.message
        })
    }

    // JSON syntax error
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        return res.status(400).json({
            message: "Malformed JSON payload provided."
        })
    }

    const statusCode = err.status || err.statusCode || 500
    const message = err.message || "Internal server error occurred."

    // Avoid logging secrets or flooding in production
    if (process.env.NODE_ENV !== "test") {
        console.error(`[Error] ${req.method} ${req.originalUrl} - ${statusCode}:`, err.message)
    }

    res.status(statusCode).json({
        message,
        ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {})
    })
})

module.exports = app