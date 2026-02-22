import fs from "node:fs";

const VALID_ATTRIBUTES = new Set(["forca", "destreza", "constituicao", "inteligencia", "sabedoria", "carisma"]);
const VALID_SIZES = new Set(["pequeno", "medio"]);
const VALID_SPELLS = new Set(["full", "half", "third", "pact", "none"]);
const VALID_HIT_DICE = new Set(["d6", "d8", "d10", "d12"]);

export function loadSrdData(path = "data/rpg_srd_base.json") {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

export function validateSrdData(data) {
  const errors = [];
  const warnings = [];

  if (!data || typeof data !== "object") errors.push("Root precisa ser objeto.");
  if (!Array.isArray(data?.races)) errors.push("races precisa ser array.");
  if (!Array.isArray(data?.classes)) errors.push("classes precisa ser array.");

  const traitIds = new Set(Object.keys(data?.trait_dictionary || {}));
  const featureIds = new Set(Object.keys(data?.class_feature_dictionary || {}));

  for (const [idx, race] of (data?.races || []).entries()) {
    if (!race?.id) errors.push(`races[${idx}] sem id.`);
    if (!VALID_SIZES.has(race?.size)) errors.push(`race ${race?.id || idx} size inválido: ${race?.size}`);
    for (const key of Object.keys(race?.atributos_fixos || {})) {
      if (!VALID_ATTRIBUTES.has(key)) errors.push(`race ${race.id} atributo_fixo inválido: ${key}`);
    }
    if (!Array.isArray(race?.tracos)) errors.push(`race ${race?.id} tracos deve ser array.`);
    for (const traitId of race?.tracos || []) {
      if (!traitIds.has(traitId)) errors.push(`race ${race.id} referencia trait inexistente: ${traitId}`);
    }
  }

  for (const [idx, cls] of (data?.classes || []).entries()) {
    if (!cls?.id) errors.push(`classes[${idx}] sem id.`);
    if (!VALID_HIT_DICE.has(cls?.hit_die)) errors.push(`classe ${cls?.id || idx} hit_die inválido: ${cls?.hit_die}`);
    if (!VALID_SPELLS.has(cls?.spell_progression)) errors.push(`classe ${cls?.id} spell_progression inválido: ${cls?.spell_progression}`);
    if (!cls?.magic_points || typeof cls.magic_points !== "object") errors.push(`classe ${cls?.id} sem magic_points.`);
    if (cls?.magic_points && typeof cls.magic_points.enabled !== "boolean") errors.push(`classe ${cls?.id} magic_points.enabled inválido.`);

    for (const attr of cls?.atributos_chave || []) {
      if (!VALID_ATTRIBUTES.has(attr)) errors.push(`classe ${cls.id} atributo_chave inválido: ${attr}`);
    }
    for (const attr of cls?.salvaguardas || []) {
      if (!VALID_ATTRIBUTES.has(attr)) errors.push(`classe ${cls.id} salvaguarda inválida: ${attr}`);
    }

    const byLevel = cls?.features_by_level || {};
    for (let level = 1; level <= 20; level += 1) {
      if (!Object.prototype.hasOwnProperty.call(byLevel, String(level))) {
        warnings.push(`classe ${cls.id} sem key de nível ${level} em features_by_level.`);
      }
    }
    for (const [lvl, featureList] of Object.entries(byLevel)) {
      if (!Array.isArray(featureList)) errors.push(`classe ${cls.id} nível ${lvl} não é array.`);
      for (const featureId of featureList || []) {
        if (!featureIds.has(featureId)) errors.push(`classe ${cls.id} referencia feature inexistente: ${featureId}`);
      }
    }
  }

  const hpRule = data?.system_notes?.hp_rule || "";
  if (!hpRule.includes("rolagem cheia")) warnings.push("system_notes.hp_rule não menciona explicitamente rolagem cheia.");

  if (!sameSet(new Set(data?.enums?.attributes || []), VALID_ATTRIBUTES)) {
    warnings.push("enums.attributes diverge dos atributos esperados.");
  }
  if (!sameSet(new Set(data?.enums?.sizes || []), VALID_SIZES)) {
    warnings.push("enums.sizes diverge dos tamanhos esperados.");
  }
  if (!sameSet(new Set(data?.enums?.spell_progression_types || []), VALID_SPELLS)) {
    warnings.push("enums.spell_progression_types diverge dos tipos esperados.");
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

function sameSet(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

export function toUiDatabases(data) {
  const racesDb = Object.fromEntries(
    data.races.map((race) => {
      const abilities = race.tracos.map((id) => {
        const trait = data.trait_dictionary[id];
        return {
          id,
          icon: "🧬",
          name: trait.nome,
          desc: trait.resumo,
          manaCost: 0,
          sourceType: "race",
          sourceName: race.nome,
          passive: true,
        };
      });

      const abilityBonuses = Object.entries(race.atributos_fixos || {}).map(([ability, modDelta]) => ({ ability, modDelta }));

      return [
        race.nome,
        {
          id: race.id,
          abilityBonuses,
          abilities,
        },
      ];
    })
  );

  const classesDb = Object.fromEntries(
    data.classes.map((cls) => {
      const features = [];
      for (const [level, ids] of Object.entries(cls.features_by_level || {})) {
        for (const id of ids) {
          const feature = data.class_feature_dictionary[id];
          features.push({
            id,
            icon: "⚙️",
            name: `${feature.nome} (Nv ${level})`,
            desc: feature.resumo,
            manaCost: 0,
            sourceType: "class",
            sourceName: cls.nome,
            level: Number(level),
            passive: true,
          });
        }
      }

      return [
        cls.nome,
        {
          id: cls.id,
          hitDie: cls.hit_die,
          hpMode: cls.hp,
          savingThrowProficiencies: cls.salvaguardas,
          primaryAbilities: cls.atributos_chave,
          abilities: features,
          magic_points: cls.magic_points || { enabled: false },
        },
      ];
    })
  );

  return { racesDb, classesDb };
}


export function calculateMagicPoints(level, classId, data) {
  const lv = Math.max(1, Math.min(20, parseInt(level || 1, 10) || 1));
  const cls = (data?.classes || []).find((x) => x.id === classId || x.nome === classId);
  if (!cls?.magic_points?.enabled) return 0;
  const startsAt = parseInt(cls.magic_points.starts_at_level || 1, 10) || 1;
  if (lv < startsAt) return 0;
  const tableId = cls.magic_points.table_id || "universal_base";
  const table = data?.magic_point_tables?.[tableId] || {};
  const base = parseInt(table[String(lv)] || 0, 10) || 0;
  const multiplier = Number(cls.magic_points.multiplier ?? 1);
  return Math.max(0, Math.floor(base * multiplier));
}

export function seedRpgDatabases(data, outDir = "data/generated") {
  fs.mkdirSync(outDir, { recursive: true });
  const { racesDb, classesDb } = toUiDatabases(data);

  fs.writeFileSync(`${outDir}/races.db.json`, JSON.stringify(racesDb, null, 2));
  fs.writeFileSync(`${outDir}/classes.db.json`, JSON.stringify(classesDb, null, 2));

  return { racesCount: Object.keys(racesDb).length, classesCount: Object.keys(classesDb).length };
}
