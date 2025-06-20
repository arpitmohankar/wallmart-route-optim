'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

export default function RefreshButton({
  onRefresh,
  isLoading = false,
  refreshCount = 0,
  disabled = false,
  className,
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      className={cn("fixed bottom-20 right-4 md:bottom-8 md:right-8 z-50", className)}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Button
        size="lg"
        onClick={onRefresh}
        disabled={disabled || isLoading}
        className={cn(
          "h-14 w-14 rounded-full shadow-lg relative",
          "bg-gradient-to-br from-blue-600 to-purple-600",
          "hover:from-blue-700 hover:to-purple-700",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <RefreshCw 
          className={cn(
            "h-6 w-6",
            isLoading && "animate-spin"
          )} 
        />
        
        {refreshCount > 0 && (
          <Badge 
            className="absolute -top-2 -right-2 h-6 w-6 p-0 flex items-center justify-center"
            variant="destructive"
          >
            {refreshCount}
          </Badge>
        )}
      </Button>
      
      {/* Tooltip */}
      {isHovered && !disabled && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute right-full mr-2 top-1/2 -translate-y-1/2"
        >
          <div className="bg-popover text-popover-foreground px-3 py-1.5 rounded-md shadow-md whitespace-nowrap text-sm">
            {isLoading ? 'Optimizing route...' : 'Refresh route'}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
