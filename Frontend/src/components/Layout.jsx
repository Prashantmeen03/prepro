import React, { useState } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router"
import { Icon, Logo, Button } from "./ui"
import { useAuth } from "../features/auth/hooks/useAuth"

const NAV_ITEMS = [
  { label: "Dashboard", path: "/", icon: "dashboard" },
  { label: "Resume", path: "/resume", icon: "resume" },
  { label: "New", path: "/create-interview", icon: "briefcase" },
  { label: "Interview Report", path: "/report", icon: "spark" },
  { label: "Interview History", path: "/history", icon: "history" },
  { label: "Question Bank", path: "/questions", icon: "spark" },
  { label: "Preparation Roadmap", path: "/roadmap", icon: "roadmap" },
  { label: "Skill Gap Analysis", path: "/skill-gaps", icon: "target" },
  { label: "Profile", path: "/profile", icon: "user" },
  { label: "Settings", path: "/settings", icon: "settings" },
]

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, handleLogout } = useAuth()

  const currentItem = NAV_ITEMS.find((item) => item.path === location.pathname) || {
    label: "Interview Strategy",
  }

  const onLogout = async () => {
    await handleLogout()
    navigate("/login")
  }

  return (
    <div className="app-shell">
      {/* Mobile Backdrop */}
      <div
        className={`sidebar-backdrop ${mobileOpen ? "sidebar-backdrop--visible" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileOpen ? "sidebar--open" : ""}`}>
        <div className="sidebar__brand">
          <Logo />
        </div>

        <nav className="sidebar__nav">
          <span className="sidebar__label">Main Navigation</span>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `sidebar__item ${isActive ? "sidebar__item--active" : ""}`
              }
            >
              <span className="sidebar__icon">
                <Icon name={item.icon} size={18} />
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__avatar">
              {(user?.username?.[0] || "U").toUpperCase()}
            </div>
            <div className="sidebar__user-meta">
              <strong>{user?.username || "Guest User"}</strong>
              <span>{user?.email || "Signed in"}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" icon="logout" onClick={onLogout}>
            Log out
          </Button>
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className="main-wrapper">
        <header className="header">
          <div className="header__left">
            <button
              className="header__toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation"
            >
              <Icon name="menu" size={22} />
            </button>
            <h2 className="header__title">{currentItem.label}</h2>
          </div>

          <div className="header__actions">
            <Button
              variant="primary"
              size="sm"
              icon="spark"
              onClick={() => navigate("/create-interview")}
            >
              New
            </Button>
          </div>
        </header>

        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
