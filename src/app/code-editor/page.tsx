import AppLayout from '@/components/AppLayout';
import CodeEditorWorkspace from './components/CodeEditorWorkspace';

export default function CodeEditorPage() {
  return (
    <AppLayout currentPath="/code-editor">
      <CodeEditorWorkspace />
    </AppLayout>
  );
}