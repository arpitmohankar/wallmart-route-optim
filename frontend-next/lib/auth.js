import Cookies from 'js-cookie'

const TOKEN_KEY = 'delivery-token'
const USER_KEY = 'delivery-user'

// Professional tip: Always use a class or object for related functions
export const auth = {
  // Save authentication data
  setAuth: (token, user) => {
    // Cookies for token (httpOnly would be better but needs backend support)
    Cookies.set(TOKEN_KEY, token, { 
      expires: 7, // 7 days
      sameSite: 'strict', // CSRF protection
      secure: process.env.NODE_ENV === 'production' // HTTPS in production
    })
    
    // LocalStorage for user data (non-sensitive)
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    }
  },

  // Get authentication token
  getToken: () => {
    return Cookies.get(TOKEN_KEY)
  },

  // Get user data
  getUser: () => {
    if (typeof window === 'undefined') return null
    
    try {
      const userStr = localStorage.getItem(USER_KEY)
      return userStr ? JSON.parse(userStr) : null
    } catch (error) {
      console.error('Error parsing user data:', error)
      return null
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!auth.getToken()
  },

  // Get user role
  getUserRole: () => {
    const user = auth.getUser()
    return user?.role || null
  },

  // Clear authentication data
  clearAuth: () => {
    Cookies.remove(TOKEN_KEY)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(USER_KEY)
    }
  },

  // Get authorization header
  getAuthHeader: () => {
    const token = auth.getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
}
