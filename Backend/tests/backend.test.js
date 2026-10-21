const { describe, it } = require("node:test")
const assert = require("node:assert")
const request = require("supertest")
const app = require("../src/app")

describe("Backend Health & Route Tests", () => {
    it("GET / should return online status", async () => {
        const res = await request(app).get("/")
        assert.strictEqual(res.status, 200)
        assert.strictEqual(res.body.status, "online")
        assert.ok(res.body.timestamp)
    })

    it("GET /unknown-route should return 404 JSON error", async () => {
        const res = await request(app).get("/api/non-existent-route")
        assert.strictEqual(res.status, 404)
        assert.ok(res.body.message.includes("Endpoint not found"))
    })
})

describe("Authentication Validation Tests", () => {
    it("POST /api/auth/register should fail on empty body", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({})
        assert.strictEqual(res.status, 400)
        assert.ok(res.body.message)
    })

    it("POST /api/auth/register should fail on invalid email", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({
                username: "testuser",
                email: "not-an-email",
                password: "password123"
            })
        assert.strictEqual(res.status, 400)
        assert.ok(res.body.message.includes("email") || res.body.message.includes("Email"))
    })

    it("POST /api/auth/register should fail on password shorter than 6 chars", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({
                username: "testuser",
                email: "test@example.com",
                password: "123"
            })
        assert.strictEqual(res.status, 400)
        assert.ok(res.body.message.includes("Password") || res.body.message.includes("password"))
    })

    it("POST /api/auth/login should fail on empty body", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({})
        assert.strictEqual(res.status, 400)
        assert.ok(res.body.message)
    })
})

describe("Protected Routes & Authorization Tests", () => {
    it("GET /api/auth/get-me should return 401 without token", async () => {
        const res = await request(app).get("/api/auth/get-me")
        assert.strictEqual(res.status, 401)
        assert.ok(res.body.message.includes("token"))
    })

    it("GET /api/interview/ should return 401 without token", async () => {
        const res = await request(app).get("/api/interview/")
        assert.strictEqual(res.status, 401)
        assert.ok(res.body.message.includes("token"))
    })

    it("POST /api/interview/ should return 401 without token", async () => {
        const res = await request(app).post("/api/interview/").send({
            jobDescription: "Senior React Engineer needed."
        })
        assert.strictEqual(res.status, 401)
    })

    it("POST /api/interview/resume/pdf/12345 should return 401 without token", async () => {
        const res = await request(app).post("/api/interview/resume/pdf/12345")
        assert.strictEqual(res.status, 401)
    })
})

describe("File Upload & Security Middleware Tests", () => {
    it("POST /api/interview/ should reject non-PDF file upload with 400", async () => {
        const jwt = require("jsonwebtoken")
        const validToken = jwt.sign(
            { id: "60d0fe4f5311236168a109ca", username: "testuser" },
            process.env.JWT_SECRET || "default_jwt_secret"
        )

        const res = await request(app)
            .post("/api/interview/")
            .set("Authorization", `Bearer ${validToken}`)
            .field("jobDescription", "Senior Developer position with 5+ years experience")
            .attach("resume", Buffer.from("console.log('not a pdf')"), "malicious.js")

        assert.strictEqual(res.status, 400)
        assert.ok(res.body.message.includes("PDF"))
    })
})
