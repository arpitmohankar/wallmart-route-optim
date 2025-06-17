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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Badge,
  CircularProgress,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme as useMuiTheme,
} from '@mui/material'
import {
  Dashboard,
  LocalShipping,
  DirectionsCar,
  Schedule,
  TrendingUp,
  Warning,
  CheckCircle,
  Error,
  Visibility,
  Phone,
  Message,
  Assignment,
  Analytics,
  Refresh,
  Download,
  FilterList,
  Search,
  Notifications,
  Speed,
  Route as RouteIcon,
  Group,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

// Import components and services
import Map from '../components/Map.jsx'
import { useAuth } from '../App.jsx'
import { useTheme } from '../App.jsx'
import { apiService } from '../services/api.js'
import socketService from '../services/socket.js'

const AdminPage = () => {
  const { user } = useAuth()
  const { isDarkMode } = useTheme()
  const muiTheme = useMuiTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'))

  // State management
  const [allDeliveries, setAllDeliveries] = useState([])
  const [activeDrivers, setActiveDrivers] = useState([])
  const [selectedDelivery, setSelectedDelivery] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentTab, setCurrentTab] = useState(0)
  const [fleetStats, setFleetStats] = useState({
    totalDeliveries: 0,
    activeDeliveries: 0,
    completedToday: 0,
    totalDrivers: 0,
    activeDrivers: 0,
    totalDistance: 0,
    averageDeliveryTime: 0,
    routeOptimizations: 0,
  })

  // Filters and search
  const [filters, setFilters] = useState({
    status: 'all',
    driver: 'all',
    dateRange: 'today',
    search: '',
  })

  // Dialog states
  const [trackingDialog, setTrackingDialog] = useState(false)
  const [assignDriverDialog, setAssignDriverDialog] = useState(false)
  const [selectedDeliveryForAssign, setSelectedDeliveryForAssign] = useState(null)

  // Real-time updates
  const [realTimeUpdates, setRealTimeUpdates] = useState([])

  // Load initial data
  useEffect(() => {
    const initializeAdminPage = async () => {
      try {
        setIsLoading(true)
        
        // Initialize socket connection for real-time monitoring
        socketService.initialize()
        socketService.monitorFleet()
        
        // Load all data
        await Promise.all([
          loadAllDeliveries(),
          loadActiveDrivers(),
          loadFleetStatistics(),
        ])
        
        // Setup real-time listeners
        setupRealTimeListeners()
        
      } catch (error) {
        console.error('Admin page initialization error:', error)
        toast.error('Failed to load admin dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    initializeAdminPage()

    // Cleanup on unmount
    return () => {
      socketService.disconnect()
    }
  }, [user.id])

  // Setup real-time event listeners
  const setupRealTimeListeners = () => {
    // Listen for delivery status updates
    socketService.on('delivery-status-update', (data) => {
      setAllDeliveries(prev => prev.map(delivery =>
        delivery._id === data.deliveryId
          ? { ...delivery, status: data.status }
          : delivery
      ))
      
      addRealTimeUpdate({
        type: 'status_update',
        message: `Delivery #${data.orderId} status updated to ${data.status}`,
        timestamp: new Date(),
        severity: 'info',
      })
    })

    // Listen for driver location updates
    socketService.on('location-update', (data) => {
      setActiveDrivers(prev => prev.map(driver =>
        driver._id === data.driverId
          ? { ...driver, currentLocation: data.location, lastUpdate: new Date() }
          : driver
      ))
    })

    // Listen for route optimizations
    socketService.on('route-refreshed', (data) => {
      addRealTimeUpdate({
        type: 'route_optimization',
        message: `Route optimized for driver ${data.driverName}`,
        timestamp: new Date(),
        severity: 'success',
      })
      
      // Update statistics
      setFleetStats(prev => ({
        ...prev,
        routeOptimizations: prev.routeOptimizations + 1,
      }))
    })

    // Listen for system alerts
    socketService.on('admin-notification', (data) => {
      addRealTimeUpdate({
        type: 'system_alert',
        message: data.message,
        timestamp: new Date(),
        severity: data.severity || 'warning',
      })
      
      if (data.severity === 'error') {
        toast.error(data.message)
      }
    })
  }

  // Add real-time update to feed
  const addRealTimeUpdate = (update) => {
    setRealTimeUpdates(prev => [update, ...prev.slice(0, 49)]) // Keep last 50 updates
  }

  // Load all deliveries
  const loadAllDeliveries = async () => {
    try {
      const response = await apiService.delivery.getAllDeliveries({
        page: 1,
        limit: 100,
        status: filters.status !== 'all' ? filters.status : undefined,
      })
      
      if (response.success) {
        setAllDeliveries(response.deliveries)
      }
    } catch (error) {
      console.error('Failed to load deliveries:', error)
    }
  }

  // Load active drivers
  const loadActiveDrivers = async () => {
    try {
      // Mock data for active drivers - in real app, this would be an API call
      const mockDrivers = [
        {
          _id: '1',
          name: 'Rajesh Kumar',
          phone: '+91-9876543210',
          vehicleInfo: { type: 'truck', licensePlate: 'KA-01-AB-1234' },
          currentLocation: { latitude: 12.9716, longitude: 77.5946 },
          status: 'active',
          activeDeliveries: 3,
          lastUpdate: new Date(),
        },
        {
          _id: '2',
          name: 'Priya Sharma',
          phone: '+91-9876543211',
          vehicleInfo: { type: 'van', licensePlate: 'KA-02-CD-5678' },
          currentLocation: { latitude: 12.9616, longitude: 77.5846 },
          status: 'active',
          activeDeliveries: 2,
          lastUpdate: new Date(),
        },
        {
          _id: '3',
          name: 'Amit Singh',
          phone: '+91-9876543212',
          vehicleInfo: { type: 'bike', licensePlate: 'KA-03-EF-9012' },
          currentLocation: { latitude: 12.9816, longitude: 77.6046 },
          status: 'active',
          activeDeliveries: 1,
          lastUpdate: new Date(),
        },
      ]
      
      setActiveDrivers(mockDrivers)
    } catch (error) {
      console.error('Failed to load drivers:', error)
    }
  }

  // Load fleet statistics
  const loadFleetStatistics = () => {
    // Calculate statistics from loaded data
    const stats = {
      totalDeliveries: allDeliveries.length,
      activeDeliveries: allDeliveries.filter(d => ['assigned', 'picked_up', 'in_transit'].includes(d.status)).length,
      completedToday: allDeliveries.filter(d => d.status === 'delivered' && 
        new Date(d.updatedAt).toDateString() === new Date().toDateString()).length,
      totalDrivers: activeDrivers.length + 5, // Mock total drivers
      activeDrivers: activeDrivers.filter(d => d.status === 'active').length,
      totalDistance: 234.6, // Mock total distance
      averageDeliveryTime: 45, // Mock average time
      routeOptimizations: 12, // Mock optimizations
    }
    
    setFleetStats(stats)
  }

  // Handle delivery tracking
  const handleTrackDelivery = (delivery) => {
    setSelectedDelivery(delivery)
    setTrackingDialog(true)
  }

  // Handle driver assignment
  const handleAssignDriver = (delivery) => {
    setSelectedDeliveryForAssign(delivery)
    setAssignDriverDialog(true)
  }

  // Assign driver to delivery
  const assignDriverToDelivery = async (driverId) => {
    try {
      // Mock assignment - in real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Update delivery with assigned driver
      setAllDeliveries(prev => prev.map(delivery =>
        delivery._id === selectedDeliveryForAssign._id
          ? { ...delivery, driver: activeDrivers.find(d => d._id === driverId), status: 'assigned' }
          : delivery
      ))
      
      toast.success('Driver assigned successfully!')
      setAssignDriverDialog(false)
      setSelectedDeliveryForAssign(null)
      
    } catch (error) {
      console.error('Failed to assign driver:', error)
      toast.error('Failed to assign driver')
    }
  }

  // Get status color
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

  // Get driver status color
  const getDriverStatusColor = (status) => {
    const colors = {
      active: '#4caf50',
      busy: '#ff9800',
      offline: '#f44336',
    }
    return colors[status] || '#757575'
  }

  // Filter deliveries based on current filters
  const filteredDeliveries = allDeliveries.filter(delivery => {
    const matchesStatus = filters.status === 'all' || delivery.status === filters.status
    const matchesSearch = !filters.search || 
      delivery.orderId.toLowerCase().includes(filters.search.toLowerCase()) ||
      delivery.customer?.name?.toLowerCase().includes(filters.search.toLowerCase())
    
    return matchesStatus && matchesSearch
  })

  if (isLoading) {
    return (
      <Box className="flex items-center justify-center min-h-screen">
        <CircularProgress size={48} />
        <Typography variant="h6" className="ml-4">
          Loading Admin Dashboard...
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
              🏢 Admin Dashboard
            </Typography>
            <Typography variant="body1" className="text-gray-600 dark:text-gray-400">
              Monitor your fleet and manage deliveries in real-time
            </Typography>
          </Box>
          
          <Box className="flex items-center space-x-2">
            <Badge badgeContent={realTimeUpdates.length} color="primary" max={99}>
              <IconButton>
                <Notifications />
              </IconButton>
            </Badge>
            <Button
              variant="outlined"
              startIcon={<Download />}
              sx={{ borderRadius: '12px' }}
            >
              Export Data
            </Button>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={() => window.location.reload()}
              sx={{
                borderRadius: '12px',
                background: 'linear-gradient(45deg, #2196f3, #64b5f6)',
              }}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Statistics Cards */}
        <Grid container spacing={3}>
          <Grid item xs={6} md={3}>
            <motion.div whileHover={{ scale: 1.02 }}>
              <Card sx={{ borderRadius: '16px' }}>
                <CardContent className="text-center py-4">
                  <LocalShipping sx={{ fontSize: 40, color: '#2196f3', mb: 1 }} />
                  <Typography variant="h5" className="font-bold">
                    {fleetStats.activeDeliveries}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Deliveries
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          <Grid item xs={6} md={3}>
            <motion.div whileHover={{ scale: 1.02 }}>
              <Card sx={{ borderRadius: '16px' }}>
                <CardContent className="text-center py-4">
                  <DirectionsCar sx={{ fontSize: 40, color: '#4caf50', mb: 1 }} />
                  <Typography variant="h5" className="font-bold">
                    {fleetStats.activeDrivers}/{fleetStats.totalDrivers}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Drivers
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          <Grid item xs={6} md={3}>
            <motion.div whileHover={{ scale: 1.02 }}>
              <Card sx={{ borderRadius: '16px' }}>
                <CardContent className="text-center py-4">
                  <CheckCircle sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
                  <Typography variant="h5" className="font-bold">
                    {fleetStats.completedToday}
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
                  <TrendingUp sx={{ fontSize: 40, color: '#9c27b0', mb: 1 }} />
                  <Typography variant="h5" className="font-bold">
                    {fleetStats.routeOptimizations}
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

      {/* Main Content Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card sx={{ borderRadius: '20px' }}>
          <Tabs 
            value={currentTab} 
            onChange={(e, newValue) => setCurrentTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
          >
            <Tab icon={<Dashboard />} label="Fleet Overview" />
            <Tab icon={<LocalShipping />} label="Deliveries" />
            <Tab icon={<DirectionsCar />} label="Drivers" />
            <Tab icon={<Analytics />} label="Analytics" />
          </Tabs>

          <CardContent className="p-0">
            {/* Fleet Overview Tab */}
            {currentTab === 0 && (
              <Box className="p-6">
                <Grid container spacing={4}>
                  {/* Fleet Map */}
                  <Grid item xs={12} lg={8}>
                    <Card sx={{ borderRadius: '16px', overflow: 'hidden' }}>
                      <CardContent className="p-0">
                        <Box className="p-4 border-b border-gray-200 dark:border-gray-700">
                          <Typography variant="h6" className="font-semibold">
                            🗺️ Live Fleet Tracking
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Real-time location of all active drivers and deliveries
                          </Typography>
                        </Box>
                        <Map
                          deliveries={allDeliveries.filter(d => ['assigned', 'picked_up', 'in_transit'].includes(d.status))}
                          height="500px"
                          showControls={false}
                        />
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Real-time Updates */}
                  <Grid item xs={12} lg={4}>
                    <Card sx={{ borderRadius: '16px', height: '548px' }}>
                      <CardContent>
                        <Typography variant="h6" className="font-semibold mb-4">
                          📡 Real-time Updates
                        </Typography>
                        
                        <List className="overflow-auto" style={{ maxHeight: '450px' }}>
                          {realTimeUpdates.length === 0 ? (
                            <Box className="text-center py-8">
                              <Notifications sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                              <Typography variant="body2" color="text.secondary">
                                No recent updates
                              </Typography>
                            </Box>
                          ) : (
                            realTimeUpdates.map((update, index) => (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                              >
                                <ListItem
                                  sx={{
                                    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                    borderRadius: '8px',
                                    mb: 1,
                                    backgroundColor: update.severity === 'error' ? 'rgba(244, 67, 54, 0.05)' :
                                                   update.severity === 'success' ? 'rgba(76, 175, 80, 0.05)' :
                                                   'rgba(33, 150, 243, 0.05)',
                                  }}
                                >
                                  <ListItemIcon>
                                    {update.severity === 'error' ? <Error color="error" /> :
                                     update.severity === 'success' ? <CheckCircle color="success" /> :
                                     <Notifications color="primary" />}
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={update.message}
                                    secondary={update.timestamp.toLocaleTimeString()}
                                    primaryTypographyProps={{ fontSize: '0.9rem' }}
                                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                                  />
                                </ListItem>
                              </motion.div>
                            ))
                          )}
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Deliveries Tab */}
            {currentTab === 1 && (
              <Box className="p-6">
                {/* Filters */}
                <Box className="flex items-center space-x-4 mb-4">
                  <TextField
                    select
                    label="Status"
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    size="small"
                    sx={{ minWidth: 120 }}
                  >
                    <MenuItem value="all">All Status</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="assigned">Assigned</MenuItem>
                    <MenuItem value="picked_up">Picked Up</MenuItem>
                    <MenuItem value="in_transit">In Transit</MenuItem>
                    <MenuItem value="delivered">Delivered</MenuItem>
                  </TextField>

                  <TextField
                    placeholder="Search deliveries..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    size="small"
                    InputProps={{
                      startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                    sx={{ minWidth: 200 }}
                  />
                </Box>

                {/* Deliveries Table */}
                <TableContainer component={Paper} sx={{ borderRadius: '12px' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Order ID</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Driver</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Pickup</TableCell>
                        <TableCell>Delivery</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredDeliveries.map((delivery) => (
                        <TableRow key={delivery._id} hover>
                          <TableCell>
                            <Typography variant="subtitle2" className="font-semibold">
                              #{delivery.orderId}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box className="flex items-center space-x-2">
                              <Avatar sx={{ width: 32, height: 32, fontSize: '0.9rem' }}>
                                {delivery.customer?.name?.charAt(0).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="body2">{delivery.customer?.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {delivery.customer?.phone}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {delivery.driver ? (
                              <Box className="flex items-center space-x-2">
                                <Avatar sx={{ width: 32, height: 32, fontSize: '0.9rem' }}>
                                  {delivery.driver.name?.charAt(0).toUpperCase()}
                                </Avatar>
                                <Typography variant="body2">{delivery.driver.name}</Typography>
                              </Box>
                            ) : (
                              <Button
                                size="small"
                                onClick={() => handleAssignDriver(delivery)}
                                sx={{ borderRadius: '8px' }}
                              >
                                Assign Driver
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={delivery.status.replace('_', ' ').toUpperCase()}
                              size="small"
                              sx={{
                                backgroundColor: getStatusColor(delivery.status),
                                color: 'white',
                                fontSize: '0.7rem',
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" className="truncate max-w-32">
                              {delivery.pickup.address}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" className="truncate max-w-32">
                              {delivery.delivery.address}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box className="flex space-x-1">
                              <IconButton
                                size="small"
                                onClick={() => handleTrackDelivery(delivery)}
                                title="Track Delivery"
                              >
                                <Visibility />
                              </IconButton>
                              {delivery.customer?.phone && (
                                <IconButton
                                  size="small"
                                  onClick={() => window.open(`tel:${delivery.customer.phone}`)}
                                  title="Call Customer"
                                >
                                  <Phone />
                                </IconButton>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* Drivers Tab */}
            {currentTab === 2 && (
              <Box className="p-6">
                <Grid container spacing={3}>
                  {activeDrivers.map((driver) => (
                    <Grid item xs={12} md={6} lg={4} key={driver._id}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <Card sx={{ borderRadius: '16px' }}>
                          <CardContent>
                            <Box className="flex items-center justify-between mb-3">
                              <Box className="flex items-center space-x-3">
                                <Avatar sx={{ bgcolor: '#4caf50', width: 48, height: 48 }}>
                                  {driver.name.charAt(0).toUpperCase()}
                                </Avatar>
                                <Box>
                                  <Typography variant="h6" className="font-semibold">
                                    {driver.name}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {driver.vehicleInfo.type?.toUpperCase()} • {driver.vehicleInfo.licensePlate}
                                  </Typography>
                                </Box>
                              </Box>
                              
                              <Chip
                                label={driver.status.toUpperCase()}
                                size="small"
                                sx={{
                                  backgroundColor: getDriverStatusColor(driver.status),
                                  color: 'white',
                                }}
                              />
                            </Box>

                            <Box className="grid grid-cols-2 gap-4 mb-3">
                              <Box className="text-center">
                                <Typography variant="h5" className="font-bold">
                                  {driver.activeDeliveries}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Active Deliveries
                                </Typography>
                              </Box>
                              <Box className="text-center">
                                <Typography variant="h5" className="font-bold">
                                  {driver.lastUpdate ? Math.floor((new Date() - driver.lastUpdate) / 60000) : 0}m
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Last Update
                                </Typography>
                              </Box>
                            </Box>

                            <Box className="flex space-x-2">
                              <Button
                                variant="outlined"
                                startIcon={<Phone />}
                                onClick={() => window.open(`tel:${driver.phone}`)}
                                size="small"
                                sx={{ borderRadius: '8px', flex: 1 }}
                              >
                                Call
                              </Button>
                              <Button
                                variant="outlined"
                                startIcon={<Visibility />}
                                size="small"
                                sx={{ borderRadius: '8px', flex: 1 }}
                              >
                                Track
                              </Button>
                            </Box>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* Analytics Tab */}
            {currentTab === 3 && (
              <Box className="p-6">
                <Grid container spacing={4}>
                  <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: '16px' }}>
                      <CardContent>
                        <Typography variant="h6" className="font-semibold mb-4">
                          📊 Performance Metrics
                        </Typography>
                        
                        <Box className="space-y-4">
                          <Box>
                            <Box className="flex justify-between mb-1">
                              <Typography variant="body2">Average Delivery Time</Typography>
                              <Typography variant="body2">{fleetStats.averageDeliveryTime} min</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={(fleetStats.averageDeliveryTime / 60) * 100}
                              sx={{ borderRadius: '4px', height: '8px' }}
                            />
                          </Box>

                          <Box>
                            <Box className="flex justify-between mb-1">
                              <Typography variant="body2">On-time Delivery Rate</Typography>
                              <Typography variant="body2">94%</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={94}
                              sx={{ borderRadius: '4px', height: '8px' }}
                              color="success"
                            />
                          </Box>

                          <Box>
                            <Box className="flex justify-between mb-1">
                              <Typography variant="body2">Driver Utilization</Typography>
                              <Typography variant="body2">87%</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={87}
                              sx={{ borderRadius: '4px', height: '8px' }}
                              color="warning"
                            />
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: '16px' }}>
                      <CardContent>
                        <Typography variant="h6" className="font-semibold mb-4">
                          🚀 Daily Insights
                        </Typography>
                        
                        <List>
                          <ListItem>
                            <ListItemIcon>
                              <TrendingUp color="success" />
                            </ListItemIcon>
                            <ListItemText
                              primary="Delivery efficiency improved by 15%"
                              secondary="Compared to last week"
                            />
                          </ListItem>
                          
                          <ListItem>
                            <ListItemIcon>
                              <Speed color="primary" />
                            </ListItemIcon>
                            <ListItemText
                              primary={`${fleetStats.routeOptimizations} route optimizations today`}
                              secondary="Dynamic routing saved 2.3 hours"
                            />
                          </ListItem>
                          
                          <ListItem>
                            <ListItemIcon>
                              <Group color="warning" />
                            </ListItemIcon>
                            <ListItemText
                              primary="Peak delivery hours: 2-4 PM"
                              secondary="Consider adding more drivers during this time"
                            />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Delivery Tracking Dialog */}
      <Dialog
        open={trackingDialog}
        onClose={() => setTrackingDialog(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '16px',
            backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
          },
        }}
      >
        <DialogTitle>
          📦 Track Delivery #{selectedDelivery?.orderId}
        </DialogTitle>
        <DialogContent>
          {selectedDelivery && (
            <Box sx={{ height: '500px', mt: 2 }}>
              <Map
                deliveries={[selectedDelivery]}
                height="100%"
                showControls={false}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTrackingDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Driver Dialog */}
      <Dialog
        open={assignDriverDialog}
        onClose={() => setAssignDriverDialog(false)}
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
          👨‍💼 Assign Driver to Delivery #{selectedDeliveryForAssign?.orderId}
        </DialogTitle>
        <DialogContent>
          <List sx={{ mt: 2 }}>
            {activeDrivers.filter(d => d.status === 'active').map((driver) => (
              <ListItem
                key={driver._id}
                button
                onClick={() => assignDriverToDelivery(driver._id)}
                sx={{
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  borderRadius: '12px',
                  mb: 1,
                }}
              >
                <ListItemIcon>
                  <Avatar sx={{ bgcolor: '#4caf50' }}>
                    {driver.name.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={driver.name}
                  secondary={`${driver.vehicleInfo.type?.toUpperCase()} • ${driver.activeDeliveries} active deliveries`}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDriverDialog(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AdminPage
