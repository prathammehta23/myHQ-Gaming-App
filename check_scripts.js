const fs = require('fs');
const path = require('path');
const vm = require('vm');

const projectDir = __dirname;

const htmlFiles = [
  'index.html',
  'admin.html',
  'calendar.html',
  'hall-of-fame.html',
  'loot-room.html',
  'mini-games.html',
  'player.html',
  'quiz-admin.html',
  'quiz-player.html',
  'test-load.html'
];

htmlFiles.forEach(file => {
  const filePath = path.join(projectDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`File does not exist: ${file}`);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract script tags
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let scriptIndex = 1;
  
  while ((match = scriptRegex.exec(content)) !== null) {
    let scriptCode = match[1];
    if (!scriptCode.trim()) continue;
    
    // Replace imports/exports with comments or empty lines to avoid vm.Script SyntaxError
    scriptCode = scriptCode.replace(/^\s*import\b[\s\S]*?;/gm, (m) => {
      return '// ' + m.replace(/\n/g, '\n// ');
    });
    scriptCode = scriptCode.replace(/^\s*export\b/gm, '// export');
    
    try {
      new vm.Script(scriptCode, { filename: `${file} [script ${scriptIndex}]` });
    } catch (err) {
      console.log(`\n--- Syntax Error in ${file} (Script #${scriptIndex}) ---`);
      console.log(err.message);
      // Print the line with error if we can find it
      const matchLine = err.stack.match(/\[script \d+\]:(\d+)/);
      if (matchLine) {
        const lineNum = parseInt(matchLine[1], 10);
        const lines = scriptCode.split('\n');
        console.log(`Around line ${lineNum}:`);
        for (let l = Math.max(0, lineNum - 3); l < Math.min(lines.length, lineNum + 3); l++) {
          console.log(`${l + 1}: ${lines[l]}`);
        }
      } else {
        console.log(err.stack);
      }
    }
    scriptIndex++;
  }
});
