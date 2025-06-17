/* eslint-disable no-unused-vars */
import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge,
  useMediaQuery,
  useTheme as useMuiTheme,
  Fab,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard,
  LocalShipping,
  PersonPin,
  AdminPanelSettings,
  Logout,
  Settings,
  DarkMode,
  LightMode,
  Navigation,
  Refresh,
  Notifications,
  AccountCircle,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

// Import contexts
import { useAuth } from '../App.jsx'
import { useTheme } from '../App.jsx'

const Layout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { isDarkMode, toggleTheme } = useTheme()
  const muiTheme = useMuiTheme()
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'))

  // Local state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null)
  const [notifications] = useState(3) // Mock notification count

  // Navigation items based on user role
  const getNavigationItems = () => {
    const baseItems = [
      {
        text: 'Dashboard',
        icon: <Dashboard />,
        path: `/${user?.role}`,
        roles: ['driver', 'customer', 'admin']
      },
    ]

    const roleSpecificItems = {
      driver: [
        { text: 'My Routes', icon: <Navigation />, path: '/driver/routes' },
        { text: 'Deliveries', icon: <LocalShipping />, path: '/driver/deliveries' },
      ],
      customer: [
        { text: 'Track Order', icon: <PersonPin />, path: '/customer/track' },
        { text: 'Order History', icon: <LocalShipping />, path: '/customer/orders' },
      ],
      admin: [
        { text: 'Fleet Management', icon: <LocalShipping />, path: '/admin/fleet' },
        { text: 'Analytics', icon: <AdminPanelSettings />, path: '/admin/analytics' },
      ]
    }

    return [...baseItems, ...(roleSpecificItems[user?.role] || [])]
  }

  // Handle profile menu
  const handleProfileMenuOpen = (event) => {
    setProfileMenuAnchor(event.currentTarget)
  }

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null)
  }

  // Handle logout
  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully!')
    navigate('/login')
    handleProfileMenuClose()
  }

  // Get user role display
  const getRoleDisplay = (role) => {
    const roleMap = {
      driver: 'Driver',
      customer: 'Customer',
      admin: 'Admin'
    }
    return roleMap[role] || 'User'
  }

  // Get user avatar color
  const getAvatarColor = (role) => {
    const colorMap = {
      driver: '#4caf50',
      customer: '#2196f3',
      admin: '#ff9800'
    }
    return colorMap[role] || '#757575'
  }

  // Mobile drawer content
  const drawerContent = (
    <Box sx={{ width: 280 }} className="h-full bg-white dark:bg-gray-900">
      {/* Drawer Header */}
      <Box className="p-4 border-b border-gray-200 dark:border-gray-700">
        <Box className="flex items-center space-x-3">
          <Avatar
            sx={{ 
              bgcolor: getAvatarColor(user?.role),
              width: 48,
              height: 48,
              fontSize: '1.25rem'
            }}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h6" className="font-semibold text-gray-900 dark:text-white">
              {user?.name}
            </Typography>
            <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
              {getRoleDisplay(user?.role)}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Navigation List */}
      <List className="py-2">
        {getNavigationItems().map((item, index) => (
          <motion.div
            key={item.text}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate(item.path)
                  setMobileDrawerOpen(false)
                }}
                selected={location.pathname === item.path}
                sx={{
                  margin: '4px 8px',
                  borderRadius: '12px',
                  '&.Mui-selected': {
                    backgroundColor: isDarkMode ? 'rgba(100, 181, 246, 0.12)' : 'rgba(33, 150, 243, 0.12)',
                    '&:hover': {
                      backgroundColor: isDarkMode ? 'rgba(100, 181, 246, 0.16)' : 'rgba(33, 150, 243, 0.16)',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ color: location.pathname === item.path ? muiTheme.palette.primary.main : 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  sx={{ 
                    '& .MuiTypography-root': { 
                      fontWeight: location.pathname === item.path ? 600 : 400 
                    } 
                  }} 
                />
              </ListItemButton>
            </ListItem>
          </motion.div>
        ))}
      </List>

      <Divider className="my-4" />

      {/* Settings and Theme */}
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={toggleTheme} sx={{ margin: '4px 8px', borderRadius: '12px' }}>
            <ListItemIcon>
              {isDarkMode ? <LightMode /> : <DarkMode />}
            </ListItemIcon>
            <ListItemText primary={isDarkMode ? 'Light Mode' : 'Dark Mode'} />
          </ListItemButton>
        </ListItem>
        
        <ListItem disablePadding>
          <ListItemButton sx={{ margin: '4px 8px', borderRadius: '12px' }}>
            <ListItemIcon>
              <Settings />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  )

  return (
    <Box className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* App Bar */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: muiTheme.zIndex.drawer + 1,
          backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          boxShadow: isDarkMode 
            ? '0 4px 20px rgba(0,0,0,0.3)' 
            : '0 4px 20px rgba(0,0,0,0.1)',
          borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        }}
      >
        <Toolbar className="justify-between">
          {/* Left side */}
          <Box className="flex items-center space-x-3">
            {isMobile && (
              <IconButton
                edge="start"
                onClick={() => setMobileDrawerOpen(true)}
                sx={{ color: isDarkMode ? 'white' : 'black' }}
              >
                <MenuIcon />
              </IconButton>
            )}
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-2"
            >
              <Box className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <LocalShipping className="text-white text-lg" />
              </Box>
              <Typography 
                variant="h6" 
                className="font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
              >
                Smart Delivery
              </Typography>
            </motion.div>
          </Box>

          {/* Right side */}
          <Box className="flex items-center space-x-2">
            {/* Theme Toggle for Desktop */}
            {!isMobile && (
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <IconButton 
                  onClick={toggleTheme}
                  sx={{ color: isDarkMode ? 'white' : 'black' }}
                >
                  {isDarkMode ? <LightMode /> : <DarkMode />}
                </IconButton>
              </motion.div>
            )}

            {/* Notifications */}
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <IconButton sx={{ color: isDarkMode ? 'white' : 'black' }}>
                <Badge badgeContent={notifications} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
            </motion.div>

            {/* Profile Menu */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <IconButton onClick={handleProfileMenuOpen}>
                <Avatar
                  sx={{ 
                    bgcolor: getAvatarColor(user?.role),
                    width: 36,
                    height: 36,
                    fontSize: '0.9rem'
                  }}
                >
                  {user?.name?.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
            </motion.div>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Sidebar */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: 280,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 280,
              boxSizing: 'border-box',
              mt: '64px',
              backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
              borderRight: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main Content */}
      <Box 
        component="main" 
        className="flex-1 overflow-auto"
        sx={{ 
          ml: isMobile ? 0 : '280px',
          mt: '64px',
          backgroundColor: isDarkMode ? '#121212' : '#fafafa',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          <Outlet />
        </motion.div>
      </Box>

      {/* Profile Menu */}
      <Menu
        anchorEl={profileMenuAnchor}
        open={Boolean(profileMenuAnchor)}
        onClose={handleProfileMenuClose}
        PaperProps={{
          sx: {
            backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
            border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            borderRadius: '12px',
            minWidth: '200px',
            mt: 1,
          },
        }}
      >
        <Box className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Typography variant="subtitle1" className="font-semibold">
            {user?.name}
          </Typography>
          <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
            {user?.email}
          </Typography>
        </Box>
        
        <MenuItem onClick={handleProfileMenuClose} className="py-3">
          <AccountCircle className="mr-3" />
          Profile Settings
        </MenuItem>
        
        <MenuItem onClick={handleProfileMenuClose} className="py-3">
          <Settings className="mr-3" />
          App Settings
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleLogout} className="py-3 text-red-600 dark:text-red-400">
          <Logout className="mr-3" />
          Logout
        </MenuItem>
      </Menu>

      {/* Floating Action Button for Driver Route Refresh */}
      <AnimatePresence>
        {user?.role === 'driver' && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{
              position: 'fixed',
              bottom: isMobile ? 80 : 24,
              right: 24,
              zIndex: 1000,
            }}
          >
            <Fab
              color="primary"
              size="large"
              sx={{
                background: 'linear-gradient(45deg, #2196f3 30%, #64b5f6 90%)',
                boxShadow: '0 8px 25px rgba(33, 150, 243, 0.4)',
                '&:hover': {
                  transform: 'scale(1.1)',
                  boxShadow: '0 12px 35px rgba(33, 150, 243, 0.6)',
                },
                transition: 'all 0.3s ease',
              }}
              onClick={() => toast.success('Route refresh feature coming soon!')}
            >
              <Refresh className="text-white" />
            </Fab>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  )
}

export default Layout
