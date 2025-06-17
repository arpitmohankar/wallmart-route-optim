/* eslint-disable no-unused-vars */
import React, { useState } from 'react'
import {
  Fab,
  IconButton,
  Button,
  Tooltip,
  Badge,
  CircularProgress,
  Box,
  Typography,
  useTheme as useMuiTheme,
  useMediaQuery,
} from '@mui/material'
import {
  Refresh,
  Speed,
  Navigation,
  Timer,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

// Import contexts
import { useTheme } from '../App.jsx'

const RefreshButton = ({
  onRefresh,
  isLoading = false,
  refreshCount = 0,
  lastRefreshed = null,
  variant = 'fab', // 'fab', 'button', 'icon'
  size = 'large',
  disabled = false,
  showStats = true,
  className = '',
  style = {},
  ...props
}) => {
  const { isDarkMode } = useTheme()
  const muiTheme = useMuiTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'))

  const [isHovered, setIsHovered] = useState(false)

  // Handle refresh click
  const handleRefresh = async () => {
    if (disabled || isLoading) return

    try {
      await onRefresh?.()
    } catch (error) {
      console.error('Refresh failed:', error)
      toast.error('Failed to refresh route')
    }
  }

  // Get time since last refresh
  const getTimeSinceRefresh = () => {
    if (!lastRefreshed) return 'Never'
    
    const now = new Date()
    const diff = Math.floor((now - new Date(lastRefreshed)) / 60000) // minutes
    
    if (diff < 1) return 'Just now'
    if (diff < 60) return `${diff}m ago`
    
    const hours = Math.floor(diff / 60)
    return `${hours}h ago`
  }

  // Floating Action Button variant
  if (variant === 'fab') {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: disabled ? 1 : 1.1 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        className={className}
        style={{
          position: 'fixed',
          bottom: isMobile ? 80 : 24,
          right: 24,
          zIndex: 1000,
          ...style,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Tooltip
          title={
            disabled
              ? 'Location required for route optimization'
              : isLoading
              ? 'Optimizing route...'
              : `Refresh route (${refreshCount} optimizations)`
          }
          arrow
          placement="left"
        >
          <span>
            <Fab
              onClick={handleRefresh}
              disabled={disabled || isLoading}
              size={size}
              sx={{
                background: disabled
                  ? '#ccc'
                  : 'linear-gradient(45deg, #2196f3 30%, #64b5f6 90%)',
                color: 'white',
                boxShadow: disabled
                  ? 'none'
                  : '0 8px 25px rgba(33, 150, 243, 0.4)',
                '&:hover': {
                  background: disabled
                    ? '#ccc'
                    : 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)',
                  boxShadow: disabled
                    ? 'none'
                    : '0 12px 35px rgba(33, 150, 243, 0.6)',
                },
                transition: 'all 0.3s ease',
              }}
              {...props}
            >
              <Badge badgeContent={refreshCount} color="secondary" max={99}>
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ rotate: 0 }}
                      animate={{ rotate: 360 }}
                      exit={{ rotate: 0 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <CircularProgress size={24} color="inherit" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="refresh"
                      initial={{ rotate: -180 }}
                      animate={{ rotate: 0 }}
                      exit={{ rotate: 180 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Refresh />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Badge>
            </Fab>
          </span>
        </Tooltip>

        {/* Stats popup on hover */}
        <AnimatePresence>
          {isHovered && showStats && refreshCount > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.8 }}
              style={{
                position: 'absolute',
                right: '100%',
                top: '50%',
                transform: 'translateY(-50%)',
                marginRight: '16px',
                zIndex: 1001,
              }}
            >
              <Box
                sx={{
                  backgroundColor: isDarkMode ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                  minWidth: '180px',
                }}
              >
                <Typography variant="caption" className="font-semibold block mb-1">
                  Route Statistics
                </Typography>
                <Box className="flex items-center space-x-1 mb-1">
                  <Refresh sx={{ fontSize: 14 }} />
                  <Typography variant="caption">
                    {refreshCount} optimizations
                  </Typography>
                </Box>
                <Box className="flex items-center space-x-1">
                  <Timer sx={{ fontSize: 14 }} />
                  <Typography variant="caption">
                    Last: {getTimeSinceRefresh()}
                  </Typography>
                </Box>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  // Button variant
  if (variant === 'button') {
    return (
      <motion.div
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        className={className}
        style={style}
      >
        <Button
          onClick={handleRefresh}
          disabled={disabled || isLoading}
          startIcon={
            isLoading ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <Refresh />
            )
          }
          variant="contained"
          size={size}
          sx={{
            borderRadius: '12px',
            background: disabled
              ? undefined
              : 'linear-gradient(45deg, #2196f3, #64b5f6)',
            '&:hover': {
              background: disabled
                ? undefined
                : 'linear-gradient(45deg, #1976d2, #2196f3)',
            },
            textTransform: 'none',
            fontWeight: 600,
          }}
          {...props}
        >
          {isLoading ? 'Optimizing...' : 'Refresh Route'}
          {refreshCount > 0 && !isLoading && (
            <Badge
              badgeContent={refreshCount}
              color="secondary"
              sx={{ ml: 1 }}
              max={99}
            />
          )}
        </Button>
      </motion.div>
    )
  }

  // Icon button variant
  if (variant === 'icon') {
    return (
      <motion.div
        whileHover={{ scale: disabled ? 1 : 1.1 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        className={className}
        style={style}
      >
        <Tooltip
          title={
            disabled
              ? 'Location required for route optimization'
              : isLoading
              ? 'Optimizing route...'
              : `Refresh route (${refreshCount} times)`
          }
          arrow
        >
          <span>
            <IconButton
              onClick={handleRefresh}
              disabled={disabled || isLoading}
              size={size}
              sx={{
                backgroundColor: disabled
                  ? 'transparent'
                  : isDarkMode
                  ? 'rgba(33, 150, 243, 0.1)'
                  : 'rgba(33, 150, 243, 0.05)',
                border: `1px solid ${
                  disabled
                    ? 'rgba(0,0,0,0.12)'
                    : isDarkMode
                    ? 'rgba(33, 150, 243, 0.3)'
                    : 'rgba(33, 150, 243, 0.2)'
                }`,
                borderRadius: '12px',
                '&:hover': {
                  backgroundColor: disabled
                    ? 'transparent'
                    : isDarkMode
                    ? 'rgba(33, 150, 243, 0.15)'
                    : 'rgba(33, 150, 243, 0.1)',
                },
              }}
              {...props}
            >
              <Badge badgeContent={refreshCount} color="primary" max={99}>
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ rotate: 0 }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <CircularProgress size={20} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="refresh"
                      initial={{ rotate: -180 }}
                      animate={{ rotate: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Refresh color={disabled ? 'disabled' : 'primary'} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Badge>
            </IconButton>
          </span>
        </Tooltip>
      </motion.div>
    )
  }

  return null
}

export default RefreshButton
