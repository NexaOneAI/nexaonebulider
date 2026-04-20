/**
 * github-sync: handles all GitHub repo operations for a project.
 *
 * Actions (POST body):
 *   - { action: "status" }
 *       → { connected: bool, github_login?, avatar_url?, repo?: {...} }
 *   - { action: "disconnect" } → revokes the token row
 *   - { action: "create_repo", projectId, name, private?: bool, files }
 *       → creates a new GitHub repo, links it, pushes scaffold + files.
 *   - { action: "link_repo", projectId, owner, repo, branch?, files }
 *       → links an existing repo and pushes current files.
 *   - { action: "push", projectId, files, message? }
 *       → pushes current files to the linked repo as a single commit.
 *   - { action: "set_auto_push", projectId, auto_push: bool }
 *   - { action: "unlink", projectId } → removes the repo link.
 *
 * Always returns JSON with a stable shape.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { requireUser, getAdminClient } from '../_shared/auth.ts';
import { buildScaffoldFiles, slugify } from '../_shared/projectScaffold.ts';
import {
  ghCreateRepo,
  ghGetRepo,
  ghGetRef,
  ghGetCommit,
  ghCreateBlob,
  ghCreateTree,
  ghCreateCommit,
  ghUpdateRef,
  GithubError,
} from '../_shared/github.ts';

interface GeneratedFile {
  path: string;
  content: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { user, error: authError } = await requireUser(req);
    if (authError || !user) return jsonResponse({ error: authError || 'No autorizado' }, 401);

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = (body.action as string) || '';
    const admin = getAdminClient();

    // ---- status ----
    if (action === 'status') {
      const { data: token } = await admin
        .from('user_github_tokens')
        .select('github_login, github_avatar_url, scope')
        .eq('user_id', user.id)
        .maybeSingle();

      const projectId = body.projectId as string | undefined;
      let repo = null;
      if (projectId) {
        const { data } = await admin
          .from('project_github_repos')
          .select('*')
          .eq('project_id', projectId)
          .eq('user_id', user.id)
          .maybeSingle();
        repo = data;
      }

      return jsonResponse({
        connected: !!token,
        github_login: token?.github_login ?? null,
        avatar_url: token?.github_avatar_url ?? null,
        scope: token?.scope ?? null,
        repo,
      });
    }

    // All remaining actions need a token.
    const { data: tokenRow, error: tokenError } = await admin
      .from('user_github_tokens')
      .select('access_token, github_login')
      .eq('user_id', user.id)
      .maybeSingle();

    if (action === 'disconnect') {
      await admin.from('user_github_tokens').delete().eq('user_id', user.id);
      return jsonResponse({ ok: true });
    }

    if (tokenError || !tokenRow?.access_token) {
      return jsonResponse(
        { error: 'GitHub no conectado. Conecta tu cuenta primero.' },
        400,
      );
    }
    const ghToken = tokenRow.access_token;
    const ghLogin = tokenRow.github_login;

    // ---- helpers shared by create/link/push ----
    const ensureProjectOwnership = async (projectId: string) => {
      const { data, error } = await admin
        .from('projects')
        .select('id, user_id, name')
        .eq('id', projectId)
        .maybeSingle();
      if (error || !data || data.user_id !== user.id) {
        throw new Error('Proyecto no encontrado o sin acceso');
      }
      return data;
    };

    const pushFilesToRepo = async (
      owner: string,
      repo: string,
      branch: string,
      files: GeneratedFile[],
      message: string,
    ): Promise<{ sha: string }> => {
      // 1. Get current branch ref + parent commit + base tree
      let parentSha: string | null = null;
      let baseTree: string | null = null;
      try {
        const ref = await ghGetRef(ghToken, owner, repo, branch);
        parentSha = ref.object.sha;
        const parentCommit = await ghGetCommit(ghToken, owner, repo, parentSha);
        baseTree = parentCommit.tree.sha;
      } catch (e) {
        if (e instanceof GithubError && e.status === 404) {
          // Empty repo — first commit
          parentSha = null;
          baseTree = null;
        } else {
          throw e;
        }
      }

      // 2. Create blobs in parallel (chunked to avoid rate limits)
      const CHUNK = 8;
      const blobs: Array<{ path: string; sha: string }> = [];
      for (let i = 0; i < files.length; i += CHUNK) {
        const slice = files.slice(i, i + CHUNK);
        const created = await Promise.all(
          slice.map(async (f) => {
            const blob = await ghCreateBlob(ghToken, owner, repo, f.content, 'utf-8');
            return { path: f.path, sha: blob.sha };
          }),
        );
        blobs.push(...created);
      }

      // 3. Create tree (use base_tree only when not creating from scratch)
      const tree = await ghCreateTree(
        ghToken,
        owner,
        repo,
        baseTree,
        blobs.map((b) => ({
          path: b.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: b.sha,
        })),
      );

      // 4. Create commit
      const commit = await ghCreateCommit(
        ghToken,
        owner,
        repo,
        message,
        tree.sha,
        parentSha ? [parentSha] : [],
      );

      // 5. Update branch ref (force=true to handle the auto-init initial commit
      // when we're pushing a fresh tree from the scaffold).
      await ghUpdateRef(ghToken, owner, repo, branch, commit.sha, true);

      return { sha: commit.sha };
    };

    const buildFullFileList = (
      projectName: string,
      genFiles: GeneratedFile[],
    ): GeneratedFile[] => {
      const present = new Set(genFiles.map((f) => f.path));
      const scaffold = buildScaffoldFiles(projectName, present);
      return [...genFiles, ...scaffold];
    };

    // ---- create_repo ----
    if (action === 'create_repo') {
      const projectId = body.projectId as string;
      const name = (body.name as string) || '';
      const isPrivate = body.private !== false;
      const files = (body.files as GeneratedFile[]) || [];
      if (!projectId || !name || files.length === 0) {
        return jsonResponse({ error: 'projectId, name y files son requeridos' }, 400);
      }
      const project = await ensureProjectOwnership(projectId);

      const repoName = slugify(name) || slugify(project.name) || 'nexa-app';

      let createdRepo;
      try {
        createdRepo = await ghCreateRepo(ghToken, {
          name: repoName,
          description: `Generated with Nexa One Builder — ${project.name}`,
          private: isPrivate,
          auto_init: true,
        });
      } catch (e) {
        const msg =
          e instanceof GithubError && e.status === 422
            ? `Ya existe un repo "${repoName}" en tu cuenta. Elige otro nombre o linkéalo.`
            : e instanceof Error
              ? e.message
              : 'No se pudo crear el repo';
        return jsonResponse({ error: msg }, 400);
      }

      const branch = createdRepo.default_branch || 'main';
      const fullFiles = buildFullFileList(project.name, files);
      const { sha } = await pushFilesToRepo(
        createdRepo.owner.login,
        createdRepo.name,
        branch,
        fullFiles,
        `Initial commit from Nexa One Builder (${fullFiles.length} files)`,
      );

      const { data: linked } = await admin
        .from('project_github_repos')
        .upsert(
          {
            project_id: projectId,
            user_id: user.id,
            owner: createdRepo.owner.login,
            repo: createdRepo.name,
            branch,
            repo_id: createdRepo.id,
            html_url: createdRepo.html_url,
            is_private: createdRepo.private,
            auto_push: true,
            last_pushed_sha: sha,
            last_pushed_at: new Date().toISOString(),
            last_push_error: null,
          },
          { onConflict: 'project_id' },
        )
        .select()
        .single();

      return jsonResponse({ ok: true, repo: linked, commit_sha: sha });
    }

    // ---- link_repo ----
    if (action === 'link_repo') {
      const projectId = body.projectId as string;
      const owner = (body.owner as string) || ghLogin;
      const repoName = body.repo as string;
      const requestedBranch = (body.branch as string) || '';
      const files = (body.files as GeneratedFile[]) || [];
      if (!projectId || !repoName) {
        return jsonResponse({ error: 'projectId y repo son requeridos' }, 400);
      }
      const project = await ensureProjectOwnership(projectId);

      let info;
      try {
        info = await ghGetRepo(ghToken, owner, repoName);
      } catch (e) {
        const msg =
          e instanceof GithubError && e.status === 404
            ? `Repo ${owner}/${repoName} no encontrado o sin acceso`
            : e instanceof Error
              ? e.message
              : 'No se pudo leer el repo';
        return jsonResponse({ error: msg }, 400);
      }

      const branch = requestedBranch || info.default_branch || 'main';

      let pushedSha: string | null = null;
      if (files.length > 0) {
        const fullFiles = buildFullFileList(project.name, files);
        const { sha } = await pushFilesToRepo(
          info.owner.login,
          info.name,
          branch,
          fullFiles,
          `Sync from Nexa One Builder (${fullFiles.length} files)`,
        );
        pushedSha = sha;
      }

      const { data: linked } = await admin
        .from('project_github_repos')
        .upsert(
          {
            project_id: projectId,
            user_id: user.id,
            owner: info.owner.login,
            repo: info.name,
            branch,
            repo_id: info.id,
            html_url: info.html_url,
            is_private: info.private,
            auto_push: true,
            last_pushed_sha: pushedSha,
            last_pushed_at: pushedSha ? new Date().toISOString() : null,
            last_push_error: null,
          },
          { onConflict: 'project_id' },
        )
        .select()
        .single();

      return jsonResponse({ ok: true, repo: linked, commit_sha: pushedSha });
    }

    // ---- push (manual or auto) ----
    if (action === 'push') {
      const projectId = body.projectId as string;
      const files = (body.files as GeneratedFile[]) || [];
      const message = (body.message as string) || 'Update from Nexa One Builder';
      const versionId = (body.versionId as string) || null;
      if (!projectId || files.length === 0) {
        return jsonResponse({ error: 'projectId y files requeridos' }, 400);
      }
      const project = await ensureProjectOwnership(projectId);
      const { data: link } = await admin
        .from('project_github_repos')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!link) {
        return jsonResponse({ error: 'Proyecto no vinculado a un repo' }, 400);
      }

      try {
        const fullFiles = buildFullFileList(project.name, files);
        const { sha } = await pushFilesToRepo(
          link.owner,
          link.repo,
          link.branch,
          fullFiles,
          message,
        );
        await admin
          .from('project_github_repos')
          .update({
            last_pushed_sha: sha,
            last_pushed_at: new Date().toISOString(),
            last_pushed_version_id: versionId,
            last_push_error: null,
          })
          .eq('project_id', projectId);
        return jsonResponse({ ok: true, commit_sha: sha, html_url: link.html_url });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Push falló';
        await admin
          .from('project_github_repos')
          .update({ last_push_error: msg.slice(0, 500) })
          .eq('project_id', projectId);
        return jsonResponse({ error: msg }, 500);
      }
    }

    // ---- set_auto_push ----
    if (action === 'set_auto_push') {
      const projectId = body.projectId as string;
      const auto_push = body.auto_push !== false;
      if (!projectId) return jsonResponse({ error: 'projectId requerido' }, 400);
      await admin
        .from('project_github_repos')
        .update({ auto_push })
        .eq('project_id', projectId)
        .eq('user_id', user.id);
      return jsonResponse({ ok: true });
    }

    // ---- unlink ----
    if (action === 'unlink') {
      const projectId = body.projectId as string;
      if (!projectId) return jsonResponse({ error: 'projectId requerido' }, 400);
      await admin
        .from('project_github_repos')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', user.id);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ error: `Acción desconocida: ${action}` }, 400);
  } catch (e) {
    console.error('github-sync error', e);
    return jsonResponse(
      { error: e instanceof Error ? e.message : 'Error desconocido' },
      500,
    );
  }
});
