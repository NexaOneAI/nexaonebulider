import { aiService } from '../ai/aiService';
import { exportProjectZip } from './zipExport';
import type { GeneratedFile } from '../projects/projectTypes';

export const builderService = {
  generateApp: aiService.generateApp.bind(aiService),
  editApp: aiService.editApp.bind(aiService),
  exportZip: exportProjectZip,

  getFileLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
      tsx: 'tsx', ts: 'typescript', jsx: 'jsx', js: 'javascript',
      css: 'css', html: 'html', json: 'json', md: 'markdown',
    };
    return map[ext] || 'text';
  },

  buildFileTree(files: GeneratedFile[]): Record<string, GeneratedFile[]> {
    const tree: Record<string, GeneratedFile[]> = {};
    files.forEach((file) => {
      const dir = file.path.includes('/') ? file.path.split('/').slice(0, -1).join('/') : '.';
      if (!tree[dir]) tree[dir] = [];
      tree[dir].push(file);
    });
    return tree;
  },
};
