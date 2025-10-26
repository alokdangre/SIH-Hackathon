"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser, isAuthenticated } from "@/lib/auth";
import { User } from "@/lib/types";

export function useAuth(redirectTo?: string) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") {
      return;
    }

    const checkAuth = () => {
      try {
        const authenticated = isAuthenticated();
        const storedUser = getStoredUser();
        
        if (authenticated && storedUser) {
          setUser(storedUser);
          setIsLoading(false);
          setIsChecking(false);
        } else {
          setUser(null);
          setIsLoading(false);
          setIsChecking(false);
          if (redirectTo) {
            router.push(redirectTo);
          }
        }
      } catch (error) {
        setUser(null);
        setIsLoading(false);
        setIsChecking(false);

        if (redirectTo) {
          router.push(redirectTo);
        }
      }
    };

    // Add a small delay to ensure hydration is complete
    const timeoutId = setTimeout(checkAuth, 100);

    return () => clearTimeout(timeoutId);
  }, [router, redirectTo]);

  return {
    user,
    isLoading,
    isChecking,
    isAuthenticated: !!user,
  };
}
