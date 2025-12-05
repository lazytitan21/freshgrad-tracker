// Create Linux deployment package for Azure
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Creating Linux Azure deployment package...\n');

const distDir = path.join(__dirname, 'dist');

// Copy server.cjs to dist
console.log('✅ Copying server.cjs to dist/');
fs.copyFileSync('server.cjs', path.join(distDir, 'server.cjs'));

// Copy package.json 
console.log('✅ Copying package.json to dist/');
fs.copyFileSync('azure-package.json', path.join(distDir, 'package.json'));

// Copy startup.sh
console.log('✅ Copying startup.sh to dist/');
fs.copyFileSync('startup.sh', path.join(distDir, 'startup.sh'));

// Copy server folder (without node_modules)
console.log('📁 Copying server files...');
const serverSrc = path.join(__dirname, 'server');
const serverDest = path.join(distDir, 'server');
if (!fs.existsSync(serverDest)) fs.mkdirSync(serverDest, { recursive: true });
copyFolder(serverSrc, serverDest, ['node_modules']);
console.log('✅ Server files copied');

// Copy public folder
console.log('📁 Copying public assets...');
const publicSrc = path.join(__dirname, 'public');
const publicDest = path.join(distDir, 'public');
if (fs.existsSync(publicSrc)) {
  if (!fs.existsSync(publicDest)) fs.mkdirSync(publicDest, { recursive: true });
  copyFolder(publicSrc, publicDest);
  console.log('✅ Public assets copied');
}

// Create deployment info
const deployInfo = {
  deployedAt: new Date().toISOString(),
  platform: 'Linux',
  nodeVersion: 'NODE:22-lts',
  buildFrom: 'local'
};
fs.writeFileSync(
  path.join(distDir, 'deployment-info.json'),
  JSON.stringify(deployInfo, null, 2)
);
console.log('✅ Deployment info created');

// Remove old zip if exists
const zipFile = 'azure-linux-deploy.zip';
if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
  console.log('🗑️  Removed old azure-linux-deploy.zip');
}

// Create ZIP file
console.log('📦 Creating ZIP file (PowerShell)...\n');
const zipCommand = `powershell -Command "Compress-Archive -Path .\\dist\\* -DestinationPath .\\${zipFile} -Force"`;

try {
  execSync(zipCommand, { stdio: 'inherit' });
  const stats = fs.statSync(zipFile);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`\n✅ SUCCESS! Deployment package created: ${zipFile}`);
  console.log(`📦 Size: ${sizeMB} MB`);
} catch (error) {
  console.error('❌ Failed to create ZIP file:', error.message);
  process.exit(1);
}

// Helper function
function copyFolder(src, dest, exclude = []) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    if (exclude.includes(entry.name)) continue;
    
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyFolder(srcPath, destPath, exclude);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
