'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import MapView from '@/components/map/MapView'
import RefreshButton from '@/components/shared/refresh-button'
import LocationTracker from '@/components/shared/location-tracker'
import { 
  Package, Navigation, Clock, CheckCircle,
  AlertCircle, TrendingUp, MapPin, Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import apiService from '@/services/api'
import socketService from '@/services/socket'
import { useAuthStore, useAppStore } from '@/lib/store'
import { formatDistance, formatDuration } from '@/utils/helpers'

export default function DriverDashboard() {
  const { user } = useAuthStore()
  const { refreshCount, incrementRefreshCount } = useAppStore()
  
  const [deliveries, setDeliveries] = useState([])
  const [currentRoute, setCurrentRoute] = useState(null)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [stats, setStats] = useState({
    todayDeliveries: 0,
    completedDeliveries: 0,
    pendingDeliveries: 0,
    totalDistance: 0,
  })

  // Fetch driver data
  useEffect(() => {
    fetchDriverData()
    
    // Connect to socket
    socketService.connect()
    socketService.joinDriverRoom(user.id)
    
    // Listen for updates
    const unsubscribe = socketService.on('route-updated', (data) => {
      setCurrentRoute(data.route)
      toast.success('Route has been optimized!')
    })

    return () => {
      unsubscribe()
      socketService.leaveRoom(`driver-${user.id}`)
    }
  }, [user.id])

  const fetchDriverData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch driver deliveries
      const deliveriesRes = await apiService.delivery.getByDriver(user.id)
      const deliveriesData = deliveriesRes.data.deliveries || []
      setDeliveries(deliveriesData)
      
      // Fetch current route
      const routeRes = await apiService.route.getCurrent(user.id)
      setCurrentRoute(routeRes.data.route)
      
      // Calculate stats
      const today = new Date().toDateString()
      const todayDeliveries = deliveriesData.filter(d => 
        new Date(d.createdAt).toDateString() === today
      )
      
      setStats({
        todayDeliveries: todayDeliveries.length,
        completedDeliveries: todayDeliveries.filter(d => d.status === 'delivered').length,
        pendingDeliveries: deliveriesData.filter(d => 
          ['assigned', 'picked_up', 'in_transit'].includes(d.status)
        ).length,
        totalDistance: currentRoute?.totalDistance || 0,
      })
      
    } catch (error) {
      console.error('Failed to fetch driver data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle location update
  const handleLocationUpdate = (location) => {
    setCurrentLocation(location)
    
    // Send location to backend
    apiService.route.updateLocation({
      driverId: user.id,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
      },
      timestamp: new Date(),
    })
  }

  // Handle route refresh
  const handleRouteRefresh = async () => {
    try {
      setIsRefreshing(true)
      
      const response = await apiService.route.refresh(user.id)
      
      if (response.data.success) {
        setCurrentRoute(response.data.route)
        incrementRefreshCount()
        toast.success('Route optimized successfully!')
        
        // Show optimization stats
        if (response.data.optimization) {
          const { originalDuration, optimizedDuration, savedTime } = response.data.optimization
          toast.success(
            `Saved ${formatDuration(savedTime)} on your route!`,
            { duration: 5000 }
          )
        }
      }
    } catch (error) {
      console.error('Route refresh failed:', error)
      toast.error('Failed to refresh route')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Get next delivery
  const getNextDelivery = () => {
    return deliveries.find(d => 
      ['assigned', 'picked_up'].includes(d.status)
    )
  }

  const nextDelivery = getNextDelivery()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Driver Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user.name}!
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-lg px-4 py-2">
            <TrendingUp className="w-4 h-4 mr-2" />
            {refreshCount} Route Optimizations
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Deliveries</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayDeliveries}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedDeliveries}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingDeliveries}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
            <Navigation className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDistance(stats.totalDistance * 1000)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Map */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Current Route</CardTitle>
            <CardDescription>
              Your optimized delivery route for today
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <MapView
              deliveries={deliveries.filter(d => 
                ['assigned', 'picked_up', 'in_transit'].includes(d.status)
              )}
              currentLocation={currentLocation}
              optimizedRoute={currentRoute}
              height="500px"
              showControls
            />
          </CardContent>
        </Card>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Location Tracker */}
          <LocationTracker
            onLocationUpdate={handleLocationUpdate}
            userId={user.id}
            autoStart
            showControls
          />

          {/* Next Delivery */}
          {nextDelivery && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Next Delivery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Order ID</p>
                    <p className="font-medium">#{nextDelivery.orderId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{nextDelivery.customer?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium text-sm">
                      {nextDelivery.delivery?.address}
                    </p>
                  </div>
                  <Button className="w-full">
                    Start Navigation
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Road Condition Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Report road conditions to help optimize routes for other drivers
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Floating Refresh Button */}
      <RefreshButton
        onRefresh={handleRouteRefresh}
        isLoading={isRefreshing}
        refreshCount={refreshCount}
        disabled={!currentLocation}
      />
    </div>
  )
}
