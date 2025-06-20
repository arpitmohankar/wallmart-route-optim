'use client'

import { useState } from 'react'
import { LoginForm } from '@/components/auth/login-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Package } from 'lucide-react'

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState('login')

  return (
    <div className="container max-w-md mx-auto px-4 py-8">
      {/* Logo and Title */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Package className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Walmart Route Optimizer
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Smart delivery management system
        </p>
      </div>

      {/* Auth Card */}
      <Card className="shadow-2xl border-0">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl text-center">Welcome</CardTitle>
          <CardDescription className="text-center">
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <LoginForm mode="login" />
            </TabsContent>
            
            <TabsContent value="register">
              <LoginForm mode="register" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Footer */}
      <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-8">
        By continuing, you agree to our Terms of Service and Privacy Policy
      </p>
    </div>
  )
}
