const multer = require("multer")

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const originalName = (file.originalname || "").toLowerCase()
        const isPdf = file.mimetype === "application/pdf" || originalName.endsWith(".pdf")
        const isDocx = file.mimetype.includes("wordprocessingml") ||
                       file.mimetype === "application/msword" ||
                       originalName.endsWith(".docx") ||
                       originalName.endsWith(".doc")

        if (isPdf || isDocx) {
            cb(null, true)
        } else {
            const err = new Error("Invalid file type. Only PDF and DOCX resumes are supported.")
            err.code = "INVALID_FILE_TYPE"
            cb(err, false)
        }
    }
})

module.exports = upload