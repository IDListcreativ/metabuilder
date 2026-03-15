import AppLayout from '@/components/AppLayout';
import ExportShareWorkspace from './components/ExportShareWorkspace';

export default function ExportSharePage() {
  return (
    <AppLayout currentPath="/export-share">
      <ExportShareWorkspace />
    </AppLayout>
  );
}