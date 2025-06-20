'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/auth'
import { useAuthStore } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Loader2, Package } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const { setAuth, setLoading } = useAuthStore()

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const token = auth.getToken()
      const user = auth.getUser()

      if (token && user) {
        // User is logged in, redirect based on role
        setAuth(user, token)
        
        const roleRoutes = {
          admin: '/admin',
          driver: '/driver',
          customer: '/customer'
        }

        const redirectPath = roleRoutes[user.role] || '/login'
        router.push(redirectPath)
      } else {
        // Not logged in, redirect to login
        router.push('/login')
      }
      
      setLoading(false)
    }

    checkAuth()
  }, [router, setAuth, setLoading])

  // Loading screen while checking auth
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <Card className="p-8 shadow-2xl border-0">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Package className="w-16 h-16 text-blue-600 animate-pulse" />
            <Loader2 className="w-16 h-16 absolute inset-0 text-purple-600 animate-spin" />
          </div>
          
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Walmart Route Optimizer
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400 text-center">
            Optimizing your delivery routes...
          </p>
        </div>
      </Card>
    </div>
  )
}
