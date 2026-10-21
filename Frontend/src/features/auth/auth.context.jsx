import { createContext, useEffect, useState } from "react";
import { onAuthChange } from "@netlify/identity"
import { initializeAuth, toAppUser } from "./services/auth.api"


export const AuthContext = createContext()


export const AuthProvider = ({ children }) => { 

    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [authError, setAuthError] = useState("")

    useEffect(() => {
        let active = true
        const unsubscribe = onAuthChange((_event, currentUser) => {
            if (active) setUser(toAppUser(currentUser))
        })
        initializeAuth()
            .then(data => { if (active) setUser(data.user) })
            .catch(() => { if (active) setAuthError("Unable to confirm your session. Please sign in again or request a new confirmation email.") })
            .finally(() => { if (active) setLoading(false) })
        return () => { active = false; unsubscribe() }
    }, [])

    


    return (
        <AuthContext.Provider value={{user,setUser,loading,setLoading,authError}} >
            {children}
        </AuthContext.Provider>
    )

    
}
