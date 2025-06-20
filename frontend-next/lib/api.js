import axios from 'axios'
import { auth } from './auth'
import { toast } from 'sonner'

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - runs before every request
api.interceptors.request.use(
  (config) => {
    // Add auth token to every request
    const authHeader = auth.getAuthHeader()
    config.headers = { ...config.headers, ...authHeader }
    
    // Log requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`)
    }
    
    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor - handles all responses
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Response:`, response.data)
    }
    return response
  },
  (error) => {
    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          // Unauthorized - clear auth and redirect
          auth.clearAuth()
          window.location.href = '/login'
          toast.error('Session expired. Please login again.')
          break
          
        case 403:
          toast.error('You do not have permission to perform this action.')
          break
          
        case 404:
          toast.error('Requested resource not found.')
          break
          
        case 422:
          // Validation errors
          const validationErrors = data.errors || {}
          Object.keys(validationErrors).forEach(field => {
            toast.error(`${field}: ${validationErrors[field]}`)
          })
          break
          
        case 500:
          toast.error('Server error. Please try again later.')
          break
          
        default:
          toast.error(data.message || 'Something went wrong.')
      }
    } else if (error.request) {
      // Request made but no response
      toast.error('Network error. Please check your connection.')
    } else {
      // Something else happened
      toast.error('An unexpected error occurred.')
    }
    
    return Promise.reject(error)
  }
)

export default api
