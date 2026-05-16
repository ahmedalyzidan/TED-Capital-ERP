
const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\Ahmed Zidan\\ERP\\backend\\Ted ERP\\backend\\client\\src\\pages\\Inventory.jsx', 'utf8');
const lines = content.split('\n');

let balance = 0;
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
        if (line[j] === '(') balance++;
        if (line[j] === ')') balance--;
        if (balance < 0) {
            console.log(`Negative balance at line ${i + 1}, char ${j + 1}`);
            process.exit(0);
        }
    }
}
console.log('No negative balance found, total balance:', balance);
