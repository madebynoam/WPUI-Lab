'use client';

import { useEffect, useState } from 'react';
import { __experimentalStyleProvider as StyleProvider } from '@wordpress/components';
import { ComponentTreeProvider } from '../src/ComponentTreeContext';

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevent hydration mismatch by only rendering StyleProvider on client
  if (!isMounted) {
    return (
      <ComponentTreeProvider>
        {children}
      </ComponentTreeProvider>
    );
  }

  return (
    <StyleProvider document={document}>
      <ComponentTreeProvider>
        {children}
      </ComponentTreeProvider>
    </StyleProvider>
  );
}
