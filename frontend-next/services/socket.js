import { io } from 'socket.io-client'
import { auth } from '@/lib/auth'
import { toast } from 'sonner'

class SocketService {
  constructor() {
    this.socket = null
    this.listeners = new Map()
  }
  
  // Initialize socket connection
  connect() {
    if (this.socket?.connected) {
      console.log('Socket already connected')
      return
    }
    
    const token = auth.getToken()
    if (!token) {
      console.warn('No auth token, skipping socket connection')
      return
    }
    
    this.socket = io(process.env.NEXT_PUBLIC_API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })
    
    this.setupEventListeners()
  }
  
  // Setup default event listeners
  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('✅ Socket connected')
      toast.success('Real-time connection established')
    })
    
    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason)
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.socket.connect()
      }
    })
    
    this.socket.on('error', (error) => {
      console.error('Socket error:', error)
      toast.error('Connection error. Retrying...')
    })
    
    // Business logic events
    this.socket.on('location-update', (data) => {
      this.emit('driver-location-updated', data)
    })
    
    this.socket.on('delivery-status-update', (data) => {
      this.emit('delivery-status-changed', data)
      toast.info(`Delivery #${data.orderId} status: ${data.status}`)
    })
    
    this.socket.on('route-optimized', (data) => {
      this.emit('route-updated', data)
      toast.success('Route has been optimized!')
    })
  }
  
  // Emit event to server
  emit(event, data) {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, queuing event:', event)
      return
    }
    
    this.socket.emit(event, data)
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
  
  // Emit to local listeners
  emitLocal(event, data) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(data))
    }
  }
  
  // Update driver location
  updateDriverLocation(locationData) {
    this.emit('update-location', locationData)
  }
  
  // Join driver room
  joinDriverRoom(driverId) {
    this.emit('join-driver-room', { driverId })
  }
  
  // Join customer room
  joinCustomerRoom(customerId) {
    this.emit('join-customer-room', { customerId })
  }
  
  // Leave room
  leaveRoom(roomId) {
    this.emit('leave-room', { roomId })
  }
  
  // Disconnect socket
  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.listeners.clear()
    }
  }
  
  // Get connection status
  isConnected() {
    return this.socket?.connected || false
  }
}

// Create singleton instance
const socketService = new SocketService()

export default socketService
