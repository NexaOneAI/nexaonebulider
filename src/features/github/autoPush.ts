/**
 * Shared helper to auto-push to GitHub if the project has auto_push enabled.
 * Used by both AI generations and manual saves.
 */
import { githubService } from './githubService';
import { useGithubStore } from './githubStore';

export async function autoPushToGithub(
  projectId: string,
  files: { path: string; content: string }[],
  versionId: string,
  message: string,
): Promise<void> {
  const { refresh, setPushing } = useGithubStore.getState();
  const status =
    useGithubStore.getState().byProject[projectId] ??
    (await refresh(projectId).catch(() => null));
  if (!status?.repo || !status.repo.auto_push) return;
  setPushing(projectId, true);
  try {
    await githubService.push({ projectId, files, message, versionId });
    await refresh(projectId).catch(() => {});
  } finally {
    setPushing(projectId, false);
  }
}
