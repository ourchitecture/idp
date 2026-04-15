#!/usr/bin/env node
/**
 * setup-claude-skills.js
 *
 * Ensures .claude/skills points to .agents/skills so Claude Code can discover
 * skills from the canonical location without duplication.
 *
 * .claude/skills is NOT tracked by git (see .gitignore). This script is the
 * sole mechanism that creates the link on every platform, so that git never
 * sees a junction or symlink type-change on Windows.
 *
 * Platform behaviour:
 *   Linux / macOS  — creates a real directory symlink (no privileges needed).
 *   Windows        — creates an NTFS junction, which works for directories
 *                    without Developer Mode or elevated privileges. A real
 *                    symlink is attempted first if core.symlinks=true; the
 *                    junction is the fallback.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const linkPath = path.join(repoRoot, '.claude', 'skills');
// Absolute target for Windows junctions (junctions require absolute paths).
const targetAbsolute = path.join(repoRoot, '.agents', 'skills');
// Relative target keeps the symlink portable when the repo moves.
const targetRelative = path.join('..', '.agents', 'skills');

function isRealSymlink(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

function pathExists(p) {
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
  console.log('.claude/skills is already a symlink — nothing to do.');
  process.exit(0);
}

// Remove any stale text stub or directory (e.g. a previous failed run).
if (pathExists(linkPath)) {
  fs.rmSync(linkPath, { recursive: true, force: true });
}

if (process.platform === 'win32') {
  // Try a real symlink first (requires Developer Mode or admin). If that fails,
  // fall back to an NTFS junction, which needs no special privileges.
  try {
    fs.symlinkSync(targetAbsolute, linkPath, 'dir');
    console.log(`.claude/skills -> ${targetAbsolute} (symlink)`);
  } catch {
    try {
      fs.symlinkSync(targetAbsolute, linkPath, 'junction');
      console.log(`.claude/skills -> ${targetAbsolute} (junction)`);
    } catch (err) {
      console.warn(
        `Warning: could not create .claude/skills link: ${err.message}`
      );
      console.warn(
        'Claude Code skill discovery from .claude/ will not work on this machine.'
      );
      console.warn(
        'Skills remain available in .agents/skills/ for other agents.'
      );
    }
  }
} else {
  try {
    fs.symlinkSync(targetRelative, linkPath, 'dir');
    console.log(`.claude/skills -> ${targetRelative} (symlink)`);
  } catch (err) {
    console.warn(
      `Warning: could not create .claude/skills symlink: ${err.message}`
    );
    console.warn(
      'Claude Code skill discovery from .claude/ will not work on this machine.'
    );
    console.warn(
      'Skills remain available in .agents/skills/ for other agents.'
    );
  }
}
