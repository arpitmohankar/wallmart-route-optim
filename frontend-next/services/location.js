class LocationService {
  constructor() {
    this.watchId = null
    this.lastPosition = null
    this.listeners = new Map()
  }
  
  // Check if geolocation is supported
  isSupported() {
    return 'geolocation' in navigator
  }
  
  // Request location permissions
  async requestPermissions() {
    if (!this.isSupported()) {
      throw new Error('Geolocation is not supported by your browser')
    }
    
    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' })
      return permission.state
    } catch (error) {
      console.warn('Permissions API not supported:', error)
      return 'unknown'
    }
  }
  
  // Get current location once
  async getCurrentLocation(options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('Geolocation not supported'))
        return
      }
      
      const defaultOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = this.formatPosition(position)
          this.lastPosition = location
          resolve(location)
        },
        (error) => {
          reject(this.handleError(error))
        },
        { ...defaultOptions, ...options }
      )
    })
  }
  
  // Start watching location
  startTracking(options = {}) {
    if (!this.isSupported()) {
      throw new Error('Geolocation not supported')
    }
    
    if (this.watchId !== null) {
      console.warn('Already tracking location')
      return
    }
    
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000,
    }
    
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = this.formatPosition(position)
        this.lastPosition = location
        this.emit('location-update', location)
      },
      (error) => {
        const errorMessage = this.handleError(error)
        this.emit('location-error', errorMessage)
      },
      { ...defaultOptions, ...options }
    )
  }
  
  // Stop watching location
  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
      this.emit('tracking-stopped', null)
    }
  }
  
  // Format position data
  formatPosition(position) {
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
  
  // Handle geolocation errors
  handleError(error) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location permission denied. Please enable location access.'
      case error.POSITION_UNAVAILABLE:
        return 'Location information unavailable. Please try again.'
      case error.TIMEOUT:
        return 'Location request timed out. Please try again.'
      default:
        return 'An unknown error occurred while getting location.'
    }
  }
  
  // Subscribe to events
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    
    this.listeners.get(event).add(callback)
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event)
      if (callbacks) {
        callbacks.delete(callback)
        if (callbacks.size === 0) {
          this.listeners.delete(event)
        }
      }
    }
  }
  
  // Emit events to listeners
  emit(event, data) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }
  
  // Get last known position
  getLastPosition() {
    return this.lastPosition
  }
  
  // Check if currently tracking
  isTracking() {
    return this.watchId !== null
  }
  
  // Calculate distance between two points
  calculateDistance(lat1, lon1, lat2, lon2) {
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
}

// Create singleton instance
const locationService = new LocationService()

export default locationService
