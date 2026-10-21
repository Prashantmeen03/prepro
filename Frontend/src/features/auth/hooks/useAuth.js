import { useContext, useEffect } from "react";
import { AuthContext } from "../auth.context";
import { login, register, logout, getMe } from "../services/auth.api";

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider")
    }
    const { user, setUser, loading, setLoading } = context

    const handleLogin = async ({ email, password }) => {
        setLoading(true)
        try {
            const data = await login({ email, password })
            if (data?.token) {
                localStorage.setItem("token", data.token)
            }
            if (data?.user) {
                setUser(data.user)
            }
            return data
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async ({ username, email, password }) => {
        setLoading(true)
        try {
            const data = await register({ username, email, password })
            if (data?.token) {
                localStorage.setItem("token", data.token)
            }
            if (data?.user) {
                setUser(data.user)
            }
            return data
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        setLoading(true)
        try {
            await logout()
            localStorage.removeItem("token")
            setUser(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        let isMounted = true
        const getAndSetUser = async () => {
            try {
                const data = await getMe()
                if (isMounted && data?.user) {
                    setUser(data.user)
                }
            } catch (err) {
                if (isMounted) setUser(null)
            } finally {
                if (isMounted) setLoading(false)
            }
        }
        getAndSetUser()
        return () => { isMounted = false }
    }, [])

    return { user, loading, handleRegister, handleLogin, handleLogout }
}