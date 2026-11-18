import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('C:/Users/aiden/AppData/Local/Temp/claude/429b5cc849355cac/83bdb4c7-ab8b-4d3a-a192-cc3ae5a7efb6/scratchpad/preview.sqlite');
const row = db.prepare('SELECT id, record FROM characters').get();
const record = JSON.parse(row.record);
console.log('was', JSON.stringify(record.location));
record.location = JSON.parse(process.argv[2]);
db.prepare('UPDATE characters SET record = ? WHERE id = ?').run(JSON.stringify(record), row.id);
console.log('now', JSON.stringify(record.location));
