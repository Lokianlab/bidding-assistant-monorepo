import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export async function uploadToGitHubRelease(
  backupFilePath: string,
  tagName: string
) {
  const owner = 'Lokianlab';
  const repo = 'bidding-assistant-monorepo';
  const fileName = path.basename(backupFilePath);

  try {
    console.log(`📤 Uploading to GitHub Release: ${tagName}/${fileName}`);

    // 建立或獲取 Release
    let release;
    try {
      const existingRelease = await octokit.repos.getReleaseByTag({
        owner,
        repo,
        tag: tagName,
      });
      release = existingRelease.data;
    } catch {
      // Release 不存在，建立新的
      release = (
        await octokit.repos.createRelease({
          owner,
          repo,
          tag_name: tagName,
          name: `Backup ${tagName}`,
          body: `Automated backup - ${new Date().toISOString()}`,
          draft: false,
        })
      ).data;
    }

    // 上傳檔案到 Release
    const fileContent = fs.readFileSync(backupFilePath);

    await octokit.repos.uploadReleaseAsset({
      owner,
      repo,
      release_id: release.id,
      name: fileName,
      data: fileContent as unknown as string,
    });

    console.log(`✅ Uploaded to GitHub Release: ${tagName}/${fileName}`);

    // 清理舊備份（保留最新 10 個）
    await cleanOldReleases(10);

    return release.upload_url;
  } catch (error) {
    console.error('❌ GitHub upload failed:', error);
    throw error;
  }
}

async function cleanOldReleases(keepCount: number) {
  try {
    const releases = await octokit.repos.listReleases({
      owner: 'Lokianlab',
      repo: 'bidding-assistant-monorepo',
    });

    const backupReleases = releases.data
      .filter((r) => r.name?.includes('Backup'))
      .sort(
        (a, b) =>
          new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
      );

    for (let i = keepCount; i < backupReleases.length; i++) {
      await octokit.repos.deleteRelease({
        owner: 'Lokianlab',
        repo: 'bidding-assistant-monorepo',
        release_id: backupReleases[i].id,
      });
      console.log(`🗑️  Deleted old release: ${backupReleases[i].tag_name}`);
    }
  } catch (error) {
    console.error('⚠️  Cleanup failed (non-critical):', error);
  }
}
