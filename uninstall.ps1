#!/usr/bin/env powershell
<#
.SYNOPSIS
    Uninstall script for WEPPY Roblox MCP — removes ALL traces of the old
    Weppy MCP server and Roblox Studio plugin from the system.

.USAGE
    Run this in PowerShell as Administrator for best results:
        irm https://raw.githubusercontent.com/johirshik/weppy-roblox-mcp/main/uninstall.ps1 | iex
    Or run locally:
        powershell -ExecutionPolicy Bypass -File uninstall.ps1
#>

$ErrorActionPreference = "Continue"

function Write-Ok($msg)   { Write-Host "  + $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  ~ $msg" -ForegroundColor Yellow }
function Write-Step($msg) { Write-Host "`n[ $msg ]" -ForegroundColor Cyan }
function Write-Skip($msg) { Write-Host "  - $msg" -ForegroundColor DarkGray }

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  WEPPY Roblox MCP — Full Uninstall Script       " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# ─── 1. Remove Roblox Studio Plugin ──────────────────────────────────────────
Write-Step "Removing Roblox Studio Plugin"
$pluginPaths = @(
    (Join-Path $env:LOCALAPPDATA "Roblox\Plugins\WeppyRobloxMCP.rbxm"),
    (Join-Path $env:USERPROFILE "Documents\Roblox\Plugins\WeppyRobloxMCP.rbxm"),
    (Join-Path $env:USERPROFILE "AppData\Local\Roblox\Plugins\WeppyRobloxMCP.rbxm")
)

$foundPlugin = $false
foreach ($p in $pluginPaths) {
    if (Test-Path $p) {
        Remove-Item -Path $p -Force
        Write-Ok "Removed plugin: $p"
        $foundPlugin = $true
    }
}
if (-not $foundPlugin) { Write-Skip "No plugin file found (already removed or never installed)" }

# ─── 2. Remove WEPPY app data ────────────────────────────────────────────────
Write-Step "Removing WEPPY app data (license cache, logs, device ID)"
$appDataDirs = @(
    (Join-Path $env:LOCALAPPDATA "weppy-roblox-mcp"),
    (Join-Path $env:APPDATA "weppy-roblox-mcp"),
    (Join-Path $env:USERPROFILE ".weppy-roblox-mcp"),
    (Join-Path $env:TEMP "weppy-roblox-mcp")
)
foreach ($d in $appDataDirs) {
    if (Test-Path $d) {
        Remove-Item -Recurse -Force -Path $d
        Write-Ok "Removed app data dir: $d"
    } else {
        Write-Skip "Not found: $d"
    }
}

# ─── 3. Remove npx / npm package cache ───────────────────────────────────────
Write-Step "Clearing npx cache for @weppy/roblox-mcp"
try {
    $npxCacheBase = Join-Path $env:LOCALAPPDATA "npm-cache\_npx"
    if (Test-Path $npxCacheBase) {
        $dirs = Get-ChildItem -Path $npxCacheBase -Directory -Recurse -ErrorAction SilentlyContinue |
                Where-Object { (Test-Path (Join-Path $_.FullName "node_modules\@weppy\roblox-mcp")) }
        foreach ($d in $dirs) {
            Remove-Item -Recurse -Force -Path $d.FullName
            Write-Ok "Cleared npx cache: $($d.FullName)"
        }
        if ($dirs.Count -eq 0) { Write-Skip "No npx cache entries for @weppy/roblox-mcp found" }
    } else {
        Write-Skip "npx cache directory not found"
    }
} catch {
    Write-Warn "Could not clear npx cache: $_"
}

# ─── 4. Remove MCP server config from AI apps ────────────────────────────────
Write-Step "Removing weppy-roblox-mcp from AI app MCP configs"

$mcpConfigs = @(
    # Antigravity / Gemini
    (Join-Path $env:USERPROFILE ".gemini\antigravity-ide\mcp_config.json"),
    (Join-Path $env:USERPROFILE ".gemini\antigravity\mcp_config.json"),
    (Join-Path $env:USERPROFILE ".gemini\config\mcp_config.json"),
    # Claude Code
    (Join-Path $env:USERPROFILE ".claude\claude_desktop_config.json"),
    (Join-Path $env:APPDATA "Claude\claude_desktop_config.json"),
    # Codex CLI
    (Join-Path $env:USERPROFILE ".codex\config.yaml"),
    # VS Code / Cline / Cursor / Windsurf
    (Join-Path $env:APPDATA "Code\User\settings.json"),
    (Join-Path $env:APPDATA "Cursor\User\settings.json"),
    (Join-Path $env:APPDATA "Windsurf\User\settings.json")
)

foreach ($cfg in $mcpConfigs) {
    if (-not (Test-Path $cfg)) {
        Write-Skip "Not found: $cfg"
        continue
    }
    try {
        $raw = Get-Content -Path $cfg -Raw
        if ($raw -notmatch "weppy-roblox-mcp") {
            Write-Skip "No weppy entry in: $cfg"
            continue
        }

        # JSON config files
        if ($cfg.EndsWith(".json")) {
            $backup = $cfg + ".weppy-uninstall-bak"
            Copy-Item $cfg $backup
            $env:WEPPY_UNINSTALL_CFG = $cfg
            node --input-type=commonjs -e @"
const fs = require('fs');
const path = process.env.WEPPY_UNINSTALL_CFG;
let config = {};
try { config = JSON.parse(fs.readFileSync(path, 'utf8')); } catch {}

// Remove from top-level and mcpServers
delete config['weppy-roblox-mcp'];
if (config.mcpServers && config.mcpServers['weppy-roblox-mcp']) {
  delete config.mcpServers['weppy-roblox-mcp'];
}
// Remove from mcp.servers (VS Code style)
if (config.mcp && config.mcp.servers && config.mcp.servers['weppy-roblox-mcp']) {
  delete config.mcp.servers['weppy-roblox-mcp'];
}

fs.writeFileSync(path, JSON.stringify(config, null, 2) + '\n');
"@
            Remove-Item Env:\WEPPY_UNINSTALL_CFG -ErrorAction SilentlyContinue
            if ($LASTEXITCODE -eq 0) {
                Write-Ok "Cleaned: $cfg  (backup: $backup)"
            } else {
                Write-Warn "Failed to clean: $cfg"
            }
        } else {
            Write-Warn "Non-JSON config skipped (manual edit needed): $cfg"
        }
    } catch {
        Write-Warn "Error processing $cfg`: $_"
    }
}

# ─── 5. Remove AI Agent Plugin (Antigravity / Claude Code / Codex) ───────────
Write-Step "Removing WEPPY AI Agent Plugin from AI tools"
$pluginDirs = @(
    (Join-Path $env:USERPROFILE ".gemini\config\plugins\weppy-roblox-mcp"),
    (Join-Path $env:USERPROFILE ".gemini\antigravity-ide\plugins\weppy-roblox-mcp"),
    (Join-Path $env:USERPROFILE ".claude\plugins\weppy-roblox-mcp"),
    (Join-Path $env:USERPROFILE ".codex\plugins\weppy-roblox-mcp")
)
foreach ($d in $pluginDirs) {
    if (Test-Path $d) {
        Remove-Item -Recurse -Force -Path $d
        Write-Ok "Removed plugin dir: $d"
    } else {
        Write-Skip "Not found: $d"
    }
}

# ─── 6. Remove install log files ─────────────────────────────────────────────
Write-Step "Removing WEPPY install log files from TEMP"
$logs = Get-Item (Join-Path ([System.IO.Path]::GetTempPath()) "weppy-install-*.log") -ErrorAction SilentlyContinue
foreach ($log in $logs) {
    Remove-Item -Force -Path $log.FullName
    Write-Ok "Removed log: $($log.FullName)"
}
if (-not $logs) { Write-Skip "No install log files found" }

# ─── Done ─────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=================================================" -ForegroundColor Green
Write-Host "  Uninstall complete!                            " -ForegroundColor Green
Write-Host "  All WEPPY MCP files and configs have been      " -ForegroundColor Green
Write-Host "  removed from this machine.                     " -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""
