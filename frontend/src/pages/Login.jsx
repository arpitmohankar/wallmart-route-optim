/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  Tabs,
  Tab,
  Avatar,
  Chip,
  CircularProgress,
  useMediaQuery,
  useTheme as useMuiTheme,
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  LocalShipping,
  PersonPin,
  AdminPanelSettings,
  Phone,
  DirectionsCar,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

// Import contexts and services
import { useAuth } from '../App.jsx'
import { useTheme } from '../App.jsx'
import { apiService } from '../services/api.js'

const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { isDarkMode } = useTheme()
  const muiTheme = useMuiTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'))

  // Form state
  const [activeTab, setActiveTab] = useState(0) // 0: Login, 1: Register
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  })

  // Register form state
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'customer',
    vehicleInfo: {
      type: 'car',
      licensePlate: '',
      capacity: '',
    },
    address: '',
    coordinates: null,
  })

  // User roles configuration
  const userRoles = [
    {
      value: 'customer',
      label: 'Customer',
      icon: <PersonPin />,
      color: '#2196f3',
      description: 'Order and track deliveries',
    },
    {
      value: 'driver',
      label: 'Driver',
      icon: <LocalShipping />,
      color: '#4caf50',
      description: 'Deliver packages with optimized routes',
    },
    {
      value: 'admin',
      label: 'Admin',
      icon: <AdminPanelSettings />,
      color: '#ff9800',
      description: 'Manage fleet and monitor operations',
    },
  ]

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue)
    setError('')
  }

  // Handle login form submission
  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (!loginData.email || !loginData.password) {
        throw new Error('Please fill in all fields')
      }

      const response = await apiService.auth.login(loginData)
      
      if (response.success) {
        login(response.user, response.token)
        toast.success(`Welcome back, ${response.user.name}!`)
        
        // Navigate based on user role
        const roleRoute = {
          driver: '/driver',
          customer: '/customer',
          admin: '/admin',
        }
        navigate(roleRoute[response.user.role] || '/')
      }
    } catch (error) {
      setError(error.response?.data?.message || error.message || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle register form submission
  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Validation
      if (!registerData.name || !registerData.email || !registerData.password || !registerData.phone) {
        throw new Error('Please fill in all required fields')
      }

      if (registerData.password.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }

      // For demo purposes, set mock coordinates
      if (registerData.role === 'customer' && registerData.address) {
        registerData.coordinates = {
          latitude: 12.9716 + (Math.random() - 0.5) * 0.1, // Random coordinates around Bangalore
          longitude: 77.5946 + (Math.random() - 0.5) * 0.1,
        }
      }

      const response = await apiService.auth.register(registerData)
      
      if (response.success) {
        login(response.user, response.token)
        toast.success(`Account created successfully! Welcome, ${response.user.name}!`)
        
        // Navigate based on user role
        const roleRoute = {
          driver: '/driver',
          customer: '/customer',
          admin: '/admin',
        }
        navigate(roleRoute[response.user.role] || '/')
      }
    } catch (error) {
      setError(error.response?.data?.message || error.message || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  // Get current location (for demo)
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setRegisterData(prev => ({
            ...prev,
            coordinates: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }
          }))
          toast.success('Location detected!')
        },
        (error) => {
          toast.error('Unable to get location. Using default coordinates.')
          // Set default coordinates (Bangalore)
          setRegisterData(prev => ({
            ...prev,
            coordinates: {
              latitude: 12.9716,
              longitude: 77.5946,
            }
          }))
        }
      )
    }
  }

  // Auto-detect location for customers
  useEffect(() => {
    if (registerData.role === 'customer' && registerData.address && !registerData.coordinates) {
      getCurrentLocation()
    }
  }, [registerData.role, registerData.address])

  return (
    <Box 
      className="min-h-screen flex items-center justify-center p-4"
      sx={{
        background: isDarkMode
          ? 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)'
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
      >
        <Card
          sx={{
            maxWidth: isMobile ? '100%' : 500,
            width: '100%',
            backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'}`,
            borderRadius: '24px',
            boxShadow: isDarkMode 
              ? '0 20px 60px rgba(0,0,0,0.5)' 
              : '0 20px 60px rgba(0,0,0,0.15)',
          }}
        >
          <CardContent className="p-8">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-6"
            >
              <Box className="flex justify-center mb-4">
                <Box className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <LocalShipping className="text-white text-2xl" />
                </Box>
              </Box>
              <Typography variant="h4" className="font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Smart Delivery
              </Typography>
              <Typography variant="body1" className="text-gray-600 dark:text-gray-400">
                AI-powered last-mile delivery optimization
              </Typography>
            </motion.div>

            {/* Tabs */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Tabs 
                value={activeTab} 
                onChange={handleTabChange} 
                centered
                sx={{
                  mb: 4,
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    minWidth: isMobile ? 'auto' : 120,
                  },
                }}
              >
                <Tab label="Login" />
                <Tab label="Register" />
              </Tabs>
            </motion.div>

            {/* Error Alert */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4"
                >
                  <Alert severity="error" sx={{ borderRadius: '12px' }}>
                    {error}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Form */}
            {activeTab === 0 && (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={loginData.password}
                  onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 3 }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={isLoading}
                  sx={{
                    background: 'linear-gradient(45deg, #2196f3 30%, #64b5f6 90%)',
                    borderRadius: '12px',
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    boxShadow: '0 4px 20px rgba(33, 150, 243, 0.4)',
                    '&:hover': {
                      boxShadow: '0 6px 25px rgba(33, 150, 243, 0.6)',
                    },
                  }}
                >
                  {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
                </Button>
              </motion.form>
            )}

            {/* Register Form */}
            {activeTab === 1 && (
              <motion.form
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleRegister}
                className="space-y-4"
              >
                {/* Role Selection */}
                <Box className="mb-6">
                  <Typography variant="subtitle1" className="mb-3 font-semibold">
                    Select Your Role
                  </Typography>
                  <Box className="grid grid-cols-1 gap-3">
                    {userRoles.map((role) => (
                      <motion.div
                        key={role.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Chip
                          avatar={<Avatar sx={{ bgcolor: role.color }}>{role.icon}</Avatar>}
                          label={
                            <Box className="py-2">
                              <Typography variant="subtitle2" className="font-semibold">
                                {role.label}
                              </Typography>
                              <Typography variant="caption" className="text-gray-600 dark:text-gray-400">
                                {role.description}
                              </Typography>
                            </Box>
                          }
                          onClick={() => setRegisterData(prev => ({ ...prev, role: role.value }))}
                          variant={registerData.role === role.value ? "filled" : "outlined"}
                          sx={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: '12px',
                            justifyContent: 'flex-start',
                            backgroundColor: registerData.role === role.value ? `${role.color}20` : 'transparent',
                            borderColor: registerData.role === role.value ? role.color : undefined,
                          }}
                        />
                      </motion.div>
                    ))}
                  </Box>
                </Box>

                {/* Basic Information */}
                <TextField
                  fullWidth
                  label="Full Name"
                  value={registerData.name}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, name: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="Phone Number"
                  value={registerData.phone}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, phone: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={registerData.password}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />

                {/* Role-specific fields */}
                <AnimatePresence>
                  {registerData.role === 'driver' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4"
                    >
                      <TextField
                        fullWidth
                        label="Vehicle License Plate"
                        value={registerData.vehicleInfo.licensePlate}
                        onChange={(e) => setRegisterData(prev => ({
                          ...prev,
                          vehicleInfo: { ...prev.vehicleInfo, licensePlate: e.target.value }
                        }))}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <DirectionsCar />
                            </InputAdornment>
                          ),
                        }}
                        sx={{ mb: 2 }}
                      />
                    </motion.div>
                  )}

                  {registerData.role === 'customer' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <TextField
                        fullWidth
                        label="Address"
                        multiline
                        rows={2}
                        value={registerData.address}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Enter your complete address"
                        sx={{ mb: 2 }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={isLoading}
                  sx={{
                    background: 'linear-gradient(45deg, #4caf50 30%, #81c784 90%)',
                    borderRadius: '12px',
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    boxShadow: '0 4px 20px rgba(76, 175, 80, 0.4)',
                    '&:hover': {
                      boxShadow: '0 6px 25px rgba(76, 175, 80, 0.6)',
                    },
                  }}
                >
                  {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
                </Button>
              </motion.form>
            )}

            {/* Demo Credentials */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg"
            >
              <Typography variant="caption" className="text-center block mb-2 font-semibold">
                Demo Credentials:
              </Typography>
              <Typography variant="caption" className="text-center block text-gray-600 dark:text-gray-400">
                Driver: driver@demo.com / password123<br />
                Customer: customer@demo.com / password123<br />
                Admin: admin@demo.com / password123
              </Typography>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </Box>
  )
}

export default Login
