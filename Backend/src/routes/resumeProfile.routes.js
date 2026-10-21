const express = require("express")
const router = express.Router()
const { authUser } = require("../middlewares/auth.middleware")
const upload = require("../middlewares/file.middleware")
const {
    getResumeProfileController,
    updateResumeProfileController,
    uploadAndExtractResumeController,
    deleteResumeFileController,
    exportResumePdfController
} = require("../controllers/resumeProfile.controller")

// All routes require authentication
router.use(authUser)

router.get("/profile", getResumeProfileController)
router.put("/profile", updateResumeProfileController)
router.post("/upload", upload.single("resume"), uploadAndExtractResumeController)
router.delete("/file", deleteResumeFileController)
router.get("/pdf", exportResumePdfController)
router.post("/pdf", exportResumePdfController)

module.exports = router
