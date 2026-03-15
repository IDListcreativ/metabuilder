import AppLayout from '@/components/AppLayout';
import TemplatesWorkspace from './components/TemplatesWorkspace';

export default function TemplatesPage() {
  return (
    <AppLayout currentPath="/templates">
      <TemplatesWorkspace />
    </AppLayout>
  );
}
