/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Button,
  Alert,
  CircularProgress,
  LinearProgress,
  Tooltip,
  useTheme as useMuiTheme,
  useMediaQuery,
} from '@mui/material'
import {
  MyLocation,
  LocationOn,
  Navigation,
  GpsFixed,
  GpsNotFixed,
  GpsOff,
  Speed,
  Schedule,
  Warning,
  Refresh,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

// Import services and contexts
import { useTheme } from '../App.jsx'
import locationService from '../services/location.js'
import socketService from '../services/socket.js'

const LocationTracker = ({
  onLocationUpdate,
  showControls = true,
  showDetails = true,
  autoStart = false,
  userId = null,
  className = '',
  style = {},
}) => {
  const { isDarkMode } = useTheme()
  const muiTheme = useMuiTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'))

  // Location state
  const [isTracking, setIsTracking] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [locationHistory, setLocationHistory] = useState([])
  const [accuracy, setAccuracy] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // Permission state
  const [permissionStatus, setPermissionStatus] = useState('unknown')
  
  // Tracking statistics
  const [trackingStats, setTrackingStats] = useState({
    startTime: null,
    totalDistance: 0,
    averageSpeed: 0,
    maxSpeed: 0,
    updateCount: 0,
  })

  // Check location permissions on mount
  useEffect(() => {
    checkLocationPermissions()
    
    if (autoStart) {
      startTracking()
    }
  }, [autoStart])

  // Location service event listeners
  useEffect(() => {
    const locationCleanup = locationService.onLocationUpdate((location) => {
      setCurrentLocation(location)
      setAccuracy(location.accuracy)
      setError(null)
      
      // Update tracking statistics
      updateTrackingStats(location)
      
      // Add to location history
      setLocationHistory(prev => [location, ...prev.slice(0, 99)]) // Keep last 100 locations
      
      // Notify parent component
      onLocationUpdate?.(location)
      
      // Send to backend if user ID is provided
      if (userId && socketService.getConnectionStatus().isConnected) {
        socketService.updateDriverLocation({
          driverId: userId,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
          },
          timestamp: location.timestamp,
        })
      }
    })

    const errorCleanup = locationService.onError((error) => {
      setError(error)
      setIsTracking(false)
      toast.error(error)
    })

    return () => {
      locationCleanup()
      errorCleanup()
    }
  }, [onLocationUpdate, userId])

  // Check location permissions
  const checkLocationPermissions = async () => {
    try {
      const permission = await locationService.checkPermissions()
      setPermissionStatus(permission)
    } catch (error) {
      console.warn('Could not check location permissions:', error)
      setPermissionStatus('unknown')
    }
  }

  // Update tracking statistics
  const updateTrackingStats = useCallback((newLocation) => {
    setTrackingStats(prev => {
      const now = new Date()
      const newStats = { ...prev }
      
      // Set start time if first location
      if (!prev.startTime) {
        newStats.startTime = now
      }
      
      // Calculate distance and speed if we have previous location
      if (locationHistory.length > 0) {
        const lastLocation = locationHistory[0]
        const distance = calculateDistance(
          lastLocation.latitude,
          lastLocation.longitude,
          newLocation.latitude,
          newLocation.longitude
        )
        
        newStats.totalDistance += distance
        
        // Calculate speed (km/h)
        const timeDiff = (newLocation.timestamp - lastLocation.timestamp) / 1000 / 3600 // hours
        if (timeDiff > 0) {
          const speed = distance / timeDiff
          newStats.maxSpeed = Math.max(newStats.maxSpeed, speed)
          
          // Calculate average speed
          const totalTime = (now - new Date(prev.startTime)) / 1000 / 3600 // hours
          if (totalTime > 0) {
            newStats.averageSpeed = newStats.totalDistance / totalTime
          }
        }
      }
      
      newStats.updateCount += 1
      return newStats
    })
  }, [locationHistory])

  // Calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180)
    const dLon = (lon2 - lon1) * (Math.PI / 180)
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Start location tracking
  const startTracking = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      await locationService.startTracking({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      })
      
      setIsTracking(true)
      setTrackingStats({
        startTime: new Date(),
        totalDistance: 0,
        averageSpeed: 0,
        maxSpeed: 0,
        updateCount: 0,
      })
      
      toast.success('📍 Location tracking started')
      
    } catch (error) {
      setError(error.message)
      toast.error('Failed to start location tracking: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Stop location tracking
  const stopTracking = () => {
    locationService.stopTracking()
    setIsTracking(false)
    toast.success('📍 Location tracking stopped')
  }

  // Get accuracy status
  const getAccuracyStatus = (accuracy) => {
    if (!accuracy) return { level: 'unknown', message: 'Unknown', color: '#757575' }
    
    if (accuracy <= 10) return { level: 'high', message: 'Very accurate', color: '#4caf50' }
    if (accuracy <= 50) return { level: 'medium', message: 'Good', color: '#2196f3' }
    if (accuracy <= 100) return { level: 'low', message: 'Fair', color: '#ff9800' }
    return { level: 'poor', message: 'Poor', color: '#f44336' }
  }

  // Get permission status icon and color
  const getPermissionStatusInfo = (status) => {
    switch (status) {
      case 'granted':
        return { icon: <GpsFixed />, color: '#4caf50', message: 'Location access granted' }
      case 'denied':
        return { icon: <GpsOff />, color: '#f44336', message: 'Location access denied' }
      case 'prompt':
        return { icon: <GpsNotFixed />, color: '#ff9800', message: 'Location permission required' }
      default:
        return { icon: <GpsNotFixed />, color: '#757575', message: 'Checking permissions...' }
    }
  }

  const accuracyStatus = getAccuracyStatus(accuracy)
  const permissionInfo = getPermissionStatusInfo(permissionStatus)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={className}
      style={style}
    >
      <Card
        sx={{
          borderRadius: '16px',
          border: `2px solid ${isTracking ? '#4caf50' : isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
          backgroundColor: isDarkMode ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <CardContent>
          {/* Header */}
          <Box className="flex items-center justify-between mb-4">
            <Box className="flex items-center space-x-2">
              <motion.div
                animate={isTracking ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 2, repeat: isTracking ? Infinity : 0 }}
              >
                {permissionInfo.icon}
              </motion.div>
              <Typography variant="h6" className="font-semibold">
                📍 Location Tracker
              </Typography>
            </Box>
            
            <Box className="flex items-center space-x-2">
              <Chip
                label={isTracking ? 'TRACKING' : 'STOPPED'}
                size="small"
                color={isTracking ? 'success' : 'default'}
                icon={isTracking ? <GpsFixed /> : <GpsOff />}
              />
              
              {showControls && (
                <Tooltip title="Refresh location">
                  <IconButton
                    size="small"
                    onClick={() => locationService.getCurrentLocation()}
                    disabled={!isTracking}
                  >
                    <Refresh />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Permission Status */}
          {permissionStatus !== 'granted' && (
            <Alert
              severity={permissionStatus === 'denied' ? 'error' : 'warning'}
              sx={{ borderRadius: '8px', mb: 3 }}
              action={
                permissionStatus === 'denied' ? (
                  <Button size="small" onClick={checkLocationPermissions}>
                    Retry
                  </Button>
                ) : undefined
              }
            >
              {permissionInfo.message}
            </Alert>
          )}

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3"
              >
                <Alert severity="error" sx={{ borderRadius: '8px' }}>
                  {error}
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Current Location Info */}
          {currentLocation && showDetails && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <Box className="grid grid-cols-2 gap-4 mb-3">
                <Box className="text-center">
                  <Typography variant="h6" className="font-bold">
                    {currentLocation.latitude.toFixed(6)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Latitude
                  </Typography>
                </Box>
                <Box className="text-center">
                  <Typography variant="h6" className="font-bold">
                    {currentLocation.longitude.toFixed(6)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Longitude
                  </Typography>
                </Box>
              </Box>

              <Box className="flex items-center justify-between mb-2">
                <Typography variant="body2">
                  Accuracy: ±{accuracy?.toFixed(1) || 'Unknown'} meters
                </Typography>
                <Chip
                  label={accuracyStatus.message}
                  size="small"
                  sx={{
                    backgroundColor: accuracyStatus.color,
                    color: 'white',
                    fontSize: '0.7rem',
                  }}
                />
              </Box>

              <LinearProgress
                variant="determinate"
                value={Math.max(0, Math.min(100, 100 - (accuracy || 0)))}
                sx={{
                  borderRadius: '4px',
                  height: '6px',
                  backgroundColor: 'rgba(0,0,0,0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: accuracyStatus.color,
                  },
                }}
              />

              <Typography variant="caption" color="text.secondary" className="block mt-1">
                Last update: {currentLocation.timestamp.toLocaleTimeString()}
              </Typography>
            </motion.div>
          )}

          {/* Tracking Statistics */}
          {isTracking && trackingStats.startTime && showDetails && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <Typography variant="subtitle2" className="font-semibold mb-2">
                📊 Tracking Statistics
              </Typography>
              
              <Box className="grid grid-cols-2 gap-4">
                <Box className="text-center">
                  <Typography variant="h6" className="font-bold">
                    {trackingStats.totalDistance.toFixed(2)} km
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Distance Traveled
                  </Typography>
                </Box>
                
                <Box className="text-center">
                  <Typography variant="h6" className="font-bold">
                    {trackingStats.averageSpeed.toFixed(1)} km/h
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Average Speed
                  </Typography>
                </Box>
                
                <Box className="text-center">
                  <Typography variant="h6" className="font-bold">
                    {Math.floor((new Date() - trackingStats.startTime) / 60000)}m
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Tracking Time
                  </Typography>
                </Box>
                
                <Box className="text-center">
                  <Typography variant="h6" className="font-bold">
                    {trackingStats.updateCount}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Location Updates
                  </Typography>
                </Box>
              </Box>
            </motion.div>
          )}

          {/* Controls */}
          {showControls && (
            <Box className="flex space-x-2">
              {!isTracking ? (
                <Button
                  variant="contained"
                  startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <MyLocation />}
                  onClick={startTracking}
                  disabled={isLoading || permissionStatus === 'denied'}
                  fullWidth
                  sx={{
                    borderRadius: '12px',
                    background: 'linear-gradient(45deg, #4caf50, #81c784)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #388e3c, #4caf50)',
                    },
                  }}
                >
                  {isLoading ? 'Starting...' : 'Start Tracking'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  startIcon={<GpsOff />}
                  onClick={stopTracking}
                  fullWidth
                  color="error"
                  sx={{
                    borderRadius: '12px',
                  }}
                >
                  Stop Tracking
                </Button>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default LocationTracker
