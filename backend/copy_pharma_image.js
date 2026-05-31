const fs = require('fs');
const path = require('path');

const sourcePath = path.join('C:', 'Users', 'Ahmed Zidan', '.gemini', 'antigravity-ide', 'brain', '62fe31ef-3cfc-4b8c-9ab6-5ec4a78b7c53', 'media__1780256649129.jpg');
const destBgPng = path.join(__dirname, 'client', 'public', 'primemed_bg.png');
const destWarehouseJpg = path.join(__dirname, 'client', 'public', 'primemed_warehouse.jpg');

try {
    if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, destBgPng);
        fs.copyFileSync(sourcePath, destWarehouseJpg);
        console.log("Successfully copied warehouse image to public assets!");
    } else {
        console.error("Source image not found at: " + sourcePath);
    }
} catch (err) {
    console.error("Error copying file: ", err);
}
