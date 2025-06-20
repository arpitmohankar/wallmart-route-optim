'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { auth } from '@/lib/auth'
import { useAuthStore } from '@/lib/store'
import apiService from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Lock, User, Phone, MapPin, AlertCircle } from 'lucide-react'

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  role: z.enum(['customer', 'driver', 'admin']),
  address: z.string().optional(),
})

export function LoginForm({ mode = 'login' }) {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(mode === 'login' ? loginSchema : registerSchema),
    defaultValues: {
      role: 'customer',
    },
  })

  const selectedRole = watch('role')

  // Handle form submission
  const onSubmit = async (data) => {
    setIsLoading(true)
    setError('')

    try {
      let response
      
      if (mode === 'login') {
        response = await apiService.auth.login(data)
      } else {
        // Add mock coordinates for demo
        if (data.role === 'customer' && data.address) {
          data.coordinates = {
            latitude: 12.9716 + (Math.random() - 0.5) * 0.1,
            longitude: 77.5946 + (Math.random() - 0.5) * 0.1,
          }
        }
        response = await apiService.auth.register(data)
      }

      if (response.data.success) {
        // Save auth data
        auth.setAuth(response.data.token, response.data.user)
        setAuth(response.data.user, response.data.token)
        
        // Show success message
        toast.success(
          mode === 'login' 
            ? `Welcome back, ${response.data.user.name}!` 
            : `Account created successfully!`
        )

        // Redirect based on role
        const roleRoutes = {
          admin: '/admin',
          driver: '/driver',
          customer: '/customer',
        }
        
        const redirectPath = roleRoutes[response.data.user.role] || '/'
        
        // Use window.location for force navigation
        window.location.href = redirectPath
      }
    } catch (error) {
      console.error('Auth error:', error)
      setError(
        error.response?.data?.message || 
        `${mode === 'login' ? 'Login' : 'Registration'} failed. Please try again.`
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Name field (Register only) */}
      {mode === 'register' && (
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              className="pl-10"
              {...register('name')}
            />
          </div>
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>
      )}

      {/* Email field */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            className="pl-10"
            {...register('email')}
          />
        </div>
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Password field */}
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            className="pl-10"
            {...register('password')}
          />
        </div>
        {errors.password && (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        )}
      </div>

      {/* Register-only fields */}
      {mode === 'register' && (
        <>
          {/* Phone field */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <Input
                id="phone"
                type="tel"
                placeholder="9876543210"
                className="pl-10"
                {...register('phone')}
              />
            </div>
            {errors.phone && (
              <p className="text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          {/* Role selection */}
          <div className="space-y-2">
            <Label htmlFor="role">Account Type</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setValue('role', value)}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">
                  <div className="flex items-center">
                    <span className="mr-2">🛍️</span>
                    Customer - Track deliveries
                  </div>
                </SelectItem>
                <SelectItem value="driver">
                  <div className="flex items-center">
                    <span className="mr-2">🚚</span>
                    Driver - Deliver packages
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center">
                    <span className="mr-2">👨‍💼</span>
                    Admin - Manage fleet
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Address field (Customer only) */}
          {selectedRole === 'customer' && (
            <div className="space-y-2">
              <Label htmlFor="address">Delivery Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <Input
                  id="address"
                  type="text"
                  placeholder="123 Main St, City"
                  className="pl-10"
                  {...register('address')}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Submit button */}
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {mode === 'login' ? 'Signing in...' : 'Creating account...'}
          </>
        ) : (
          mode === 'login' ? 'Sign In' : 'Create Account'
        )}
      </Button>

      {/* Demo credentials for login */}
      {mode === 'login' && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            Demo Credentials:
          </p>
          <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
            <p>👨‍💼 Admin: admin@walmart.com / admin123</p>
            <p>🚚 Driver: driver@walmart.com / driver123</p>
            <p>🛍️ Customer: customer@walmart.com / customer123</p>
          </div>
        </div>
      )}
    </form>
  )
}
