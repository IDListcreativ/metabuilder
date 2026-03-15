'use client';

import AppLayout from '@/components/AppLayout';
import NotionWorkspace from './components/NotionWorkspace';

export default function NotionIntegrationPage() {
  return (
    <AppLayout currentPath="/notion-integration">
      <NotionWorkspace />
    </AppLayout>
  );
}
