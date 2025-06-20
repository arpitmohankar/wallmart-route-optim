'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import MapView from '@/components/map/MapView'
import { 
  Package, MapPin, Clock, CheckCircle,
  Truck, Search, Bell, Info
} from 'lucide-react'
import { toast } from 'sonner'
import apiService from '@/services/api'
import socketService from '@/services/socket'
import { useAuthStore } from '@/lib/store'
import { formatDate, getDeliveryStatusInfo } from '@/utils/helpers'

export default function CustomerDashboard() {
  const { user } = useAuthStore()
  const [deliveries, setDeliveries] = useState([])
  const [activeDelivery, setActiveDelivery] = useState(null)
  const [driverLocation, setDriverLocation] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Fetch customer deliveries
  useEffect(() => {
    fetchDeliveries()
    
    // Connect to socket
    socketService.connect()
    socketService.joinCustomerRoom(user.id)
    
    // Listen for delivery updates
    const unsubscribeStatus = socketService.on('delivery-status-changed', (data) => {
      handleDeliveryUpdate(data)
    })
    
    const unsubscribeLocation = socketService.on('driver-location-updated', (data) => {
      if (activeDelivery?.driver?._id === data.driverId) {
        setDriverLocation(data.location)
      }
    })

    return () => {
      unsubscribeStatus()
      unsubscribeLocation()
      socketService.leaveRoom(`customer-${user.id}`)
    }
  }, [user.id, activeDelivery])

  const fetchDeliveries = async () => {
    try {
      setIsLoading(true)
      
      const response = await apiService.delivery.getByCustomer(user.id)
      const deliveriesData = response.data.deliveries || []
      setDeliveries(deliveriesData)
      
      // Set active delivery (latest in-transit or assigned)
      const active = deliveriesData.find(d => 
        ['assigned', 'picked_up', 'in_transit'].includes(d.status)
      )
      setActiveDelivery(active)
      
    } catch (error) {
      console.error('Failed to fetch deliveries:', error)
      toast.error('Failed to load your deliveries')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeliveryUpdate = (data) => {
    // Update delivery status
    setDeliveries(prev => 
      prev.map(d => d._id === data.deliveryId ? { ...d, status: data.status } : d)
    )
    
    // Show notification
    const statusInfo = getDeliveryStatusInfo(data.status)
    toast.success(
      <div className="flex items-center gap-2">
        <span>{statusInfo.icon}</span>
        <span>Your order is now {statusInfo.label.toLowerCase()}</span>
      </div>
    )
    
    // Check if this is the active delivery
    if (activeDelivery?._id === data.deliveryId) {
      if (data.status === 'delivered') {
        setActiveDelivery(null)
      }
    }
  }

  const filteredDeliveries = deliveries.filter(d => 
    d.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.delivery?.address?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Track Your Deliveries</h1>
        <p className="text-muted-foreground">
          Monitor your orders in real-time
        </p>
      </div>

      {/* Active Delivery Alert */}
      {activeDelivery && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
          <Truck className="h-4 w-4" />
          <AlertTitle>Active Delivery</AlertTitle>
          <AlertDescription>
            Your order #{activeDelivery.orderId} is on the way! 
            Track it live on the map below.
          </AlertDescription>
        </Alert>
      )}

      {/* Map for Active Delivery */}
      {activeDelivery && (
        <Card>
          <CardHeader>
            <CardTitle>Live Tracking</CardTitle>
            <CardDescription>
              Real-time location of your delivery
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <MapView
              deliveries={[activeDelivery]}
              currentLocation={driverLocation}
              height="400px"
              showControls={false}
            />
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Your Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by order ID or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-4">
            {filteredDeliveries.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No deliveries found</p>
              </div>
            ) : (
              filteredDeliveries.map((delivery) => (
                <DeliveryCard 
                  key={delivery._id} 
                  delivery={delivery}
                  isActive={activeDelivery?._id === delivery._id}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delivery Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveries.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deliveries.filter(d => d.status === 'delivered').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {deliveries.filter(d => 
                ['assigned', 'picked_up', 'in_transit'].includes(d.status)
              ).length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Delivery Card Component
function DeliveryCard({ delivery, isActive }) {
  const statusInfo = getDeliveryStatusInfo(delivery.status)
  
  return (
    <div className={cn(
      "p-4 border rounded-lg transition-colors",
      isActive && "border-blue-500 bg-blue-50 dark:bg-blue-950"
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">Order #{delivery.orderId}</p>
            {isActive && (
              <Badge variant="outline" className="text-xs">
                <span className="animate-pulse mr-1">●</span>
                Live
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2">
            {delivery.delivery?.address}
          </p>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(delivery.createdAt)}
            </span>
            
            {delivery.tracking?.estimatedArrival && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                ETA: {new Date(delivery.tracking.estimatedArrival).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <Badge className={cn("text-xs", statusInfo.color)}>
            {statusInfo.icon} {statusInfo.label}
          </Badge>
          
          {delivery.driver && (
            <p className="text-xs text-muted-foreground">
              Driver: {delivery.driver.name}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper function
function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
