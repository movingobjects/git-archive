#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve('./bundles');

function loadUrls(filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`Repos file not found: ${resolved}`);
    process.exit(1);
  }
  return fs.readFileSync(resolved, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

const gitFile = process.argv[2] || './repos-git.txt';
const svnFile = process.argv[3] || './repos-svn.txt';

const repos = [
  ...loadUrls(gitFile).map(url => ({ url, name: path.basename(url, '.git'), type: 'git' })),
  ...loadUrls(svnFile).map(url => ({ url, name: url.replace(/\/$/, '').split('/').pop(), type: 'svn' })),
];

function run(cmd, opts = {}) {
  console.log(`  $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}


function cloneGit(url, name) {
  const cloneDir = `${name}.git`;
  if (fs.existsSync(cloneDir)) shellRm(cloneDir);
  run(`git clone --mirror ${url} ${cloneDir}`);
}

function cloneSvn(url, name) {
  const cloneDir = `${name}.git`;
  if (fs.existsSync(cloneDir)) shellRm(cloneDir);

  let needsFlatClone = false;
  try {
    run(`git svn clone --stdlayout ${url} ${cloneDir}`);
    const count = execSync(`git -C ${cloneDir} rev-list --count --all`, { encoding: 'utf8' }).trim();
    const files = execSync(`git -C ${cloneDir} ls-files`, { encoding: 'utf8' }).trim();
    if (count === '0' || files === '') needsFlatClone = true;
  } catch (e) {
    needsFlatClone = true;
  }

  if (needsFlatClone) {
    if (fs.existsSync(cloneDir)) shellRm(cloneDir);
    run(`git svn clone ${url} ${cloneDir}`);
  }
}

function bundle(name) {
  const cloneDir = `${name}.git`;
  const bundleFile = `${name}.bundle`;
  run(`git -C ${cloneDir} bundle create ../${bundleFile} --all`);
}

function shellRm(dirPath) {
  execSync(`rm -rf ${JSON.stringify(dirPath)}`);
}

function cleanup(name) {
  const cloneDir = `${name}.git`;
  shellRm(cloneDir);
  console.log(`  Removed ${cloneDir}`);
}

function moveBundle(name) {
  const bundleFile = `${name}.bundle`;
  const dest = path.join(OUTPUT_DIR, bundleFile);
  fs.renameSync(bundleFile, dest);
  console.log(`  Moved ${bundleFile} -> ${dest}`);
}

async function main() {
  if (repos.length === 0) {
    console.error(`No repos found in ${reposFile}.`);
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const workDir = path.resolve('./temp');
  fs.mkdirSync(workDir, { recursive: true });
  process.chdir(workDir);

  let succeeded = 0;
  let failed = 0;

  for (const entry of repos) {
    const { url, name, type } = entry;
    console.log(`\n[${'='.repeat(60)}]`);
    console.log(`Processing: ${name} (${type})`);
    console.log(`${'='.repeat(62)}\n`);

    const bundleDest = path.join(OUTPUT_DIR, `${name}.bundle`);
    if (fs.existsSync(bundleDest)) {
      console.log(`  Already bundled, skipping.`);
      succeeded++;
      continue;
    }

    try {
      if (type === 'git') {
        cloneGit(url, name);
      } else if (type === 'svn') {
        cloneSvn(url, name);
      } else {
        throw new Error(`Unknown repo type: ${type}`);
      }

      bundle(name);
      cleanup(name);
      moveBundle(name);

      console.log(`\n  Done: ${name}.bundle`);
      succeeded++;
    } catch (err) {
      console.error(`\n  FAILED: ${name}`);
      console.error(`  ${err.message}`);
      try { cleanup(name); } catch (_) {}
      failed++;
    }
  }

  process.chdir('..');
  shellRm(workDir);

  console.log(`\n${'='.repeat(62)}`);
  console.log(`Done. ${succeeded} succeeded, ${failed} failed.`);
  console.log(`Bundles are in: ${OUTPUT_DIR}`);
}

main();
