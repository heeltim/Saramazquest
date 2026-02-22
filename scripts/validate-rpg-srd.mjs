import { loadSrdData, validateSrdData } from "./rpg-data-tools.mjs";

const data = loadSrdData();
const report = validateSrdData(data);

console.log("# Validação do schema (rpg_srd_base.json)");
if (report.warnings.length) {
  console.log("\nAvisos:");
  report.warnings.forEach((w) => console.log(`- ${w}`));
}
if (report.errors.length) {
  console.log("\nErros:");
  report.errors.forEach((e) => console.log(`- ${e}`));
  process.exit(1);
}
console.log("\nSem erros de schema/referência.");
