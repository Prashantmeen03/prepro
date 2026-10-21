import {
    login as identityLogin,
    signup,
    logout as identityLogout,
    getUser,
    handleAuthCallback,
} from "@netlify/identity"

export function toAppUser(user) {
    if (!user) return null
    return {
        id: user.id,
        _id: user.id,
        email: user.email || "",
        username: String(user.userMetadata?.username || user.name || user.email?.split("@")[0] || "Candidate"),
    }
}

let initialization
export function initializeAuth() {
    initialization ||= (async () => {
        await handleAuthCallback()
        return getMe()
    })()
    return initialization
}

export async function register({ username, email, password }) {
    const registered = await signup(email, password, { username, full_name: username })
    if (!registered.confirmedAt) {
        return { user: null, requiresConfirmation: true, message: "Check your email to confirm your account, then sign in." }
    }
    return { user: toAppUser(await getUser()) }
}

export async function login({ email, password }) {
    return { user: toAppUser(await identityLogin(email, password)) }
}

export async function logout() {
    await identityLogout()
}

export async function getMe() {
    return { user: toAppUser(await getUser()) }
}
