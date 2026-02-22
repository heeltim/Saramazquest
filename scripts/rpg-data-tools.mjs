import fs from "node:fs";

const VALID_ATTRIBUTES = new Set(["forca", "destreza", "constituicao", "inteligencia", "sabedoria", "carisma"]);
const VALID_SIZES = new Set(["pequeno", "medio"]);
const VALID_SPELLS = new Set(["full", "half", "third", "pact", "none"]);
const VALID_HIT_DICE = new Set(["d6", "d8", "d10", "d12"]);

const RACE_DNA_BY_ID = {
  humano: {
    ui: { cor_hex: "#6C7075" },
    ficha: {
      tamanho: "medio",
      deslocamento_ft: 30,
      deslocamento_m: 9,
      altura_cm: { min: 150, max: 190 },
      peso_kg: { min: 50, max: 100 },
      adulto_aos: 18,
      expectativa_vida_ate: 100,
      idiomas: { fixos: ["comum"], escolha: { quantidade: 1, opcoes: "qualquer" } },
    },
  },
  elfo: {
    ui: { cor_hex: "#3F6F62" },
    ficha: {
      tamanho: "medio",
      deslocamento_ft: 30,
      deslocamento_m: 9,
      altura_cm: { min: 150, max: 190 },
      peso_kg: { min: 45, max: 85 },
      adulto_aos: 100,
      expectativa_vida_ate: 750,
      idiomas: { fixos: ["comum", "elfico"], escolha: { quantidade: 0, opcoes: [] } },
    },
  },
  anao: {
    ui: { cor_hex: "#6B5C4E" },
    ficha: {
      tamanho: "medio",
      deslocamento_ft: 25,
      deslocamento_m: 7.5,
      altura_cm: { min: 120, max: 150 },
      peso_kg: { min: 60, max: 120 },
      adulto_aos: 50,
      expectativa_vida_ate: 350,
      idiomas: { fixos: ["comum", "anao"], escolha: { quantidade: 0, opcoes: [] } },
    },
  },
  halfling: {
    ui: { cor_hex: "#6B5F44" },
    ficha: {
      tamanho: "pequeno",
      deslocamento_ft: 25,
      deslocamento_m: 7.5,
      altura_cm: { min: 90, max: 120 },
      peso_kg: { min: 30, max: 45 },
      adulto_aos: 20,
      expectativa_vida_ate: 150,
      idiomas: { fixos: ["comum", "halfling"], escolha: { quantidade: 0, opcoes: [] } },
    },
  },
  gnomo: {
    ui: { cor_hex: "#4E6F6A" },
    ficha: {
      tamanho: "pequeno",
      deslocamento_ft: 25,
      deslocamento_m: 7.5,
      altura_cm: { min: 90, max: 120 },
      peso_kg: { min: 25, max: 45 },
      adulto_aos: 40,
      expectativa_vida_ate: 400,
      idiomas: { fixos: ["comum", "gnomico"], escolha: { quantidade: 0, opcoes: [] } },
    },
  },
  meio_elfo: {
    ui: { cor_hex: "#54707A" },
    ficha: {
      tamanho: "medio",
      deslocamento_ft: 30,
      deslocamento_m: 9,
      altura_cm: { min: 150, max: 190 },
      peso_kg: { min: 50, max: 95 },
      adulto_aos: 20,
      expectativa_vida_ate: 180,
      idiomas: { fixos: ["comum", "elfico"], escolha: { quantidade: 1, opcoes: "qualquer" } },
    },
  },
  meio_orc: {
    ui: { cor_hex: "#586C4F" },
    ficha: {
      tamanho: "medio",
      deslocamento_ft: 30,
      deslocamento_m: 9,
      altura_cm: { min: 160, max: 200 },
      peso_kg: { min: 65, max: 120 },
      adulto_aos: 14,
      expectativa_vida_ate: 75,
      idiomas: { fixos: ["comum", "orc"], escolha: { quantidade: 0, opcoes: [] } },
    },
  },
  draconato: {
    ui: { cor_hex: "#6B3E3E" },
    ficha: {
      tamanho: "medio",
      deslocamento_ft: 30,
      deslocamento_m: 9,
      altura_cm: { min: 170, max: 210 },
      peso_kg: { min: 80, max: 140 },
      adulto_aos: 15,
      expectativa_vida_ate: 80,
      idiomas: { fixos: ["comum", "draconico"], escolha: { quantidade: 0, opcoes: [] } },
    },
  },
  tiefling: {
    ui: { cor_hex: "#6B3E57" },
    ficha: {
      tamanho: "medio",
      deslocamento_ft: 30,
      deslocamento_m: 9,
      altura_cm: { min: 150, max: 190 },
      peso_kg: { min: 50, max: 95 },
      adulto_aos: 18,
      expectativa_vida_ate: 120,
      idiomas: { fixos: ["comum", "infernal"], escolha: { quantidade: 0, opcoes: [] } },
    },
  },
};

const RACE_DNA_PARENT_BY_ID = {
  alto_elfo: "elfo",
  elfo_floresta: "elfo",
  drow: "elfo",
  anao_montanha: "anao",
  anao_colina: "anao",
  halfling_pes_leves: "halfling",
  halfling_robusto: "halfling",
  gnomo_floresta: "gnomo",
  gnomo_rochas: "gnomo",
};

function getRaceDnaById(id) {
  const own = RACE_DNA_BY_ID[id];
  if (own) return structuredClone(own);
  const parent = RACE_DNA_PARENT_BY_ID[id];
  return parent && RACE_DNA_BY_ID[parent] ? structuredClone(RACE_DNA_BY_ID[parent]) : null;
}

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
          parent: RACE_DNA_PARENT_BY_ID[race.id],
          dna: getRaceDnaById(race.id),
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
          spellProgression: cls.spell_progression,
          magicPoints: cls.magic_points || { enabled: false },
          magicPointTable:
            cls.magic_points?.table_id && data.magic_point_tables?.[cls.magic_points.table_id]
              ? data.magic_point_tables[cls.magic_points.table_id]
              : null,
          savingThrowProficiencies: cls.salvaguardas,
          primaryAbilities: cls.atributos_chave,
          abilities: features,
        },
      ];
    })
  );

  return { racesDb, classesDb };
}

export function seedRpgDatabases(data, outDir = "data/generated") {
  fs.mkdirSync(outDir, { recursive: true });
  const { racesDb, classesDb } = toUiDatabases(data);

  fs.writeFileSync(`${outDir}/races.db.json`, JSON.stringify(racesDb, null, 2));
  fs.writeFileSync(`${outDir}/classes.db.json`, JSON.stringify(classesDb, null, 2));

  return { racesCount: Object.keys(racesDb).length, classesCount: Object.keys(classesDb).length };
}
