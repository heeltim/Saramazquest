/* ================= CONFIG ================= */
const STORAGE_KEY = "rpgquest_v2_scene";
let room = "arena";
let currentUser =
  prompt("Digite seu nome:") || "Jogador" + Math.floor(Math.random() * 1000);
document.getElementById("meName").textContent = currentUser;

const QUICK_REACTIONS = ["👍", "😂", "🔥", "❤️", "😮"];
const PICKER_EMOJIS = ["😀", "😁", "😂", "🤣", "🙂", "😉", "😎", "🤔", "😮", "😢", "😡", "❤️", "🔥", "👏", "🎲", "⚔️", "🛡️", "✨"];
let pendingReplyId = null;
let chatSenderKey = "player";
let chatContextCleanup = null;

/* ================= SCENE DEFAULT ================= */
const DEFAULT_COLS = 20;
const DEFAULT_ROWS = 12;

const DEFAULT_SCENE = {
  cols: DEFAULT_COLS,
  rows: DEFAULT_ROWS,
  bgUrl: "",
  bgX: 0,
  bgY: 0,
  bgScale: 120, // %
  bgOpacity: 65, // %
  tiles: [], // string array: "floor" | "wall" | "void"
};

const DEFAULT_EQUIPPED = {
  weapon: null,
  armor: null,
  shield: null,
  ring: null,
  cloak: null,
  misc: null,
};

function createEmptyEquipped() {
  return { ...DEFAULT_EQUIPPED };
}

function makeRuntimeItemId(baseId) {
  return `${baseId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/* ================= ATRIBUTOS / PERÍCIAS (5e - mods) ================= */
const ATTRIBUTES = [
  { id: "str", name: "Força", short: "FOR" },
  { id: "dex", name: "Destreza", short: "DES" },
  { id: "con", name: "Constituição", short: "CON" },
  { id: "int", name: "Inteligência", short: "INT" },
  { id: "wis", name: "Sabedoria", short: "SAB" },
  { id: "cha", name: "Carisma", short: "CAR" },
];

const ATTRIBUTE_POINT_BUY = [
  { score: 8, cost: 0, mod: -1 },
  { score: 9, cost: 1, mod: -1 },
  { score: 10, cost: 2, mod: 0 },
  { score: 11, cost: 3, mod: 0 },
  { score: 12, cost: 4, mod: 1 },
  { score: 13, cost: 5, mod: 1 },
  { score: 14, cost: 7, mod: 2 },
  { score: 15, cost: 9, mod: 2 },
];
const POINT_BUY_BUDGET = 27;

const SKILLS = [
  { id: "athletics", name: "Atletismo", ability: "str" },
  { id: "acrobatics", name: "Acrobacia", ability: "dex" },
  { id: "sleightOfHand", name: "Prestidigitação", ability: "dex" },
  { id: "stealth", name: "Furtividade", ability: "dex" },
  { id: "arcana", name: "Arcanismo", ability: "int" },
  { id: "history", name: "História", ability: "int" },
  { id: "investigation", name: "Investigação", ability: "int" },
  { id: "nature", name: "Natureza", ability: "int" },
  { id: "religion", name: "Religião", ability: "int" },
  { id: "animalHandling", name: "Lidar com Animais", ability: "wis" },
  { id: "insight", name: "Intuição", ability: "wis" },
  { id: "medicine", name: "Medicina", ability: "wis" },
  { id: "perception", name: "Percepção", ability: "wis" },
  { id: "survival", name: "Sobrevivência", ability: "wis" },
  { id: "deception", name: "Enganação", ability: "cha" },
  { id: "intimidation", name: "Intimidação", ability: "cha" },
  { id: "performance", name: "Atuação", ability: "cha" },
  { id: "persuasion", name: "Persuasão", ability: "cha" },
];

/* ================= BANCO: RAÇAS / CLASSES ================= */
const RACES = {
  Humano: {
    abilityBonuses: [
      { ability: "str", modDelta: 1 },
      { ability: "dex", modDelta: 1 },
      { ability: "con", modDelta: 1 },
      { ability: "int", modDelta: 1 },
      { ability: "wis", modDelta: 1 },
      { ability: "cha", modDelta: 1 },
    ],
    abilities: [
      {
        icon: "🌍",
        name: "Adaptável",
        desc: "+1 em todos os atributos.",
        manaCost: 0,
      },
      {
        icon: "🔥",
        name: "Determinação",
        desc: "1 vez por turno, pode repetir uma ação/rolagem (futuro).",
        manaCost: 0,
      },
    ],
  },
  Elfo: {
    abilityBonuses: [
      { ability: "dex", modDelta: 2 },
      { ability: "wis", modDelta: 1 },
    ],
    abilities: [
      {
        icon: "🌙",
        name: "Visão Noturna",
        desc: "Enxerga no escuro (futuro).",
        manaCost: 0,
      },
      {
        icon: "✨",
        name: "Precisão Élfica",
        desc: "+1 em ações de precisão (futuro).",
        manaCost: 0,
      },
    ],
  },
  Anao: {
    abilityBonuses: [
      { ability: "str", modDelta: 2 },
      { ability: "con", modDelta: 1 },
    ],
    abilities: [
      {
        icon: "🛡️",
        name: "Resistência Anã",
        desc: "Redução de dano físico (futuro).",
        manaCost: 0,
      },
      {
        icon: "⛰️",
        name: "Vigor de Pedra",
        desc: "+2 HP por nível (já entra no HP Máx).",
        manaCost: 0,
      },
    ],
  },
};

const CLASSES = {
  Guerreiro: {
    primaryAbilities: ["str", "con"],
    savingThrowProficiencies: ["str", "con"],
    skillChoices: {
      choose: 2,
      from: ["athletics", "animalHandling", "intimidation", "survival", "perception"],
    },
    hpMod: 6,
    manaMod: -2,
    abilities: [
      {
        icon: "⚔️",
        name: "Golpe Poderoso",
        desc: "+3 dano no próximo ataque (futuro).",
        manaCost: 0,
      },
      {
        icon: "🛡️",
        name: "Postura Defensiva",
        desc: "+2 defesa por 1 turno (futuro).",
        manaCost: 0,
      },
    ],
  },
  Mago: {
    primaryAbilities: ["int"],
    savingThrowProficiencies: ["int", "wis"],
    skillChoices: {
      choose: 2,
      from: ["arcana", "history", "insight", "investigation", "medicine", "religion"],
    },
    hpMod: -2,
    manaMod: 10,
    abilities: [
      {
        icon: "🔥",
        name: "Bola de Fogo",
        desc: "Ataque mágico (futuro).",
        manaCost: 3,
      },
      {
        icon: "🔮",
        name: "Escudo Arcano",
        desc: "Absorve dano (futuro).",
        manaCost: 2,
      },
    ],
  },
  Arqueiro: {
    primaryAbilities: ["dex", "wis"],
    savingThrowProficiencies: ["dex", "wis"],
    skillChoices: {
      choose: 3,
      from: ["acrobatics", "athletics", "nature", "perception", "stealth", "survival"],
    },
    hpMod: 2,
    manaMod: 2,
    abilities: [
      {
        icon: "🏹",
        name: "Tiro Preciso",
        desc: "+4 precisão (futuro).",
        manaCost: 1,
      },
      {
        icon: "👣",
        name: "Passo Sombrio",
        desc: "Movimento tático (futuro).",
        manaCost: 1,
      },
    ],
  },
};


const BACKGROUNDS = {
  Nenhum: {
    abilityBonuses: [],
    skillProficiencies: [],
  },
  Sabio: {
    abilityBonuses: [{ ability: "int", modDelta: 1 }],
    skillProficiencies: ["arcana", "history"],
  },
};

/* ================= BANCO: ITENS (resumo) ================= */
const ITEM_DB = {
  dagger: {
    name: "Adaga",
    icon: "🗡️",
    type: "weapon",
    equipSlot: "weapon",
    desc: "+1 FOR (arma leve).",
    mods: { str: +1 },
  },
  short_sword: {
    name: "Espada Curta",
    icon: "⚔️",
    type: "weapon",
    equipSlot: "weapon",
    desc: "+2 FOR (padrão).",
    mods: { str: +2 },
  },
  arcane_staff: {
    name: "Cajado Arcano",
    icon: "🪄",
    type: "weapon",
    equipSlot: "weapon",
    desc: "+2 ESP (arma de mago).",
    mods: { spr: +2 },
  },

  icebolt: {
    name: "Raio de Gelo",
    icon: "❄️",
    type: "weapon",
    equipSlot: "weapon",
    desc: "+2 ESP. Magia básica (sem custo).",
    mods: { spr: +2 },
  },
  firebolt: {
    name: "Faísca de Fogo",
    icon: "🔥",
    type: "weapon",
    equipSlot: "weapon",
    desc: "+2 ESP. Magia básica (sem custo).",
    mods: { spr: +2 },
  },

  leather_armor: {
    name: "Armadura de Couro",
    icon: "🥋",
    type: "armor",
    equipSlot: "armor",
    desc: "+1 Defesa.",
    mods: { defense: +1 },
  },
  chainmail: {
    name: "Cota de Malha",
    icon: "⛓️",
    type: "armor",
    equipSlot: "armor",
    desc: "+2 Defesa.",
    mods: { defense: +2 },
  },
  shield: {
    name: "Escudo",
    icon: "🛡️",
    type: "shield",
    equipSlot: "shield",
    desc: "+1 Defesa.",
    mods: { defense: +1 },
  },
  heavy_shield: {
    name: "Escudo Pesado",
    icon: "🛡️",
    type: "shield",
    equipSlot: "shield",
    desc: "+2 Defesa.",
    mods: { defense: +2 },
  },

  ring_protection: {
    name: "Anel de Proteção",
    icon: "💍",
    type: "ring",
    equipSlot: "ring",
    desc: "+1 Defesa.",
    mods: { defense: +1 },
  },
  elven_cloak: {
    name: "Capa Élfica",
    icon: "🧥",
    type: "cloak",
    equipSlot: "cloak",
    desc: "+1 DES.",
    mods: { dex: +1 },
  },
  backpack: {
    name: "Mochila",
    icon: "🎒",
    type: "misc",
    equipSlot: "misc",
    desc: "+6 slots inventário.",
    mods: { invExtra: +6 },
  },

  potion_healing: {
    name: "Poção de Cura",
    icon: "🧪",
    type: "potion",
    desc: "+10 HP (consome).",
    consume: { hp: +10 },
  },
  potion_mana: {
    name: "Poção de Mana",
    icon: "🔵",
    type: "potion",
    desc: "+8 MP (consome).",
    consume: { mana: +8 },
  },
};
const SHOP_TABS = [
  { id: "taberna", label: "Taberna" },
  { id: "arsenal", label: "Arsenal" },
  { id: "ferreiro", label: "Ferreiro" },
];
const SHOP_DB = {
  taberna: { shopId: "taberna", shopName: "Taberna & Suprimentos", items: [] },
  arsenal: { shopId: "arsenal", shopName: "Arsenal", items: [] },
  ferreiro: { shopId: "ferreiro", shopName: "Ferreiro", items: [] },
};
let selectedShopId = "taberna";
let selectedArsenalType = "weapon";
let pendingUpgradeId = null;


const SPELL_EFFECTS_CATALOG = [
  {
    id: "direct_damage",
    name: "Dano direto",
    type: "dano",
    baseCost: 3,
    unitCost: 2,
    minUnits: 1,
    maxUnits: 6,
    unitLabel: "+1d6",
    defaultDamageType: "arcano",
  },
  {
    id: "area_control",
    name: "Controle de área",
    type: "controle",
    baseCost: 5,
    unitCost: 2,
    minUnits: 1,
    maxUnits: 3,
    unitLabel: "+1 intensidade",
    status: "movimento reduzido",
  },
  {
    id: "temp_buff",
    name: "Bônus temporário",
    type: "buff",
    baseCost: 3,
    unitCost: 2,
    minUnits: 1,
    maxUnits: 3,
    unitLabel: "+1 bônus",
    stat: "defesa",
  },
  {
    id: "healing",
    name: "Cura",
    type: "cura",
    baseCost: 4,
    unitCost: 2,
    minUnits: 1,
    maxUnits: 4,
    unitLabel: "+1d8",
  },
  {
    id: "debuff",
    name: "Debuff",
    type: "debuff",
    baseCost: 4,
    unitCost: 2,
    minUnits: 1,
    maxUnits: 3,
    unitLabel: "+1 intensidade",
    stat: "ataque",
  },
  {
    id: "summon",
    name: "Invocação",
    type: "invocacao",
    baseCost: 8,
    unitCost: 3,
    minUnits: 1,
    maxUnits: 2,
    unitLabel: "+1 duração",
  },
];

const SPELL_CREATION_LEVEL_LIMITS = [
  { minLevel: 1, maxLevel: 1, points: 10 },
  { minLevel: 2, maxLevel: 2, points: 15 },
  { minLevel: 3, maxLevel: 4, points: 20 },
  { minLevel: 5, maxLevel: 20, points: 30 },
];

const SPELL_ICON_LIBRARY = [
  "🔥", "❄️", "⚡", "🌪️", "🌑", "☀️", "🧿", "✨", "💥", "🛡️", "❤️", "☠️",
  "🌿", "🪄", "🕸️", "🦴", "🌀", "💫", "🐉", "🔮",
];

const SPELL_SLOTS_BY_LEVEL = {
  1: [2],
  2: [3],
  3: [4, 2],
  4: [4, 3],
  5: [4, 3, 2],
  6: [4, 3, 3],
  7: [4, 3, 3, 1],
  8: [4, 3, 3, 2],
  9: [4, 3, 3, 3, 1],
  10: [4, 3, 3, 3, 2],
  11: [4, 3, 3, 3, 2, 1],
  12: [4, 3, 3, 3, 2, 1],
  13: [4, 3, 3, 3, 2, 1, 1],
  14: [4, 3, 3, 3, 2, 1, 1],
  15: [4, 3, 3, 3, 2, 1, 1, 1],
  16: [4, 3, 3, 3, 2, 1, 1, 1],
  17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
  18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
  20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
};

let grimoireTargetName = null;
let activeGrimoireTab = "resources";
let selectedSpellIcon = SPELL_ICON_LIBRARY[0];

/* ================= STORAGE ================= */
function load() {
  const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  if (!raw.rooms || typeof raw.rooms !== "object") raw.rooms = {};
  if (!raw.chat || typeof raw.chat !== "object") raw.chat = {};
  if (!raw.scenes || typeof raw.scenes !== "object") raw.scenes = {};
  return raw;
}
function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

async function loadShopCatalogs() {
  const files = {
    taberna: "data/shops/shop_taberna.json",
    arsenal: "data/shops/shop_arsenal.json",
    ferreiro: "data/shops/shop_ferreiro.json",
  };

  await Promise.all(
    Object.entries(files).map(async ([shopId, file]) => {
      try {
        const resp = await fetch(file, { cache: "no-store" });
        if (!resp.ok) return;
        const json = await resp.json();
        if (json && Array.isArray(json.items)) SHOP_DB[shopId] = json;
      } catch (_) {
        // fallback silencioso
      }
    })
  );
}

function normalizeChatMessage(message) {
  if (typeof message === "string") {
    return {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      user: "Sistema",
      text: message,
      senderType: "system",
      senderProfile: null,
      replyTo: null,
      reactions: {},
      createdAt: Date.now(),
    };
  }
  if (!message || typeof message !== "object") return null;

  const user = String(message.user || message.name || "Sistema").trim();
  const text = String(message.text || message.message || "").trim();
  if (!text) return null;

  return {
    id:
      String(message.id || "").trim() ||
      `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    user,
    text,
    senderType: String(message.senderType || "player"),
    senderProfile: message.senderProfile ? String(message.senderProfile) : null,
    replyTo: message.replyTo ? String(message.replyTo) : null,
    reactions:
      message.reactions && typeof message.reactions === "object"
        ? Object.fromEntries(
            Object.entries(message.reactions).map(([emoji, users]) => [
              emoji,
              Array.isArray(users)
                ? users.map((u) => String(u)).filter(Boolean)
                : [],
            ])
          )
        : {},
    createdAt: Number(message.createdAt) || Date.now(),
  };
}

function getRoomChat(data, roomName) {
  if (!Array.isArray(data.chat[roomName])) {
    const legacy = data.rooms?.[roomName]?.chat;
    data.chat[roomName] = Array.isArray(legacy) ? legacy : [];
  }

  data.chat[roomName] = data.chat[roomName]
    .map(normalizeChatMessage)
    .filter(Boolean);

  return data.chat[roomName];
}

function getRoomChatProfiles(data, roomName) {
  if (!data.chatProfiles || typeof data.chatProfiles !== "object") data.chatProfiles = {};
  if (!Array.isArray(data.chatProfiles[roomName])) data.chatProfiles[roomName] = [];
  data.chatProfiles[roomName] = data.chatProfiles[roomName]
    .map((n) => String(n || "").trim())
    .filter(Boolean)
    .filter((n, idx, arr) => arr.indexOf(n) === idx);
  return data.chatProfiles[roomName];
}

let data = load();
if (!data.rooms[room]) data.rooms[room] = {};
getRoomChat(data, room);
if (!data.scenes[room]) data.scenes[room] = structuredClone(DEFAULT_SCENE);
save(data);

/* ================= SCENE HELPERS ================= */
function ensureScene() {
  let data = load();
  if (!data.scenes) data.scenes = {};
  if (!data.scenes[room]) data.scenes[room] = structuredClone(DEFAULT_SCENE);

  const s = data.scenes[room];

  // cols/rows
  s.cols = s.cols || DEFAULT_COLS;
  s.rows = s.rows || DEFAULT_ROWS;

  // tiles size
  const needed = s.cols * s.rows;
  if (!Array.isArray(s.tiles)) s.tiles = [];
  if (s.tiles.length !== needed) {
    const newTiles = new Array(needed).fill("floor");
    for (let i = 0; i < Math.min(s.tiles.length, needed); i++) {
      newTiles[i] = s.tiles[i] || "floor";
    }
    s.tiles = newTiles;
  }

  // defaults
  s.bgUrl = s.bgUrl || "";
  s.bgX = Number.isFinite(s.bgX) ? s.bgX : 0;
  s.bgY = Number.isFinite(s.bgY) ? s.bgY : 0;
  s.bgScale = Number.isFinite(s.bgScale) ? s.bgScale : 120;
  s.bgOpacity = Number.isFinite(s.bgOpacity) ? s.bgOpacity : 65;

  data.scenes[room] = s;
  save(data);
}
ensureScene();

function applySceneCSS() {
  const s = load().scenes[room];
  const arena = document.getElementById("arena");
  arena.style.setProperty("--cols", s.cols);
  arena.style.setProperty("--rows", s.rows);

  const bg = s.bgUrl ? `url("${s.bgUrl}")` : "none";
  arena.style.setProperty("--scene-bg", bg);
  arena.style.setProperty("--scene-scale", `${s.bgScale}%`);
  arena.style.setProperty("--scene-x", `${s.bgX}px`);
  arena.style.setProperty("--scene-y", `${s.bgY}px`);
  arena.style.setProperty("--scene-opacity", (s.bgOpacity / 100).toString());
}

function tileIndex(x, y) {
  const s = load().scenes[room];
  return y * s.cols + x;
}
function getTile(x, y) {
  const s = load().scenes[room];
  const idx = y * s.cols + x;
  return s.tiles[idx] || "floor";
}
function setTile(x, y, type) {
  let data = load();
  const s = data.scenes[room];
  const idx = y * s.cols + x;
  s.tiles[idx] = type;
  save(data);
}

/* ================= PLAYER SCHEMA ================= */
function randomColor() {
  return (
    "#" +
    Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")
  );
}

function defaultAttributeScores() {
  return { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };
}

function defaultAttributeMods() {
  return { str: -1, dex: -1, con: -1, int: -1, wis: -1, cha: -1 };
}

function getPointBuyRow(score) {
  return ATTRIBUTE_POINT_BUY.find((r) => r.score === score);
}

function pointBuyCost(score) {
  const row = getPointBuyRow(score);
  return row ? row.cost : 0;
}

function scoreToMod(score) {
  const row = getPointBuyRow(score);
  return row ? row.mod : -1;
}

function normalizeScore(score) {
  const n = parseInt(score, 10);
  if (Number.isNaN(n)) return 8;
  return Math.max(8, Math.min(15, n));
}

function normalizeAttributeScores(scores) {
  const next = defaultAttributeScores();
  ATTRIBUTES.forEach((a) => {
    next[a.id] = normalizeScore(scores?.[a.id]);
  });
  return next;
}

function totalPointBuyCost(scores) {
  return ATTRIBUTES.reduce((acc, a) => acc + pointBuyCost(scores[a.id]), 0);
}

function computeProficiencyBonus(level) {
  const lv = Math.max(1, parseInt(level || 1, 10) || 1);
  return 2 + Math.floor((lv - 1) / 4);
}

function abilityShort(abilityId) {
  const found = ATTRIBUTES.find((a) => a.id === abilityId);
  return found ? found.short : abilityId.toUpperCase();
}

function fmtMod(value) {
  return value >= 0 ? `+${value}` : `${value}`;
}

function normalizeQuickSpellSlots(rawSlots) {
  const base = Array(8).fill(null);
  if (!Array.isArray(rawSlots)) return base;
  for (let i = 0; i < 8; i++) {
    base[i] = rawSlots[i] || null;
  }
  return base;
}

function ensurePlayerSchema(p) {
  if (p.hp === undefined) p.hp = 100;
  if (p.hpMax === undefined) p.hpMax = 100;
  if (p.mana === undefined) p.mana = 50;
  if (p.manaMax === undefined) p.manaMax = 50;

  if (p.race === undefined) p.race = "Humano";
  if (p.class === undefined) p.class = "Guerreiro";
  if (p.background === undefined) p.background = "Nenhum";
  if (p.level === undefined) p.level = 1;
  if (p.owner === undefined) p.owner = "";
  if (p.onTable === undefined) p.onTable = true;

  if (p.gold === undefined) p.gold = 60;

  p.attributeScores = normalizeAttributeScores(p.attributeScores);
  p.attributeMods = { ...defaultAttributeMods(), ...(p.attributeMods || {}) };
  if (!Array.isArray(p.skillProficiencies)) p.skillProficiencies = [];
  if (!Array.isArray(p.expertiseSkills)) p.expertiseSkills = [];

  if (!Array.isArray(p.skills)) p.skills = [];
  if (!Array.isArray(p.customSpells)) p.customSpells = [];
  p.spellSlots = normalizeQuickSpellSlots(p.spellSlots);

  if (!p.spellcasting || typeof p.spellcasting !== "object") p.spellcasting = {};
  if (!Array.isArray(p.spellcasting.slotsMax)) p.spellcasting.slotsMax = [];
  if (!Array.isArray(p.spellcasting.slotsCurrent)) p.spellcasting.slotsCurrent = [];

  if (!Array.isArray(p.inventory)) {
    if (typeof p.inventory === "string" && p.inventory.trim()) {
      p.inventory = [p.inventory.trim()];
    } else if (
      p.inventory &&
      typeof p.inventory === "object" &&
      Array.isArray(p.inventory.items)
    ) {
      p.inventory = p.inventory.items.filter(Boolean);
    } else {
      p.inventory = [];
    }
  }

  if (!p.equipped || typeof p.equipped !== "object" || Array.isArray(p.equipped)) {
    p.equipped = createEmptyEquipped();
  } else {
    p.equipped = { ...createEmptyEquipped(), ...p.equipped };
  }

  if (p.color === undefined) p.color = randomColor();

  const s = load().scenes[room];
  if (p.x === undefined) p.x = Math.floor(Math.random() * s.cols);
  if (p.y === undefined) p.y = Math.floor(Math.random() * s.rows);
}

function ensureAllPlayersSchema() {
  let data = load();
  if (!data.rooms[room]) data.rooms[room] = {};
  Object.keys(data.rooms[room]).forEach((name) => {
    ensurePlayerSchema(data.rooms[room][name]);
  });
  save(data);
}
ensureAllPlayersSchema();

/* ================= CHAT ================= */
function createChatMessage({ user, text, senderType = "player", senderProfile = null }) {
  return {
    id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    user,
    text,
    senderType,
    senderProfile,
    replyTo: pendingReplyId,
    reactions: {},
    createdAt: Date.now(),
  };
}

function resolveSenderIdentity() {
  if (chatSenderKey === "character") {
    return { label: "Personagem", senderType: "character", senderProfile: null };
  }
  if (chatSenderKey.startsWith("profile:")) {
    const profileName = chatSenderKey.replace("profile:", "").trim();
    return {
      label: profileName || currentUser,
      senderType: "profile",
      senderProfile: profileName || null,
    };
  }
  return { label: currentUser, senderType: "player", senderProfile: null };
}

function clearReplyState() {
  pendingReplyId = null;
  renderReplyPreview();
}

function pushChat(user, text, meta = {}) {
  let data = load();
  const roomChat = getRoomChat(data, room);
  roomChat.push(createChatMessage({ user, text, ...meta }));
  save(data);
  updateChat();
}
function pushAction(user, text) {
  pushChat(user, "* " + text);
}

function spellToCardHtml(spell) {
  if (!spell) return "";
  const effects = (spell.effects || []).map((fx) => {
    if (fx.type === "dano") return `• Dano ${fx.damageDice} (${fx.damageType})`;
    if (fx.type === "cura") return `• Cura ${fx.healDice}`;
    if (fx.type === "status") return `• Controle: ${fx.effect} (${fx.duration})`;
    if (fx.type === "buff") return `• Bônus: +${fx.bonus} ${fx.stat}`;
    if (fx.type === "debuff") return `• Debuff: -${fx.penalty} ${fx.stat}`;
    return `• Invocação (${fx.duration})`;
  }).join("<br>");

  return `
    <div class="spellCard">
      <div class="spellHead">
        <strong>${spell.icon || "✨"} ${spell.name}</strong>
        <span>Nv ${spell.level} • ${spell.pointCost} pts</span>
      </div>
      <div style="opacity:.8; font-size:12px;">${spell.description || "Sem descrição."}</div>
      <div style="margin:6px 0; font-size:12px;">${effects}</div>
      <div class="spellFooter">
        <span>Componentes: ${(spell.components || []).join(", ") || "—"}</span>
      </div>
    </div>
  `;
}

function resolveSpellAutoRoll(spell) {
  const pools = [];
  const notes = [];
  (spell.effects || []).forEach((fx) => {
    if (fx.type === "dano" && fx.damageDice) {
      const parsed = parseDiceExpression(fx.damageDice);
      if (parsed?.length) pools.push(...parsed);
      notes.push(`Dano ${fx.damageDice} (${fx.damageType || "arcano"})`);
    } else if (fx.type === "cura" && fx.healDice) {
      const parsed = parseDiceExpression(fx.healDice);
      if (parsed?.length) pools.push(...parsed);
      notes.push(`Cura ${fx.healDice}`);
    } else if (fx.type === "buff") {
      notes.push(`Bônus: +${fx.bonus} ${fx.stat} (${fx.duration || "1 turno"})`);
    } else if (fx.type === "debuff") {
      notes.push(`Debuff: -${fx.penalty} ${fx.stat} (${fx.duration || "1 turno"})`);
    } else if (fx.type === "status") {
      notes.push(`Controle: ${fx.effect} (${fx.duration || "1 turno"})`);
    }
  });

  if (!pools.length) return { rollText: "", detailsText: notes.join(" • ") };

  const expr = pools.map((p) => `${p.count}d${p.sides}`).join(" + ");
  const rollText = formatRollAction(pools, expr);
  return { rollText, detailsText: notes.join(" • ") };
}

function castSpellForPlayer(playerName, spellId) {
  const data = load();
  const p = data.rooms[room][playerName];
  if (!p) return;

  ensurePlayerSchema(p);
  recalcFromSheet(p);

  const spell = (p.customSpells || []).find((s) => s.id === spellId);
  if (!spell) return;

  const slotIndex = Math.max(0, (spell.level || 1) - 1);
  const current = p.spellcasting.slotsCurrent[slotIndex] ?? 0;
  if (current <= 0) {
    alert(`Sem slots de nível ${spell.level} disponíveis.`);
    return;
  }

  p.spellcasting.slotsCurrent[slotIndex] = current - 1;
  save(data);

  const { rollText, detailsText } = resolveSpellAutoRoll(spell);
  const summary = `${playerName} conjurou ${spell.icon || "✨"} ${spell.name} usando 1 slot de nível ${spell.level}.`;
  const detailsLine = [spell.description || "", detailsText].filter(Boolean).join(" • ");

  pushAction(currentUser, summary);
  if (detailsLine) pushAction(currentUser, `Detalhes da magia: ${detailsLine}`);
  if (rollText) pushAction(currentUser, rollText);

  if (grimoireTargetName === playerName) renderGrimoire(p);
  updateArena();
}

function sendMessage() {
  let input = document.getElementById("messageInput");
  let text = input.value.trim();
  if (!text) return;

  if (handleRollCommand(text)) {
    input.value = "";
    return;
  }

  const sender = resolveSenderIdentity();
  pushChat(sender.label, text, {
    senderType: sender.senderType,
    senderProfile: sender.senderProfile,
  });
  input.value = "";
  clearReplyState();
  updateChat();
}


function formatTimestampBR(value) {
  const d = new Date(Number(value) || Date.now());
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildSessionReportText(roomChat) {
  const lines = [];
  const generatedAt = formatTimestampBR(Date.now());
  lines.push(`Relatório da Sessão - Sala: ${room}`);
  lines.push(`Gerado em: ${generatedAt}`);
  lines.push("");

  roomChat.forEach((msg, index) => {
    const stamp = formatTimestampBR(msg.createdAt);
    const replyPrefix = msg.replyTo ? "↳ resposta | " : "";
    const kind = msg.senderType === "character"
      ? "Fala"
      : msg.senderType === "profile"
        ? "Intenção"
        : msg.senderType === "system"
          ? "Sistema"
          : "Conversa";

    lines.push(`${index + 1}. [${stamp}] ${replyPrefix}${kind} - ${msg.user}`);
    lines.push(msg.text);

    const reactions = Object.entries(msg.reactions || {})
      .map(([emoji, users]) => `${emoji} x${Array.isArray(users) ? users.length : 0}`)
      .filter((part) => !part.endsWith("x0"));
    if (reactions.length) {
      lines.push(`Reações: ${reactions.join(" | ")}`);
    }

    lines.push("");
  });

  if (roomChat.length === 0) {
    lines.push("Nenhuma mensagem registrada nesta sessão.");
  }

  return lines.join("\n");
}

function buildSessionReportHtml(reportText) {
  const safeText = escapeHtml(reportText).replaceAll("\n", "<br>");
  return `
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Relatório da Sessão</title>
        <style>
          @page { size: A4; margin: 16mm; }
          body {
            font-family: "Segoe UI", Arial, sans-serif;
            color: #111;
            line-height: 1.5;
            font-size: 12px;
            white-space: normal;
          }
          h1 {
            margin: 0 0 10px;
            font-size: 18px;
          }
          .content {
            border-top: 1px solid #ddd;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <h1>Relatório da Sessão</h1>
        <div class="content">${safeText}</div>
      </body>
    </html>
  `;
}

function exportChatReportPDF() {
  const data = load();
  const roomChat = getRoomChat(data, room);
  const reportText = buildSessionReportText(roomChat);
  const reportHtml = buildSessionReportHtml(reportText);

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    alert("Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-up está ativo.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(reportHtml);
  printWindow.document.close();

  const runPrint = () => {
    printWindow.focus();
    printWindow.print();
  };

  if (printWindow.document.readyState === "complete") {
    runPrint();
  } else {
    printWindow.onload = runPrint;
  }
}

function clampDiceCount(value) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return 1;
  return Math.min(20, Math.max(1, n));
}

function rollPool(count, sides) {
  const rolls = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }
  const total = rolls.reduce((sum, n) => sum + n, 0);
  return { count, sides, rolls, total };
}

function parseDiceExpression(rawExpression) {
  const expression = (rawExpression || "").toLowerCase().replace(/\s+/g, "");
  if (!expression) return null;

  const allowedSides = new Set([4, 6, 8, 10, 12, 20, 100]);
  const parts = expression.split("+").filter(Boolean);
  if (parts.length === 0) return null;

  const pools = [];
  for (const part of parts) {
    const m = part.match(/^(\d*)d(\d+)$/);
    if (!m) return null;

    const rawCount = m[1] || "1";
    const sides = parseInt(m[2], 10);
    if (!allowedSides.has(sides)) return null;

    const count = clampDiceCount(rawCount);
    pools.push({ count, sides });
  }
  return pools;
}

function formatRollAction(pools, sourceExpression) {
  const rolled = pools.map((p) => rollPool(p.count, p.sides));
  const total = rolled.reduce((sum, p) => sum + p.total, 0);
  const details = rolled
    .map((p) => `${p.count}d${p.sides}=[${p.rolls.join(",")}]`)
    .join(" + ");
  return `rolou ${sourceExpression} → ${details} = ${total}`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderRollDetails(actionText) {
  const m = actionText.match(/^rolou\s+(.+?)\s+→\s+(.+?)\s+=\s+(-?\d+)$/i);
  if (!m) return null;

  const expression = m[1];
  const detailsRaw = m[2];
  const total = m[3];

  const pools = detailsRaw
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const poolMatch = part.match(/^(\d+d\d+)=\[([^\]]*)\]$/i);
      if (!poolMatch) return null;
      return {
        dice: poolMatch[1],
        rolls: poolMatch[2],
      };
    })
    .filter(Boolean);

  if (!pools.length) return null;

  const chips = pools
    .map(
      (pool) =>
        `<span class="rollPool"><span class="rollDice">${escapeHtml(pool.dice)}</span> <span class="rollValues">[${escapeHtml(pool.rolls)}]</span></span>`
    )
    .join("");

  return `
    <div class="rollSummary">
      <span class="rollExpr">${escapeHtml(expression)}</span>
      <span class="rollTotalLabel">Total</span>
      <span class="rollTotal">${escapeHtml(total)}</span>
    </div>
    <div class="rollPools">${chips}</div>
  `;
}

function handleRollCommand(text) {
  const cmd = text.match(/^\/(r|roll)\s*(.*)$/i);
  if (!cmd) return false;

  const expression = (cmd[2] || "").trim();
  const pools = parseDiceExpression(expression);
  if (!pools) {
    pushChat("Sistema", "Uso: /roll 2d6 + 1d4 (dados: d4,d6,d8,d10,d12,d20,d100)");
    return true;
  }

  const normalized = pools.map((p) => `${p.count}d${p.sides}`).join(" + ");
  pushAction(currentUser, formatRollAction(pools, normalized));
  return true;
}

function rollDiceFromTray(sides) {
  const input = document.getElementById(`diceCount${sides}`);
  const count = clampDiceCount(input?.value || "1");
  if (input) input.value = String(count);

  const pools = [{ count, sides }];
  pushAction(currentUser, formatRollAction(pools, `${count}d${sides}`));
}

function setDiceTrayOpen(open) {
  const tray = document.getElementById("diceTray");
  const toggle = document.getElementById("diceTrayToggle");
  if (!tray || !toggle) return;

  tray.classList.toggle("collapsed", !open);
  tray.setAttribute("aria-hidden", String(!open));
  toggle.setAttribute("aria-expanded", String(open));
}

function toggleDiceTray() {
  const tray = document.getElementById("diceTray");
  if (!tray) return;
  setDiceTrayOpen(tray.classList.contains("collapsed"));
}

function closeDiceTray() {
  setDiceTrayOpen(false);
}

document.getElementById("messageInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function setReplyTarget(messageId) {
  pendingReplyId = messageId;
  renderReplyPreview();
  document.getElementById("messageInput")?.focus();
}

function renderReplyPreview() {
  const box = document.getElementById("replyPreview");
  if (!box) return;

  if (!pendingReplyId) {
    box.classList.add("hidden");
    box.innerHTML = "";
    return;
  }

  const data = load();
  const roomChat = getRoomChat(data, room);
  const original = roomChat.find((m) => m.id === pendingReplyId);
  if (!original) {
    pendingReplyId = null;
    box.classList.add("hidden");
    box.innerHTML = "";
    return;
  }

  box.classList.remove("hidden");
  box.innerHTML = `<div class="replyPreviewHeader">Respondendo <strong>${escapeHtml(original.user)}</strong></div><div class="replyPreviewText">${escapeHtml(original.text)}</div><button type="button" onclick="clearReplyState()">Cancelar</button>`;
}

function toggleReaction(messageId, emoji) {
  let data = load();
  const roomChat = getRoomChat(data, room);
  const msg = roomChat.find((m) => m.id === messageId);
  if (!msg) return;

  if (!msg.reactions || typeof msg.reactions !== "object") msg.reactions = {};
  if (!Array.isArray(msg.reactions[emoji])) msg.reactions[emoji] = [];

  const already = msg.reactions[emoji].includes(currentUser);
  if (already) {
    msg.reactions[emoji] = msg.reactions[emoji].filter((u) => u !== currentUser);
  } else {
    msg.reactions[emoji].push(currentUser);
  }

  if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];

  save(data);
  updateChat();
}

function closeChatContextMenu() {
  const existing = document.getElementById("chatContextMenu");
  if (existing) existing.remove();
  if (typeof chatContextCleanup === "function") {
    chatContextCleanup();
    chatContextCleanup = null;
  }
}

function openChatContextMenu(messageId, x, y) {
  closeChatContextMenu();

  const menu = document.createElement("div");
  menu.id = "chatContextMenu";
  menu.className = "chatContextMenu";
  menu.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  const replyBtn = document.createElement("button");
  replyBtn.type = "button";
  replyBtn.textContent = "Responder";
  replyBtn.onclick = () => {
    setReplyTarget(messageId);
    closeChatContextMenu();
  };
  menu.appendChild(replyBtn);

  const reactionWrap = document.createElement("div");
  reactionWrap.className = "chatContextReactions";
  QUICK_REACTIONS.forEach((emoji) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = emoji;
    btn.title = `Reagir com ${emoji}`;
    btn.onclick = () => {
      toggleReaction(messageId, emoji);
      closeChatContextMenu();
    };
    reactionWrap.appendChild(btn);
  });
  menu.appendChild(reactionWrap);

  document.body.appendChild(menu);

  const rect = menu.getBoundingClientRect();
  const margin = 10;
  const left = Math.min(x, window.innerWidth - rect.width - margin);
  const top = Math.min(y, window.innerHeight - rect.height - margin);
  menu.style.left = `${Math.max(margin, left)}px`;
  menu.style.top = `${Math.max(margin, top)}px`;

  const onWindowClick = (event) => {
    if (!menu.contains(event.target)) closeChatContextMenu();
  };
  const onEsc = (event) => {
    if (event.key === "Escape") closeChatContextMenu();
  };

  window.addEventListener("click", onWindowClick);
  window.addEventListener("pointerdown", onWindowClick);
  window.addEventListener("keydown", onEsc);

  chatContextCleanup = () => {
    window.removeEventListener("click", onWindowClick);
    window.removeEventListener("pointerdown", onWindowClick);
    window.removeEventListener("keydown", onEsc);
  };
}

function toggleEmojiPicker() {
  const picker = document.getElementById("emojiPicker");
  if (!picker) return;
  picker.classList.toggle("hidden");
}

function addEmojiToInput(emoji) {
  const input = document.getElementById("messageInput");
  if (!input) return;
  input.value = `${input.value}${emoji}`;
  input.focus();
}

function refreshSenderSelect() {
  const select = document.getElementById("chatSenderSelect");
  if (!select) return;

  const data = load();
  const profiles = getRoomChatProfiles(data, room);

  const options = [
    { value: "player", label: `👤 Jogador (${currentUser})` },
    { value: "character", label: "🎭 Personagem" },
    ...profiles.map((name) => ({ value: `profile:${name}`, label: `🧩 ${name}` })),
  ];

  select.innerHTML = options
    .map((opt) => `<option value="${escapeHtml(opt.value)}">${escapeHtml(opt.label)}</option>`)
    .join("");

  if (!options.some((opt) => opt.value === chatSenderKey)) chatSenderKey = "player";
  select.value = chatSenderKey;
}

function addChatProfile() {
  const input = document.getElementById("chatProfileName");
  const name = String(input?.value || "").trim();
  if (!name) return;

  let data = load();
  const profiles = getRoomChatProfiles(data, room);
  if (!profiles.includes(name)) profiles.push(name);
  save(data);

  chatSenderKey = `profile:${name}`;
  input.value = "";
  refreshSenderSelect();
}

function updateChat() {
  let data = load();
  const roomChat = getRoomChat(data, room);
  let chatBox = document.getElementById("chat");
  chatBox.innerHTML = "";

  roomChat.forEach((msg) => {
    let div = document.createElement("div");
    div.className = "chatMessage";
    div.title = "Botão direito ou ⋯ para responder e reagir";
    div.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openChatContextMenu(msg.id, event.clientX, event.clientY);
    });

    const actionsBtn = document.createElement("button");
    actionsBtn.type = "button";
    actionsBtn.className = "chatMessageMenuBtn";
    actionsBtn.textContent = "⋯";
    actionsBtn.title = "Responder ou reagir";
    actionsBtn.onclick = (event) => {
      event.stopPropagation();
      const rect = actionsBtn.getBoundingClientRect();
      openChatContextMenu(msg.id, rect.left + rect.width / 2, rect.bottom + 6);
    };
    div.appendChild(actionsBtn);
    const safeUser = escapeHtml(msg.user);
    const safeText = escapeHtml(msg.text);

    if (msg.replyTo) {
      const original = roomChat.find((candidate) => candidate.id === msg.replyTo);
      if (original) {
        const replyDiv = document.createElement("div");
        replyDiv.className = "chatReplyRef";
        replyDiv.innerHTML = `<strong>${escapeHtml(original.user)}</strong>: ${escapeHtml(original.text)}`;
        div.appendChild(replyDiv);
      }
    }

    const content = document.createElement("div");

    if (msg.text.startsWith("*")) {
      div.classList.add("chatAction");
      const actionText = msg.text.replace(/^\*\s*/, "");
      const rollHtml = renderRollDetails(actionText);
      if (rollHtml) {
        div.classList.add("chatRoll");
        content.innerHTML = `<div class="chatActionHead"><strong>${safeUser}</strong> <span>rolou</span></div>${rollHtml}`;
      } else {
        content.innerHTML = `<strong>${safeUser}</strong> ${safeText}`;
      }
    } else if (msg.text.startsWith("(")) {
      div.classList.add("chatOOC");
      content.innerHTML = safeText;
    } else {
      div.classList.add("chatSpeak");
      content.innerHTML = `<strong>${safeUser}:</strong> ${safeText}`;
    }

    div.appendChild(content);

    const reactionSummary = document.createElement("div");
    reactionSummary.className = "chatReactionSummary";
    QUICK_REACTIONS.forEach((emoji) => {
      const users = Array.isArray(msg.reactions?.[emoji]) ? msg.reactions[emoji] : [];
      if (!users.length) return;
      const mine = users.includes(currentUser);
      const chip = document.createElement("span");
      chip.className = `chatReactionChip ${mine ? "mine" : ""}`;
      chip.textContent = `${emoji} ${users.length}`;
      reactionSummary.appendChild(chip);
    });
    if (reactionSummary.children.length > 0) div.appendChild(reactionSummary);

    chatBox.appendChild(div);
  });

  closeChatContextMenu();
  renderReplyPreview();
  chatBox.scrollTop = chatBox.scrollHeight;
  save(data);
}

function initChatComposer() {
  const picker = document.getElementById("emojiPicker");
  if (picker) {
    picker.innerHTML = PICKER_EMOJIS.map((emoji) => `<button type="button" onclick="addEmojiToInput('${emoji}')">${emoji}</button>`).join("");
  }

  const select = document.getElementById("chatSenderSelect");
  if (select) {
    select.onchange = () => {
      chatSenderKey = select.value;
    };
  }

  refreshSenderSelect();
  renderReplyPreview();
}

/* ================= ITENS ================= */
function getEquippedItemIds(p) {
  const eq = p.equipped || {};
  return Object.values(eq).filter(Boolean);
}
function computeItemMods(p) {
  const ids = getEquippedItemIds(p);
  const mods = {
    str: 0,
    dex: 0,
    spr: 0,
    defense: 0,
    hpMax: 0,
    manaMax: 0,
    invExtra: 0,
  };
  ids.forEach((id) => {
    const it = ITEM_DB[id];
    if (!it || !it.mods) return;
    if (it.mods.str) mods.str += it.mods.str;
    if (it.mods.dex) mods.dex += it.mods.dex;
    if (it.mods.spr) mods.spr += it.mods.spr;
    if (it.mods.defense) mods.defense += it.mods.defense;
    if (it.mods.hpMax) mods.hpMax += it.mods.hpMax;
    if (it.mods.manaMax) mods.manaMax += it.mods.manaMax;
    if (it.mods.invExtra) mods.invExtra += it.mods.invExtra;
  });
  return mods;
}
function invCount(p) {
  return (p.inventory || []).length;
}
function invMax(p) {
  return p.invMax || 12;
}

function addItemToPlayer(p, itemId) {
  if (!itemId) return { ok: false, msg: "Item não existe" };
  if (invCount(p) >= invMax(p)) return { ok: false, msg: "Inventário cheio" };
  p.inventory.push(itemId);
  return { ok: true };
}
function removeItemFromPlayer(p, itemId) {
  const idx = (p.inventory || []).findIndex((entry) => {
    const it = resolveInventoryItem(entry);
    return it && it.id === itemId;
  });
  if (idx >= 0) p.inventory.splice(idx, 1);
}
function equipItem(p, itemId) {
  const it = ITEM_DB[itemId];
  if (!it || !it.equipSlot) return;
  const hasItem = (p.inventory || []).some((entry) => {
    const invIt = resolveInventoryItem(entry);
    return invIt && invIt.id === itemId;
  });
  if (!hasItem) return;
  p.equipped[it.equipSlot] = itemId;
}
function unequipSlot(p, slot) {
  if (!p.equipped) return;
  p.equipped[slot] = null;
}
function useConsumable(p, itemId) {
  const it = ITEM_DB[itemId];
  if (!it || !it.consume) return { ok: false };
  const idx = (p.inventory || []).findIndex((entry) => {
    const invIt = resolveInventoryItem(entry);
    return invIt && invIt.id === itemId;
  });
  if (idx < 0) return { ok: false };

  if (it.consume.hp) {
    p.hp = Math.max(0, Math.min(p.hpMax, p.hp + it.consume.hp));
  }
  if (it.consume.mana) {
    p.mana = Math.max(0, Math.min(p.manaMax, p.mana + it.consume.mana));
  }
  p.inventory.splice(idx, 1);
  return { ok: true };
}

/* ================= REGRAS / RECALC ================= */
function ensureMageFreeWeapon(p) {
  if (p.class !== "Mago") return;
  if (!p.inventory) p.inventory = [];
  if (!p.inventory.includes("icebolt")) p.inventory.push("icebolt");
  if (!p.inventory.includes("firebolt")) p.inventory.push("firebolt");
  if (!p.equipped) p.equipped = createEmptyEquipped();
  if (!p.equipped.weapon) p.equipped.weapon = "icebolt";
}

function recalcFromSheet(p) {
  const race = RACES[p.race] || RACES.Humano;
  const cls = CLASSES[p.class] || CLASSES.Guerreiro;
  const bg = BACKGROUNDS[p.background] || BACKGROUNDS.Nenhum;

  let level = parseInt(p.level, 10);
  if (isNaN(level) || level < 1) level = 1;
  p.level = level;

  ensureMageFreeWeapon(p);

  p.attributeScores = normalizeAttributeScores(p.attributeScores);
  const totalCost = totalPointBuyCost(p.attributeScores);
  if (totalCost > POINT_BUY_BUDGET) {
    p.attributeScores = defaultAttributeScores();
  }

  const mods = defaultAttributeMods();
  ATTRIBUTES.forEach((attr) => {
    mods[attr.id] = scoreToMod(p.attributeScores[attr.id]);
  });

  [...(race.abilityBonuses || []), ...(bg.abilityBonuses || [])].forEach((entry) => {
    if (!entry || !mods.hasOwnProperty(entry.ability)) return;
    mods[entry.ability] += parseInt(entry.modDelta || 0, 10) || 0;
  });

  const itemMods = computeItemMods(p);
  mods.str += itemMods.str;
  mods.dex += itemMods.dex;
  mods.wis += itemMods.spr;

  p.attributeMods = mods;

  let hpMax = 10 + (mods.con + 2) * 3 + cls.hpMod + (level - 1) * 2;
  let manaMax = 5 + (mods.int + mods.wis + 2) * 2 + cls.manaMod + (level - 1) * 2;

  if (p.race === "Anao") hpMax += level * 2;

  hpMax += itemMods.hpMax;
  manaMax += itemMods.manaMax;

  hpMax = Math.max(1, hpMax);
  manaMax = Math.max(0, manaMax);

  const hpRatio = p.hpMax > 0 ? p.hp / p.hpMax : 1;
  const manaRatio = p.manaMax > 0 ? p.mana / p.manaMax : 1;

  p.hpMax = hpMax;
  p.manaMax = manaMax;

  p.hp = Math.round(Math.max(0, Math.min(p.hpMax, p.hpMax * hpRatio)));
  p.mana = Math.round(Math.max(0, Math.min(p.manaMax, p.manaMax * manaRatio)));

  p.defense = 10 + mods.dex + (itemMods.defense || 0);
  p.proficiencyBonus = computeProficiencyBonus(level);
  p.skillProficiencies = Array.from(new Set([...(p.skillProficiencies || []), ...(bg.skillProficiencies || [])]));
  p.skills = [...(race.abilities || []), ...(cls.abilities || [])];
  p.invMax = 12 + (itemMods.invExtra || 0);
  syncSpellcasting(p);
}

/* ================= CREATE USER ================= */
data = load();
if (!data.rooms[room][currentUser]) {
  const s = data.scenes[room];
  data.rooms[room][currentUser] = {
    x: Math.floor(Math.random() * s.cols),
    y: Math.floor(Math.random() * s.rows),
    hp: 100,
    hpMax: 100,
    mana: 50,
    manaMax: 50,
    race: "Humano",
    class: "Guerreiro",
    background: "Nenhum",
    level: 1,
    owner: "",
    attributeScores: defaultAttributeScores(),
    attributeMods: defaultAttributeMods(),
    skillProficiencies: [],
    expertiseSkills: [],
    skills: [],
    gold: 60,
    inventory: ["potion_healing"],
    equipped: createEmptyEquipped(),
    color: randomColor(),
    onTable: true,
  };
  ensurePlayerSchema(data.rooms[room][currentUser]);
  recalcFromSheet(data.rooms[room][currentUser]);
  save(data);
} else {
  ensurePlayerSchema(data.rooms[room][currentUser]);
  recalcFromSheet(data.rooms[room][currentUser]);
  save(data);
}

/* ================= GRID ================= */
const arena = document.getElementById("arena");
function createGrid() {
  ensureScene();
  const s = load().scenes[room];
  arena.innerHTML = "";
  applySceneCSS();

  for (let y = 0; y < s.rows; y++) {
    for (let x = 0; x < s.cols; x++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.x = x;
      cell.dataset.y = y;
      arena.appendChild(cell);
    }
  }
}

/* ================= RENDER ================= */
function updateArena() {
  ensureScene();
  let data = load();
  let players = data.rooms[room];
  const s = data.scenes[room];

  applySceneCSS();

  let cells = [...document.querySelectorAll(".cell")];
  // aplica tiles nas células
  for (const cell of cells) {
    const x = parseInt(cell.dataset.x, 10);
    const y = parseInt(cell.dataset.y, 10);
    const t = s.tiles[tileIndex(x, y)] || "floor";
    cell.classList.remove("tile-floor", "tile-wall", "tile-void");
    cell.classList.add("tile-" + t);
    cell.innerHTML = "";
  }

  // tokens
  Object.keys(players).forEach((name) => {
    let p = players[name];
    ensurePlayerSchema(p);
    recalcFromSheet(p);

    if (!p.onTable) return;

    // se cair em wall/void, ajusta pra floor mais próximo (bem simples)
    if (getTile(p.x, p.y) !== "floor") {
      const found = findNearestFloor(p.x, p.y);
      if (found) {
        p.x = found.x;
        p.y = found.y;
      }
    }

    const idx = tileIndex(p.x, p.y);
    const cell = cells[idx];
    if (!cell) return;

    let token = document.createElement("div");
    token.className = "token";
    token.style.background = p.color;
    token.innerText = name[0].toUpperCase();

    token.onclick = (e) => {
      e.stopPropagation();
      showMenu(name, token);
    };

    // HP bar
    let hpBar = document.createElement("div");
    hpBar.className = "bar";
    hpBar.style.bottom = "-4px";
    let hpFill = document.createElement("div");
    hpFill.className = "hpFill";
    let hpPercent = p.hpMax > 0 ? (p.hp / p.hpMax) * 100 : 0;
    hpFill.style.width = hpPercent + "%";
    hpBar.appendChild(hpFill);
    token.appendChild(hpBar);

    // Mana bar
    let manaBar = document.createElement("div");
    manaBar.className = "bar";
    manaBar.style.bottom = "-10px";
    let manaFill = document.createElement("div");
    manaFill.className = "manaFill";
    let manaPercent = p.manaMax > 0 ? (p.mana / p.manaMax) * 100 : 0;
    manaFill.style.width = manaPercent + "%";
    manaBar.appendChild(manaFill);
    token.appendChild(manaBar);

    cell.appendChild(token);
  });

  updateSidebar(players);
  const activePlayerName = players[currentUser]
    ? currentUser
    : (players[grimoireTargetName] ? grimoireTargetName : Object.keys(players)[0]);
  const activePlayer = activePlayerName ? players[activePlayerName] : null;
  renderCombatSpellSlots(activePlayerName, activePlayer);

  // modais
  if (sheetTargetName) {
    const p = load().rooms[room][sheetTargetName];
    if (p) {
      ensurePlayerSchema(p);
      recalcFromSheet(p);
      renderSheetComputed(p);
      renderEquip(p);
      renderAbilities(p);
    }
  }
  if (invTargetName) {
    const p = load().rooms[room][invTargetName];
    if (p) {
      ensurePlayerSchema(p);
      recalcFromSheet(p);
      renderInventoryModal(p);
    }
  }
}

function renderCombatSpellSlots(playerName, player) {
  const wrap = document.getElementById("combatSpellSlots");
  if (!wrap) return;

  if (!player) {
    wrap.innerHTML = "";
    return;
  }

  ensurePlayerSchema(player);
  const slots = normalizeQuickSpellSlots(player.spellSlots);
  wrap.innerHTML = slots.map((spellId, idx) => {
    const spell = (player.customSpells || []).find((s) => s.id === spellId);
    if (!spell) {
      return `<button class="combatSlot empty" type="button" title="Slot ${idx + 1} vazio">+</button>`;
    }
    return `
      <button class="combatSlot" type="button" title="${escapeHtml(spell.name)}" onclick="castSpellForPlayer('${escapeHtml(playerName || '')}','${spell.id}')">
        <span class="slotIcon">${spell.icon || "✨"}</span>
        <span class="slotIndex">${idx + 1}</span>
        <div class="combatSlotTooltip">${spellToCardHtml(spell)}</div>
      </button>
    `;
  }).join("");
}

/* ================= nearest floor ================= */
function findNearestFloor(x0, y0) {
  const s = load().scenes[room];
  const maxR = Math.max(s.cols, s.rows);
  for (let r = 0; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = x0 + dx;
        const y = y0 + dy;
        if (x < 0 || y < 0 || x >= s.cols || y >= s.rows) continue;
        if (getTile(x, y) === "floor") return { x, y };
      }
    }
  }
  return null;
}

/* ================= SIDEBAR ================= */
function updateSidebar(players) {
  let party = document.getElementById("party");
  party.innerHTML = "";

  Object.keys(players).forEach((name) => {
    let p = players[name];
    ensurePlayerSchema(p);
    recalcFromSheet(p);

    const hpPct = p.hpMax > 0 ? (p.hp / p.hpMax) * 100 : 0;
    const mpPct = p.manaMax > 0 ? (p.mana / p.manaMax) * 100 : 0;

    let card = document.createElement("div");
    card.className = "playerCard";

    card.onclick = (e) => {
      e.stopPropagation();
      showMenu(name, card);
    };

    const ownerTxt = p.owner ? ` <span>(${p.owner})</span>` : "";

    card.innerHTML = `
      <div class="miniToken" style="background:${p.color}">
        ${name[0].toUpperCase()}
      </div>
      <div class="playerMain">
        <div class="playerName">${name}${ownerTxt}</div>

        <div class="statRow">
          <div class="statLabel">HP</div>
          <div class="miniBar"><div class="miniHP" style="width:${hpPct}%"></div></div>
          <div class="statValue">${p.hp}/${p.hpMax}</div>
        </div>

        <div class="statRow">
          <div class="statLabel">MP</div>
          <div class="miniBar"><div class="miniMana" style="width:${mpPct}%"></div></div>
          <div class="statValue">${p.mana}/${p.manaMax}</div>
        </div>
      </div>
    `;

    if (!p.onTable) {
      const btn = document.createElement("div");
      btn.className = "addToTableBtn";
      btn.title = "Adicionar de volta à mesa";
      btn.textContent = "➕";
      btn.onclick = (e) => {
        e.stopPropagation();
        addBackToTable(name);
      };
      card.appendChild(btn);
    }

    party.appendChild(card);
  });

}

/* ================= MOVIMENTO (setas + colisão) ================= */
document.addEventListener("keydown", (e) => {
  if (document.activeElement && document.activeElement.id === "messageInput")
    return;

  let data = load();
  let p = data.rooms[room][currentUser];
  if (!p) return;
  ensurePlayerSchema(p);

  if (!p.onTable) return;

  let nx = p.x;
  let ny = p.y;

  if (e.key === "ArrowUp") ny--;
  if (e.key === "ArrowDown") ny++;
  if (e.key === "ArrowLeft") nx--;
  if (e.key === "ArrowRight") nx++;

  const s = data.scenes[room];
  if (nx < 0 || ny < 0 || nx >= s.cols || ny >= s.rows) return;

  // colisão
  const tile = data.scenes[room].tiles[tileIndex(nx, ny)] || "floor";
  if (tile !== "floor") {
    // feedback leve: pisca a célula destino
    flashCell(nx, ny);
    return;
  }

  p.x = nx;
  p.y = ny;

  save(data);
  updateArena();
});

function flashCell(x, y) {
  const idx = tileIndex(x, y);
  const cell = document.querySelectorAll(".cell")[idx];
  if (!cell) return;
  cell.animate(
    [
      { transform: "scale(1)", filter: "brightness(1)" },
      { transform: "scale(1.02)", filter: "brightness(1.35)" },
      { transform: "scale(1)", filter: "brightness(1)" },
    ],
    { duration: 220, easing: "ease-out" },
  );
}

/* ================= MENU ================= */
function showMenu(name, element) {
  removeMenu();

  let menu = document.createElement("div");
  menu.className = "floatingMenu";

  const actions = [
    { icon: "🎒", title: "Inventário", run: () => openInventory(name) },
    { icon: "📜", title: "Ficha", run: () => openSheet(name) },
    { icon: "📖", title: "Grimório", run: () => openGrimoire(name) },
    { icon: "❤️", title: "HP (+/-)", run: () => editStat(name, "hp") },
    { icon: "🔵", title: "MP (+/-)", run: () => editStat(name, "mana") },
    { icon: "🗑️", title: "Remover da mesa", run: () => removeFromTable(name) },
  ];

  actions.forEach((action) => {
    const btn = document.createElement("div");
    btn.className = "menuBtn";
    btn.title = action.title;
    btn.textContent = action.icon;
    btn.onclick = (evt) => {
      evt.stopPropagation();
      action.run();
    };
    menu.appendChild(btn);
  });

  document.body.appendChild(menu);

  const rect = element.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  const margin = 8;

  let left = rect.left + rect.width / 2 - menuRect.width / 2;
  let top = rect.top - menuRect.height - 10;

  if (top < margin) {
    top = rect.bottom + 10;
  }

  left = Math.max(margin, Math.min(left, window.innerWidth - menuRect.width - margin));
  top = Math.max(margin, Math.min(top, window.innerHeight - menuRect.height - margin));

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;

  setTimeout(() => {
    document.addEventListener("click", removeMenu);
  }, 10);
}
function removeMenu() {
  let old = document.querySelector(".floatingMenu");
  if (old) old.remove();
  document.removeEventListener("click", removeMenu);
}

/* ================= MESA: remove/add ================= */
function removeFromTable(name) {
  let data = load();
  let p = data.rooms[room][name];
  if (!p) return;
  ensurePlayerSchema(p);
  p.onTable = false;
  save(data);
  removeMenu();
  updateArena();
}
function addBackToTable(name) {
  let data = load();
  let p = data.rooms[room][name];
  if (!p) return;
  ensurePlayerSchema(p);

  const s = data.scenes[room];
  const found = findNearestFloor(
    Math.floor(s.cols / 2),
    Math.floor(s.rows / 2),
  );
  if (found) {
    p.x = found.x;
    p.y = found.y;
  }
  p.onTable = true;

  save(data);
  updateArena();
}

/* ================= EDIT HP/MP (delta) ================= */
function editStat(name, stat) {
  let data = load();
  let p = data.rooms[room][name];
  if (!p) return;
  ensurePlayerSchema(p);
  recalcFromSheet(p);

  let v = prompt(
    `Digite um valor para ${stat.toUpperCase()} (ex: -20 ou +10):`,
    "-10",
  );
  if (v === null) return;

  let delta = parseInt(v, 10);
  if (isNaN(delta)) return;

  if (stat === "hp") {
    p.hp = Math.max(0, Math.min(p.hpMax, p.hp + delta));
  } else {
    p.mana = Math.max(0, Math.min(p.manaMax, p.mana + delta));
  }

  save(data);
  updateArena();
}

/* ================= FICHA ================= */
let sheetTargetName = null;

function closeAllCharacterModals() {
  const sheet = document.getElementById("sheetOverlay");
  const inv = document.getElementById("invOverlay");
  const grim = document.getElementById("grimoireOverlay");
  if (sheet) sheet.style.display = "none";
  if (inv) inv.style.display = "none";
  if (grim) grim.style.display = "none";
  sheetTargetName = null;
  invTargetName = null;
  grimoireTargetName = null;
}

function openSheet(name) {
  if (!name) return;
  removeMenu();
  const invOpen = document.getElementById("invOverlay").style.display === "flex";
  const grimOpen = document.getElementById("grimoireOverlay").style.display === "flex";
  if (invOpen || grimOpen) closeAllCharacterModals();

  let data = load();
  let p = data.rooms[room][name];
  if (!p) return;

  ensurePlayerSchema(p);
  recalcFromSheet(p);
  save(data);

  sheetTargetName = name;

  const raceSel = document.getElementById("sheetRace");
  const classSel = document.getElementById("sheetClass");
  const bgSel = document.getElementById("sheetBackground");
  raceSel.innerHTML = Object.keys(RACES)
    .map((r) => `<option value="${r}">${r}</option>`)
    .join("");
  classSel.innerHTML = Object.keys(CLASSES)
    .map((c) => `<option value="${c}">${c}</option>`)
    .join("");
  bgSel.innerHTML = Object.keys(BACKGROUNDS)
    .map((b) => `<option value="${b}">${b}</option>`)
    .join("");

  document.getElementById("sheetTitle").textContent = `Ficha — ${name}`;
  document.getElementById("sheetSub").textContent =
    `Equipados ficam aqui. Inventário/Loja ficam no 🎒.`;

  document.getElementById("sheetOwner").value = p.owner || "";
  document.getElementById("sheetLevel").value = p.level || 1;
  raceSel.value = p.race;
  classSel.value = p.class;
  bgSel.value = p.background || "Nenhum";

  renderPointBuy(p);
  renderSheetComputed(p);
  renderSkills(p);
  renderEquip(p);
  renderAbilities(p);

  raceSel.onchange = () => previewSheet();
  classSel.onchange = () => previewSheet();
  bgSel.onchange = () => previewSheet();
  document.getElementById("sheetLevel").oninput = () => previewSheet();

  document.getElementById("sheetOverlay").style.display = "flex";
}

function previewSheet() {
  if (!sheetTargetName) return;
  let data = load();
  let p = data.rooms[room][sheetTargetName];
  if (!p) return;
  ensurePlayerSchema(p);

  p.race = document.getElementById("sheetRace").value;
  p.class = document.getElementById("sheetClass").value;
  p.background = document.getElementById("sheetBackground").value;
  p.level = parseInt(document.getElementById("sheetLevel").value || "1", 10);
  p.attributeScores = readPointBuyFromUI();
  const { profs, exps } = collectSkillFlags();
  p.skillProficiencies = profs;
  p.expertiseSkills = exps;
  recalcFromSheet(p);
  save(data);

  renderPointBuy(p);
  renderSheetComputed(p);
  renderSkills(p);
  renderEquip(p);
  renderAbilities(p);
  updateArena();
}

function readPointBuyFromUI() {
  const scores = defaultAttributeScores();
  ATTRIBUTES.forEach((attr) => {
    const input = document.getElementById(`attrScore_${attr.id}`);
    scores[attr.id] = normalizeScore(input ? input.value : 8);
  });
  return scores;
}

function renderPointBuy(p) {
  const wrap = document.getElementById("sheetPointBuy");
  wrap.innerHTML = ATTRIBUTES.map((attr) => {
    const score = p.attributeScores[attr.id];
    return `
      <div class="pointRow">
        <div class="pointLabel">${attr.short}</div>
        <input id="attrScore_${attr.id}" type="number" min="8" max="15" step="1" value="${score}" />
      </div>
    `;
  }).join("");

  ATTRIBUTES.forEach((attr) => {
    const input = document.getElementById(`attrScore_${attr.id}`);
    if (input) input.oninput = () => previewSheet();
  });
}

function renderSkills(p) {
  const profSet = new Set(p.skillProficiencies || []);
  const expSet = new Set(p.expertiseSkills || []);
  const prof = p.proficiencyBonus || 2;
  const wrap = document.getElementById("sheetSkills");

  wrap.innerHTML = SKILLS.map((skill) => {
    const trained = profSet.has(skill.id);
    const expert = expSet.has(skill.id);
    const attrMod = p.attributeMods[skill.ability] || 0;
    const bonus = attrMod + (expert ? prof * 2 : trained ? prof : 0);
    return `
      <label class="skillRow">
        <div class="skillMain">
          <input type="checkbox" data-skill-prof="${skill.id}" ${trained ? "checked" : ""} />
          <span>${skill.name}</span>
          <small>(${abilityShort(skill.ability)})</small>
        </div>
        <div class="skillMeta">
          <input type="checkbox" data-skill-exp="${skill.id}" ${expert ? "checked" : ""} ${trained ? "" : "disabled"} title="Especialização" />
          <strong>${fmtMod(bonus)}</strong>
        </div>
      </label>
    `;
  }).join("");

  wrap.querySelectorAll("input[data-skill-prof]").forEach((el) => {
    el.onchange = () => previewSheet();
  });
  wrap.querySelectorAll("input[data-skill-exp]").forEach((el) => {
    el.onchange = () => previewSheet();
  });
}

function collectSkillFlags() {
  const profs = [];
  const exps = [];
  document.querySelectorAll("input[data-skill-prof]").forEach((el) => {
    if (el.checked) profs.push(el.dataset.skillProf);
  });
  document.querySelectorAll("input[data-skill-exp]").forEach((el) => {
    if (el.checked) exps.push(el.dataset.skillExp);
  });
  return { profs, exps };
}

function renderSheetComputed(p) {
  document.getElementById("statSTR").textContent = fmtMod(p.attributeMods.str || 0);
  document.getElementById("statDEX").textContent = fmtMod(p.attributeMods.dex || 0);
  document.getElementById("statCON").textContent = fmtMod(p.attributeMods.con || 0);
  document.getElementById("statINT").textContent = fmtMod(p.attributeMods.int || 0);
  document.getElementById("statWIS").textContent = fmtMod(p.attributeMods.wis || 0);
  document.getElementById("statCHA").textContent = fmtMod(p.attributeMods.cha || 0);
  document.getElementById("statProf").textContent = fmtMod(p.proficiencyBonus || 2);
  document.getElementById("statDEF").textContent = p.defense ?? 10 + (p.attributeMods.dex || 0);
  document.getElementById("statHPMax").textContent = p.hpMax;
  document.getElementById("statMPMax").textContent = p.manaMax;
  document.getElementById("statHPNow").textContent = p.hp;
  document.getElementById("statMPNow").textContent = p.mana;

  const used = totalPointBuyCost(p.attributeScores || defaultAttributeScores());
  document.getElementById("pointBuyUsed").textContent = `${used}/${POINT_BUY_BUDGET}`;
  document.getElementById("pointBuyUsed").className = used > POINT_BUY_BUDGET ? "warn" : "";
}

function renderAbilities(p) {
  const list = document.getElementById("sheetAbilities");
  const skills = p.skills || [];
  list.innerHTML = skills
    .map(
      (a, idx) => `
    <div class="ability">
      <div class="abilityIcon">${a.icon}</div>
      <div style="flex:1;">
        <div class="abilityName">${a.name}</div>
        <div class="abilityDesc">${a.desc}</div>
        <div class="abilityMeta">
          <span>${a.manaCost ? `Custo: <strong>${a.manaCost} MP</strong>` : `Custo: <strong>0 MP</strong>`}</span>
          <button class="smallBtn smallBtnPrimary" onclick="useAbility(${idx})">Usar</button>
        </div>
      </div>
    </div>
  `,
    )
    .join("");
}

function useAbility(skillIndex) {
  if (!sheetTargetName) return;
  let data = load();
  let p = data.rooms[room][sheetTargetName];
  if (!p) return;

  ensurePlayerSchema(p);
  recalcFromSheet(p);

  const skills = p.skills || [];
  const a = skills[skillIndex];
  if (!a) return;

  const cost = parseInt(a.manaCost || 0, 10) || 0;
  if (cost > 0 && p.mana < cost) {
    alert("Mana insuficiente!");
    return;
  }

  p.mana = Math.max(0, p.mana - cost);
  save(data);

  pushAction(
    currentUser,
    `${sheetTargetName} usou ${a.icon} ${a.name}${cost > 0 ? ` (-${cost} MP)` : ""}.`,
  );
  updateArena();

  renderSheetComputed(p);
  renderEquip(p);
  renderAbilities(p);
}

function renderEquip(p) {
  const eq = p.equipped || createEmptyEquipped();
  function itemName(id) {
    if (!id) return "—";
    const it = ITEM_DB[id];
    return it ? `${it.icon} ${it.name}` : "—";
  }
  const wrap = document.getElementById("equipSlots");
  wrap.innerHTML = `
    ${slotRow("Arma", "weapon", itemName(eq.weapon))}
    ${slotRow("Armadura", "armor", itemName(eq.armor))}
    ${slotRow("Escudo", "shield", itemName(eq.shield))}
    ${slotRow("Anel", "ring", itemName(eq.ring))}
    ${slotRow("Manto", "cloak", itemName(eq.cloak))}
    ${slotRow("Extra", "misc", itemName(eq.misc))}
  `;
}
function slotRow(label, slot, value) {
  return `
    <div class="kv" style="align-items:center; gap:10px;">
      <span style="opacity:.85">${label}</span>
      <strong style="text-align:right; flex:1;">${value}</strong>
      <button class="smallBtn" onclick="unequip('${sheetTargetName}','${slot}')">Remover</button>
    </div>
  `;
}
function unequip(name, slot) {
  let data = load();
  let p = data.rooms[room][name];
  if (!p) return;
  ensurePlayerSchema(p);

  unequipSlot(p, slot);
  recalcFromSheet(p);
  save(data);

  renderSheetComputed(p);
  renderEquip(p);
  renderAbilities(p);
  updateArena();
}

function saveSheet() {
  if (!sheetTargetName) return;
  let data = load();
  let p = data.rooms[room][sheetTargetName];
  if (!p) return;

  ensurePlayerSchema(p);

  p.owner = document.getElementById("sheetOwner").value || "";
  p.level = parseInt(document.getElementById("sheetLevel").value || "1", 10);
  p.race = document.getElementById("sheetRace").value;
  p.class = document.getElementById("sheetClass").value;
  p.background = document.getElementById("sheetBackground").value;
  p.attributeScores = readPointBuyFromUI();
  const { profs, exps } = collectSkillFlags();
  p.skillProficiencies = profs;
  p.expertiseSkills = exps;

  recalcFromSheet(p);
  save(data);

  closeSheet();
  updateArena();
}
function closeSheet() {
  document.getElementById("sheetOverlay").style.display = "none";
  sheetTargetName = null;
}

/* ================= GRIMÓRIO / MAGIAS CUSTOM ================= */
function getSpellCreationLimit(level) {
  for (const row of SPELL_CREATION_LEVEL_LIMITS) {
    if (level >= row.minLevel && level <= row.maxLevel) return row.points;
  }
  return 10;
}

function getSpellSlotsForLevel(level) {
  const lv = Math.max(1, Math.min(20, parseInt(level || 1, 10) || 1));
  return [...(SPELL_SLOTS_BY_LEVEL[lv] || SPELL_SLOTS_BY_LEVEL[1])];
}

function syncSpellcasting(p) {
  if (!p.spellcasting || typeof p.spellcasting !== "object") p.spellcasting = {};

  const slotsMax = getSpellSlotsForLevel(p.level || 1);
  const oldCurrent = Array.isArray(p.spellcasting.slotsCurrent)
    ? p.spellcasting.slotsCurrent
    : [];

  p.spellcasting.slotsMax = slotsMax;
  p.spellcasting.slotsCurrent = slotsMax.map((max, idx) => {
    const prev = parseInt(oldCurrent[idx], 10);
    if (Number.isNaN(prev)) return max;
    return Math.max(0, Math.min(max, prev));
  });
}

function openGrimoire(name) {
  const data = load();
  const p = data.rooms[room][name];
  if (!p) return;

  ensurePlayerSchema(p);
  recalcFromSheet(p);
  save(data);

  grimoireTargetName = name;
  document.getElementById("grimoireTitle").textContent = `Grimório — ${name}`;
  document.getElementById("grimoireSub").textContent = "Crie magias homebrew por pontos e use slots por nível.";
  document.getElementById("grimoireOverlay").style.display = "flex";

  setupGrimoireFormDefaults();
  renderGrimoire(p);
}

function closeGrimoire() {
  document.getElementById("grimoireOverlay").style.display = "none";
  grimoireTargetName = null;
  activeGrimoireTab = "resources";
}

function openMyGrimoire() {
  const data = load();
  const players = data.rooms?.[room] || {};
  const targetName = players[currentUser]
    ? currentUser
    : (grimoireTargetName && players[grimoireTargetName] ? grimoireTargetName : Object.keys(players)[0]);

  if (!targetName) {
    alert("Nenhum personagem disponível para abrir o grimório.");
    return;
  }

  openGrimoire(targetName);
}

function setGrimoireTab(tabId) {
  activeGrimoireTab = tabId;
  applyGrimoireTabState();
}

function applyGrimoireTabState() {
  const tabs = document.querySelectorAll(".grimoireTab");
  tabs.forEach((tab) => {
    const isActive = tab.dataset.tab === activeGrimoireTab;
    tab.classList.toggle("active", Boolean(isActive));
    tab.setAttribute("aria-selected", String(Boolean(isActive)));
  });

  const panels = document.querySelectorAll(".grimoirePanel");
  panels.forEach((panel) => {
    const isActive = panel.dataset.tab === activeGrimoireTab;
    panel.style.display = isActive ? "block" : "none";
  });
}

function setupGrimoireFormDefaults() {
  const recalc = () => refreshSpellCostSummary();
  ["spellName", "spellLevel", "spellCastingTime", "spellRange", "spellDescription", "compV", "compS", "compM"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.oninput = recalc;
    if (el && el.type === "checkbox") el.onchange = recalc;
  });

  renderSpellIconLibrary();
  applyGrimoireTabState();
}

function renderGrimoire(p) {
  renderSpellMeta(p);
  renderSpellSlots(p);
  renderSpellEffectsCatalog();
  renderCustomSpells(p);
  refreshSpellCostSummary();
}

function renderSpellMeta(p) {
  const meta = document.getElementById("grimoireMeta");
  const limit = getSpellCreationLimit(p.level || 1);
  const maxSpellLevel = Math.min(9, Math.max(1, Math.ceil((p.level || 1) / 2)));

  meta.innerHTML = `
    <div class="kv"><span>Nível do personagem</span><strong>${p.level}</strong></div>
    <div class="kv"><span>Pontos de criação</span><strong>${limit}</strong></div>
    <div class="kv"><span>Nível máximo da magia</span><strong>${maxSpellLevel}</strong></div>
    <div class="kv"><span>Magias customizadas</span><strong>${(p.customSpells || []).length}</strong></div>
  `;

  const spellLevelInput = document.getElementById("spellLevel");
  spellLevelInput.max = String(maxSpellLevel);
  const val = parseInt(spellLevelInput.value || "1", 10);
  if (Number.isNaN(val) || val > maxSpellLevel || val < 1) {
    spellLevelInput.value = String(Math.min(maxSpellLevel, Math.max(1, val || 1)));
  }
}

function renderSpellSlots(p) {
  const wrap = document.getElementById("grimoireSlots");
  const rows = (p.spellcasting?.slotsMax || []).map((max, idx) => {
    const current = p.spellcasting?.slotsCurrent?.[idx] ?? max;
    const lvl = idx + 1;
    return `<div class="kv"><span>Slot nível ${lvl}</span><strong>${current}/${max}</strong></div>`;
  });
  wrap.innerHTML = rows.join("") || '<div style="opacity:.7">Sem slots.</div>';
}

function renderSpellEffectsCatalog() {
  const box = document.getElementById("spellEffectsCatalog");
  box.innerHTML = SPELL_EFFECTS_CATALOG.map((fx) => `
    <div class="effectCard">
      <div><strong>${fx.name}</strong> <span style="opacity:.7">(${fx.baseCost} pts base)</span></div>
      <div style="opacity:.75; font-size:12px;">Escala: ${fx.unitLabel} custa +${fx.unitCost} pts (máx ${fx.maxUnits})</div>
      <div class="effectRow">
        <label>Intensidade</label>
        <input type="number" min="0" max="${fx.maxUnits}" value="0" id="effect_${fx.id}" oninput="refreshSpellCostSummary()" />
      </div>
    </div>
  `).join("");
}

function renderSpellIconLibrary() {
  const box = document.getElementById("spellIconLibrary");
  if (!box) return;

  box.innerHTML = SPELL_ICON_LIBRARY.map((icon) => {
    const active = selectedSpellIcon === icon ? " active" : "";
    return `<button type="button" class="iconChip${active}" onclick="selectSpellIcon('${icon}')">${icon}</button>`;
  }).join("");
}

function selectSpellIcon(icon) {
  selectedSpellIcon = icon;
  renderSpellIconLibrary();
}

function getSelectedEffects() {
  return SPELL_EFFECTS_CATALOG.map((fx) => {
    const el = document.getElementById(`effect_${fx.id}`);
    const units = Math.max(0, Math.min(fx.maxUnits, parseInt(el?.value || "0", 10) || 0));
    return { fx, units };
  }).filter((x) => x.units > 0);
}

function computeSpellDraftCost() {
  const selected = getSelectedEffects();
  const total = selected.reduce((sum, item) => sum + item.fx.baseCost + item.units * item.fx.unitCost, 0);
  return { selected, total };
}

function refreshSpellCostSummary() {
  if (!grimoireTargetName) return;
  const data = load();
  const p = data.rooms[room][grimoireTargetName];
  if (!p) return;
  const limit = getSpellCreationLimit(p.level || 1);
  const { selected, total } = computeSpellDraftCost();

  const details = selected.length
    ? selected.map((s) => `${s.fx.name}: ${s.fx.baseCost} + (${s.units}×${s.fx.unitCost}) = <strong>${s.fx.baseCost + s.units * s.fx.unitCost}</strong>`).join("<br>")
    : "Nenhum efeito selecionado.";

  document.getElementById("spellCostSummary").innerHTML = `
    <div><strong>Custo total:</strong> ${total} / ${limit} pontos</div>
    <div style="margin-top:6px; opacity:.85; font-size:12px;">${details}</div>
  `;
}

function buildCustomSpellEffects(selected) {
  return selected.map(({ fx, units }) => {
    if (fx.type === "dano") {
      return { type: "dano", damageDice: `${units}d6`, damageType: fx.defaultDamageType, area: "alvo único" };
    }
    if (fx.type === "cura") {
      return { type: "cura", healDice: `${units}d8` };
    }
    if (fx.type === "controle") {
      return { type: "status", effect: fx.status, duration: `${units} turnos` };
    }
    if (fx.type === "buff") {
      return { type: "buff", stat: fx.stat, bonus: units, duration: "1 turno" };
    }
    if (fx.type === "debuff") {
      return { type: "debuff", stat: fx.stat, penalty: units, duration: "1 turno" };
    }
    return { type: "invocacao", creaturePower: units, duration: `${units} turnos` };
  });
}

function createCustomSpell() {
  if (!grimoireTargetName) return;
  const data = load();
  const p = data.rooms[room][grimoireTargetName];
  if (!p) return;

  ensurePlayerSchema(p);
  recalcFromSheet(p);

  const name = (document.getElementById("spellName").value || "").trim();
  const level = parseInt(document.getElementById("spellLevel").value || "1", 10) || 1;
  const maxSpellLevel = Math.min(9, Math.max(1, Math.ceil((p.level || 1) / 2)));
  const limit = getSpellCreationLimit(p.level || 1);
  const castingTime = (document.getElementById("spellCastingTime").value || "1 ação").trim();
  const range = (document.getElementById("spellRange").value || "18m").trim();
  const description = (document.getElementById("spellDescription").value || "").trim();

  const { selected, total } = computeSpellDraftCost();
  if (!name) return alert("Dê um nome para a magia.");
  if (selected.length === 0) return alert("Selecione ao menos 1 efeito.");
  if (level > maxSpellLevel) return alert(`Nível de magia acima do permitido para o personagem (máx ${maxSpellLevel}).`);
  if (total > limit) return alert(`Custo excede o limite de criação (${limit} pontos).`);

  const components = [];
  if (document.getElementById("compV").checked) components.push("V");
  if (document.getElementById("compS").checked) components.push("S");
  if (document.getElementById("compM").checked) components.push("M");

  const spell = {
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    icon: selectedSpellIcon,
    name,
    level,
    creatorLevel: p.level,
    effects: buildCustomSpellEffects(selected),
    pointCost: total,
    castingTime,
    range,
    components,
    description,
    rules: {
      usesSpellSlots: true,
      preparedType: ["Mago", "Feiticeiro"].includes(p.class) ? "known" : "prepared",
    },
  };

  p.customSpells.push(spell);
  save(data);

  pushAction(currentUser, `${grimoireTargetName} criou a magia customizada 📖 ${spell.name} (Nível ${spell.level}, custo ${spell.pointCost} pts).`);
  renderGrimoire(p);
  updateArena();
}

function renderCustomSpells(p) {
  const box = document.getElementById("customSpellsList");
  const spells = p.customSpells || [];
  if (spells.length === 0) {
    box.innerHTML = '<div style="opacity:.7; font-size:12px;">Nenhuma magia customizada ainda.</div>';
    return;
  }

  box.innerHTML = spells.map((spell) => {
    const equippedAt = (p.spellSlots || []).findIndex((id) => id === spell.id);
    const equipLabel = equippedAt >= 0 ? `No slot ${equippedAt + 1}` : "Enviar para slot";
    return `
      ${spellToCardHtml(spell)}
      <div style="display:flex; justify-content:flex-end; gap:8px; margin-bottom:10px;">
        <button class="smallBtn" onclick="bindSpellToSlot('${spell.id}')">${equipLabel}</button>
        <button class="smallBtn" onclick="castCustomSpell('${spell.id}')">Conjurar</button>
      </div>
    `;
  }).join("");
}

function bindSpellToSlot(spellId) {
  if (!grimoireTargetName) return;
  const data = load();
  const p = data.rooms[room][grimoireTargetName];
  if (!p) return;

  ensurePlayerSchema(p);

  p.spellSlots = normalizeQuickSpellSlots(p.spellSlots);
  const currentIdx = p.spellSlots.findIndex((id) => id === spellId);
  if (currentIdx >= 0) {
    p.spellSlots[currentIdx] = null;
    save(data);
    renderGrimoire(p);
    updateArena();
    return;
  }

  const freeIdx = p.spellSlots.findIndex((id) => !id);
  if (freeIdx < 0) {
    alert("Todos os slots rápidos estão ocupados.");
    return;
  }
  p.spellSlots[freeIdx] = spellId;
  save(data);
  renderGrimoire(p);
  updateArena();
}

function castCustomSpell(spellId) {
  if (!grimoireTargetName) return;
  castSpellForPlayer(grimoireTargetName, spellId);
}

function resetSpellSlots(name) {
  const data = load();
  const p = data.rooms[room][name];
  if (!p) return;

  ensurePlayerSchema(p);
  recalcFromSheet(p);
  p.spellcasting.slotsCurrent = [...(p.spellcasting.slotsMax || [])];
  save(data);

  pushAction(currentUser, `${name} concluiu descanso longo e recuperou todos os slots de magia.`);

  if (grimoireTargetName === name) renderGrimoire(p);
  updateArena();
}

/* ================= INVENTÁRIO + LOJA ================= */
let invTargetName = null;

function openInventory(name) {
  let data = load();
  let p = data.rooms[room][name];
  if (!p) return;

  ensurePlayerSchema(p);
  recalcFromSheet(p);
  save(data);

  invTargetName = name;
  selectedShopId = "taberna";
  selectedArsenalType = "weapon";
  pendingUpgradeId = null;

  document.getElementById("invTitle").textContent = `Inventário — ${name}`;
  document.getElementById("invSub").textContent =
    `Ações via menu ⋯. Loja com ouro. Itens equipados refletem na ficha.`;

  document.getElementById("invOverlay").style.display = "flex";
  try {
    renderInventoryModal(p);
  } catch (err) {
    console.error("Falha ao abrir inventário:", err);
    document.getElementById("invList").innerHTML =
      `<div style="opacity:.8;font-size:12px;">Não foi possível renderizar o inventário deste personagem.</div>`;
    document.getElementById("shopList").innerHTML = "";
  }
}
function closeInventory() {
  document.getElementById("invOverlay").style.display = "none";
  invTargetName = null;
  pendingUpgradeId = null;
  removeMiniMenu();
}
function renderInventoryModal(p) {
  document.getElementById("goldValue").textContent = p.gold ?? 0;
  document.getElementById("invSlotsValue").textContent =
    `${invCount(p)}/${invMax(p)}`;
  renderInvList(p);
  renderShop(p);
}

function resolveInventoryItem(entry) {
  if (!entry) return null;
  if (typeof entry === "string") return ITEM_DB[entry] || null;
  if (typeof entry === "object") return entry;
  return null;
}

function renderInvList(p) {
  const box = document.getElementById("invList");
  const inv = p.inventory || [];
  if (inv.length === 0) {
    box.innerHTML = `<div style="opacity:.7;font-size:12px;">Inventário vazio.</div>`;
    return;
  }
  box.innerHTML = inv
    .map((entry, idx) => {
      const it = resolveInventoryItem(entry);
      if (!it) return "";
      return `
      <div class="invItem" data-idx="${idx}">
        <div class="invIcon">${it.icon || "📦"}</div>
        <div style="flex:1;">
          <div class="invName">${it.name || "Item"}</div>
          <div class="invDesc">${it.desc || it.description || "Sem descrição."}</div>
        </div>
        <button class="dotBtn" title="Ações" onclick="openItemMenu(event,${idx})">⋯</button>
      </div>
    `;
    })
    .join("");
}

function iconForShopItem(item) {
  const iconMap = {
    rope: "🪢",
    anvil: "🔨",
    sword: "⚔️",
    shield: "🛡️",
    armor: "🥋",
    backpack: "🎒",
  };
  if (item.icon && item.icon.length <= 3) return item.icon;
  if (iconMap[item.icon]) return iconMap[item.icon];
  if (item.type === "weapon") return "⚔️";
  if (item.type === "armor") return "🥋";
  if (item.type === "shield") return "🛡️";
  if (item.type === "upgrade") return "🔨";
  if (item.type === "consumable" || item.type === "utility") return "🎒";
  return "📦";
}

function renderShopTabs() {
  const tabs = document.getElementById("shopTabs");
  tabs.innerHTML = SHOP_TABS.map((tab) => `
    <button class="smallBtn ${selectedShopId === tab.id ? "smallBtnPrimary" : ""}" onclick="selectShop('${tab.id}')">${tab.label}</button>
  `).join("");
}

function selectShop(shopId) {
  selectedShopId = shopId;
  pendingUpgradeId = null;
  const p = load().rooms[room][invTargetName];
  if (!p) return;
  renderInventoryModal(p);
}

function selectArsenalType(type) {
  selectedArsenalType = type;
  const p = load().rooms[room][invTargetName];
  if (!p) return;
  renderShop(p);
}

function renderShop(p) {
  const list = document.getElementById("shopList");
  const smithApplyBox = document.getElementById("smithApplyBox");
  const arsenalSubTabs = document.getElementById("arsenalSubTabs");
  renderShopTabs();

  if (selectedShopId === "arsenal") {
    arsenalSubTabs.innerHTML = ["weapon", "armor", "shield"].map((t) => `
      <button class="smallBtn ${selectedArsenalType === t ? "smallBtnPrimary" : ""}" onclick="selectArsenalType('${t}')">${t === "weapon" ? "Armas" : t === "armor" ? "Armaduras" : "Escudos"}</button>
    `).join("");
  } else {
    arsenalSubTabs.innerHTML = "";
  }

  const shop = SHOP_DB[selectedShopId] || { items: [] };
  let rows = shop.items || [];
  if (selectedShopId === "arsenal") rows = rows.filter((it) => it.type === selectedArsenalType);

  list.innerHTML = rows
    .map((it) => {
      const price = it.priceGold ?? 0;
      const affordable = (p.gold ?? 0) >= price;
      const actionLabel = selectedShopId === "ferreiro" ? "Aplicar" : "Comprar";
      const actionOnclick = selectedShopId === "ferreiro" ? `startApplyUpgrade('${it.id}')` : `buyItem('${it.id}')`;
      return `
      <div class="shopItem">
        <div class="invIcon">${iconForShopItem(it)}</div>
        <div style="flex:1;">
          <div class="invName">${it.name} ${price === 0 ? `<span class="badge">grátis</span>` : ""}</div>
          <div class="invDesc">${it.description || "Sem descrição."}</div>
        </div>
        <div class="price">
          <span>🪙 <strong>${price}</strong></span>
          <button class="smallBtn ${affordable ? "smallBtnPrimary" : ""}" onclick="${actionOnclick}" ${affordable ? "" : "disabled"}>${actionLabel}</button>
        </div>
      </div>
    `;
    })
    .join("");

  if (selectedShopId === "ferreiro") {
    renderSmithApplyBox(p);
    smithApplyBox.style.display = "block";
  } else {
    smithApplyBox.style.display = "none";
    smithApplyBox.innerHTML = "";
  }
}

function createInventoryItemFromShopEntry(entry) {
  const id = makeRuntimeItemId(entry.id);
  const runtimeItem = {
    id,
    baseId: entry.id,
    name: entry.name,
    icon: iconForShopItem(entry),
    type: entry.type,
    desc: entry.description || "",
    upgrades: [],
  };

  if (entry.type === "weapon") {
    runtimeItem.equipSlot = "weapon";
    runtimeItem.mods = { attack: 0 };
    runtimeItem.stats = {
      damage: entry.damage || null,
      crit: entry.crit || null,
      range: entry.range || null,
      damageType: entry.damageType || null,
      proficiency: entry.proficiency || null,
    };
  }
  if (entry.type === "armor") {
    runtimeItem.equipSlot = "armor";
    runtimeItem.mods = { defense: entry.defenseBonus || 0 };
    runtimeItem.stats = {
      defenseBonus: entry.defenseBonus || 0,
      penalty: entry.penalty || 0,
      category: entry.category || "",
    };
  }
  if (entry.type === "shield") {
    runtimeItem.equipSlot = "shield";
    runtimeItem.mods = { defense: entry.defenseBonus || 0 };
    runtimeItem.stats = {
      defenseBonus: entry.defenseBonus || 0,
      penalty: entry.penalty || 0,
    };
  }

  ITEM_DB[id] = runtimeItem;
  return id;
}

function buyItem(itemId) {
  if (!invTargetName) return;
  let data = load();
  let p = data.rooms[room][invTargetName];
  if (!p) return;

  ensurePlayerSchema(p);
  recalcFromSheet(p);

  const shop = SHOP_DB[selectedShopId] || { items: [] };
  const shopEntry = (shop.items || []).find((s) => s.id === itemId);
  if (!shopEntry) return;

  const price = shopEntry.priceGold ?? 0;
  const gold = p.gold ?? 0;
  if (gold < price) {
    alert("Ouro insuficiente.");
    return;
  }

  const runtimeItemId = createInventoryItemFromShopEntry(shopEntry);
  const res = addItemToPlayer(p, runtimeItemId);
  if (!res.ok) {
    alert(res.msg || "Não foi possível comprar.");
    return;
  }

  p.gold = gold - price;

  const it = ITEM_DB[runtimeItemId];
  if (it && it.equipSlot === "weapon" && !p.equipped.weapon) {
    p.equipped.weapon = runtimeItemId;
  }

  recalcFromSheet(p);
  save(data);

  pushAction(currentUser, `${invTargetName} comprou ${it.icon || "📦"} ${it.name} por 🪙${price}.`);
  updateArena();
}

function startApplyUpgrade(upgradeId) {
  pendingUpgradeId = upgradeId;
  const p = load().rooms[room][invTargetName];
  if (!p) return;
  renderSmithApplyBox(p);
}

function renderSmithApplyBox(p) {
  const box = document.getElementById("smithApplyBox");
  const ferreiro = SHOP_DB.ferreiro || { items: [] };
  const upgrade = (ferreiro.items || []).find((u) => u.id === pendingUpgradeId);
  if (!upgrade) {
    box.innerHTML = `<div class="invDesc">Escolha uma melhoria e clique em Aplicar.</div>`;
    return;
  }

  const compatible = (p.inventory || []).map((entry, idx) => ({ idx, item: resolveInventoryItem(entry) }))
    .filter(({ item }) => item && upgrade.appliesTo.includes(item.type));

  if (!compatible.length) {
    box.innerHTML = `<div class="invDesc">Nenhum item compatível para <strong>${upgrade.name}</strong>.</div>`;
    return;
  }

  box.innerHTML = `
    <div class="invName" style="margin-bottom:8px;">Aplicar ${upgrade.name}</div>
    ${compatible.map(({ idx, item }) => `
      <div class="shopItem">
        <div class="invIcon">${item.icon || "📦"}</div>
        <div style="flex:1;">
          <div class="invName">${item.name}</div>
          <div class="invDesc">${item.desc || item.description || ""}</div>
        </div>
        <button class="smallBtn smallBtnPrimary" onclick="confirmApplyUpgrade('${upgrade.id}', ${idx})">Confirmar</button>
      </div>
    `).join("")}
  `;
}

function confirmApplyUpgrade(upgradeId, inventoryIndex) {
  if (!invTargetName) return;
  let data = load();
  const p = data.rooms[room][invTargetName];
  if (!p) return;

  const ferreiro = SHOP_DB.ferreiro || { items: [] };
  const upgrade = (ferreiro.items || []).find((u) => u.id === upgradeId);
  if (!upgrade) return;

  const price = upgrade.priceGold ?? 0;
  if ((p.gold ?? 0) < price) {
    alert("Ouro insuficiente.");
    return;
  }

  const entry = (p.inventory || [])[inventoryIndex];
  const item = resolveInventoryItem(entry);
  if (!item || !upgrade.appliesTo.includes(item.type)) {
    alert("Item incompatível.");
    return;
  }

  if (!item.upgrades) item.upgrades = [];
  item.upgrades.push({
    id: upgrade.id,
    name: upgrade.name,
    effect: upgrade.effect || {},
    priceGold: price,
  });

  if (!item.mods) item.mods = {};
  const eff = upgrade.effect || {};
  if (eff.defenseBonus) item.mods.defense = (item.mods.defense || 0) + eff.defenseBonus;
  if (eff.damageBonus) item.mods.str = (item.mods.str || 0) + eff.damageBonus;
  if (eff.attackBonus) item.mods.dex = (item.mods.dex || 0) + eff.attackBonus;

  p.gold -= price;
  p.inventory[inventoryIndex] = item;

  recalcFromSheet(p);
  save(data);
  pendingUpgradeId = null;

  pushAction(currentUser, `${invTargetName} aplicou 🔨 ${upgrade.name} em ${item.name} por 🪙${price}.`);
  updateArena();
}

/* mini menu inv */
function openItemMenu(evt, idx) {
  evt.stopPropagation();
  removeMiniMenu();

  const p = load().rooms[room][invTargetName];
  if (!p) return;
  const it = resolveInventoryItem((p.inventory || [])[idx]);
  if (!it) return;
  const anchor = evt.currentTarget;
  const r = anchor.getBoundingClientRect();

  const menu = document.createElement("div");
  menu.className = "miniMenu";
  menu.id = "miniMenu";

  const canEquip = !!it.equipSlot;
  const canUse = !!it.consume;

  menu.innerHTML = `
    <div class="muted">${it.icon} ${it.name}</div>
    ${canEquip ? `<button onclick="menuEquip(${idx})">🧷 Equipar</button>` : `<div class="muted">Não equipável</div>`}
    ${canUse ? `<button onclick="menuUse(${idx})">🧪 Usar</button>` : `<div class="muted">Não consumível</div>`}
    <button onclick="menuSend(${idx})">📦 Enviar para jogador</button>
    <button onclick="menuDrop(${idx})">🗑️ Descartar</button>
  `;

  document.body.appendChild(menu);

  const left = Math.min(window.innerWidth - 240, r.left - 170);
  const top = Math.min(window.innerHeight - 220, r.top + 30);

  menu.style.left = left + "px";
  menu.style.top = top + "px";

  setTimeout(() => document.addEventListener("click", removeMiniMenu), 10);
}
function removeMiniMenu() {
  const m = document.getElementById("miniMenu");
  if (m) m.remove();
  document.removeEventListener("click", removeMiniMenu);
}
function menuEquip(idx) {
  if (!invTargetName) return;
  let data = load();
  const p = data.rooms[room][invTargetName];
  if (!p) return;
  ensurePlayerSchema(p);

  const item = resolveInventoryItem((p.inventory || [])[idx]);
  if (!item) return;
  equipItem(p, item.id);
  recalcFromSheet(p);
  save(data);

  pushAction(currentUser, `${invTargetName} equipou ${item.icon || "📦"} ${item.name}.`);

  removeMiniMenu();
  updateArena();
}
function menuUse(idx) {
  if (!invTargetName) return;
  let data = load();
  const p = data.rooms[room][invTargetName];
  if (!p) return;
  ensurePlayerSchema(p);
  recalcFromSheet(p);

  const item = resolveInventoryItem((p.inventory || [])[idx]);
  if (!item) return;
  const ok = useConsumable(p, item.id);
  if (!ok.ok) return;

  save(data);
  pushAction(currentUser, `${invTargetName} usou ${item.icon || "📦"} ${item.name}.`);

  removeMiniMenu();
  updateArena();
}
function menuDrop(idx) {
  if (!invTargetName) return;
  if (!confirm("Descartar este item?")) return;

  let data = load();
  const p = data.rooms[room][invTargetName];
  if (!p) return;
  ensurePlayerSchema(p);

  const item = resolveInventoryItem((p.inventory || [])[idx]);
  if (!item) return;
  if (item.equipSlot && p.equipped && p.equipped[item.equipSlot] === item.id) {
    p.equipped[item.equipSlot] = null;
  }
  (p.inventory || []).splice(idx, 1);
  recalcFromSheet(p);
  save(data);

  removeMiniMenu();
  updateArena();
}
function menuSend(idx) {
  if (!invTargetName) return;

  let data = load();
  const from = data.rooms[room][invTargetName];
  if (!from) return;

  const names = Object.keys(data.rooms[room]).filter(
    (n) => n !== invTargetName,
  );
  if (names.length === 0) {
    alert("Não há outro jogador na sala.");
    return;
  }

  const targetName = prompt("Enviar para quem?\n" + names.join(", "), names[0]);
  if (!targetName || !data.rooms[room][targetName]) return;

  const to = data.rooms[room][targetName];

  ensurePlayerSchema(from);
  ensurePlayerSchema(to);
  recalcFromSheet(from);
  recalcFromSheet(to);

  const item = resolveInventoryItem((from.inventory || [])[idx]);
  if (!item) return;
  if (invCount(to) >= invMax(to)) {
    alert("Inventário do destino está cheio.");
    return;
  }

  if (
    item.equipSlot &&
    from.equipped &&
    from.equipped[item.equipSlot] === item.id
  ) {
    from.equipped[item.equipSlot] = null;
  }

  (from.inventory || []).splice(idx, 1);
  to.inventory.push(item);

  recalcFromSheet(from);
  recalcFromSheet(to);
  save(data);

  pushAction(
    currentUser,
    `${invTargetName} entregou ${item.icon || "📦"} ${item.name} para ${targetName}.`,
  );

  removeMiniMenu();
  updateArena();
}

/* ================= MASTER MODE / SCENE UI ================= */
let isMaster = false;
let paintTool = "floor";
let isPainting = false;

function toggleMasterMode() {
  isMaster = !isMaster;
  const btn = document.getElementById("masterToggle");
  const panel = document.getElementById("scenePanel");
  btn.classList.toggle("on", isMaster);
  btn.textContent = isMaster ? "🛠️ Mestre: ON" : "🛠️ Mestre: OFF";
  panel.classList.toggle("on", isMaster);

  if (isMaster) {
    syncSceneUIFromStorage();
    attachPaintHandlers();
  } else {
    detachPaintHandlers();
    clearPaintHighlights();
  }
}

function setTool(tool) {
  paintTool = tool;
  document
    .getElementById("toolFloor")
    .classList.toggle("active", tool === "floor");
  document
    .getElementById("toolWall")
    .classList.toggle("active", tool === "wall");
  document
    .getElementById("toolVoid")
    .classList.toggle("active", tool === "void");
}

function syncSceneUIFromStorage() {
  ensureScene();
  const s = load().scenes[room];
  document.getElementById("bgUrl").value = s.bgUrl || "";
  document.getElementById("bgScale").value = s.bgScale;
  document.getElementById("bgOpacity").value = s.bgOpacity;
  document.getElementById("bgX").value = s.bgX;
  document.getElementById("bgY").value = s.bgY;
  applySceneCSS();
}

function bindSceneInputs() {
  const bgUrl = document.getElementById("bgUrl");
  const bgScale = document.getElementById("bgScale");
  const bgOpacity = document.getElementById("bgOpacity");
  const bgX = document.getElementById("bgX");
  const bgY = document.getElementById("bgY");
  const bgFile = document.getElementById("bgFile");

  bgUrl.addEventListener("change", () => {
    let data = load();
    data.scenes[room].bgUrl = bgUrl.value.trim();
    save(data);
    applySceneCSS();
  });

  function upd() {
    let data = load();
    const s = data.scenes[room];
    s.bgScale = parseInt(bgScale.value, 10);
    s.bgOpacity = parseInt(bgOpacity.value, 10);
    s.bgX = parseInt(bgX.value, 10);
    s.bgY = parseInt(bgY.value, 10);
    save(data);
    applySceneCSS();
  }
  bgScale.addEventListener("input", upd);
  bgOpacity.addEventListener("input", upd);
  bgX.addEventListener("input", upd);
  bgY.addEventListener("input", upd);

  bgFile.addEventListener("change", () => {
    const file = bgFile.files && bgFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let data = load();
      data.scenes[room].bgUrl = reader.result; // dataURL
      save(data);
      document.getElementById("bgUrl").value = "";
      applySceneCSS();
    };
    reader.readAsDataURL(file);
  });
}
bindSceneInputs();

function fillAll(type) {
  let data = load();
  const s = data.scenes[room];
  s.tiles = new Array(s.cols * s.rows).fill(type);
  save(data);
  updateArena();
}

function clearScene() {
  if (!confirm("Limpar cena? (tiles e background)")) return;
  let data = load();
  data.scenes[room] = structuredClone(DEFAULT_SCENE);
  save(data);
  createGrid();
  updateArena();
  syncSceneUIFromStorage();
}

/* pintura de tiles */
function attachPaintHandlers() {
  arena.addEventListener("mousedown", onPaintStart);
  arena.addEventListener("mousemove", onPaintMove);
  window.addEventListener("mouseup", onPaintEnd);
  arena.addEventListener("contextmenu", (e) => e.preventDefault());
}
function detachPaintHandlers() {
  arena.removeEventListener("mousedown", onPaintStart);
  arena.removeEventListener("mousemove", onPaintMove);
  window.removeEventListener("mouseup", onPaintEnd);
}
function onPaintStart(e) {
  if (!isMaster) return;
  const cell = e.target.closest(".cell");
  if (!cell) return;
  isPainting = true;
  paintAtEvent(e, cell);
}
function onPaintMove(e) {
  if (!isMaster || !isPainting) return;
  const cell = e.target.closest(".cell");
  if (!cell) return;
  paintAtEvent(e, cell);
}
function onPaintEnd() {
  if (!isMaster) return;
  isPainting = false;
  clearPaintHighlights();
}

function effectiveTool(e) {
  if (e.altKey) return "void";
  if (e.shiftKey) return "wall";
  return paintTool || "floor";
}
function paintAtEvent(e, cell) {
  const x = parseInt(cell.dataset.x, 10);
  const y = parseInt(cell.dataset.y, 10);
  const t = effectiveTool(e);

  setTile(x, y, t);

  // highlight leve
  cell.classList.remove("paint-floor", "paint-wall", "paint-void");
  cell.classList.add("paint-" + t);

  updateArena();
}

function clearPaintHighlights() {
  document.querySelectorAll(".cell").forEach((c) => {
    c.classList.remove("paint-floor", "paint-wall", "paint-void");
  });
}

/* ================= INIT ================= */
createGrid();
applySceneCSS();
updateArena();
setDiceTrayOpen(false);
initChatComposer();
updateChat();
loadShopCatalogs().then(() => {
  if (!invTargetName) return;
  const p = load().rooms[room][invTargetName];
  if (!p) return;
  renderShop(p);
});

/* realtime local */
window.addEventListener("storage", () => {
  ensureScene();
  createGrid();
  updateArena();
  updateChat();
});

/* ================= TABLE: add back ================= */
function addBackToTable(name) {
  let data = load();
  let p = data.rooms[room][name];
  if (!p) return;
  ensurePlayerSchema(p);

  const s = data.scenes[room];
  const found = findNearestFloor(
    Math.floor(s.cols / 2),
    Math.floor(s.rows / 2),
  );
  if (found) {
    p.x = found.x;
    p.y = found.y;
  }
  p.onTable = true;

  save(data);
  updateArena();
}
