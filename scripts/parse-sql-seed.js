/**
 * parse-sql-seed.js
 * Parses tuhanas_db.sql INSERT statements and exports a JSON seed file
 * for Dexie.js offline seeding.
 * 
 * Run: node scripts/parse-sql-seed.js
 */

const fs = require('fs');
const path = require('path');

const SQL_PATH = path.join(__dirname, '../../tuhanas_api/tuhanas_db.sql');
const OUT_PATH = path.join(__dirname, '../src/seed-data.json');

const sql = fs.readFileSync(SQL_PATH, 'utf8');
const lines = sql.split('\n');

// Tables we want to seed into Dexie
const TARGET_TABLES = [
  'products', 'stocks', 'sales', 'sale_items', 'purchases', 'purchase_items',
  'expenses', 'expense_categories', 'customers', 'suppliers', 'transfers',
  'inventory_adjustments', 'shops', 'audit_logs'
];

const seed = {};
TARGET_TABLES.forEach(t => seed[t] = []);

// Regex to match: INSERT INTO table_name (cols) VALUES (vals);
const INSERT_RE = /^INSERT INTO (\w+) \(([^)]+)\) VALUES \((.+)\);?\s*$/;

let count = 0;
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('INSERT INTO')) continue;

  const match = trimmed.match(INSERT_RE);
  if (!match) continue;

  const [, table, colsStr, valsStr] = match;
  if (!TARGET_TABLES.includes(table)) continue;

  const cols = colsStr.split(',').map(c => c.trim());
  
  // Parse values - handle quoted strings, nulls, booleans, numbers
  const vals = parseValues(valsStr);
  
  if (cols.length !== vals.length) continue;

  const row = {};
  cols.forEach((col, i) => {
    row[col] = vals[i];
  });

  seed[table].push(row);
  count++;
}

// Write output
fs.writeFileSync(OUT_PATH, JSON.stringify(seed, null, 0));

const stats = TARGET_TABLES.map(t => `  ${t}: ${seed[t].length}`).join('\n');
console.log(`✅ Seed file written to: ${OUT_PATH}`);
console.log(`📊 Record counts:\n${stats}`);
console.log(`📦 Total records: ${count}`);

/**
 * Parse a SQL VALUES string into an array of JS values.
 * Handles: 'string', NULL, True/False, numbers, nested quotes ''
 */
function parseValues(valsStr) {
  const vals = [];
  let i = 0;
  
  while (i < valsStr.length) {
    // Skip whitespace and commas
    while (i < valsStr.length && (valsStr[i] === ' ' || valsStr[i] === ',')) i++;
    if (i >= valsStr.length) break;
    
    if (valsStr[i] === "'") {
      // String value
      i++; // skip opening quote
      let str = '';
      while (i < valsStr.length) {
        if (valsStr[i] === "'" && valsStr[i+1] === "'") {
          str += "'"; // escaped single quote
          i += 2;
        } else if (valsStr[i] === "'") {
          i++; // skip closing quote
          break;
        } else {
          str += valsStr[i];
          i++;
        }
      }
      // Try to parse JSON strings (like JSON columns)
      if (str.startsWith('{') || str.startsWith('[')) {
        try { vals.push(JSON.parse(str)); continue; } catch {}
      }
      vals.push(str);
    } else {
      // Non-string value (NULL, True, False, number)
      let token = '';
      while (i < valsStr.length && valsStr[i] !== ',' ) {
        token += valsStr[i];
        i++;
      }
      token = token.trim();
      if (token === 'NULL') vals.push(null);
      else if (token === 'True') vals.push(true);
      else if (token === 'False') vals.push(false);
      else if (!isNaN(token) && token !== '') vals.push(Number(token));
      else vals.push(token);
    }
  }
  
  return vals;
}
