const fs = require('fs');
const path = require('path');

// List of route files to check and fix
const routeFiles = [
  'app/api/prospects/[id]/revert/route.ts',
  'app/api/prospects/folders/[folderId]/route.ts',
  'app/api/prospects/items/[itemId]/route.ts',
  'app/api/prospects/lists/[listId]/route.ts',
  'app/api/chat/[id]/route.ts',
  'app/api/lists/[listId]/import/route.ts'
];

// Function to fix the route handler type
function fixRouteHandler(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`File not found: ${fullPath}`);
      return;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace GET handler type
    content = content.replace(
      /export async function GET\(req: NextRequest, { params }: { params: {[^}]*} }\)/g,
      'export async function GET(req: NextRequest, { params }: any)'
    );
    
    // Replace POST handler type
    content = content.replace(
      /export async function POST\(req: NextRequest, { params }: { params: {[^}]*} }\)/g,
      'export async function POST(req: NextRequest, { params }: any)'
    );
    
    // Replace PUT handler type
    content = content.replace(
      /export async function PUT\(req: NextRequest, { params }: { params: {[^}]*} }\)/g,
      'export async function PUT(req: NextRequest, { params }: any)'
    );
    
    // Replace DELETE handler type
    content = content.replace(
      /export async function DELETE\(req: NextRequest, { params }: { params: {[^}]*} }\)/g,
      'export async function DELETE(req: NextRequest, { params }: any)'
    );
    
    // Replace PATCH handler type
    content = content.replace(
      /export async function PATCH\(req: NextRequest, { params }: { params: {[^}]*} }\)/g,
      'export async function PATCH(req: NextRequest, { params }: any)'
    );

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

// Process each file
routeFiles.forEach(fixRouteHandler);
console.log('Done fixing route handler types.');
