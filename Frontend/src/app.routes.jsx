import React from "react"
import { createBrowserRouter, Navigate } from "react-router"
import Protected from "./features/auth/components/Protected"
import Layout from "./components/Layout"

// Application Pages
import AuthPage from "./pages/AuthPage"
import DashboardPage from "./pages/DashboardPage"
import CreateInterviewPage from "./pages/CreateInterviewPage"
import ReportPage from "./pages/ReportPage"
import ResumeGeneratorPage from "./pages/ResumeGeneratorPage"
import InterviewHistoryPage from "./pages/InterviewHistoryPage"
import QuestionBankPage from "./pages/QuestionBankPage"
import RoadmapPage from "./pages/RoadmapPage"
import SkillGapPage from "./pages/SkillGapPage"
import ProfilePage from "./pages/ProfilePage"
import SettingsPage from "./pages/SettingsPage"

export const router = createBrowserRouter([
    {
        path: "/login",
        element: <AuthPage initialMode="login" />
    },
    {
        path: "/register",
        element: <AuthPage initialMode="register" />
    },
    {
        path: "/",
        element: (
            <Protected>
                <Layout />
            </Protected>
        ),
        children: [
            {
                index: true,
                element: <DashboardPage />
            },
            {
                path: "create-interview",
                element: <CreateInterviewPage />
            },
            {
                path: "report",
                element: <ReportPage />
            },
            {
                path: "report/:interviewId",
                element: <ReportPage />
            },
            {
                path: "interview/:interviewId",
                element: <ReportPage />
            },
            {
                path: "resume",
                element: <ResumeGeneratorPage />
            },
            {
                path: "resume/:interviewId",
                element: <ResumeGeneratorPage />
            },
            {
                path: "history",
                element: <InterviewHistoryPage />
            },
            {
                path: "questions",
                element: <QuestionBankPage />
            },
            {
                path: "questions/:interviewId",
                element: <QuestionBankPage />
            },
            {
                path: "roadmap",
                element: <RoadmapPage />
            },
            {
                path: "roadmap/:interviewId",
                element: <RoadmapPage />
            },
            {
                path: "skill-gaps",
                element: <SkillGapPage />
            },
            {
                path: "skill-gaps/:interviewId",
                element: <SkillGapPage />
            },
            {
                path: "profile",
                element: <ProfilePage />
            },
            {
                path: "settings",
                element: <SettingsPage />
            }
        ]
    },
    {
        path: "*",
        element: <Navigate to="/" replace />
    }
])