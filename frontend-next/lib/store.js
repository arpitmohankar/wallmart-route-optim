import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// Auth store - manages user authentication state
export const useAuthStore = create(
  devtools(
    persist(
      (set, get) => ({
        // State
        user: null,
        isAuthenticated: false,
        isLoading: true,
        
        // Actions
        setAuth: (user, token) => {
          set({ 
            user, 
            isAuthenticated: true,
            isLoading: false 
          })
        },
        
        clearAuth: () => {
          set({ 
            user: null, 
            isAuthenticated: false,
            isLoading: false 
          })
        },
        
        setLoading: (isLoading) => set({ isLoading }),
        
        // Getters
        getUserRole: () => get().user?.role,
        isDriver: () => get().user?.role === 'driver',
        isCustomer: () => get().user?.role === 'customer',
        isAdmin: () => get().user?.role === 'admin',
      }),
      {
        name: 'auth-store', // localStorage key
        partialize: (state) => ({ user: state.user }), // Only persist user data
      }
    ),
    {
      name: 'AuthStore', // Redux DevTools name
    }
  )
)

// App store - manages global app state
export const useAppStore = create(
  devtools((set, get) => ({
    // Theme state
    isDarkMode: false,
    toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
    
    // Loading states
    isPageLoading: false,
    setPageLoading: (loading) => set({ isPageLoading: loading }),
    
    // Route refresh counter (for driver's main feature)
    refreshCount: 0,
    incrementRefreshCount: () => set((state) => ({ 
      refreshCount: state.refreshCount + 1 
    })),
    
    // Real-time connection status
    socketConnected: false,
    setSocketConnected: (connected) => set({ socketConnected: connected }),
  })),
  {
    name: 'AppStore',
  }
)
