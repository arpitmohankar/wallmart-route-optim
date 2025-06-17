/* eslint-disable no-unused-vars */
import React from 'react'
import {
  IconButton,
  Tooltip,
  Box,
  Switch,
  Typography,
  Card,
  CardContent,
  useTheme as useMuiTheme,
  useMediaQuery,
} from '@mui/material'
import {
  DarkMode,
  LightMode,
  Brightness4,
  Brightness7,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'

// Import theme context
import { useTheme } from '../App.jsx'

const ThemeToggle = ({ 
  variant = 'icon', // 'icon', 'switch', 'card'
  size = 'medium',
  showLabel = false,
  className = '',
  ...props 
}) => {
  const { isDarkMode, toggleTheme } = useTheme()
  const muiTheme = useMuiTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'))

  // Icon variant (simple icon button)
  if (variant === 'icon') {
    return (
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={className}
      >
        <Tooltip 
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          arrow
        >
          <IconButton
            onClick={toggleTheme}
            size={size}
            sx={{
              backgroundColor: isDarkMode 
                ? 'rgba(255, 255, 255, 0.05)' 
                : 'rgba(0, 0, 0, 0.05)',
              border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
              borderRadius: '12px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                backgroundColor: isDarkMode 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'rgba(0, 0, 0, 0.1)',
                transform: 'translateY(-2px)',
                boxShadow: isDarkMode 
                  ? '0 8px 25px rgba(255,255,255,0.1)' 
                  : '0 8px 25px rgba(0,0,0,0.15)',
              },
            }}
            {...props}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={isDarkMode ? 'dark' : 'light'}
                initial={{ rotate: -180, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 180, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {isDarkMode ? (
                  <LightMode sx={{ color: '#ffd54f' }} />
                ) : (
                  <DarkMode sx={{ color: '#424242' }} />
                )}
              </motion.div>
            </AnimatePresence>
          </IconButton>
        </Tooltip>
      </motion.div>
    )
  }

  // Switch variant (toggle switch with label)
  if (variant === 'switch') {
    return (
      <Box 
        className={`flex items-center space-x-3 ${className}`}
        {...props}
      >
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center"
        >
          <Brightness7 sx={{ color: isDarkMode ? '#757575' : '#ffd54f' }} />
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Switch
            checked={isDarkMode}
            onChange={toggleTheme}
            size={size}
            sx={{
              width: 58,
              height: 38,
              padding: 1,
              '& .MuiSwitch-switchBase': {
                margin: 1,
                padding: 0,
                transform: 'translateX(6px)',
                '&.Mui-checked': {
                  color: '#fff',
                  transform: 'translateX(22px)',
                  '& .MuiSwitch-thumb:before': {
                    backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
                      '#fff',
                    )}" d="M4.2 2.5l-.7 1.8-1.8.7 1.8.7.7 1.8.6-1.8L6.7 5l-1.9-.7-.6-1.8zm15 8.3a6.7 6.7 0 11-6.6-6.6 5.8 5.8 0 006.6 6.6z"/></svg>')`,
                  },
                  '& + .MuiSwitch-track': {
                    opacity: 1,
                    backgroundColor: '#8796A5',
                  },
                },
              },
              '& .MuiSwitch-thumb': {
                backgroundColor: isDarkMode ? '#003892' : '#001e3c',
                width: 32,
                height: 32,
                '&:before': {
                  content: "''",
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  left: 0,
                  top: 0,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'center',
                  backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
                    '#fff',
                  )}" d="M9.305 1.667V3.75h1.389V1.667h-1.39zm-4.707 1.95l-.982.982L5.09 6.072l.982-.982-1.473-1.473zm10.802 0L13.927 5.09l.982.982 1.473-1.473-.982-.982zM10 5.139a4.872 4.872 0 00-4.862 4.86A4.872 4.872 0 0010 14.862 4.872 4.872 0 0014.86 10 4.872 4.872 0 0010 5.139zm0 1.389A3.462 3.462 0 0113.471 10a3.462 3.462 0 01-3.473 3.472A3.462 3.462 0 016.527 10 3.462 3.462 0 0110 6.528zM1.665 9.305v1.39h2.083v-1.39H1.666zm14.583 0v1.39h2.084v-1.39h-2.084zM5.09 13.928L3.616 15.4l.982.982 1.473-1.473-.982-.982zm9.82 0l-.982.982 1.473 1.473.982-.982-1.473-1.473zM9.305 16.25v2.083h1.389V16.25h-1.39z"/></svg>')`,
                },
              },
              '& .MuiSwitch-track': {
                opacity: 1,
                backgroundColor: '#aab4be',
                borderRadius: 20 / 2,
              },
            }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center"
        >
          <DarkMode sx={{ color: isDarkMode ? '#90caf9' : '#757575' }} />
        </motion.div>

        {showLabel && (
          <Typography variant="body2" className="ml-2">
            {isDarkMode ? 'Dark' : 'Light'} Mode
          </Typography>
        )}
      </Box>
    )
  }

  // Card variant (full card with description)
  if (variant === 'card') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        className={className}
      >
        <Card
          sx={{
            borderRadius: '16px',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            backgroundColor: isDarkMode 
              ? 'rgba(255, 255, 255, 0.05)' 
              : 'rgba(0, 0, 0, 0.02)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            '&:hover': {
              backgroundColor: isDarkMode 
                ? 'rgba(255, 255, 255, 0.08)' 
                : 'rgba(0, 0, 0, 0.04)',
              boxShadow: isDarkMode 
                ? '0 8px 32px rgba(255,255,255,0.1)' 
                : '0 8px 32px rgba(0,0,0,0.1)',
            },
          }}
          onClick={toggleTheme}
          {...props}
        >
          <CardContent className="p-6">
            <Box className="flex items-center justify-between">
              <Box className="flex items-center space-x-4">
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    background: isDarkMode 
                      ? 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' 
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={isDarkMode ? 'dark' : 'light'}
                      initial={{ rotate: -180, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 180, opacity: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      {isDarkMode ? (
                        <DarkMode sx={{ color: 'white', fontSize: 24 }} />
                      ) : (
                        <LightMode sx={{ color: 'white', fontSize: 24 }} />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </Box>

                <Box>
                  <Typography variant="h6" className="font-semibold mb-1">
                    {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                  </Typography>
                  <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                    {isDarkMode 
                      ? 'Easy on the eyes in low light'
                      : 'Clean and bright interface'
                    }
                  </Typography>
                </Box>
              </Box>

              <Box className="flex items-center space-x-2">
                <Typography variant="body2" className="text-gray-500">
                  {isDarkMode ? 'ON' : 'OFF'}
                </Typography>
                <Switch
                  checked={isDarkMode}
                  onChange={toggleTheme}
                  size="medium"
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: muiTheme.palette.primary.main,
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: muiTheme.palette.primary.main,
                    },
                  }}
                />
              </Box>
            </Box>

            {/* Additional Features */}
            <Box className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Box className="grid grid-cols-2 gap-4 text-center">
                <Box>
                  <Typography variant="caption" className="text-gray-500 block">
                    Battery Usage
                  </Typography>
                  <Typography variant="body2" className="font-semibold">
                    {isDarkMode ? 'Lower' : 'Normal'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" className="text-gray-500 block">
                    Eye Comfort
                  </Typography>
                  <Typography variant="body2" className="font-semibold">
                    {isDarkMode ? 'High' : 'Standard'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return null
}

export default ThemeToggle
