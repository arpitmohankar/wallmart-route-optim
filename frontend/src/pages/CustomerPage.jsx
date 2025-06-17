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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  Divider,
  useMediaQuery,
  useTheme as useMuiTheme,
} from '@mui/material'
import {
  LocationOn,
  LocalShipping,
  Schedule,
  Phone,
  Message,
  Navigation,
  CheckCircle,
  RadioButtonChecked,
  DirectionsCar,
  Notifications,
  Add,
  History,
  Star,
  StarBorder,
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

const CustomerPage = () => {
  const { user } = useAuth()
  const { isDarkMode } = useTheme()
  const muiTheme = useMuiTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'))

  // State management
  const [deliveries, setDeliveries] = useState([])
  const [activeDelivery, setActiveDelivery] = useState(null)
  const [driverLocation, setDriverLocation] = useState(null)
  const [customerLocation, setCustomerLocation] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [trackingData, setTrackingData] = useState(null)
  const [estimatedArrival, setEstimatedArrival] = useState(null)
  const [orderHistory, setOrderHistory] = useState([])

  // UI State
  const [newOrderDialog, setNewOrderDialog] = useState(false)
  const [showOrderHistory, setShowOrderHistory] = useState(false)
  const [isTrackingActive, setIsTrackingActive] = useState(false)

  // New order form
  const [newOrder, setNewOrder] = useState({
    pickupAddress: '',
    deliveryAddress: '',
    packageDescription: '',
    packageWeight: '',
    scheduledTime: '',
    notes: '',
  })

  // Delivery status steps
  const deliverySteps = [
    {
      label: 'Order Placed',
      icon: <CheckCircle />,
      description: 'Your delivery request has been received',
      status: 'pending'
    },
    {
      label: 'Driver Assigned',
      icon: <DirectionsCar />,
      description: 'A driver has been assigned to your delivery',
      status: 'assigned'
    },
    {
      label: 'Package Picked Up',
      icon: <LocalShipping />,
      description: 'Driver has collected your package',
      status: 'picked_up'
    },
    {
      label: 'On the Way',
      icon: <Navigation />,
      description: 'Your package is being delivered',
      status: 'in_transit'
    },
    {
      label: 'Delivered',
      icon: <CheckCircle />,
      description: 'Package delivered successfully',
      status: 'delivered'
    }
  ]

  // Load initial data
  useEffect(() => {
    const initializeCustomerPage = async () => {
      try {
        setIsLoading(true)
        
        // Initialize socket connection for real-time updates
        socketService.initialize()
        
        // Load customer's deliveries
        await loadCustomerDeliveries()
        
        // Load order history
        await loadOrderHistory()
        
        // Get customer's location
        await getCurrentLocation()
        
      } catch (error) {
        console.error('Customer page initialization error:', error)
        toast.error('Failed to load customer dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    initializeCustomerPage()

    // Cleanup on unmount
    return () => {
      if (activeDelivery) {
        socketService.stopTrackingDelivery(activeDelivery._id)
      }
      socketService.disconnect()
    }
  }, [user.id])

  // Socket.io real-time event listeners
  useEffect(() => {
    // Listen for driver location updates
    socketService.on('location-update', (data) => {
      if (activeDelivery && data.deliveryId === activeDelivery._id) {
        setDriverLocation(data.location)
        setTrackingData(prev => ({
          ...prev,
          currentLocation: data.location,
          lastUpdate: new Date(data.timestamp),
        }))
        
        // Calculate distance and show proximity notifications
        if (customerLocation) {
          const distance = calculateDistance(
            data.location.latitude,
            data.location.longitude,
            customerLocation.latitude,
            customerLocation.longitude
          )
          
          // Show proximity notifications
          if (distance <= 1 && !sessionStorage.getItem('proximity-1km-notified')) {
            toast.success('🚚 Your driver is less than 1 km away!')
            sessionStorage.setItem('proximity-1km-notified', 'true')
          } else if (distance <= 0.1 && !sessionStorage.getItem('proximity-100m-notified')) {
            toast.success('📦 Driver arriving in 2-3 minutes!')
            sessionStorage.setItem('proximity-100m-notified', 'true')
          }
        }
      }
    })

    // Listen for ETA updates
    socketService.on('eta-updated', (data) => {
      if (activeDelivery && data.deliveryId === activeDelivery._id) {
        setEstimatedArrival(new Date(data.newETA))
        const eta = new Date(data.newETA).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
        toast.success(`⏰ Updated arrival time: ${eta}`)
      }
    })

    // Listen for delivery status updates
    socketService.on('delivery-status-update', (data) => {
      if (activeDelivery && data.deliveryId === activeDelivery._id) {
        setActiveDelivery(prev => ({ ...prev, status: data.status }))
        
        // Show status-specific notifications
        const statusMessages = {
          assigned: '👨‍💼 Driver assigned to your delivery!',
          picked_up: '📦 Your package has been picked up!',
          in_transit: '🚚 Your delivery is on the way!',
          delivered: '✅ Package delivered successfully!'
        }
        
        const message = statusMessages[data.status]
        if (message) {
          toast.success(message, { duration: 6000 })
        }
        
        // Clear proximity notifications when delivered
        if (data.status === 'delivered') {
          sessionStorage.removeItem('proximity-1km-notified')
          sessionStorage.removeItem('proximity-100m-notified')
          setIsTrackingActive(false)
        }
      }
    })

    // Cleanup function
    return () => {
      socketService.off('location-update')
      socketService.off('eta-updated')
      socketService.off('delivery-status-update')
    }
  }, [activeDelivery, customerLocation])

  // Load customer's deliveries
  const loadCustomerDeliveries = async () => {
    try {
      const response = await apiService.delivery.getCustomerDeliveries(user.id)
      if (response.success) {
        setDeliveries(response.deliveries)
        
        // Find active delivery to track
        const active = response.deliveries.find(d => 
          ['assigned', 'picked_up', 'in_transit'].includes(d.status)
        )
        
        if (active) {
          setActiveDelivery(active)
          setIsTrackingActive(true)
          
          // Start tracking this delivery
          socketService.trackDelivery(active._id)
          
          // Set ETA if available
          if (active.tracking?.estimatedArrival) {
            setEstimatedArrival(new Date(active.tracking.estimatedArrival))
          }
        }
      }
    } catch (error) {
      console.error('Failed to load deliveries:', error)
    }
  }

  // Load order history
  const loadOrderHistory = async () => {
    try {
      const response = await apiService.delivery.getCustomerDeliveries(user.id)
      if (response.success) {
        const completed = response.deliveries.filter(d => 
          ['delivered', 'failed', 'cancelled'].includes(d.status)
        )
        setOrderHistory(completed.slice(0, 10)) // Last 10 orders
      }
    } catch (error) {
      console.error('Failed to load order history:', error)
    }
  }

  // Get customer's current location
  const getCurrentLocation = async () => {
    try {
      if (locationService.isSupported()) {
        const location = await locationService.getCurrentLocation()
        setCustomerLocation(location)
      }
    } catch (error) {
      console.warn('Could not get customer location:', error)
      // Use default location or address from profile
      if (user.addresses && user.addresses.length > 0) {
        const defaultAddress = user.addresses.find(addr => addr.isDefault) || user.addresses[0]
        setCustomerLocation({
          latitude: defaultAddress.coordinates.latitude,
          longitude: defaultAddress.coordinates.longitude,
        })
      }
    }
  }

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
    return R * c // Distance in kilometers
  }

  // Handle new order creation
  const handleCreateOrder = async () => {
    try {
      if (!newOrder.pickupAddress || !newOrder.deliveryAddress || !newOrder.packageDescription) {
        toast.error('Please fill in all required fields')
        return
      }

      // For demo, use mock coordinates
      const mockPickupCoords = {
        latitude: 12.9716 + (Math.random() - 0.5) * 0.05,
        longitude: 77.5946 + (Math.random() - 0.5) * 0.05,
      }

      const mockDeliveryCoords = {
        latitude: customerLocation?.latitude || 12.9716,
        longitude: customerLocation?.longitude || 77.5946,
      }

      const orderData = {
        pickupAddress: newOrder.pickupAddress,
        pickupCoordinates: mockPickupCoords,
        pickupContact: {
          name: 'Pickup Contact',
          phone: '+91-9876543210'
        },
        pickupTime: new Date(newOrder.scheduledTime || Date.now() + 30 * 60 * 1000),
        
        deliveryAddress: newOrder.deliveryAddress,
        deliveryCoordinates: mockDeliveryCoords,
        deliveryContact: {
          name: user.name,
          phone: user.phone
        },
        deliveryTime: new Date(newOrder.scheduledTime || Date.now() + 2 * 60 * 60 * 1000),
        
        packageDetails: {
          description: newOrder.packageDescription,
          weight: parseFloat(newOrder.packageWeight) || 1,
          value: 1000,
          fragile: false,
        },
        
        notes: newOrder.notes,
      }

      const response = await apiService.delivery.create(orderData)
      if (response.success) {
        toast.success('📦 Order created successfully!')
        setNewOrderDialog(false)
        setNewOrder({
          pickupAddress: '',
          deliveryAddress: '',
          packageDescription: '',
          packageWeight: '',
          scheduledTime: '',
          notes: '',
        })
        
        // Reload deliveries
        await loadCustomerDeliveries()
      }
    } catch (error) {
      console.error('Failed to create order:', error)
      toast.error('Failed to create order: ' + error.message)
    }
  }

  // Get current step index based on delivery status
  const getCurrentStepIndex = (status) => {
    const statusMap = {
      pending: 0,
      assigned: 1,
      picked_up: 2,
      in_transit: 3,
      delivered: 4,
    }
    return statusMap[status] || 0
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
          Loading Customer Dashboard...
        </Typography>
      </Box>
    )
  }

  return (
    <Box className="p-4 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Box className="flex items-center justify-between mb-4">
          <Box>
            <Typography variant="h4" className="font-bold mb-2">
              📦 Track Your Delivery
            </Typography>
            <Typography variant="body1" className="text-gray-600 dark:text-gray-400">
              Welcome back, {user.name}! Track your packages in real-time.
            </Typography>
          </Box>
          
          <Box className="flex items-center space-x-2">
            <Button
              variant="outlined"
              startIcon={<History />}
              onClick={() => setShowOrderHistory(true)}
              sx={{ borderRadius: '12px' }}
            >
              Order History
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setNewOrderDialog(true)}
              sx={{
                borderRadius: '12px',
                background: 'linear-gradient(45deg, #2196f3, #64b5f6)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1976d2, #2196f3)',
                },
              }}
            >
              New Order
            </Button>
          </Box>
        </Box>

        {/* Active Delivery Status */}
        {activeDelivery && (
          <Alert
            severity="info"
            icon={<LocalShipping />}
            sx={{
              borderRadius: '12px',
              backgroundColor: isDarkMode ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.05)',
              border: `1px solid ${isDarkMode ? 'rgba(33, 150, 243, 0.3)' : 'rgba(33, 150, 243, 0.2)'}`,
            }}
          >
            <Typography variant="subtitle1" className="font-semibold">
              📦 Order #{activeDelivery.orderId} is {activeDelivery.status.replace('_', ' ')}
            </Typography>
            {estimatedArrival && (
              <Typography variant="body2">
                🕐 Estimated arrival: {estimatedArrival.toLocaleTimeString()} ({Math.ceil((estimatedArrival - new Date()) / 60000)} minutes)
              </Typography>
            )}
          </Alert>
        )}
      </motion.div>

      {/* Main Content */}
      {activeDelivery ? (
        // Active Delivery Tracking View
        <Grid container spacing={4}>
          {/* Live Tracking Map */}
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
                        🚚 Live Delivery Tracking
                      </Typography>
                      
                      <Box className="flex items-center space-x-2">
                        {isTrackingActive && (
                          <Chip
                            icon={<RadioButtonChecked className="animate-pulse" />}
                            label="Live Tracking"
                            color="success"
                            size="small"
                            sx={{ 
                              backgroundColor: '#4caf50',
                              color: 'white',
                              '& .MuiChip-icon': { color: 'white' }
                            }}
                          />
                        )}
                        
                        <Chip
                          label={activeDelivery.status.replace('_', ' ').toUpperCase()}
                          size="small"
                          sx={{
                            backgroundColor: getStatusColor(activeDelivery.status),
                            color: 'white',
                          }}
                        />
                      </Box>
                    </Box>
                    
                    {driverLocation && customerLocation && (
                      <Box className="flex items-center space-x-4 mt-2">
                        <Chip
                          icon={<Navigation />}
                          label={`${calculateDistance(
                            driverLocation.latitude,
                            driverLocation.longitude,
                            customerLocation.latitude,
                            customerLocation.longitude
                          ).toFixed(1)} km away`}
                          size="small"
                          variant="outlined"
                        />
                        
                        {trackingData?.lastUpdate && (
                          <Chip
                            icon={<Schedule />}
                            label={`Updated ${trackingData.lastUpdate.toLocaleTimeString()}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    )}
                  </Box>

                  <Map
                    deliveries={[activeDelivery]}
                    currentLocation={driverLocation}
                    height="500px"
                    showControls={false}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Delivery Details & Status */}
          <Grid item xs={12} lg={4}>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              {/* Delivery Progress */}
              <Card sx={{ borderRadius: '16px' }}>
                <CardContent>
                  <Typography variant="h6" className="font-semibold mb-4">
                    📋 Delivery Progress
                  </Typography>
                  
                  <Stepper activeStep={getCurrentStepIndex(activeDelivery.status)} orientation="vertical">
                    {deliverySteps.map((step, index) => (
                      <Step key={step.label}>
                        <StepLabel
                          StepIconComponent={({ active, completed }) => (
                            <Box
                              sx={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                backgroundColor: completed || active ? getStatusColor(step.status) : '#e0e0e0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                              }}
                            >
                              {React.cloneElement(step.icon, { sx: { fontSize: 16 } })}
                            </Box>
                          )}
                        >
                          <Typography variant="subtitle2" className="font-semibold">
                            {step.label}
                          </Typography>
                        </StepLabel>
                        <StepContent>
                          <Typography variant="body2" color="text.secondary">
                            {step.description}
                          </Typography>
                        </StepContent>
                      </Step>
                    ))}
                  </Stepper>
                </CardContent>
              </Card>

              {/* Driver Information */}
              {activeDelivery.driver && (
                <Card sx={{ borderRadius: '16px' }}>
                  <CardContent>
                    <Typography variant="h6" className="font-semibold mb-3">
                      👨‍💼 Your Driver
                    </Typography>
                    
                    <Box className="flex items-center space-x-3 mb-3">
                      <Avatar sx={{ bgcolor: '#4caf50', width: 48, height: 48 }}>
                        {activeDelivery.driver.name?.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" className="font-semibold">
                          {activeDelivery.driver.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Professional Driver
                        </Typography>
                        <Box className="flex items-center mt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} sx={{ fontSize: 16, color: '#ffd54f' }} />
                          ))}
                          <Typography variant="caption" className="ml-1">
                            5.0 (124 reviews)
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box className="flex space-x-2">
                      <Button
                        variant="outlined"
                        startIcon={<Phone />}
                        onClick={() => window.open(`tel:${activeDelivery.driver.phone}`)}
                        size="small"
                        sx={{ borderRadius: '8px', flex: 1 }}
                      >
                        Call
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<Message />}
                        size="small"
                        sx={{ borderRadius: '8px', flex: 1 }}
                      >
                        Message
                      </Button>
                    </Box>

                    {activeDelivery.driver.vehicleInfo && (
                      <Box className="mt-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Typography variant="caption" color="text.secondary">
                          Vehicle: {activeDelivery.driver.vehicleInfo.type?.toUpperCase()} • {activeDelivery.driver.vehicleInfo.licensePlate}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Delivery Details */}
              <Card sx={{ borderRadius: '16px' }}>
                <CardContent>
                  <Typography variant="h6" className="font-semibold mb-3">
                    📦 Package Details
                  </Typography>
                  
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <LocationOn />
                      </ListItemIcon>
                      <ListItemText
                        primary="Pickup"
                        secondary={activeDelivery.pickup.address}
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <LocationOn />
                      </ListItemIcon>
                      <ListItemText
                        primary="Delivery"
                        secondary={activeDelivery.delivery.address}
                      />
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <LocalShipping />
                      </ListItemIcon>
                      <ListItemText
                        primary="Package"
                        secondary={`${activeDelivery.package.description} (${activeDelivery.package.weight} kg)`}
                      />
                    </ListItem>
                    
                    {estimatedArrival && (
                      <ListItem>
                        <ListItemIcon>
                          <Schedule />
                        </ListItemIcon>
                        <ListItemText
                          primary="Estimated Arrival"
                          secondary={estimatedArrival.toLocaleString()}
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      ) : (
        // No Active Delivery View
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card sx={{ borderRadius: '20px', minHeight: '500px' }}>
            <CardContent className="flex items-center justify-center h-full text-center py-16">
              <Box>
                <LocalShipping sx={{ fontSize: 120, color: 'text.secondary', mb: 4 }} />
                <Typography variant="h5" className="font-bold mb-2">
                  No Active Deliveries
                </Typography>
                <Typography variant="body1" color="text.secondary" className="mb-6">
                  You don't have any active deliveries at the moment.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Add />}
                  onClick={() => setNewOrderDialog(true)}
                  sx={{
                    borderRadius: '12px',
                    px: 4,
                    py: 1.5,
                    background: 'linear-gradient(45deg, #2196f3, #64b5f6)',
                  }}
                >
                  Create New Order
                </Button>
              </Box>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* New Order Dialog */}
      <Dialog
        open={newOrderDialog}
        onClose={() => setNewOrderDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
          },
        }}
      >
        <DialogTitle>
          📦 Create New Delivery Order
        </DialogTitle>
        <DialogContent className="space-y-4">
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Pickup Address"
                value={newOrder.pickupAddress}
                onChange={(e) => setNewOrder(prev => ({ ...prev, pickupAddress: e.target.value }))}
                placeholder="Enter pickup location"
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Delivery Address"
                value={newOrder.deliveryAddress}
                onChange={(e) => setNewOrder(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                placeholder="Enter delivery location"
                required
              />
            </Grid>
            
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Package Description"
                value={newOrder.packageDescription}
                onChange={(e) => setNewOrder(prev => ({ ...prev, packageDescription: e.target.value }))}
                placeholder="What are you sending?"
                required
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Weight (kg)"
                type="number"
                value={newOrder.packageWeight}
                onChange={(e) => setNewOrder(prev => ({ ...prev, packageWeight: e.target.value }))}
                placeholder="1.0"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Preferred Time"
                type="datetime-local"
                value={newOrder.scheduledTime}
                onChange={(e) => setNewOrder(prev => ({ ...prev, scheduledTime: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Special Instructions"
                multiline
                rows={3}
                value={newOrder.notes}
                onChange={(e) => setNewOrder(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any special handling instructions..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setNewOrderDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateOrder}
            disabled={!newOrder.pickupAddress || !newOrder.deliveryAddress || !newOrder.packageDescription}
            sx={{
              background: 'linear-gradient(45deg, #4caf50, #81c784)',
              '&:hover': {
                background: 'linear-gradient(45deg, #388e3c, #4caf50)',
              },
            }}
          >
            Create Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* Order History Dialog */}
      <Dialog
        open={showOrderHistory}
        onClose={() => setShowOrderHistory(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
          },
        }}
      >
        <DialogTitle>
          📋 Order History
        </DialogTitle>
        <DialogContent>
          {orderHistory.length === 0 ? (
            <Box className="text-center py-8">
              <History sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No order history yet
              </Typography>
            </Box>
          ) : (
            <List>
              {orderHistory.map((order, index) => (
                <motion.div
                  key={order._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <ListItem
                    sx={{
                      border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                      borderRadius: '12px',
                      mb: 2,
                    }}
                  >
                    <Box className="w-full">
                      <Box className="flex items-center justify-between mb-2">
                        <Typography variant="subtitle2" className="font-semibold">
                          #{order.orderId}
                        </Typography>
                        <Chip
                          label={order.status.toUpperCase()}
                          size="small"
                          sx={{
                            backgroundColor: getStatusColor(order.status),
                            color: 'white',
                          }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {order.delivery.address}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </ListItem>
                </motion.div>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowOrderHistory(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default CustomerPage
