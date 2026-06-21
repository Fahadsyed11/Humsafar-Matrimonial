const fs = require('fs');
const path = require('path');

const boysDir = path.join(__dirname, '..', 'public', 'boys_photos');
const girlsDir = path.join(__dirname, '..', 'public', 'girls_photos');

function renameFolder(dir, prefix) {
    if (!fs.existsSync(dir)) {
        console.error(`Directory not found: ${dir}`);
        return;
    }
    const files = fs.readdirSync(dir)
        .filter(f => fs.statSync(path.join(dir, f)).isFile() && /\.(jpg|jpeg|png|webp)$/i.test(f));
    
    // Sort files to keep order consistent
    files.sort();

    files.forEach((file, index) => {
        const num = String(index + 1).padStart(2, '0');
        const ext = path.extname(file).toLowerCase();
        const newName = `${prefix}_${num}${ext}`;
        
        const oldPath = path.join(dir, file);
        const newPath = path.join(dir, newName);
        
        fs.renameSync(oldPath, newPath);
        console.log(`Renamed: ${file} -> ${newName}`);
    });
}

renameFolder(boysDir, 'boy');
renameFolder(girlsDir, 'girl');
console.log('✅ Photo renaming complete!');
