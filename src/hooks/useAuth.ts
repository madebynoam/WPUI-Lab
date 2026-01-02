import { useState, useEffect } from 'react';

export function useAuth() {
  const [email, setEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        setEmail(data?.email || null);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  return { email, isLoading };
}
