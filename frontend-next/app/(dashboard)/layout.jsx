'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { auth } from '@/lib/auth'
import { useAuthStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { 
  Package, Menu, Home, Truck, Users, MapPin, 
  BarChart3, Settings, LogOut, Navigation,
  Package2, History, Bell
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, clearAuth } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Navigation items based on user role
  const getNavigationItems = () => {
    const roleItems = {
      admin: [
        { title: 'Dashboard', href: '/admin', icon: Home },
        { title: 'Fleet Management', href: '/admin/fleet', icon: Truck },
        { title: 'All Deliveries', href: '/admin/deliveries', icon: Package2 },
        { title: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
        { title: 'Users', href: '/admin/users', icon: Users },
      ],
      driver: [
        { title: 'Dashboard', href: '/driver', icon: Home },
        { title: 'My Deliveries', href: '/driver/deliveries', icon: Package2 },
        { title: 'Current Route', href: '/driver/route', icon: Navigation },
        { title: 'History', href: '/driver/history', icon: History },
      ],
      customer: [
        { title: 'Dashboard', href: '/customer', icon: Home },
        { title: 'Track Orders', href: '/customer/track', icon: MapPin },
        { title: 'Order History', href: '/customer/orders', icon: History },
      ],
    }

    return roleItems[user?.role] || []
  }

  // Check authentication
  useEffect(() => {
    const token = auth.getToken()
    const userData = auth.getUser()
    
    if (!token || !userData) {
      router.push('/login')
    }
  }, [router])

  // Handle logout
  const handleLogout = () => {
    auth.clearAuth()
    clearAuth()
    toast.success('Logged out successfully')
    router.push('/login')
  }

  // Get user initials
  const getUserInitials = (name) => {
    if (!name) return 'U'
    const parts = name.split(' ')
    return parts.map(part => part[0]).join('').toUpperCase().slice(0, 2)
  }

  // Get role color
  const getRoleColor = (role) => {
    const colors = {
      admin: 'bg-orange-500',
      driver: 'bg-green-500',
      customer: 'bg-blue-500',
    }
    return colors[role] || 'bg-gray-500'
  }

  const navigationItems = getNavigationItems()

  // Sidebar content component
  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-6 border-b">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
          <Package className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Walmart Route
          </h2>
          <p className="text-xs text-muted-foreground">Optimizer v2.0</p>
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar className={cn("w-10 h-10", getRoleColor(user?.role))}>
            <AvatarFallback className="text-white font-semibold">
              {getUserInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.title}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => toast.info('Settings coming soon!')}
        >
          <Settings className="w-5 h-5 mr-2" />
          Settings
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Logout
        </Button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:fixed md:inset-y-0 md:w-64 md:flex-col">
        <div className="flex flex-col flex-1 border-r bg-background">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:hidden">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle sidebar</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>

        <div className="flex-1">
          <h1 className="text-lg font-semibold">Walmart Route Optimizer</h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 md:ml-64">
        {/* Desktop Header */}
        <header className="hidden md:flex sticky top-0 z-30 h-16 items-center gap-4 border-b bg-background px-6">
          <div className="flex-1">
            <h1 className="text-xl font-semibold capitalize">
              {pathname.split('/').filter(Boolean).join(' / ')}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <ThemeToggle />
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background">
        <div className="grid grid-cols-4 gap-1 p-2">
          {navigationItems.slice(0, 4).map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="truncate">{item.title}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
