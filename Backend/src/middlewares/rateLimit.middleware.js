const rateLimit = require("express-rate-limit")

// Rate limiter for authentication endpoints (login, register)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Too many authentication attempts. Please try again after 15 minutes."
    }
})

// Rate limiter for expensive AI generation endpoints
const aiGenerationLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 10, // 10 strategy or resume generations per 5 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "AI generation rate limit reached. Please wait a few moments before generating again."
    }
})

module.exports = {
    authLimiter,
    aiGenerationLimiter
}
