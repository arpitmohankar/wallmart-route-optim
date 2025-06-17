/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Fade,
  useTheme as useMuiTheme,
  useMediaQuery,
} from '@mui/material'
import {
  MyLocation,
  DirectionsWalk,
  DirectionsCar,
  LocationOn,
  Navigation,
  Refresh,
  Warning,
  CheckCircle,
  Schedule,
} from '@mui/icons-material'
import mapboxgl from 'mapbox-gl'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

// Import contexts and services
import { useAuth } from '../App.jsx'
import { useTheme } from '../App.jsx'

// Set Mapbox access token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

const Map = ({ 
  deliveries = [], 
  currentLocation = null, 
  optimizedRoute = null,
  onLocationUpdate = null,
  onRouteRefresh = null,
  showControls = true,
  height = '400px',
  className = ''
}) => {
  const { user } = useAuth()
  const { isDarkMode } = useTheme()
  const muiTheme = useMuiTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'))
  
  // Map refs and state
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markersRef = useRef([])
  const routeLayerRef = useRef(null)
  
  const [isMapLoading, setIsMapLoading] = useState(true)
  const [mapError, setMapError] = useState(null)
  const [isLocationTracking, setIsLocationTracking] = useState(false)
  const [routeInfo, setRouteInfo] = useState(null)

  // Default coordinates (Bangalore, India)
  const defaultCenter = [77.5946, 12.9716]

  // Initialize Mapbox Map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: isDarkMode 
          ? 'mapbox://styles/mapbox/dark-v11' 
          : 'mapbox://styles/mapbox/light-v11',
        center: currentLocation 
          ? [currentLocation.longitude, currentLocation.latitude] 
          : defaultCenter,
        zoom: isMobile ? 12 : 14,
        attributionControl: false,
      })

      // Add navigation controls
      const nav = new mapboxgl.NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: false,
      })
      map.current.addControl(nav, 'top-right')

      // Add geolocate control for mobile
      if (isMobile) {
        const geolocate = new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true,
          },
          trackUserLocation: true,
          showUserHeading: true,
        })
        map.current.addControl(geolocate, 'top-right')
      }

      // Map load event
      map.current.on('load', () => {
        setIsMapLoading(false)
        initializeMapLayers()
        
        // Add current location if available
        if (currentLocation) {
          addCurrentLocationMarker(currentLocation)
        }
        
        // Add delivery markers
        if (deliveries && deliveries.length > 0) {
          addDeliveryMarkers(deliveries)
        }
      })

      // Error handling
      map.current.on('error', (e) => {
        console.error('Map error:', e)
        setMapError('Failed to load map. Please check your internet connection.')
        setIsMapLoading(false)
      })

    } catch (error) {
      console.error('Map initialization error:', error)
      setMapError('Failed to initialize map. Please refresh the page.')
      setIsMapLoading(false)
    }

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [isDarkMode])

  // Initialize map layers for routes
  const initializeMapLayers = () => {
    if (!map.current) return

    // Add route layer
    map.current.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: []
        }
      }
    })

    map.current.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': isDarkMode ? '#64b5f6' : '#2196f3',
        'line-width': isMobile ? 4 : 5,
        'line-opacity': 0.8
      }
    })

    routeLayerRef.current = 'route'
  }

  // Add current location marker
  const addCurrentLocationMarker = useCallback((location) => {
    if (!map.current) return

    // Remove existing current location marker
    const existingMarker = markersRef.current.find(m => m.id === 'current-location')
    if (existingMarker) {
      existingMarker.marker.remove()
      markersRef.current = markersRef.current.filter(m => m.id !== 'current-location')
    }

    // Create custom marker element
    const markerElement = document.createElement('div')
    markerElement.className = 'current-location-marker'
    markerElement.style.cssText = `
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: linear-gradient(45deg, #2196f3, #64b5f6);
      border: 3px solid white;
      box-shadow: 0 4px 15px rgba(33, 150, 243, 0.4);
      animation: pulse 2s infinite;
    `

    // Add pulsing animation
    const style = document.createElement('style')
    style.textContent = `
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.7; }
        100% { transform: scale(1); opacity: 1; }
      }
    `
    document.head.appendChild(style)

    const marker = new mapboxgl.Marker(markerElement)
      .setLngLat([location.longitude, location.latitude])
      .addTo(map.current)

    // Add popup for current location
    const popup = new mapboxgl.Popup({ offset: 25 })
      .setHTML(`
        <div style="padding: 8px;">
          <strong>📍 Current Location</strong><br>
          <small>${user?.role === 'driver' ? 'Driver Position' : 'Your Location'}</small>
        </div>
      `)

    marker.setPopup(popup)

    markersRef.current.push({ id: 'current-location', marker })

    // Center map on current location
    map.current.flyTo({
      center: [location.longitude, location.latitude],
      zoom: 15,
      duration: 1000,
    })
  }, [user?.role])

  // Add delivery markers
  const addDeliveryMarkers = useCallback((deliveries) => {
    if (!map.current || !deliveries) return

    // Remove existing delivery markers
    markersRef.current
      .filter(m => m.id.startsWith('delivery-'))
      .forEach(m => m.marker.remove())
    markersRef.current = markersRef.current.filter(m => !m.id.startsWith('delivery-'))

    const bounds = new mapboxgl.LngLatBounds()

    deliveries.forEach((delivery, index) => {
      const location = delivery.delivery || delivery
      if (!location.coordinates) return

      const { longitude, latitude } = location.coordinates

      // Create custom marker based on delivery status
      const markerElement = document.createElement('div')
      const statusColors = {
        pending: '#ff9800',
        assigned: '#2196f3', 
        picked_up: '#9c27b0',
        in_transit: '#ff5722',
        delivered: '#4caf50',
        failed: '#f44336',
      }

      const statusIcons = {
        pending: '⏳',
        assigned: '📦',
        picked_up: '🚚',
        in_transit: '🚛',
        delivered: '✅',
        failed: '❌',
      }

      const status = delivery.status || 'pending'
      const color = statusColors[status] || '#757575'
      const icon = statusIcons[status] || '📍'

      markerElement.innerHTML = `
        <div style="
          background: ${color};
          color: white;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: bold;
          border: 3px solid white;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          cursor: pointer;
          transition: transform 0.2s ease;
        ">
          ${icon}
        </div>
      `

      markerElement.addEventListener('mouseenter', () => {
        markerElement.style.transform = 'scale(1.2)'
      })

      markerElement.addEventListener('mouseleave', () => {
        markerElement.style.transform = 'scale(1)'
      })

      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat([longitude, latitude])
        .addTo(map.current)

      // Create detailed popup
      const popup = new mapboxgl.Popup({ offset: 25, maxWidth: '300px' })
        .setHTML(`
          <div style="padding: 12px; font-family: system-ui;">
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 18px; margin-right: 8px;">${icon}</span>
              <strong>Delivery #${delivery.orderId || (index + 1)}</strong>
            </div>
            <div style="margin-bottom: 8px;">
              <strong>Status:</strong> 
              <span style="
                background: ${color}; 
                color: white; 
                padding: 2px 8px; 
                border-radius: 12px; 
                font-size: 12px;
                margin-left: 4px;
              ">
                ${status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <div style="margin-bottom: 8px;">
              <strong>Address:</strong><br>
              <small style="color: #666;">${location.address || 'Address not available'}</small>
            </div>
            ${delivery.tracking?.estimatedArrival ? `
              <div>
                <strong>ETA:</strong><br>
                <small style="color: #2196f3;">
                  ${new Date(delivery.tracking.estimatedArrival).toLocaleTimeString()}
                </small>
              </div>
            ` : ''}
          </div>
        `)

      marker.setPopup(popup)

      markersRef.current.push({ id: `delivery-${delivery._id || index}`, marker })
      bounds.extend([longitude, latitude])
    })

    // Fit map to show all markers
    if (deliveries.length > 1) {
      map.current.fitBounds(bounds, { 
        padding: isMobile ? 50 : 100,
        maxZoom: 15 
      })
    }
  }, [isMobile])

  // Draw optimized route
  const drawRoute = useCallback((route) => {
    if (!map.current || !route || !routeLayerRef.current) return

    try {
      // Update route source
      map.current.getSource('route').setData({
        type: 'Feature',
        properties: {},
        geometry: route.geometry || {
          type: 'LineString',
          coordinates: route.waypoints?.map(wp => [wp.longitude, wp.latitude]) || []
        }
      })

      // Update route info
      setRouteInfo({
        distance: route.totalDistance,
        duration: route.totalDuration,
        waypoints: route.waypoints?.length || 0,
        optimizedAt: route.optimizedAt || new Date(),
      })

      // Fit map to route
      if (route.waypoints && route.waypoints.length > 1) {
        const bounds = new mapboxgl.LngLatBounds()
        route.waypoints.forEach(wp => bounds.extend([wp.longitude, wp.latitude]))
        map.current.fitBounds(bounds, { 
          padding: isMobile ? 80 : 120,
          maxZoom: 16
        })
      }

    } catch (error) {
      console.error('Error drawing route:', error)
      toast.error('Failed to display route')
    }
  }, [isMobile])

  // Handle location tracking
  const startLocationTracking = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser')
      return
    }

    setIsLocationTracking(true)

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(),
        }

        addCurrentLocationMarker(location)
        onLocationUpdate?.(location)
      },
      (error) => {
        console.error('Geolocation error:', error)
        toast.error('Unable to track location')
        setIsLocationTracking(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )

    // Cleanup function
    return () => {
      navigator.geolocation.clearWatch(watchId)
      setIsLocationTracking(false)
    }
  }

  // Update map when props change
  useEffect(() => {
    if (currentLocation) {
      addCurrentLocationMarker(currentLocation)
    }
  }, [currentLocation, addCurrentLocationMarker])

  useEffect(() => {
    if (deliveries && deliveries.length > 0) {
      addDeliveryMarkers(deliveries)
    }
  }, [deliveries, addDeliveryMarkers])

  useEffect(() => {
    if (optimizedRoute) {
      drawRoute(optimizedRoute)
    }
  }, [optimizedRoute, drawRoute])

  if (mapError) {
    return (
      <Card className={className} sx={{ height }}>
        <CardContent className="flex items-center justify-center h-full">
          <Alert severity="error" sx={{ borderRadius: '12px' }}>
            <Typography variant="h6" className="mb-2">Map Error</Typography>
            <Typography variant="body2">{mapError}</Typography>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card 
        sx={{ 
          height,
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: isDarkMode 
            ? '0 8px 32px rgba(0,0,0,0.3)' 
            : '0 8px 32px rgba(0,0,0,0.1)',
        }}
      >
        {/* Map Container */}
        <Box sx={{ position: 'relative', height: '100%' }}>
          <div 
            ref={mapContainer} 
            style={{ 
              width: '100%', 
              height: '100%',
              borderRadius: '16px',
            }} 
          />

          {/* Loading Overlay */}
          <AnimatePresence>
            {isMapLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDarkMode ? 'rgba(18,18,18,0.9)' : 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(8px)',
                  zIndex: 1000,
                }}
              >
                <Box className="text-center">
                  <CircularProgress size={48} />
                  <Typography variant="h6" className="mt-4">
                    Loading Map...
                  </Typography>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Map Controls */}
          {showControls && !isMapLoading && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                right: 16,
                zIndex: 100,
              }}
            >
              {/* Route Info Card */}
              <AnimatePresence>
                {routeInfo && (
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="mb-4"
                  >
                    <Card
                      sx={{
                        backgroundColor: isDarkMode ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '12px',
                      }}
                    >
                      <CardContent className="py-3">
                        <Box className="flex items-center justify-between">
                          <Box className="flex items-center space-x-4">
                            <Chip
                              icon={<Navigation />}
                              label={`${routeInfo.distance} km`}
                              variant="outlined"
                              size="small"
                            />
                            <Chip
                              icon={<Schedule />}
                              label={`${routeInfo.duration} min`}
                              variant="outlined"
                              size="small"
                            />
                            <Chip
                              icon={<LocationOn />}
                              label={`${routeInfo.waypoints} stops`}
                              variant="outlined"
                              size="small"
                            />
                          </Box>
                          
                          {user?.role === 'driver' && onRouteRefresh && (
                            <Tooltip title="Refresh Route">
                              <IconButton
                                onClick={onRouteRefresh}
                                size="small"
                                sx={{
                                  background: 'linear-gradient(45deg, #2196f3, #64b5f6)',
                                  color: 'white',
                                  '&:hover': {
                                    background: 'linear-gradient(45deg, #1976d2, #2196f3)',
                                  },
                                }}
                              >
                                <Refresh />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Location Tracking Button */}
              {user?.role === 'driver' && (
                <Box className="flex justify-center">
                  <Tooltip title={isLocationTracking ? 'Stop Tracking' : 'Start Location Tracking'}>
                    <IconButton
                      onClick={isLocationTracking ? () => setIsLocationTracking(false) : startLocationTracking}
                      sx={{
                        backgroundColor: isLocationTracking 
                          ? 'rgba(244, 67, 54, 0.9)' 
                          : 'rgba(76, 175, 80, 0.9)',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: isLocationTracking 
                            ? 'rgba(244, 67, 54, 1)' 
                            : 'rgba(76, 175, 80, 1)',
                        },
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                      }}
                    >
                      <MyLocation />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Card>
    </motion.div>
  )
}

export default Map
