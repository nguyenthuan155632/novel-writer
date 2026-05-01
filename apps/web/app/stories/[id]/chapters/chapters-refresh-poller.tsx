'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ChaptersRefreshPollerProps {
  hasGenerating: boolean;
}

export function ChaptersRefreshPoller({ hasGenerating }: ChaptersRefreshPollerProps) {
  const router = useRouter();

  useEffect(() => {
    if (!hasGenerating) return;

    const id = setInterval(() => {
      router.refresh();
    }, 5000);

    return () => clearInterval(id);
  }, [hasGenerating, router]);

  return null;
}
