'use client';

import AppLayout from '@/components/AppLayout';
import AccountSettingsWorkspace from './components/AccountSettingsWorkspace';

export default function AccountSettingsPage() {
  return (
    <AppLayout currentPath="/account-settings">
      <AccountSettingsWorkspace />
    </AppLayout>
  );
}
