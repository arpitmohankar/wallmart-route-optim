'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import MapView from '@/components/map/MapView'
import { 
  Package, Truck, Users, TrendingUp, 
  Clock, CheckCircle, AlertCircle, XCircle,
  RefreshCw, Activity
} from 'lucide-react'
import { toast } from 'sonner'
import apiService from '@/services/api'
import socketService from '@/services/socket'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    activeDrivers: 0,
    pendingDeliveries: 0,
    completedToday: 0,
  })
  const [deliveries, setDeliveries] = useState([])
  const [drivers, setDrivers] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData()
    
    // Connect to socket for real-time updates
    socketService.connect()
    
    // Listen for real-time updates
    const unsubscribeLocation = socketService.on('driver-location-updated', (data) => {
      updateDriverLocation(data)
    })
    
    const unsubscribeStatus = socketService.on('delivery-status-changed', (data) => {
      updateDeliveryStatus(data)
    })

    return () => {
      unsubscribeLocation()
      unsubscribeStatus()
    }
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch all deliveries
      const deliveriesRes = await apiService.delivery.getAll()
      const deliveriesData = deliveriesRes.data.deliveries || []
      setDeliveries(deliveriesData)
      
      // Calculate stats
      const today = new Date().toDateString()
      const stats = {
        totalDeliveries: deliveriesData.length,
        activeDrivers: new Set(deliveriesData.filter(d => 
          ['assigned', 'picked_up', 'in_transit'].includes(d.status)
        ).map(d => d.driver?._id)).size,
        pendingDeliveries: deliveriesData.filter(d => d.status === 'pending').length,
        completedToday: deliveriesData.filter(d => 
          d.status === 'delivered' && 
          new Date(d.updatedAt).toDateString() === today
        ).length,
      }
      
      setStats(stats)
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const updateDriverLocation = (data) => {
    // Update driver location in real-time
    console.log('Driver location update:', data)
  }

  const updateDeliveryStatus = (data) => {
    // Update delivery status in real-time
    setDeliveries(prev => 
      prev.map(d => d._id === data.deliveryId ? { ...d, status: data.status } : d)
    )
  }

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      assigned: 'bg-blue-100 text-blue-800',
      picked_up: 'bg-purple-100 text-purple-800',
      in_transit: 'bg-orange-100 text-orange-800',
      delivered: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your entire delivery fleet in real-time
          </p>
        </div>
        <Button onClick={fetchDashboardData} disabled={isLoading}>
          <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDeliveries}</div>
            <p className="text-xs text-muted-foreground">All time deliveries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeDrivers}</div>
            <p className="text-xs text-muted-foreground">Currently on route</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingDeliveries}</div>
            <p className="text-xs text-muted-foreground">Awaiting assignment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedToday}</div>
            <p className="text-xs text-muted-foreground">Successfully delivered</p>
          </CardContent>
        </Card>
      </div>

      {/* Map and Deliveries */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Map */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Live Fleet Map</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <MapView 
              deliveries={deliveries.filter(d => 
                ['assigned', 'picked_up', 'in_transit'].includes(d.status)
              )}
              height="500px"
              showControls={false}
            />
          </CardContent>
        </Card>

        {/* Recent Deliveries */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {deliveries.slice(0, 5).map((delivery) => (
                <div key={delivery._id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      Order #{delivery.orderId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {delivery.customer?.name || 'Unknown Customer'}
                    </p>
                  </div>
                  <Badge className={getStatusColor(delivery.status)}>
                    {delivery.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
              
              {deliveries.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No deliveries yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delivery Management Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="failed">Failed</TabsTrigger>
            </TabsList>
            
            <TabsContent value="active" className="space-y-4">
              {deliveries
                .filter(d => ['assigned', 'picked_up', 'in_transit'].includes(d.status))
                .map((delivery) => (
                  <DeliveryCard key={delivery._id} delivery={delivery} />
                ))}
            </TabsContent>
            
            <TabsContent value="pending" className="space-y-4">
              {deliveries
                .filter(d => d.status === 'pending')
                .map((delivery) => (
                  <DeliveryCard key={delivery._id} delivery={delivery} />
                ))}
            </TabsContent>
            
            <TabsContent value="completed" className="space-y-4">
              {deliveries
                .filter(d => d.status === 'delivered')
                .map((delivery) => (
                  <DeliveryCard key={delivery._id} delivery={delivery} />
                ))}
            </TabsContent>
            
            <TabsContent value="failed" className="space-y-4">
              {deliveries
                .filter(d => d.status === 'failed')
                .map((delivery) => (
                  <DeliveryCard key={delivery._id} delivery={delivery} />
                ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

// Delivery Card Component
function DeliveryCard({ delivery }) {
  const getStatusIcon = (status) => {
    const icons = {
      pending: <Clock className="h-4 w-4" />,
      assigned: <Users className="h-4 w-4" />,
      picked_up: <Package className="h-4 w-4" />,
      in_transit: <Truck className="h-4 w-4" />,
      delivered: <CheckCircle className="h-4 w-4" />,
      failed: <XCircle className="h-4 w-4" />,
    }
    return icons[status] || <AlertCircle className="h-4 w-4" />
  }

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-muted rounded-lg">
          {getStatusIcon(delivery.status)}
        </div>
        <div>
          <p className="font-medium">Order #{delivery.orderId}</p>
          <p className="text-sm text-muted-foreground">
            {delivery.customer?.name} • {delivery.delivery?.address}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {delivery.driver && (
          <Badge variant="outline">
            {delivery.driver.name}
          </Badge>
        )}
        <Badge className={getStatusColor(delivery.status)}>
          {delivery.status.replace('_', ' ')}
        </Badge>
      </div>
    </div>
  )
}

// Helper function
function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
