import { useAuth as useAuthContext } from '@/contexts/AuthContext';

export function useAuth() {
  const auth = useAuthContext();
  
  // Add additional utility functions
  const isAuthenticated = !!auth.user;
  const isAdmin = auth.user?.isAdmin || false;
  
  return {
    ...auth,
    isAuthenticated,
    isAdmin,
  };
} 