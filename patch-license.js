// patch-license.js
// Run with: node patch-license.js
// Patches package/dist/index.js to replace Weppy license verification
// with your own KeyAuth server.

const fs = require('fs');
const path = require('path');

const distFile = path.join(__dirname, 'package', 'dist', 'index.js');
const backupFile = distFile + '.bak';

console.log('Reading dist/index.js ...');
let content = fs.readFileSync(distFile, 'utf8');
const originalLength = content.length;

// ─── 1. Replace the two hardcoded fallback URLs ───────────────────────────────

const old1 = '"https://roblox-license-api.hope841026.workers.dev",licenseProjectId:e.LICENSE_PROJECT_ID||"roblox-mcp"';
const new1 = '"https://licenseauth.cloud/api/1.3/",licenseProjectId:e.LICENSE_PROJECT_ID||"mcp"';
if (content.includes(old1)) {
  content = content.replace(old1, new1);
  console.log('  [OK] Patched config default URL (occurrence 1)');
} else {
  console.warn('  [WARN] Could not find config default URL (occurrence 1) — may already be patched');
}

const old2 = '"https://roblox-license-api.hope841026.workers.dev",projectId:e.licenseProjectId||"roblox-mcp"';
const new2 = '"https://licenseauth.cloud/api/1.3/",projectId:e.licenseProjectId||"mcp"';
if (content.includes(old2)) {
  content = content.replace(old2, new2);
  console.log('  [OK] Patched N_ constructor default URL (occurrence 2)');
} else {
  console.warn('  [WARN] Could not find N_ constructor default URL (occurrence 2) — may already be patched');
}

// ─── 2. Replace the activate() and refresh() methods in class N_ ─────────────
// Original methods call bearerRequest() against the old REST API.
// We replace with a KeyAuth-compatible implementation using URLSearchParams.

const oldActivate = `async activate(e){let n=e.provider.trim().toLowerCase();if(!n)throw new Error("provider is required");let i={licenseKey:e.licenseKey,mcpInstanceId:e.mcpInstanceId},r=e.productRef??e.productPermalink;r&&(i.productRef=r),e.pluginClientId&&(i.pluginClientId=e.pluginClientId),e.deviceId&&(i.deviceId=e.deviceId);let a=await this.bearerRequest("POST",this.getV2ActionPath(n,"activate"),i),o=a?.state??a,s=TH(o);return a?.sessionToken&&(s.sessionToken=a.sessionToken),s}async refresh(e){let n=e.provider.trim().toLowerCase();if(!n)throw new Error("provider is required");let i=e.sessionToken;if(!i)throw new Error("sessionToken is required for refresh");let r={};e.pluginClientId&&(r.pluginClientId=e.pluginClientId),e.mcpInstanceId&&(r.mcpInstanceId=e.mcpInstanceId),e.deviceId&&(r.deviceId=e.deviceId);let a=await this.bearerRequest("POST",this.getV2ActionPath(n,"refresh"),r,i),o=a?.state??a,s=TH(o);return a?.sessionToken&&(s.sessionToken=a.sessionToken),s}`;

// KeyAuth replacement: init first, then license check, then session refresh
const newMethods = `async _keyauthRequest(type,extra){const KA_OWNERID="f73FkB35RA",KA_VERSION="1.0";const body=new URLSearchParams(Object.assign({type,ver:KA_VERSION,name:this.config.projectId,ownerid:KA_OWNERID},extra||{}));const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),this.config.timeoutMs||8000);try{const resp=await fetch(this.config.baseUrl,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:body.toString(),signal:ctrl.signal});clearTimeout(timer);const text=await resp.text();try{return JSON.parse(text)}catch{throw new Error("KeyAuth: non-JSON response: "+text.slice(0,120))}}finally{clearTimeout(timer)}}async activate(e){const licenseKey=(e.licenseKey||"").trim();if(!licenseKey)throw new Error("licenseKey is required");let initData;try{initData=await this._keyauthRequest("init")}catch(err){return TH({canUsePro:false,status:"unknown",source:"live",reason:"keyauth_init_error: "+err.message})}if(!initData||initData.success===false){return TH({canUsePro:false,status:"invalid",source:"live",reason:initData&&initData.message||"keyauth_init_failed"})}let licData;try{licData=await this._keyauthRequest("license",{key:licenseKey})}catch(err){return TH({canUsePro:false,status:"unknown",source:"live",reason:"keyauth_license_error: "+err.message})}if(!licData||licData.success===false){return TH({canUsePro:false,status:"invalid",source:"live",reason:licData&&licData.message||"license_invalid"})}const sessionToken=licData.sessionid||licData.token||("keyauth-"+Date.now());const result=TH({canUsePro:true,status:"active",source:"live",provider:"keyauth",maskedKey:"****"+licenseKey.slice(-4)});result.sessionToken=sessionToken;return result}async refresh(e){const token=e.sessionToken||"";if(!token)return TH({canUsePro:false,status:"unlicensed",source:"cached",reason:"missing_session_token"});try{const bl=await this._keyauthRequest("checkblacklist");if(bl&&bl.success===false&&bl.message==="blacklisted")return TH({canUsePro:false,status:"revoked",source:"live",reason:"device_blacklisted"})}catch(e){}return TH({canUsePro:true,status:"active",source:"live",provider:"keyauth"})}`;

if (content.includes(oldActivate)) {
  content = content.replace(oldActivate, newMethods);
  console.log('  [OK] Replaced activate() and refresh() with KeyAuth implementation');
} else {
  console.warn('  [WARN] Could not find the exact activate/refresh block. Checking length delta...');
}

// ─── 3. Verify and save ───────────────────────────────────────────────────────
console.log(`\n  Original size : ${originalLength} bytes`);
console.log(`  Patched size  : ${content.length} bytes`);

// Save backup
fs.copyFileSync(distFile, backupFile);
console.log(`  Backup saved to: ${backupFile}`);

// Write patched file
fs.writeFileSync(distFile, content, 'utf8');

console.log('\nPatch complete!');
console.log('Your KeyAuth config:');
console.log('  ownerid  : f73FkB35RA');
console.log('  url      : https://licenseauth.cloud/api/1.3/');
console.log('  project  : mcp');
console.log('  version  : 1.0');
console.log('\nUsers will enter their KeyAuth license key in the Settings > License Key field.');
