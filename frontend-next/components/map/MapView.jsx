'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, Refresh } from 'lucide-react'
import { MAP_CONFIG } from '@/utils/constants'
import { useTheme } from 'next-themes'

// Set Mapbox access token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

export default function MapView({
  deliveries = [],
  currentLocation = null,
  optimizedRoute = null,
  onLocationUpdate,
  height = '400px',
  showControls = true,
}) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markersRef = useRef([])
  const { theme } = useTheme()
  
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: theme === 'dark' ? MAP_CONFIG.STYLE.DARK : MAP_CONFIG.STYLE.LIGHT,
      center: currentLocation 
        ? [currentLocation.longitude, currentLocation.latitude]
        : MAP_CONFIG.DEFAULT_CENTER,
      zoom: MAP_CONFIG.DEFAULT_ZOOM,
    })

    map.current.on('load', () => {
      setIsMapLoaded(true)
      
      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Update map style when theme changes
  useEffect(() => {
    if (!map.current || !isMapLoaded) return
    
    map.current.setStyle(
      theme === 'dark' ? MAP_CONFIG.STYLE.DARK : MAP_CONFIG.STYLE.LIGHT
    )
  }, [theme, isMapLoaded])

  // Add/update markers
  useEffect(() => {
    if (!map.current || !isMapLoaded) return

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove())
    markersRef.current = []

    // Add current location marker
    if (currentLocation) {
      const el = document.createElement('div')
      el.className = 'current-location-marker'
      el.style.cssText = `
        width: 20px;
        height: 20px;
        background: #2196f3;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      `

      const marker = new mapboxgl.Marker(el)
        .setLngLat([currentLocation.longitude, currentLocation.latitude])
        .addTo(map.current)

      markersRef.current.push(marker)
    }

    // Add delivery markers
    deliveries.forEach((delivery, index) => {
      const coords = delivery.delivery?.coordinates
      if (!coords) return

      const el = document.createElement('div')
      el.className = 'delivery-marker'
      el.innerHTML = `
        <div style="
          background: ${getStatusColor(delivery.status)};
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          font-weight: bold;
        ">
          ${index + 1}
        </div>
      `

      const popup = new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div style="padding: 8px;">
            <strong>Order #${delivery.orderId}</strong><br>
            <small>${delivery.delivery.address}</small>
          </div>
        `)

      const marker = new mapboxgl.Marker(el)
        .setLngLat([coords.longitude, coords.latitude])
        .setPopup(popup)
        .addTo(map.current)

      markersRef.current.push(marker)
    })

    // Fit bounds if multiple markers
    if (markersRef.current.length > 1) {
      const bounds = new mapboxgl.LngLatBounds()
      markersRef.current.forEach(marker => {
        bounds.extend(marker.getLngLat())
      })
      map.current.fitBounds(bounds, { padding: 50 })
    }
  }, [deliveries, currentLocation, isMapLoaded])

  // Draw route
  useEffect(() => {
    if (!map.current || !isMapLoaded || !optimizedRoute) return

    // Remove existing route layer
    if (map.current.getLayer('route')) {
      map.current.removeLayer('route')
      map.current.removeSource('route')
    }

    // Add route
    map.current.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: optimizedRoute.geometry || {
          type: 'LineString',
          coordinates: []
        }
      }
    })

    map.current.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      paint: {
        'line-color': '#2196f3',
        'line-width': 4,
        'line-opacity': 0.8
      }
    })
  }, [optimizedRoute, isMapLoaded])

  // Center on current location
  const centerOnLocation = () => {
    if (!map.current || !currentLocation) return
    
    map.current.flyTo({
      center: [currentLocation.longitude, currentLocation.latitude],
      zoom: 15,
      duration: 1000
    })
  }

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      pending: '#ff9800',
      assigned: '#2196f3',
      picked_up: '#9c27b0',
      in_transit: '#ff5722',
      delivered: '#4caf50',
      failed: '#f44336',
    }
    return colors[status] || '#757575'
  }

  return (
    <div className="relative" style={{ height }}>
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      
      {showControls && isMapLoaded && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          {currentLocation && (
            <Button
              size="icon"
              variant="secondary"
              onClick={centerOnLocation}
              className="shadow-lg"
            >
              <MapPin className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
