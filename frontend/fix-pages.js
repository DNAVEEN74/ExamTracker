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

            // Wipe out ALL previously injected tags so we start fresh
            content = content.replace(/^export const dynamic = 'force-dynamic';\r?\n?/gm, '');
            content = content.replace(/\nexport const dynamic = 'force-dynamic';\r?\n?/gm, '');

            const lines = content.split('\n');
            const lastImportIndex = lines.findLastIndex(l => l.trim().startsWith('import '));

            if (lastImportIndex !== -1) {
                lines.splice(lastImportIndex + 1, 0, '\nexport const dynamic = \'force-dynamic\';');
                fs.writeFileSync(fullPath, lines.join('\n'), 'utf8');
            } else {
                fs.writeFileSync(fullPath, 'export const dynamic = \'force-dynamic\';\n' + content, 'utf8');
            }
        }
    }
}

walkDir(path.join(__dirname, 'app', 'api'));
console.log('Fixed export const dynamic order across all app/api routes!');
