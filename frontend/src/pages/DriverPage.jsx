/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Fab,
  Badge,
  Alert,
  CircularProgress,
  useMediaQuery,
  useTheme as useMuiTheme,
} from '@mui/material'
import {
  Refresh,
  Navigation,
  LocalShipping,
  LocationOn,
  Warning,
  CheckCircle,
  Schedule,
  Report,
  MyLocation,
  Phone,
  Message,
  Route as RouteIcon,
  Timeline,
  Speed,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

// Import components and services
import Map from '../components/Map.jsx'
import { useAuth } from '../App.jsx'
import { useTheme } from '../App.jsx'
import { apiService } from '../services/api.js'
import socketService from '../services/socket.js'
import locationService from '../services/location.js'

const DriverPage = () => {
  const { user } = useAuth()
  const { isDarkMode } = useTheme()
  const muiTheme = useMuiTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'))

  // State management
  const [deliveries, setDeliveries] = useState([])
  const [currentLocation, setCurrentLocation] = useState(null)
  const [optimizedRoute, setOptimizedRoute] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshingRoute, setIsRefreshingRoute] = useState(false)
  const [isLocationTracking, setIsLocationTracking] = useState(false)
  const [routeInfo, setRouteInfo] = useState(null)

  // Road condition reporting
  const [roadReportDialog, setRoadReportDialog] = useState(false)
  const [roadReport, setRoadReport] = useState({
    type: '',
    description: '',
    severity: 'medium',
    location: null,
  })

  // Route refresh count and statistics
  const [refreshCount, setRefreshCount] = useState(0)
  const [todayStats, setTodayStats] = useState({
    deliveriesCompleted: 0,
    totalDistance: 0,
    totalTime: 0,
    routeOptimizations: 0,
  })

  // Road condition types
  const roadConditionTypes = [
    { value: 'heavy_traffic', label: '🚗 Heavy Traffic', color: '#ff5722' },
    { value: 'construction', label: '🚧 Construction', color: '#ff9800' },
    { value: 'road_closure', label: '🚫 Road Closure', color: '#f44336' },
    { value: 'pothole', label: '🕳️ Potholes', color: '#795548' },
    { value: 'narrow_road', label: '🛣️ Narrow Road', color: '#607d8b' },
    { value: 'weather', label: '🌧️ Weather Issues', color: '#2196f3' },
    { value: 'accident', label: '🚨 Accident', color: '#e91e63' },
  ]

  // Load initial data
  useEffect(() => {
    const initializeDriverPage = async () => {
      try {
        setIsLoading(true)
        
        // Initialize socket connection for real-time updates
        socketService.initialize()
        socketService.startDriverTracking(user.id)
        
        // Load driver's deliveries
        await loadDeliveries()
        
        // Start location tracking
        await startLocationTracking()
        
        // Load current route if exists
        await loadCurrentRoute()
        
        // Load today's statistics
        loadTodayStats()
        
      } catch (error) {
        console.error('Driver page initialization error:', error)
        toast.error('Failed to load driver dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    initializeDriverPage()

    // Cleanup on unmount
    return () => {
      locationService.stopTracking()
      socketService.disconnect()
    }
  }, [user.id])

  // Load driver's assigned deliveries
  const loadDeliveries = async () => {
    try {
      const response = await apiService.delivery.getDriverDeliveries(user.id)
      if (response.success) {
        setDeliveries(response.deliveries)
      }
    } catch (error) {
      console.error('Failed to load deliveries:', error)
    }
  }

  // Start location tracking
  const startLocationTracking = async () => {
    try {
      if (!locationService.isSupported()) {
        toast.error('Location tracking not supported on this device')
        return
      }

      await locationService.startTracking({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      })

      setIsLocationTracking(true)

      // Listen for location updates
      locationService.onLocationUpdate((location) => {
        setCurrentLocation(location)
        
        // Send location to backend for real-time tracking
        socketService.updateDriverLocation({
          driverId: user.id,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
          },
          timestamp: location.timestamp,
        })

        // Update backend via API
        apiService.route.updateLocation({
          driverId: user.id,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
        }).catch(console.error)
      })

    } catch (error) {
      console.error('Location tracking failed:', error)
      toast.error('Unable to start location tracking: ' + error.message)
    }
  }

  // Load current optimized route
  const loadCurrentRoute = async () => {
    try {
      const response = await apiService.route.getCurrent(user.id)
      if (response.success && response.route) {
        setOptimizedRoute(response.route)
        setRouteInfo({
          distance: response.route.totalDistance,
          duration: response.route.totalDuration,
          lastOptimized: response.route.lastOptimized,
          refreshCount: response.route.refreshCount || 0,
        })
        setRefreshCount(response.route.refreshCount || 0)
      }
    } catch (error) {
      console.error('Failed to load current route:', error)
    }
  }

  // Load today's statistics
  const loadTodayStats = () => {
    // Mock data for demo - in real app, this would come from API
    setTodayStats({
      deliveriesCompleted: 3,
      totalDistance: 45.2,
      totalTime: 180,
      routeOptimizations: refreshCount,
    })
  }

  // **ROUTE REFRESH - Your Key Feature!**
  const handleRouteRefresh = async () => {
    try {
      setIsRefreshingRoute(true)
      toast.loading('Optimizing your route...', { id: 'route-refresh' })

      if (!currentLocation) {
        throw new Error('Current location not available. Please enable location tracking.')
      }

      // Prepare road conditions from recent reports
      const roadConditions = [] // This would include recent road condition reports

      const response = await apiService.route.refresh({
        driverId: user.id,
        currentLocation: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        },
        roadConditions,
      })

      if (response.success) {
        setOptimizedRoute(response.route)
        setRefreshCount(prev => prev + 1)
        setRouteInfo({
          distance: response.route.totalDistance,
          duration: response.route.totalDuration,
          lastOptimized: new Date(),
          refreshCount: response.refreshCount,
        })

        // Show improvement metrics
        if (response.improvements) {
          const { timeSaved, distanceSaved } = response.improvements
          toast.success(
            `🎉 Route optimized! Saved ${timeSaved} mins & ${distanceSaved} km`,
            { id: 'route-refresh', duration: 6000 }
          )
        } else {
          toast.success('✅ Route refreshed successfully!', { id: 'route-refresh' })
        }

        // Update statistics
        setTodayStats(prev => ({
          ...prev,
          routeOptimizations: prev.routeOptimizations + 1,
        }))

      }
    } catch (error) {
      console.error('Route refresh failed:', error)
      toast.error('Failed to refresh route: ' + error.message, { id: 'route-refresh' })
    } finally {
      setIsRefreshingRoute(false)
    }
  }

  // Handle delivery status update
  const updateDeliveryStatus = async (deliveryId, status) => {
    try {
      await apiService.delivery.updateStatus(deliveryId, {
        status,
        location: currentLocation,
        notes: `Status updated to ${status} by driver`,
      })

      // Update local state
      setDeliveries(prev => prev.map(delivery => 
        delivery._id === deliveryId 
          ? { ...delivery, status }
          : delivery
      ))

      toast.success(`Delivery marked as ${status.replace('_', ' ')}`)

      // Reload deliveries to get updated list
      await loadDeliveries()

    } catch (error) {
      console.error('Failed to update delivery status:', error)
      toast.error('Failed to update delivery status')
    }
  }

  // Handle road condition reporting
  const handleRoadConditionReport = async () => {
    try {
      if (!currentLocation) {
        toast.error('Current location not available')
        return
      }

      if (!roadReport.type || !roadReport.description) {
        toast.error('Please fill in all required fields')
        return
      }

      await apiService.route.reportCondition({
        location: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        },
        conditionType: roadReport.type,
        description: roadReport.description,
        severity: roadReport.severity,
      })

      toast.success('Road condition reported successfully!')
      setRoadReportDialog(false)
      setRoadReport({ type: '', description: '', severity: 'medium', location: null })

    } catch (error) {
      console.error('Failed to report road condition:', error)
      toast.error('Failed to report road condition')
    }
  }

  // Get delivery status color
  const getStatusColor = (status) => {
    const colors = {
      pending: '#ff9800',
      assigned: '#2196f3',
      picked_up: '#9c27b0',
      in_transit: '#ff5722',
      delivered: '#4caf50',
      failed: '#f44336',
    }
    return colors[status] || '#757575'
  }

  if (isLoading) {
    return (
      <Box className="flex items-center justify-center min-h-screen">
        <CircularProgress size={48} />
        <Typography variant="h6" className="ml-4">
          Loading Driver Dashboard...
        </Typography>
      </Box>
    )
  }

  return (
    <Box className="p-4 space-y-6">
      {/* Header with Statistics */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Box className="flex items-center justify-between mb-4">
          <Box>
            <Typography variant="h4" className="font-bold mb-2">
              🚚 Driver Dashboard
            </Typography>
            <Typography variant="body1" className="text-gray-600 dark:text-gray-400">
              Welcome back, {user.name}! Ready for today's deliveries?
            </Typography>
          </Box>
          
          <Box className="flex items-center space-x-2">
            <Chip
              icon={<MyLocation />}
              label={isLocationTracking ? 'Tracking ON' : 'Tracking OFF'}
              color={isLocationTracking ? 'success' : 'error'}
              variant="outlined"
            />
            <Chip
              icon={<LocalShipping />}
              label={`${deliveries.filter(d => d.status !== 'delivered').length} Active`}
              color="primary"
              variant="outlined"
            />
          </Box>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={3}>
          <Grid item xs={6} md={3}>
            <motion.div whileHover={{ scale: 1.02 }}>
              <Card sx={{ borderRadius: '16px' }}>
                <CardContent className="text-center py-4">
                  <CheckCircle sx={{ fontSize: 40, color: '#4caf50', mb: 1 }} />
                  <Typography variant="h5" className="font-bold">
                    {todayStats.deliveriesCompleted}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed Today
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          <Grid item xs={6} md={3}>
            <motion.div whileHover={{ scale: 1.02 }}>
              <Card sx={{ borderRadius: '16px' }}>
                <CardContent className="text-center py-4">
                  <RouteIcon sx={{ fontSize: 40, color: '#2196f3', mb: 1 }} />
                  <Typography variant="h5" className="font-bold">
                    {todayStats.totalDistance} km
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Distance Covered
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          <Grid item xs={6} md={3}>
            <motion.div whileHover={{ scale: 1.02 }}>
              <Card sx={{ borderRadius: '16px' }}>
                <CardContent className="text-center py-4">
                  <Schedule sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
                  <Typography variant="h5" className="font-bold">
                    {Math.floor(todayStats.totalTime / 60)}h {todayStats.totalTime % 60}m
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Time on Road
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          <Grid item xs={6} md={3}>
            <motion.div whileHover={{ scale: 1.02 }}>
              <Card sx={{ borderRadius: '16px' }}>
                <CardContent className="text-center py-4">
                  <Refresh sx={{ fontSize: 40, color: '#9c27b0', mb: 1 }} />
                  <Typography variant="h5" className="font-bold">
                    {refreshCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Route Optimizations
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      </motion.div>

      {/* Main Content Grid */}
      <Grid container spacing={4}>
        {/* Map Section */}
        <Grid item xs={12} lg={8}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card sx={{ borderRadius: '20px', overflow: 'hidden' }}>
              <CardContent className="p-0">
                <Box className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <Box className="flex items-center justify-between">
                    <Typography variant="h6" className="font-semibold">
                      🗺️ Optimized Route Map
                    </Typography>
                    
                    <Box className="flex items-center space-x-2">
                      <Button
                        variant="outlined"
                        startIcon={<Report />}
                        onClick={() => setRoadReportDialog(true)}
                        size="small"
                        sx={{ borderRadius: '8px' }}
                      >
                        Report Condition
                      </Button>
                      
                      <Button
                        variant="contained"
                        startIcon={isRefreshingRoute ? <CircularProgress size={16} color="inherit" /> : <Refresh />}
                        onClick={handleRouteRefresh}
                        disabled={isRefreshingRoute || !currentLocation}
                        size="small"
                        sx={{
                          borderRadius: '8px',
                          background: 'linear-gradient(45deg, #2196f3, #64b5f6)',
                          '&:hover': {
                            background: 'linear-gradient(45deg, #1976d2, #2196f3)',
                          },
                        }}
                      >
                        {isRefreshingRoute ? 'Optimizing...' : 'Refresh Route'}
                      </Button>
                    </Box>
                  </Box>
                  
                  {routeInfo && (
                    <Box className="flex items-center space-x-4 mt-2">
                      <Chip
                        icon={<Navigation />}
                        label={`${routeInfo.distance} km`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        icon={<Schedule />}
                        label={`${routeInfo.duration} min`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        icon={<Refresh />}
                        label={`${routeInfo.refreshCount} optimizations`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  )}
                </Box>

                <Map
                  deliveries={deliveries}
                  currentLocation={currentLocation}
                  optimizedRoute={optimizedRoute}
                  onLocationUpdate={setCurrentLocation}
                  onRouteRefresh={handleRouteRefresh}
                  height="500px"
                  showControls={true}
                />
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Deliveries List */}
        <Grid item xs={12} lg={4}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card sx={{ borderRadius: '20px', height: '660px' }}>
              <CardContent className="h-full flex flex-col">
                <Typography variant="h6" className="font-semibold mb-4">
                  📦 Today's Deliveries
                </Typography>

                {deliveries.length === 0 ? (
                  <Box className="flex-1 flex items-center justify-center text-center">
                    <Box>
                      <LocalShipping sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary">
                        No deliveries assigned
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Check back later for new assignments
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <List className="flex-1 overflow-auto">
                    {deliveries.map((delivery, index) => (
                      <motion.div
                        key={delivery._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <ListItem
                          sx={{
                            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                            borderRadius: '12px',
                            mb: 2,
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                          }}
                        >
                          <Box className="w-full">
                            <Box className="flex items-center justify-between mb-2">
                              <Typography variant="subtitle2" className="font-semibold">
                                #{delivery.orderId}
                              </Typography>
                              <Chip
                                label={delivery.status.replace('_', ' ').toUpperCase()}
                                size="small"
                                sx={{
                                  backgroundColor: getStatusColor(delivery.status),
                                  color: 'white',
                                  fontSize: '0.7rem',
                                }}
                              />
                            </Box>

                            <Typography variant="body2" className="text-gray-600 dark:text-gray-400 mb-2">
                              📍 {delivery.delivery.address}
                            </Typography>

                            {delivery.tracking?.estimatedArrival && (
                              <Typography variant="caption" className="text-blue-600 dark:text-blue-400">
                                🕐 ETA: {new Date(delivery.tracking.estimatedArrival).toLocaleTimeString()}
                              </Typography>
                            )}

                            {/* Action Buttons */}
                            <Box className="flex items-center space-x-1 mt-3">
                              {delivery.status === 'assigned' && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => updateDeliveryStatus(delivery._id, 'picked_up')}
                                  sx={{ borderRadius: '8px', fontSize: '0.7rem' }}
                                >
                                  Pick Up
                                </Button>
                              )}
                              
                              {delivery.status === 'picked_up' && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => updateDeliveryStatus(delivery._id, 'in_transit')}
                                  sx={{ borderRadius: '8px', fontSize: '0.7rem' }}
                                >
                                  Start Delivery
                                </Button>
                              )}
                              
                              {delivery.status === 'in_transit' && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  onClick={() => updateDeliveryStatus(delivery._id, 'delivered')}
                                  sx={{ borderRadius: '8px', fontSize: '0.7rem' }}
                                >
                                  Mark Delivered
                                </Button>
                              )}

                              <IconButton size="small" onClick={() => window.open(`tel:${delivery.customer?.phone}`)}>
                                <Phone fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                        </ListItem>
                      </motion.div>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Floating Action Button for Quick Route Refresh */}
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          style={{
            position: 'fixed',
            bottom: isMobile ? 80 : 24,
            right: 24,
            zIndex: 1000,
          }}
        >
          <Fab
            color="primary"
            size="large"
            onClick={handleRouteRefresh}
            disabled={isRefreshingRoute || !currentLocation}
            sx={{
              background: 'linear-gradient(45deg, #2196f3 30%, #64b5f6 90%)',
              boxShadow: '0 8px 25px rgba(33, 150, 243, 0.4)',
              '&:hover': {
                transform: 'scale(1.1)',
                boxShadow: '0 12px 35px rgba(33, 150, 243, 0.6)',
              },
              '&:disabled': {
                background: '#ccc',
                color: '#666',
              },
              transition: 'all 0.3s ease',
            }}
          >
            <Badge badgeContent={refreshCount} color="secondary" max={99}>
              {isRefreshingRoute ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                <Refresh className="text-white" />
              )}
            </Badge>
          </Fab>
        </motion.div>
      </AnimatePresence>

      {/* Road Condition Report Dialog */}
      <Dialog
        open={roadReportDialog}
        onClose={() => setRoadReportDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
          },
        }}
      >
        <DialogTitle>
          🚧 Report Road Condition
        </DialogTitle>
        <DialogContent className="space-y-4">
          <TextField
            select
            fullWidth
            label="Condition Type"
            value={roadReport.type}
            onChange={(e) => setRoadReport(prev => ({ ...prev, type: e.target.value }))}
            sx={{ mt: 2 }}
          >
            {roadConditionTypes.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Box className="flex items-center">
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: option.color,
                      mr: 2,
                    }}
                  />
                  {option.label}
                </Box>
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            label="Description"
            multiline
            rows={3}
            value={roadReport.description}
            onChange={(e) => setRoadReport(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the road condition in detail..."
          />

          <TextField
            select
            fullWidth
            label="Severity"
            value={roadReport.severity}
            onChange={(e) => setRoadReport(prev => ({ ...prev, severity: e.target.value }))}
          >
            <MenuItem value="low">🟢 Low Impact</MenuItem>
            <MenuItem value="medium">🟡 Medium Impact</MenuItem>
            <MenuItem value="high">🔴 High Impact</MenuItem>
          </TextField>

          {currentLocation && (
            <Alert severity="info" sx={{ borderRadius: '8px' }}>
              📍 Current location will be used for this report
            </Alert>
          )}
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setRoadReportDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleRoadConditionReport}
            disabled={!roadReport.type || !roadReport.description}
          >
            Submit Report
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default DriverPage
