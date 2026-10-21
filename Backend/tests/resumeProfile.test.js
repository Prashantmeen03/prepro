const { describe, it } = require("node:test")
const assert = require("node:assert")
const request = require("supertest")
const app = require("../src/app")

describe("Resume Profile Route Tests", () => {
    it("GET /api/resume/profile should reject unauthenticated requests with 401", async () => {
        const res = await request(app).get("/api/resume/profile")
        assert.strictEqual(res.status, 401)
        assert.ok(res.body.message.includes("token"))
    })

    it("PUT /api/resume/profile should reject unauthenticated requests with 401", async () => {
        const res = await request(app)
            .put("/api/resume/profile")
            .send({ personalInfo: { fullName: "Test Candidate" } })
        assert.strictEqual(res.status, 401)
    })

    it("POST /api/resume/upload should reject unauthenticated uploads with 401", async () => {
        const res = await request(app)
            .post("/api/resume/upload")
            .attach("resume", Buffer.from("dummy pdf content"), "resume.pdf")
        assert.strictEqual(res.status, 401)
    })

    it("GET /api/resume/pdf should reject unauthenticated requests with 401", async () => {
        const res = await request(app).get("/api/resume/pdf")
        assert.strictEqual(res.status, 401)
    })
})
