import AppLayout from '@/components/AppLayout';
import AIGeneratorWorkspace from './components/AIGeneratorWorkspace';

export default function AICodeGeneratorPage() {
  return (
    <AppLayout currentPath="/ai-code-generator">
      <AIGeneratorWorkspace />
    </AppLayout>
  );
}