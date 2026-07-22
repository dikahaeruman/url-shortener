'use client';

import { useState } from 'react';
import UrlForm from './UrlForm';
import RecentUrls from './RecentUrls';

export default function UrlShortenerSection() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUrlCreated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      <UrlForm onUrlCreated={handleUrlCreated} />
      <RecentUrls refreshTrigger={refreshKey} />
    </>
  );
}
