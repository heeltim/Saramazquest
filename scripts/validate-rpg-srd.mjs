import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSrdData, validateSrdData } from "./rpg-data-tools.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadShopItems() {
  const shopsDir = path.resolve(__dirname, "../data/shops");
  const shopFiles = fs.readdirSync(shopsDir).filter((f) => f.endsWith(".json"));

  return shopFiles.flatMap((file) => {
    const shop = JSON.parse(fs.readFileSync(path.join(shopsDir, file), "utf8"));
    return (shop.items || []).map((item) => ({ ...item, __shopFile: `data/shops/${file}` }));
  });
}

function validateItemContract(items) {
  const errors = [];

  for (const item of items) {
    if (!item.id) errors.push(`${item.__shopFile}: item sem id.`);
    if (!item.type) errors.push(`${item.__shopFile}: item ${item.id || "<sem-id>"} sem type.`);
    if (!Array.isArray(item.tags) || item.tags.length === 0) {
      errors.push(`${item.__shopFile}: item ${item.id || "<sem-id>"} sem tags funcionais.`);
    }

    if (item.type === "weapon" || item.type === "armor") {
      if (typeof item.tier !== "number") {
        errors.push(`${item.__shopFile}: item ${item.id} (${item.type}) sem tier numérico.`);
      }
      if (typeof item.material !== "string" || item.material.length === 0) {
        errors.push(`${item.__shopFile}: item ${item.id} (${item.type}) sem material.`);
      }
      if (typeof item.weight !== "number") {
        errors.push(`${item.__shopFile}: item ${item.id} (${item.type}) sem weight numérico.`);
      }
    }
  }

  return errors;
}

function validateCraftableMetadata(srd, items) {
  const errors = [];
  const byId = new Map(items.map((item) => [item.id, item]));

  for (const recipe of srd.recipes || []) {
    const output = recipe.output || {};
    if (output.type !== "item") continue;

    const item = byId.get(output.item_id);
    if (!item) {
      errors.push(`recipe ${recipe.id}: item craftável ${output.item_id} não encontrado nas lojas.`);
      continue;
    }

    const requiredTags = ["profession:", "biome:"];
    const hasRequiredTagFamilies = requiredTags.every((prefix) => item.tags?.some((tag) => tag.startsWith(prefix)));
    if (!hasRequiredTagFamilies) {
      errors.push(`recipe ${recipe.id}: item ${item.id} sem tags de profissão/bioma.`);
    }

    if (typeof item.weight !== "number") {
      errors.push(`recipe ${recipe.id}: item ${item.id} sem weight numérico para geração procedural.`);
    }

    if ((item.type === "weapon" || item.type === "armor") && (typeof item.tier !== "number" || !item.material)) {
      errors.push(`recipe ${recipe.id}: item ${item.id} sem tier/material obrigatório.`);
    }
  }

  return errors;
}

const srdData = loadSrdData();
const report = validateSrdData(srdData);
const shopItems = loadShopItems();
const itemContractErrors = validateItemContract(shopItems);
const craftableErrors = validateCraftableMetadata(srdData, shopItems);

console.log("# Validação do schema (rpg_srd_base.json + itens de lojas)");
if (report.warnings.length) {
  console.log("\nAvisos:");
  report.warnings.forEach((w) => console.log(`- ${w}`));
}

const allErrors = [...report.errors, ...itemContractErrors, ...craftableErrors];
if (allErrors.length) {
  console.log("\nErros:");
  allErrors.forEach((e) => console.log(`- ${e}`));
  process.exit(1);
}

console.log("\nSem erros de schema/referência.");
