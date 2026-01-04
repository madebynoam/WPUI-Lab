'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  __experimentalHeading as Heading,
  __experimentalHStack as HStack,
  __experimentalVStack as VStack,
  __experimentalText as Text,
  TextControl,
} from '@wordpress/components';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      router.push(returnTo);
    } else {
      const data = await res.json();
      setError(data.error || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        padding: 24,
      }}
    >
      <Card size="medium" style={{ gridColumn: '5 / span 4' }}>
        <CardHeader isBorderless={false}>
          <Heading level={5}>Login to WP-Designer</Heading>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <TextControl
                label="Automattic Email"
                type="email"
                placeholder="you@automattic.com"
                value={email}
                onChange={(value) => setEmail(value)}
                required
              />
              <TextControl
                label="Team Password"
                type="password"
                value={password}
                onChange={(value) => setPassword(value)}
                required
              />
              {error && (
                <Text style={{ color: '#cc1818' }}>{error}</Text>
              )}
              <HStack spacing={2} justify="flex-end" alignment="center">
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </HStack>
            </VStack>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
