const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '..', 'icons');

// Create a simple gradient icon with a question mark
async function generateIcon(size) {
    // Create SVG with gradient background and question mark
    const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#667eea"/>
                <stop offset="100%" style="stop-color:#764ba2"/>
            </linearGradient>
        </defs>
        <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#bg)"/>
        <text x="${size / 2}" y="${size * 0.62}"
              font-family="Arial, Helvetica, sans-serif"
              font-size="${size * 0.55}"
              font-weight="bold"
              fill="white"
              text-anchor="middle">?</text>
        <circle cx="${size * 0.74}" cy="${size * 0.27}" r="${size * 0.1}" fill="rgba(255,255,255,0.3)"/>
        <text x="${size * 0.74}" y="${size * 0.31}"
              font-family="Arial, Helvetica, sans-serif"
              font-size="${size * 0.12}"
              font-weight="bold"
              fill="white"
              text-anchor="middle">!</text>
    </svg>`;

    const outputPath = path.join(iconsDir, `icon-${size}.png`);

    await sharp(Buffer.from(svg))
        .png()
        .toFile(outputPath);

    console.log(`Generated: icon-${size}.png`);
}

async function main() {
    // Ensure icons directory exists
    if (!fs.existsSync(iconsDir)) {
        fs.mkdirSync(iconsDir, { recursive: true });
    }

    // Generate all icon sizes
    for (const size of sizes) {
        await generateIcon(size);
    }

    console.log('All icons generated successfully!');
}

main().catch(console.error);
