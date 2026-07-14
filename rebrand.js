// rebrand.js — renames "WEPPY" → "WEPPY+" and updates GitHub URLs to johirshik
// Run: node rebrand.js

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

function patch(filePath, replacements) {
  if (!fs.existsSync(filePath)) { console.warn('  [SKIP] Not found:', filePath); return; }
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = 0;
  for (const [from, to] of replacements) {
    if (typeof from === 'string') {
      while (content.includes(from)) { content = content.replace(from, to); changed++; }
    } else {
      // regex
      const before = content;
      content = content.replace(from, to);
      if (content !== before) changed++;
    }
  }
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`  [OK] ${path.basename(filePath)} — ${changed} replacements`);
}

// ── Shared replacement rules ──────────────────────────────────────────────────
const URL_OLD = 'hope1026/weppy-roblox-mcp';
const URL_NEW = 'johirshik/weppy-roblox-mcp';

const BRAND = [
  // GitHub repo URLs
  ['https://raw.githubusercontent.com/hope1026/weppy-roblox-mcp/main/install.ps1',
   'https://raw.githubusercontent.com/johirshik/weppy-roblox-mcp/main/install.ps1'],
  ['https://raw.githubusercontent.com/hope1026/weppy-roblox-mcp/main/install.sh',
   'https://raw.githubusercontent.com/johirshik/weppy-roblox-mcp/main/install.sh'],
  ['https://api.github.com/repos/hope1026/weppy-roblox-mcp/releases/latest',
   'https://api.github.com/repos/johirshik/weppy-roblox-mcp/releases/latest'],
  ['https://codeload.github.com/hope1026/weppy-roblox-mcp/tar.gz/refs/tags/',
   'https://codeload.github.com/johirshik/weppy-roblox-mcp/tar.gz/refs/tags/'],
  ['https://github.com/hope1026/weppy-roblox-mcp',
   'https://github.com/johirshik/weppy-roblox-mcp'],
  // Displayed name strings (display only, not package/config keys)
  ['WEPPY Installer',          'WEPPY+ Installer'],
  ['WEPPY Roblox Studio Plugin','WEPPY+ Roblox Studio Plugin'],
  ['WEPPY Roblox MCP',         'WEPPY+ Roblox MCP'],
  ['WEPPY AI Toolkit Pro',     'WEPPY+ AI Toolkit Pro'],
  ['WEPPY AI Agent Plugin',    'WEPPY+ AI Agent Plugin'],
  ['WEPPY MCP',                'WEPPY+ MCP'],
  ['install the WEPPY button', 'install the WEPPY+ button'],
  ['the WEPPY button',         'the WEPPY+ button'],
  ['# WEPPY —',                '# WEPPY+ —'],
  ['# WEPPY -',                '# WEPPY+ -'],
  ['\"WEPPY Roblox',           '"WEPPY+ Roblox'],
  ['\"WEPPY AI',               '"WEPPY+ AI'],
  ['\"WEPPY MCP',              '"WEPPY+ MCP'],
  // Header line in installer
  ['Write-Host "WEPPY Installer"',  'Write-Host "WEPPY+ Installer"'],
  ['Write-Host "WEPPY+ Installer"', 'Write-Host "WEPPY+ Installer"'], // idempotent
];

console.log('\n=== WEPPY → WEPPY+ Rebranding ===\n');

// ── install.ps1 ───────────────────────────────────────────────────────────────
patch(path.join(ROOT, 'install.ps1'), [
  ...BRAND,
  // header comment URL fix
  ['irm https://raw.githubusercontent.com/hope1026/weppy-roblox-mcp/main/install.ps1 | iex',
   'irm https://raw.githubusercontent.com/johirshik/weppy-roblox-mcp/main/install.ps1 | iex'],
  // footer next-steps text  
  ['Look for the WEPPY button', 'Look for the WEPPY+ button'],
  ['WEPPY button in the Plugins tab', 'WEPPY+ button in the Plugins tab'],
]);

// ── install.sh ────────────────────────────────────────────────────────────────
patch(path.join(ROOT, 'install.sh'), [
  ...BRAND,
  ['irm https://raw.githubusercontent.com/hope1026/weppy-roblox-mcp/main/install.sh | bash',
   'bash <(curl -fsSL https://raw.githubusercontent.com/johirshik/weppy-roblox-mcp/main/install.sh)'],
  ['curl -fsSL https://raw.githubusercontent.com/hope1026/weppy-roblox-mcp/main/install.sh',
   'curl -fsSL https://raw.githubusercontent.com/johirshik/weppy-roblox-mcp/main/install.sh'],
  ['Look for the WEPPY button', 'Look for the WEPPY+ button'],
]);

// ── README.md ─────────────────────────────────────────────────────────────────
patch(path.join(ROOT, 'README.md'), [
  ...BRAND,
  // Replace install command examples
  ['irm https://raw.githubusercontent.com/hope1026/weppy-roblox-mcp/main/install.ps1 | iex',
   'irm https://raw.githubusercontent.com/johirshik/weppy-roblox-mcp/main/install.ps1 | iex'],
  ['curl -fsSL https://raw.githubusercontent.com/hope1026/weppy-roblox-mcp/main/install.sh | bash',
   'bash <(curl -fsSL https://raw.githubusercontent.com/johirshik/weppy-roblox-mcp/main/install.sh)'],
  // Title line
  ['# WEPPY Roblox MCP', '# WEPPY+ Roblox MCP'],
  ['WEPPY Roblox AI Toolkit', 'WEPPY+ Roblox AI Toolkit'],
]);

// ── uninstall.ps1 ─────────────────────────────────────────────────────────────
patch(path.join(ROOT, 'uninstall.ps1'), [
  ['WEPPY Roblox MCP — Full Uninstall Script', 'WEPPY+ Roblox MCP — Full Uninstall Script'],
  ['WEPPY MCP', 'WEPPY+ MCP'],
]);

console.log('\nAll files updated.\n');
console.log('Install command for users (Windows PowerShell):');
console.log('  irm https://raw.githubusercontent.com/johirshik/weppy-roblox-mcp/main/install.ps1 | iex\n');
console.log('Install command for users (macOS/Linux):');
console.log('  bash <(curl -fsSL https://raw.githubusercontent.com/johirshik/weppy-roblox-mcp/main/install.sh)\n');
