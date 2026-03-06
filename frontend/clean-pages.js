const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (file === 'route.ts' || file === 'route.js') {
            let content = fs.readFileSync(fullPath, 'utf8');
            content = content.replace(/^export const dynamic = 'force-dynamic';\r?\n?/gm, '');
            content = content.replace(/\nexport const dynamic = 'force-dynamic';\r?\n?/gm, '');
            fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
        }
    }
}

walkDir(path.join(__dirname, 'app', 'api'));
console.log('Cleaned up all force-dynamic exports.');
