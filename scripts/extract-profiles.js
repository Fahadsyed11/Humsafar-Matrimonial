const fs = require('fs');
const path = require('path');

const logPath = 'C:\\\\Users\\\\MH\\\\.gemini\\\\antigravity-ide\\\\brain\\\\e6e4315f-a7d7-40df-9ff4-c98ae3c491d3\\\\.system_generated\\\\logs\\\\transcript.jsonl';

try {
    const fileContent = fs.readFileSync(logPath, 'utf8');
    const lines = fileContent.split('\n');

    let targetLine = null;
    for (const line of lines) {
        if (line.includes('"step_index":223') || line.includes('Humsafar - Matrimonial Database')) {
            targetLine = line;
            break;
        }
    }

    if (!targetLine) {
        console.error('Target line not found in logs!');
        process.exit(1);
    }

    const obj = JSON.parse(targetLine);
    const content = obj.content;

    const startTag = '<USER_REQUEST>';
    const endTag = '</USER_REQUEST>';
    const startIdx = content.indexOf(startTag);
    const endIdx = content.indexOf(endTag);

    if (startIdx === -1 || endIdx === -1) {
        console.error('Tags not found in content!');
        process.exit(1);
    }

    const jsonStr = content.substring(startIdx + startTag.length, endIdx).trim();
    fs.writeFileSync(path.join(__dirname, '..', 'public', 'profiles.json'), jsonStr);
    console.log('✅ Successfully extracted profiles to public/profiles.json!');
} catch (err) {
    console.error('Error during profile extraction:', err);
    process.exit(1);
}
