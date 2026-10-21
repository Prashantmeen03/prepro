import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router";
import React from 'react'

const Protected = ({children}) => {
    const { loading,user } = useAuth()


    if (loading) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#D2E5E3", color: "#10242B" }}>
                <span className="spinner" style={{ width: "2.5rem", height: "2.5rem", borderColor: "#00838F", borderTopColor: "transparent" }} />
                <p style={{ marginTop: "1rem", color: "#3D5A64", fontSize: "0.9rem", fontWeight: 600 }}>Authenticating session...</p>
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" replace />
    }
    
    return children
}

export default Protected