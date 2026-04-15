#!/usr/bin/env node
/**
 * setup-claude-skills.js
 *
 * Ensures .claude/skills points to .agents/skills so Claude Code can discover
 * skills from the canonical location without duplication.
 *
 * On Linux/macOS git creates the real symlink at clone time (mode 120000), so
 * this script is a no-op for those platforms.
 *
 * On Windows, git defaults to core.symlinks=false and writes a text stub
 * instead of a real symlink. This script detects that case and replaces the
 * stub with an NTFS junction, which works for directories without elevated
 * privileges or Developer Mode.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const linkPath = path.join(repoRoot, '.claude', 'skills');
const targetAbsolute = path.join(repoRoot, '.agents', 'skills');
// Relative target keeps the symlink portable if the repo is moved.
const targetRelative = path.join('..', '.agents', 'skills');

function isRealSymlink(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

// Ensure the .claude directory exists.
fs.mkdirSync(path.join(repoRoot, '.claude'), { recursive: true });

if (isRealSymlink(linkPath)) {
  // Already a real symlink (Linux/macOS git checkout, or a previous run of
  // this script on Windows with Developer Mode enabled).
  console.log('.claude/skills is already a symlink — nothing to do.');
  process.exit(0);
}

if (exists(linkPath)) {
  // On Windows with core.symlinks=false git writes a plain text file whose
  // content is the symlink target path. Remove it before creating the junction.
  fs.rmSync(linkPath, { recursive: true, force: true });
}

try {
  // 'junction' is Windows-only and requires no elevated privileges for
  // directories. On other platforms 'dir' or 'file' would be used but this
  // branch is only reached on Windows in practice.
  const symlinkType = process.platform === 'win32' ? 'junction' : 'dir';
  const target = process.platform === 'win32' ? targetAbsolute : targetRelative;
  fs.symlinkSync(target, linkPath, symlinkType);
  console.log(`.claude/skills -> ${target} (${symlinkType})`);
} catch (err) {
  // Non-fatal: degrade gracefully. Claude Code will simply not find the skills
  // via .claude/; they remain fully available in .agents/skills/.
  console.warn(
    `Warning: could not create .claude/skills symlink: ${err.message}`
  );
  console.warn(
    'Claude Code skill discovery from .claude/ will not work on this machine.'
  );
  console.warn('Skills remain available in .agents/skills/ for other agents.');
}
