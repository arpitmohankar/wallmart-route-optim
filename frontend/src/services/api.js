/* eslint-disable no-useless-catch */
import axios from 'axios'
import toast from 'react-hot-toast'

// Create Axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor - Add JWT token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('delivery-token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Log API calls in development
    if (import.meta.env.DEV) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`)
    }
    
    return config
  },
  (error) => {
    console.error('❌ Request Error:', error)
    return Promise.reject(error)
  }
)

// Response Interceptor - Handle responses and errors globally
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data)
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
          // Unauthorized - redirect to login
          toast.error('Session expired. Please login again.')
          localStorage.removeItem('delivery-token')
          window.location.href = '/login'
          break
          
        case 403:
          // Forbidden
          toast.error('Access denied. You don\'t have permission.')
          break
          
        case 404:
          // Not found
          toast.error('Requested resource not found.')
          break
          
        case 429:
          // Too many requests
          toast.error('Too many requests. Please try again later.')
          break
          
        case 500:
          // Server error
          toast.error('Server error. Please try again later.')
          break
          
        default:
          // Other errors
          toast.error(data.message || 'Something went wrong!')
      }
      
      console.error(`❌ API Error ${status}:`, data)
    } else if (error.request) {
      // Network error
      toast.error('Network error. Please check your connection.')
      console.error('❌ Network Error:', error.request)
    } else {
      // Other errors
      toast.error('An unexpected error occurred.')
      console.error('❌ Error:', error.message)
    }
    
    return Promise.reject(error)
  }
)

// API Service Functions
const apiService = {
  // Authentication APIs
  auth: {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    getProfile: () => api.get('/auth/profile'),
    logout: () => {
      localStorage.removeItem('delivery-token')
      return Promise.resolve()
    }
  },

  // Delivery Management APIs
  delivery: {
    create: (deliveryData) => api.post('/delivery/create', deliveryData),
    getCustomerDeliveries: (customerId) => api.get(`/delivery/customer/${customerId}`),
    getDriverDeliveries: (driverId) => api.get(`/delivery/driver/${driverId}`),
    updateStatus: (deliveryId, updateData) => api.put(`/delivery/update/${deliveryId}`, updateData),
    getAllDeliveries: (params = {}) => api.get('/delivery/all', { params }),
  },

  // Route Optimization APIs (Your Key Feature!)
  route: {
    optimize: (routeData) => api.post('/route/optimize', routeData),
    refresh: (refreshData) => api.post('/route/refresh', refreshData), // Dynamic route refresh
    getCurrent: (driverId) => api.get(`/route/current/${driverId}`),
    updateLocation: (locationData) => api.post('/route/update-location', locationData),
    reportCondition: (conditionData) => api.post('/route/report-condition', conditionData),
  },

  // Health Check
  health: () => api.get('/health'),
}

// Utility functions for common API patterns
export const apiUtils = {
  // Handle API call with loading state
  withLoading: async (apiCall, setLoading) => {
    try {
      setLoading(true)
      const response = await apiCall()
      return response.data
    } catch (error) {
      throw error
    } finally {
      setLoading(false)
    }
  },

  // Handle API call with toast notifications
  withToast: async (apiCall, successMessage = 'Operation successful!') => {
    try {
      const response = await apiCall()
      if (response.data.success) {
        toast.success(successMessage)
      }
      return response.data
    } catch (error) {
      // Error already handled by interceptor
      throw error
    }
  },

  // Upload file with progress
  uploadWithProgress: (url, formData, onProgress) => {
    return api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        )
        onProgress?.(percentCompleted)
      },
    })
  },
}

// Export default api instance and service functions
export default api
export { apiService }
