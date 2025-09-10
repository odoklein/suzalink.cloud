import React, { Suspense } from 'react';
import { getServerConversations, getServerUsers } from './lib/server-data';
import MessagerieClient from './client-page';

export default async function MessageriePage() {
  // Server-side data fetching for SSR
  const [initialConversations, initialUsers] = await Promise.all([
    getServerConversations(),
    getServerUsers()
  ]);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MessagerieClient 
        initialConversations={initialConversations}
        initialUsers={initialUsers}
      />
    </Suspense>
  );
}