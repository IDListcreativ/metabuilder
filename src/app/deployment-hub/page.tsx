import AppLayout from '@/components/AppLayout';
import DeploymentHubWorkspace from './components/DeploymentHubWorkspace';

export default function DeploymentHubPage() {
  return (
    <AppLayout currentPath="/deployment-hub">
      <DeploymentHubWorkspace />
    </AppLayout>
  );
}