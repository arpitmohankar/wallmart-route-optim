import { io } from 'socket.io-client'
import toast from 'react-hot-toast'

class SocketService {
  constructor() {
    this.socket = null
    this.isConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.listeners = new Map()
    this.connectionListeners = new Set()
  }

  // Initialize socket connection
  initialize(token = null) {
    try {
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
      
      // Socket configuration
      const socketConfig = {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        maxReconnectionAttempts: this.maxReconnectAttempts,
      }

      // Add auth token if provided
      if (token) {
        socketConfig.auth = { token }
      }

      // Create socket connection
      this.socket = io(socketUrl, socketConfig)

      // Setup connection event handlers
      this.setupConnectionHandlers()

      // Setup delivery tracking handlers
      this.setupDeliveryHandlers()

      console.log('🔌 Socket service initialized')
      return this.socket

    } catch (error) {
      console.error('❌ Socket initialization failed:', error)
      throw new Error('Failed to initialize real-time connection')
    }
  }

  // Setup connection event handlers
  setupConnectionHandlers() {
    if (!this.socket) return

    // Connection successful
    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id)
      this.isConnected = true
      this.reconnectAttempts = 0
      
      // Notify connection listeners
      this.connectionListeners.forEach(callback => callback(true))
      
      // Show success toast only after reconnection
      if (this.reconnectAttempts > 0) {
        toast.success('🔗 Reconnected to live updates!')
      }
    })

    // Connection lost
    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason)
      this.isConnected = false
      
      // Notify connection listeners
      this.connectionListeners.forEach(callback => callback(false))
      
      if (reason === 'io server disconnect') {
        // Server disconnected the socket, need to reconnect manually
        toast.error('Connection lost. Reconnecting...')
        this.socket.connect()
      }
    })

    // Connection error
    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error)
      this.reconnectAttempts++
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        toast.error('Unable to connect to live updates. Please refresh the page.')
      }
    })

    // Reconnection attempt
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`)
      if (attemptNumber === 1) {
        toast.loading('Reconnecting to live updates...', { id: 'reconnecting' })
      }
    })

    // Reconnection successful
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`)
      toast.success('🔗 Reconnected to live updates!', { id: 'reconnecting' })
    })

    // Reconnection failed
    this.socket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed')
      toast.error('Failed to reconnect. Please refresh the page.', { id: 'reconnecting' })
    })
  }

  // Setup delivery-specific event handlers
  setupDeliveryHandlers() {
    if (!this.socket) return

    // Driver location updates
    this.socket.on('location-update', (data) => {
      console.log('📍 Location update received:', data)
      this.emit('location-update', data)
    })

    // Route refresh notifications
    this.socket.on('route-refreshed', (data) => {
      console.log('🔄 Route refreshed:', data)
      this.emit('route-refreshed', data)
      toast.success('Route optimized! New path available.')
    })

    // ETA updates
    this.socket.on('eta-updated', (data) => {
      console.log('⏰ ETA updated:', data)
      this.emit('eta-updated', data)
      
      if (data.newETA) {
        const eta = new Date(data.newETA).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
        toast.success(`📦 Updated delivery time: ${eta}`)
      }
    })

    // Delivery status updates
    this.socket.on('delivery-status-update', (data) => {
      console.log('📦 Delivery status update:', data)
      this.emit('delivery-status-update', data)
      
      // Show appropriate notification based on status
      const statusMessages = {
        assigned: '👨‍💼 Driver assigned to your delivery',
        picked_up: '📦 Your package has been picked up',
        in_transit: '🚚 Your delivery is on the way',
        delivered: '✅ Package delivered successfully!',
        failed: '❌ Delivery failed. Contact support.'
      }
      
      const message = statusMessages[data.status] || 'Delivery status updated'
      toast.success(message)
    })

    // Driver notifications
    this.socket.on('driver-notification', (data) => {
      console.log('🚚 Driver notification:', data)
      this.emit('driver-notification', data)
      
      if (data.type === 'new-delivery') {
        toast.success('📦 New delivery assigned!')
      } else if (data.type === 'route-optimized') {
        toast.success('🗺️ Your route has been optimized!')
      }
    })

    // Admin notifications
    this.socket.on('admin-notification', (data) => {
      console.log('🏢 Admin notification:', data)
      this.emit('admin-notification', data)
      
      if (data.type === 'system-alert') {
        toast.error(`⚠️ System Alert: ${data.message}`)
      }
    })

    // General notifications
    this.socket.on('notification', (data) => {
      console.log('🔔 General notification:', data)
      this.emit('notification', data)
      
      if (data.toast !== false) {
        const toastMethod = data.type === 'error' ? toast.error : toast.success
        toastMethod(data.message)
      }
    })
  }

  // Join specific rooms for targeted updates
  joinRoom(roomName) {
    if (!this.socket || !this.isConnected) {
      console.warn('Cannot join room: Socket not connected')
      return
    }

    this.socket.emit('join-room', roomName)
    console.log(`🏠 Joined room: ${roomName}`)
  }

  // Leave specific rooms
  leaveRoom(roomName) {
    if (!this.socket) return

    this.socket.emit('leave-room', roomName)
    console.log(`🚪 Left room: ${roomName}`)
  }

  // Driver-specific methods
  startDriverTracking(driverId) {
    this.joinRoom(`driver-${driverId}`)
    this.socket.emit('driver-online', driverId)
  }

  updateDriverLocation(locationData) {
    if (!this.socket || !this.isConnected) return

    this.socket.emit('driver-location-update', {
      ...locationData,
      timestamp: new Date().toISOString()
    })
  }

  // Customer-specific methods
  trackDelivery(deliveryId) {
    this.joinRoom(`delivery-${deliveryId}`)
    this.socket.emit('track-delivery', deliveryId)
  }

  stopTrackingDelivery(deliveryId) {
    this.leaveRoom(`delivery-${deliveryId}`)
  }

  // Admin-specific methods
  monitorFleet() {
    this.joinRoom('admin-monitoring')
    this.socket.emit('start-fleet-monitoring')
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback)
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error)
        }
      })
    }
  }

  // Connection status listeners
  onConnectionChange(callback) {
    this.connectionListeners.add(callback)
    
    // Return cleanup function
    return () => this.connectionListeners.delete(callback)
  }

  // Send custom events
  send(event, data) {
    if (!this.socket || !this.isConnected) {
      console.warn(`Cannot send ${event}: Socket not connected`)
      return false
    }

    this.socket.emit(event, data)
    return true
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null,
      reconnectAttempts: this.reconnectAttempts,
    }
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting socket...')
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
      this.listeners.clear()
      this.connectionListeners.clear()
    }
  }

  // Reconnect socket
  reconnect() {
    if (this.socket) {
      console.log('🔄 Reconnecting socket...')
      this.socket.connect()
    }
  }
}

// Create singleton instance
const socketService = new SocketService()

// Export singleton instance and class for testing
export default socketService
export { SocketService }
