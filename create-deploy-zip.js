import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Creating Azure deployment package...\n');

// 1. Ensure dist folder exists and is built
if (!fs.existsSync('dist')) {
  console.error('❌ Error: dist folder not found. Run "npm run build" first.');
  process.exit(1);
}

// 2. Verify web.config is in dist
if (!fs.existsSync('dist/web.config')) {
  console.log('⚠️  web.config not found in dist. Copying...');
  fs.copyFileSync('web.config', 'dist/web.config');
  console.log('✅ web.config copied to dist/');
}

// 2.5 Copy server.js (IISNode entry point)
if (fs.existsSync('server.js')) {
  fs.copyFileSync('server.js', 'dist/server.js');
  console.log('✅ server.js copied to dist/');
}

// 2.6 Copy azure-package.json as package.json
if (fs.existsSync('azure-package.json')) {
  fs.copyFileSync('azure-package.json', 'dist/package.json');
  console.log('✅ package.json copied to dist/');
}

// 2.7 Copy startup.cmd if it exists
if (fs.existsSync('startup.cmd')) {
  fs.copyFileSync('startup.cmd', 'dist/startup.cmd');
  console.log('✅ startup.cmd copied to dist/');
}

// 3. Copy server files to dist
console.log('📁 Copying server files...');
const serverDest = path.join('dist', 'server');
if (!fs.existsSync(serverDest)) {
  fs.mkdirSync(serverDest, { recursive: true });
}

// Copy server files (excluding node_modules)
copyDir('server', serverDest, ['node_modules']);
console.log('✅ Server files copied');

// 4. Copy public assets
console.log('📁 Copying public assets...');
if (fs.existsSync('public')) {
  copyDir('public', path.join('dist', 'public'));
  console.log('✅ Public assets copied');
}

// 5. Create deployment info file
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const deploymentInfo = {
  buildDate: new Date().toISOString(),
  version: packageJson.version,
  appName: 'FreshGrad Training Tracker',
  instructions: 'Upload contents of azure-deploy.zip to Azure Web App via Kudu or FTP. Run "npm install" in the server directory.'
};

fs.writeFileSync(
  'dist/deployment-info.json',
  JSON.stringify(deploymentInfo, null, 2)
);
console.log('✅ Deployment info created');

// 6. Create ZIP file using PowerShell (Windows) or zip command (Unix)
const isWindows = process.platform === 'win32';
const zipName = 'azure-deploy.zip';

try {
  // Remove old zip if exists
  if (fs.existsSync(zipName)) {
    fs.unlinkSync(zipName);
    console.log('🗑️  Removed old azure-deploy.zip');
  }

  if (isWindows) {
    // Use PowerShell Compress-Archive
    console.log('📦 Creating ZIP file (PowerShell)...');
    execSync(
      `powershell -command "Compress-Archive -Path 'dist\\*' -DestinationPath '${zipName}' -Force"`,
      { stdio: 'inherit' }
    );
  } else {
    // Use zip command on Unix/Mac
    console.log('📦 Creating ZIP file...');
    execSync(`cd dist && zip -r ../${zipName} .`, { stdio: 'inherit' });
  }

  // Verify ZIP was created
  if (fs.existsSync(zipName)) {
    const stats = fs.statSync(zipName);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`\n✅ SUCCESS! Deployment package created: ${zipName}`);
    console.log(`📦 Size: ${sizeInMB} MB`);
    console.log('\n📋 Next steps:');
    console.log('1. Go to Azure Portal → Your Web App');
    console.log('2. Navigate to Advanced Tools → Kudu');
    console.log('3. Go to: Tools → Zip Push Deploy');
    console.log(`4. Drag and drop ${zipName} to deploy`);
    console.log('5. After deployment, SSH into Kudu console and run:');
    console.log('   cd site/wwwroot/server');
    console.log('   npm install');
    console.log('\nOR manually extract and upload contents to wwwroot');
  } else {
    console.error('❌ Failed to create ZIP file');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error creating ZIP:', error.message);
  console.log('\n⚠️  Fallback: Manually zip the dist folder');
  process.exit(1);
}

// Helper function to copy directory recursively
function copyDir(src, dest, excludes = []) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (excludes.includes(entry.name)) {
      continue;
    }
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, excludes);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
