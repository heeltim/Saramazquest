import { loadSrdData, seedRpgDatabases, validateSrdData } from "./rpg-data-tools.mjs";

const data = loadSrdData();
const report = validateSrdData(data);
if (!report.ok) {
  console.error("Schema inválido. Corrija os erros antes de gerar seed.");
  report.errors.forEach((err) => console.error(`- ${err}`));
  process.exit(1);
}

const result = seedRpgDatabases(data);
console.log(`Seed gerado com sucesso: ${result.racesCount} raças, ${result.classesCount} classes.`);
