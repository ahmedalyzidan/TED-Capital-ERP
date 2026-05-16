
const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\Ahmed Zidan\\ERP\\backend\\Ted ERP\\backend\\client\\src\\pages\\Inventory.jsx', 'utf8');
const lines = content.split('\n');
const firstPart = lines.slice(0, 3288).join('\n');
const secondPart = lines.slice(3288).join('\n');

function count(str, char) {
    let c = 0;
    for (let i = 0; i < str.length; i++) {
        if (str[i] === char) c++;
    }
    return c;
}

console.log('First Part (1-3288):');
console.log('(:', count(firstPart, '('));
console.log('):', count(firstPart, ')'));
console.log('{:', count(firstPart, '{'));
console.log('}:', count(firstPart, '}'));

console.log('\nSecond Part (3289-end):');
console.log('(:', count(secondPart, '('));
console.log('):', count(secondPart, ')'));
console.log('{:', count(secondPart, '{'));
console.log('}:', count(secondPart, '}'));
