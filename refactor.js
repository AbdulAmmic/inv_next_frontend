const fs = require('fs');
let code = fs.readFileSync('src/apiCalls.ts', 'utf8');

code = code.replace(/export const (get[A-Z]\w+) = async \((.*?)\) => {\s*if \(isOnline\(\)\) {([\s\S]*?)}([\s\S]*?)return { data: (.*?) };\n};/g, 
(match, funcName, args, onlineBlock, fallbackLogic, returnVar) => {
  if (['getSupplierSummary', 'getSupplierTransactions', 'getPurchase', 'getSaleDetails'].includes(funcName)) {
    return match;
  }
  
  fallbackLogic = fallbackLogic.trim();
  
  return `export const ${funcName} = async (${args}) => {
  ${fallbackLogic}
  if (${returnVar} && ${returnVar}.length > 0) {
    return { data: ${returnVar} };
  }
  if (isOnline()) {${onlineBlock}}
  return { data: ${returnVar} };
};`;
});

fs.writeFileSync('src/apiCalls.ts', code);
console.log('Done!');
