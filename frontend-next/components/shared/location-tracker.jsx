'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  MapPin, Navigation, Loader2, AlertCircle,
  CheckCircle, XCircle
} from 'lucide-react'
import locationService from '@/services/location'
import { cn } from '@/lib/utils'

export default function LocationTracker({
  onLocationUpdate,
  userId,
  autoStart = false,
  showControls = true,
}) {
  const [isTracking, setIsTracking] = useState(false)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [accuracy, setAccuracy] = useState(null)
  const [error, setError] = useState(null)
  const [permissionStatus, setPermissionStatus] = useState('unknown')

  // Check permissions on mount
  useEffect(() => {
    checkPermissions()
    
    if (autoStart) {
      startTracking()
    }
  }, [autoStart])

  // Listen for location updates
  useEffect(() => {
    const unsubscribe = locationService.on('location-update', (location) => {
      setCurrentLocation(location)
      setAccuracy(location.accuracy)
      setError(null)
      onLocationUpdate?.(location)
    })

    const unsubscribeError = locationService.on('location-error', (error) => {
      setError(error)
      setIsTracking(false)
    })

    return () => {
      unsubscribe()
      unsubscribeError()
    }
  }, [onLocationUpdate])

  const checkPermissions = async () => {
    const status = await locationService.requestPermissions()
    setPermissionStatus(status)
  }

  const startTracking = async () => {
    try {
      setError(null)
      await locationService.startTracking()
      setIsTracking(true)
    } catch (err) {
      setError(err.message)
    }
  }

  const stopTracking = () => {
    locationService.stopTracking()
    setIsTracking(false)
  }

  const getAccuracyStatus = () => {
    if (!accuracy) return { label: 'Unknown', color: 'secondary' }
    
    if (accuracy <= 10) return { label: 'Excellent', color: 'success' }
    if (accuracy <= 50) return { label: 'Good', color: 'primary' }
    if (accuracy <= 100) return { label: 'Fair', color: 'warning' }
    return { label: 'Poor', color: 'destructive' }
  }

  const accuracyStatus = getAccuracyStatus()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Location Tracking
          </span>
          <Badge variant={isTracking ? 'default' : 'secondary'}>
            {isTracking ? 'Active' : 'Inactive'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission Status */}
        {permissionStatus === 'denied' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Location permission denied. Please enable it in your browser settings.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Location Info */}
        {currentLocation && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Latitude</p>
                <p className="font-mono font-medium">
                  {currentLocation.latitude.toFixed(6)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Longitude</p>
                <p className="font-mono font-medium">
                  {currentLocation.longitude.toFixed(6)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Accuracy</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  ±{accuracy?.toFixed(0)}m
                </span>
                <Badge variant={accuracyStatus.color} className="text-xs">
                  {accuracyStatus.label}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        {showControls && (
          <div className="pt-2">
            {!isTracking ? (
              <Button 
                onClick={startTracking} 
                className="w-full"
                disabled={permissionStatus === 'denied'}
              >
                <MapPin className="mr-2 h-4 w-4" />
                Start Tracking
              </Button>
            ) : (
              <Button 
                onClick={stopTracking} 
                variant="destructive" 
                className="w-full"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Stop Tracking
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
