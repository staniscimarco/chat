"use client";

import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function TestPage() {
  const { user, loading } = useAuth();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Test Page</h1>
          
          <div className="space-y-4">
            <div>
              <strong>Loading:</strong> {loading ? "Sì" : "No"}
            </div>
            
            <div>
              <strong>User:</strong> {user ? user.username : "Nessun utente"}
            </div>
            
            <div>
              <strong>Admin:</strong> {user?.isAdmin ? "Sì" : "No"}
            </div>
            
            <div>
              <strong>User ID:</strong> {user?.id || "N/A"}
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <h2 className="font-semibold mb-2">Debug Info:</h2>
            <pre className="text-xs overflow-auto">
              {JSON.stringify({ user, loading }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
} 