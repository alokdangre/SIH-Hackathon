// Simple authentication flow test utility
import Cookies from "js-cookie";
import { getStoredUser, setStoredUser, isAuthenticated, clearAuth } from "@/lib/auth";

export const testAuthFlow = () => {
  console.log("🧪 Testing authentication flow...");
  
  // Test 1: Initial state (should be unauthenticated)
  console.log("Test 1 - Initial state:");
  console.log("- isAuthenticated():", isAuthenticated());
  console.log("- getStoredUser():", getStoredUser());
  
  // Test 2: Set mock user and token
  console.log("\nTest 2 - Setting mock auth:");
  const mockUser = {
    id: 1,
    email: "test@example.com",
    name: "Test User",
    role: "farmer" as const,
    kyc_status: "pending" as const,
    created_at: new Date().toISOString()
  };
  
  Cookies.set("access_token", "mock_token_123", { expires: 1 });
  setStoredUser(mockUser);
  
  console.log("- isAuthenticated():", isAuthenticated());
  console.log("- getStoredUser():", getStoredUser());
  
  // Test 3: Clear auth
  console.log("\nTest 3 - Clearing auth:");
  clearAuth();
  console.log("- isAuthenticated():", isAuthenticated());
  console.log("- getStoredUser():", getStoredUser());
  
  console.log("🧪 Authentication flow test completed!");
};
