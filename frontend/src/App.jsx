/* eslint-disable react-refresh/only-export-components */

// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <div>
//         <a href="https://vite.dev" target="_blank">
//           <img src={viteLogo} className="logo" alt="Vite logo" />
//         </a>
//         <a href="https://react.dev" target="_blank">
//           <img src={reactLogo} className="logo react" alt="React logo" />
//         </a>
//       </div>
//       <h1 class="font-bold text-3xl underline">Vite + React</h1>
//       <div className="card border-amber-300 border-2 p-4">
//         <button onClick={() => setCount((count) => count + 1)}>
//           count is {count}
//         </button>
//         <p>
//           Edit <code>src/App.jsx</code> and save to test HMR
//         </p>
//       </div>
//       <p className="read-the-docs">
//         Click on the Vite and React logos to learn more
//       </p>
//     </>
//   )
// }

// export default App
import React, { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { CssBaseline, Box } from '@mui/material'
import { Toaster } from 'react-hot-toast'

// Import Pages
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import DriverPage from './pages/DriverPage.jsx'
import CustomerPage from './pages/CustomerPage.jsx'
import AdminPage from './pages/AdminPage.jsx'

// Import Services
import api from './services/api.js'

// Create Theme Context
const ThemeContext = createContext()

// Custom Hook for Theme
export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

// Auth Context
const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

function App() {
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check system preference or localStorage
    const savedTheme = localStorage.getItem('delivery-app-theme')
    if (savedTheme) return savedTheme === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // Auth State
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Material UI Theme Configuration
  const theme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: isDarkMode ? '#64b5f6' : '#2196f3',
        light: '#90caf9',
        dark: '#1976d2',
      },
      secondary: {
        main: isDarkMode ? '#f48fb1' : '#e91e63',
      },
      background: {
        default: isDarkMode ? '#121212' : '#fafafa',
        paper: isDarkMode ? '#1e1e1e' : '#ffffff',
      },
      text: {
        primary: isDarkMode ? '#ffffff' : '#212121',
        secondary: isDarkMode ? '#b0b0b0' : '#757575',
      },
    },
    typography: {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      h4: {
        fontWeight: 600,
        fontSize: '1.75rem',
      },
      h6: {
        fontWeight: 600,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            padding: '10px 24px',
            fontSize: '1rem',
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: isDarkMode 
              ? '0 4px 20px rgba(0,0,0,0.3)' 
              : '0 4px 20px rgba(0,0,0,0.1)',
          },
        },
      },
    },
  })

  // Toggle Theme Function
  const toggleTheme = () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    localStorage.setItem('delivery-app-theme', newMode ? 'dark' : 'light')
    
    // Update document class for Tailwind dark mode
    if (newMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Check Authentication on App Load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('delivery-token')
        if (token) {
          const response = await api.get('/auth/profile')
          if (response.data.success) {
            setUser(response.data.user)
            setIsAuthenticated(true)
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        localStorage.removeItem('delivery-token')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Apply dark mode class on mount
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  // Login Function
  const login = (userData, token) => {
    setUser(userData)
    setIsAuthenticated(true)
    localStorage.setItem('delivery-token', token)
  }

  // Logout Function
  const logout = () => {
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('delivery-token')
  }

  // Protected Route Component
  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (isLoading) {
      return (
        <Box 
          className="flex items-center justify-center min-h-screen"
          sx={{ 
            background: isDarkMode 
              ? 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' 
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          }}
        >
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
        </Box>
      )
    }

    if (!isAuthenticated) {
      return <Navigate to="/login" replace />
    }

    if (allowedRoles && !allowedRoles.includes(user?.role)) {
      return <Navigate to="/unauthorized" replace />
    }

    return children
  }

  // Role-based Routing
  const getRoleBasedRoute = () => {
    if (!user) return '/login'
    
    switch (user.role) {
      case 'driver':
        return '/driver'
      case 'customer':
        return '/customer'
      case 'admin':
        return '/admin'
      default:
        return '/login'
    }
  }

  if (isLoading) {
    return (
      <Box 
        className="flex items-center justify-center min-h-screen"
        sx={{ 
          background: isDarkMode 
            ? 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' 
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Smart Delivery...</p>
        </div>
      </Box>
    )
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
        <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
          <Router>
            <Box className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
              <Routes>
                {/* Public Routes */}
                <Route 
                  path="/login" 
                  element={
                    isAuthenticated ? 
                    <Navigate to={getRoleBasedRoute()} replace /> : 
                    <Login />
                  } 
                />

                {/* Protected Routes with Layout */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  {/* Role-based Routes */}
                  <Route index element={<Navigate to={getRoleBasedRoute()} replace />} />
                  
                  <Route 
                    path="driver" 
                    element={
                      <ProtectedRoute allowedRoles={['driver']}>
                        <DriverPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="customer" 
                    element={
                      <ProtectedRoute allowedRoles={['customer']}>
                        <CustomerPage />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="admin" 
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <AdminPage />
                      </ProtectedRoute>
                    } 
                  />
                </Route>

                {/* Unauthorized Route */}
                <Route 
                  path="/unauthorized" 
                  element={
                    <Box className="flex items-center justify-center min-h-screen p-4">
                      <div className="text-center">
                        <h1 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          You don't have permission to access this page.
                        </p>
                        <button 
                          onClick={logout}
                          className="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition-colors"
                        >
                          Login with Different Account
                        </button>
                      </div>
                    </Box>
                  } 
                />

                {/* 404 Route */}
                <Route 
                  path="*" 
                  element={
                    <Box className="flex items-center justify-center min-h-screen p-4">
                      <div className="text-center">
                        <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200 mb-4">404</h1>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">Page not found</p>
                        <button 
                          onClick={() => window.history.back()}
                          className="bg-primary-500 text-white px-6 py-2 rounded-lg hover:bg-primary-600 transition-colors"
                        >
                          Go Back
                        </button>
                      </div>
                    </Box>
                  } 
                />
              </Routes>
            </Box>
          </Router>

          {/* Toast Notifications */}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: isDarkMode ? '#1e1e1e' : '#ffffff',
                color: isDarkMode ? '#ffffff' : '#212121',
                border: `1px solid ${isDarkMode ? '#333' : '#e0e0e0'}`,
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#ffffff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#ffffff',
                },
              },
            }}
          />
        </AuthContext.Provider>
      </ThemeContext.Provider>
    </ThemeProvider>
  )
}

export default App
