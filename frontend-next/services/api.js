import axios from 'axios'
import { auth } from '@/lib/auth'
import { toast } from 'sonner'
import { API_ENDPOINTS } from '@/utils/constants'

// Create axios instance
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = auth.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Log in development
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

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Response:`, response.data)
    }
    return response
  },
  (error) => {
    const { response } = error
    
    if (response) {
      switch (response.status) {
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
          toast.error('Resource not found.')
          break
          
        case 422:
          // Validation errors
          const errors = response.data.errors || {}
          Object.entries(errors).forEach(([field, message]) => {
            toast.error(`${field}: ${message}`)
          })
          break
          
        case 500:
          toast.error('Server error. Please try again later.')
          break
          
        default:
          toast.error(response.data.message || 'Something went wrong.')
      }
    } else if (error.request) {
      toast.error('Network error. Please check your connection.')
    } else {
      toast.error('An unexpected error occurred.')
    }
    
    return Promise.reject(error)
  }
)

// API service object
const apiService = {
  // Auth endpoints
  auth: {
    login: (credentials) => 
      apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials),
    
    register: (userData) => 
      apiClient.post(API_ENDPOINTS.AUTH.REGISTER, userData),
    
    getProfile: () => 
      apiClient.get(API_ENDPOINTS.AUTH.PROFILE),
    
    logout: () => {
      auth.clearAuth()
      return Promise.resolve()
    }
  },
  
  // Delivery endpoints
  delivery: {
    create: (deliveryData) => 
      apiClient.post(API_ENDPOINTS.DELIVERY.CREATE, deliveryData),
    
    getByCustomer: (customerId) => 
      apiClient.get(API_ENDPOINTS.DELIVERY.GET_BY_CUSTOMER(customerId)),
    
    getByDriver: (driverId) => 
      apiClient.get(API_ENDPOINTS.DELIVERY.GET_BY_DRIVER(driverId)),
    
    update: (deliveryId, updateData) => 
      apiClient.put(API_ENDPOINTS.DELIVERY.UPDATE(deliveryId), updateData),
    
    getAll: () => 
      apiClient.get(API_ENDPOINTS.DELIVERY.GET_ALL),
  },
  
  // Route endpoints
  route: {
    optimize: (routeData) => 
      apiClient.post(API_ENDPOINTS.ROUTE.OPTIMIZE, routeData),
    
    refresh: (driverId) => 
      apiClient.post(API_ENDPOINTS.ROUTE.REFRESH, { driverId }),
    
    getCurrent: (driverId) => 
      apiClient.get(API_ENDPOINTS.ROUTE.CURRENT(driverId)),
    
    updateLocation: (locationData) => 
      apiClient.post(API_ENDPOINTS.ROUTE.UPDATE_LOCATION, locationData),
    
    reportCondition: (conditionData) => 
      apiClient.post(API_ENDPOINTS.ROUTE.REPORT_CONDITION, conditionData),
  }
}

export default apiService
