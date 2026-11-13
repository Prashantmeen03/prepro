import axios from "axios"

// Use the configured backend in deployed environments. Relative URLs work with
// the Vite development proxy and same-origin production deployments.
const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || ""

export const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token")
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
}, (error) => {
    return Promise.reject(error)
})

export default api
