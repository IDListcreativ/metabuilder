'use client';

import { createClient } from '@/lib/supabase/client';

export interface BrandColor {
  name: string;
  hex: string;
}

export interface Typography {
  fontFamily?: string;
  headingFont?: string;
  bodyFont?: string;
  baseFontSize?: string;
}

export interface ComponentPattern {
  name: string;
  description: string;
  example?: string;
}

export interface Decision {
  id: string;
  summary: string;
  reasoning?: string;
  timestamp: string;
}

export interface ProjectMemory {
  id: string;
  appId: string;
  userId: string;
  brandColors: BrandColor[];
  typography: Typography;
  preferredLibraries: string[];
  componentPatterns: ComponentPattern[];
  decisions: Decision[];
  customContext: string;
  createdAt: string;
  updatedAt: string;
}

function mapRow(row: any): ProjectMemory {
  return {
    id: row.id,
    appId: row.app_id,
    userId: row.user_id,
    brandColors: row.brand_colors ?? [],
    typography: row.typography ?? {},
    preferredLibraries: row.preferred_libraries ?? [],
    componentPatterns: row.component_patterns ?? [],
    decisions: row.decisions ?? [],
    customContext: row.custom_context ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const projectMemoryService = {
  async getByAppId(appId: string): Promise<ProjectMemory | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('project_memory')
      .select('*')
      .eq('app_id', appId)
      .single();
    if (error || !data) return null;
    return mapRow(data);
  },

  async upsert(
    appId: string,
    updates: Partial<Omit<ProjectMemory, 'id' | 'appId' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<ProjectMemory | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const payload: Record<string, any> = {
      app_id: appId,
      user_id: user.id,
    };
    if (updates.brandColors !== undefined) payload.brand_colors = updates.brandColors;
    if (updates.typography !== undefined) payload.typography = updates.typography;
    if (updates.preferredLibraries !== undefined) payload.preferred_libraries = updates.preferredLibraries;
    if (updates.componentPatterns !== undefined) payload.component_patterns = updates.componentPatterns;
    if (updates.decisions !== undefined) payload.decisions = updates.decisions;
    if (updates.customContext !== undefined) payload.custom_context = updates.customContext;

    const { data, error } = await supabase
      .from('project_memory')
      .upsert(payload, { onConflict: 'app_id' })
      .select()
      .single();

    if (error) {
      console.error('projectMemoryService.upsert error:', error.message);
      return null;
    }
    return mapRow(data);
  },

  async addDecision(appId: string, summary: string, reasoning?: string): Promise<ProjectMemory | null> {
    const current = await projectMemoryService.getByAppId(appId);
    const decisions: Decision[] = current?.decisions ?? [];
    decisions.push({
      id: String(Date.now()),
      summary,
      reasoning,
      timestamp: new Date().toISOString(),
    });
    return projectMemoryService.upsert(appId, { decisions });
  },

  /**
   * Build the context string injected into every OpenAI prompt.
   * Returns empty string if no memory exists.
   */
  buildContextString(memory: ProjectMemory | null): string {
    if (!memory) return '';

    const parts: string[] = [];

    if (memory.brandColors.length > 0) {
      const colors = memory.brandColors.map(c => `${c.name}: ${c.hex}`).join(', ');
      parts.push(`Brand colors: ${colors}`);
    }

    if (memory.typography.fontFamily || memory.typography.headingFont) {
      const typo = [
        memory.typography.headingFont && `Heading font: ${memory.typography.headingFont}`,
        memory.typography.bodyFont && `Body font: ${memory.typography.bodyFont}`,
        memory.typography.baseFontSize && `Base font size: ${memory.typography.baseFontSize}`,
      ].filter(Boolean).join(', ');
      if (typo) parts.push(`Typography: ${typo}`);
    }

    if (memory.preferredLibraries.length > 0) {
      parts.push(`Preferred libraries: ${memory.preferredLibraries.join(', ')}`);
    }

    if (memory.componentPatterns.length > 0) {
      const patterns = memory.componentPatterns
        .map(p => `- ${p.name}: ${p.description}`)
        .join('\n');
      parts.push(`Component patterns:\n${patterns}`);
    }

    if (memory.decisions.length > 0) {
      const recent = memory.decisions.slice(-5);
      const decisionList = recent
        .map(d => `- ${d.summary}${d.reasoning ? ` (${d.reasoning})` : ''}`)
        .join('\n');
      parts.push(`Past decisions:\n${decisionList}`);
    }

    if (memory.customContext.trim()) {
      parts.push(`Additional context:\n${memory.customContext.trim()}`);
    }

    if (parts.length === 0) return '';

    return `\n\n---\n## Project Memory (always follow these)\n${parts.join('\n\n')}\n---`;
  },
};
