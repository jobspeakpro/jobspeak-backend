import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const targetDir = args[0] || '.';

function getGitSha() {
    try {
        return execSync('git rev-parse --short HEAD').toString().trim();
    } catch (e) {
        return process.env.RAILWAY_GIT_COMMIT_SHA?.substring(0, 7) || process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'unknown';
    }
}

const buildInfo = {
    gitSha: getGitSha(),
    buildTime: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
};

const outputPath = path.resolve(process.cwd(), targetDir, 'build-info.json');

fs.writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2));
console.log(`[BUILD] Generated backend build-info.json at ${outputPath}`);
console.log(`[BUILD] SHA: ${buildInfo.gitSha} | Time: ${buildInfo.buildTime}`);
