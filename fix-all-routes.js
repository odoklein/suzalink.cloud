const fs = require('fs');
const path = require('path');

// Get all route files recursively
function getAllRouteFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getAllRouteFiles(fullPath));
    } else if (item === 'route.ts') {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Function to fix the route handler type
function fixRouteHandler(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Replace GET handler type - more flexible pattern
    const getRegex = /export async function GET\s*\(\s*req:\s*NextRequest\s*,\s*\{\s*params\s*\}:\s*\{\s*params:\s*\{[^}]*\}\s*\}\s*\)/g;
    if (getRegex.test(content)) {
      content = content.replace(getRegex, 'export async function GET(req: NextRequest, { params }: any)');
      modified = true;
    }
    
    // Replace POST handler type
    const postRegex = /export async function POST\s*\(\s*req:\s*NextRequest\s*,\s*\{\s*params\s*\}:\s*\{\s*params:\s*\{[^}]*\}\s*\}\s*\)/g;
    if (postRegex.test(content)) {
      content = content.replace(postRegex, 'export async function POST(req: NextRequest, { params }: any)');
      modified = true;
    }
    
    // Replace PUT handler type
    const putRegex = /export async function PUT\s*\(\s*req:\s*NextRequest\s*,\s*\{\s*params\s*\}:\s*\{\s*params:\s*\{[^}]*\}\s*\}\s*\)/g;
    if (putRegex.test(content)) {
      content = content.replace(putRegex, 'export async function PUT(req: NextRequest, { params }: any)');
      modified = true;
    }
    
    // Replace DELETE handler type
    const deleteRegex = /export async function DELETE\s*\(\s*req:\s*NextRequest\s*,\s*\{\s*params\s*\}:\s*\{\s*params:\s*\{[^}]*\}\s*\}\s*\)/g;
    if (deleteRegex.test(content)) {
      content = content.replace(deleteRegex, 'export async function DELETE(req: NextRequest, { params }: any)');
      modified = true;
    }
    
    // Replace PATCH handler type
    const patchRegex = /export async function PATCH\s*\(\s*req:\s*NextRequest\s*,\s*\{\s*params\s*\}:\s*\{\s*params:\s*\{[^}]*\}\s*\}\s*\)/g;
    if (patchRegex.test(content)) {
      content = content.replace(patchRegex, 'export async function PATCH(req: NextRequest, { params }: any)');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
    } else {
      console.log(`⏭️  No changes needed: ${path.relative(process.cwd(), filePath)}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Get all route files
const routeFiles = getAllRouteFiles(path.join(process.cwd(), 'app/api'));

console.log(`🔍 Found ${routeFiles.length} route files to check...\n`);

// Process each file
routeFiles.forEach(fixRouteHandler);

console.log('\n🎉 Done fixing all route handler types!'); 