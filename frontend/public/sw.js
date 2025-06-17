/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const CACHE_NAME = 'smart-delivery-v1.0.0'
const API_CACHE_NAME = 'smart-delivery-api-v1.0.0'

// Assets to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline.html'
]

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/auth/profile',
  '/api/delivery/',
  '/api/route/current'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('✅ Service Worker installed successfully')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('❌ Service Worker installation failed:', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('🗑️ Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('✅ Service Worker activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
    return
  }

  // Handle static assets
  if (request.method === 'GET') {
    event.respondWith(handleStaticRequest(request))
    return
  }
})

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE_NAME)
  
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    // Cache successful responses
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone()
      await cache.put(request, responseClone)
    }
    
    return networkResponse
    
  } catch (error) {
    console.log('🌐 Network failed, trying cache for:', request.url)
    
    // Fallback to cache
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline message for critical API failures
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'You are currently offline. Some features may not work.' 
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Handle static requests with cache-first strategy
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME)
  
  // Try cache first
  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    // Fallback to network
    const networkResponse = await fetch(request)
    
    // Cache successful responses
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone()
      await cache.put(request, responseClone)
    }
    
    return networkResponse
    
  } catch (error) {
    console.log('🌐 Network failed for static asset:', request.url)
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await cache.match('/offline.html')
      return offlinePage || new Response('Offline', { status: 503 })
    }
    
    throw error
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync triggered:', event.tag)
  
  if (event.tag === 'location-update') {
    event.waitUntil(syncLocationUpdates())
  }
  
  if (event.tag === 'delivery-status') {
    event.waitUntil(syncDeliveryStatus())
  }
})

// Sync location updates when back online
async function syncLocationUpdates() {
  console.log('📍 Syncing location updates...')
  
  try {
    // Get pending location updates from IndexedDB
    const pendingUpdates = await getPendingLocationUpdates()
    
    for (const update of pendingUpdates) {
      await fetch('/api/route/update-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update)
      })
    }
    
    await clearPendingLocationUpdates()
    console.log('✅ Location updates synced')
    
  } catch (error) {
    console.error('❌ Failed to sync location updates:', error)
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('📱 Push notification received')
  
  const options = {
    body: 'Your delivery status has been updated',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/customer'
    },
    actions: [
      {
        action: 'view',
        title: 'View Details',
        icon: '/icons/view-action.png'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  }
  
  if (event.data) {
    const data = event.data.json()
    options.body = data.message || options.body
    options.data = { ...options.data, ...data }
  }
  
  event.waitUntil(
    self.registration.showNotification('Smart Delivery', options)
  )
})

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('📱 Notification clicked:', event.action)
  
  event.notification.close()
  
  if (event.action === 'view' || !event.action) {
    const url = event.notification.data?.url || '/'
    
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          // Focus existing window if available
          for (const client of clientList) {
            if (client.url.includes(url) && 'focus' in client) {
              return client.focus()
            }
          }
          
          // Open new window
          if (clients.openWindow) {
            return clients.openWindow(url)
          }
        })
    )
  }
})

// Helper functions for IndexedDB operations
async function getPendingLocationUpdates() {
  // Implement IndexedDB operations for offline storage
  return []
}

async function clearPendingLocationUpdates() {
  // Implement IndexedDB cleanup
}
