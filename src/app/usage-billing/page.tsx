'use client';

import AppLayout from '@/components/AppLayout';
import UsageBillingWorkspace from './components/UsageBillingWorkspace';

export default function UsageBillingPage() {
  return (
    <AppLayout currentPath="/usage-billing">
      <UsageBillingWorkspace />
    </AppLayout>
  );
}
