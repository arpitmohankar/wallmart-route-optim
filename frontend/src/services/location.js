/* eslint-disable no-unused-vars */
import toast from 'react-hot-toast'

class LocationService {
  constructor() {
    this.watchId = null
    this.isTracking = false
    this.lastKnownLocation = null
    this.locationListeners = new Set()
    this.errorListeners = new Set()
    this.options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000, // Cache location for 10 seconds
    }
  }

  // Check if geolocation is supported
  isSupported() {
    return 'geolocation' in navigator
  }

  // Check if location permissions are granted
  async checkPermissions() {
    if (!this.isSupported()) {
      throw new Error('Geolocation is not supported by this browser')
    }

    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' })
        return permission.state // 'granted', 'denied', or 'prompt'
      } catch (error) {
        console.warn('Cannot check geolocation permissions:', error)
        return 'unknown'
      }
    }

    return 'unknown'
  }

  // Request location permissions
  async requestPermissions() {
    const permission = await this.checkPermissions()
    
    if (permission === 'denied') {
      throw new Error('Location access is denied. Please enable location permissions in your browser settings.')
    }

    // Try to get location to trigger permission prompt
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve('granted')
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            reject(new Error('Location access denied by user'))
          } else {
            reject(new Error('Unable to get location: ' + this.getErrorMessage(error)))
          }
        },
        { ...this.options, timeout: 5000 }
      )
    })
  }

  // Get current location (one-time)
  async getCurrentLocation() {
    if (!this.isSupported()) {
      throw new Error('Geolocation is not supported')
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = this.formatLocationData(position)
          this.lastKnownLocation = location
          resolve(location)
        },
        (error) => {
          const errorMessage = this.getErrorMessage(error)
          this.notifyErrorListeners(errorMessage)
          reject(new Error(errorMessage))
        },
        this.options
      )
    })
  }

  // Start continuous location tracking
  async startTracking(options = {}) {
    if (!this.isSupported()) {
      throw new Error('Geolocation is not supported')
    }

    if (this.isTracking) {
      console.warn('Location tracking is already active')
      return
    }

    // Merge custom options
    const trackingOptions = { ...this.options, ...options }

    try {
      // Check permissions first
      await this.requestPermissions()

      this.isTracking = true
      console.log('📍 Starting location tracking...')

      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location = this.formatLocationData(position)
          this.lastKnownLocation = location
          this.notifyLocationListeners(location)
          
          // Log location updates in development
          if (import.meta.env.DEV) {
            console.log('📍 Location update:', {
              lat: location.latitude,
              lng: location.longitude,
              accuracy: location.accuracy
            })
          }
        },
        (error) => {
          const errorMessage = this.getErrorMessage(error)
          console.error('❌ Location tracking error:', errorMessage)
          this.notifyErrorListeners(errorMessage)
          
          // Stop tracking on permission denied
          if (error.code === error.PERMISSION_DENIED) {
            this.stopTracking()
          }
        },
        trackingOptions
      )

      toast.success('📍 Location tracking started')
      
    } catch (error) {
      this.isTracking = false
      throw error
    }
  }

  // Stop location tracking
  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }

    if (this.isTracking) {
      this.isTracking = false
      console.log('📍 Location tracking stopped')
      toast.success('📍 Location tracking stopped')
    }
  }

  // Format location data
  formatLocationData(position) {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: new Date(position.timestamp),
    }
  }

  // Get human-readable error messages
  getErrorMessage(error) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location access denied. Please enable location permissions.'
      case error.POSITION_UNAVAILABLE:
        return 'Location information is unavailable. Please check your GPS settings.'
      case error.TIMEOUT:
        return 'Location request timed out. Please try again.'
      default:
        return 'An unknown error occurred while retrieving location.'
    }
  }

  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371 // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1)
    const dLon = this.toRadians(lon2 - lon1)
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c // Distance in kilometers
  }

  // Convert degrees to radians
  toRadians(degrees) {
    return degrees * (Math.PI / 180)
  }

  // Calculate bearing between two coordinates
  calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = this.toRadians(lon2 - lon1)
    const lat1Rad = this.toRadians(lat1)
    const lat2Rad = this.toRadians(lat2)
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad)
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon)
    
    const bearing = Math.atan2(y, x)
    return (this.toDegrees(bearing) + 360) % 360 // Normalize to 0-360
  }

  // Convert radians to degrees
  toDegrees(radians) {
    return radians * (180 / Math.PI)
  }

  // Check if location is within a certain radius of target
  isWithinRadius(currentLat, currentLon, targetLat, targetLon, radiusKm) {
    const distance = this.calculateDistance(currentLat, currentLon, targetLat, targetLon)
    return distance <= radiusKm
  }

  // Get location accuracy status
  getAccuracyStatus(accuracy) {
    if (accuracy <= 10) return { level: 'high', message: 'Very accurate' }
    if (accuracy <= 50) return { level: 'medium', message: 'Good accuracy' }
    if (accuracy <= 100) return { level: 'low', message: 'Fair accuracy' }
    return { level: 'poor', message: 'Poor accuracy' }
  }

  // Event listeners for location updates
  onLocationUpdate(callback) {
    this.locationListeners.add(callback)
    
    // Return cleanup function
    return () => this.locationListeners.delete(callback)
  }

  onError(callback) {
    this.errorListeners.add(callback)
    
    // Return cleanup function
    return () => this.errorListeners.delete(callback)
  }

  // Notify listeners
  notifyLocationListeners(location) {
    this.locationListeners.forEach(callback => {
      try {
        callback(location)
      } catch (error) {
        console.error('Error in location listener:', error)
      }
    })
  }

  notifyErrorListeners(error) {
    this.errorListeners.forEach(callback => {
      try {
        callback(error)
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError)
      }
    })
  }

  // Get tracking status
  getStatus() {
    return {
      isSupported: this.isSupported(),
      isTracking: this.isTracking,
      lastKnownLocation: this.lastKnownLocation,
      watchId: this.watchId,
    }
  }

  // Mock location for testing
  mockLocation(latitude, longitude) {
    if (import.meta.env.DEV) {
      const mockPosition = {
        coords: {
          latitude,
          longitude,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      }
      
      const location = this.formatLocationData(mockPosition)
      this.lastKnownLocation = location
      this.notifyLocationListeners(location)
      
      console.log('🧪 Mock location set:', { latitude, longitude })
    }
  }

  // Cleanup method
  cleanup() {
    this.stopTracking()
    this.locationListeners.clear()
    this.errorListeners.clear()
    this.lastKnownLocation = null
  }
}

// Create singleton instance
const locationService = new LocationService()

// Export singleton instance and class
export default locationService
export { LocationService }
