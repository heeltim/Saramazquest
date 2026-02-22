export type Attribute =
  | "forca"
  | "destreza"
  | "constituicao"
  | "inteligencia"
  | "sabedoria"
  | "carisma";

export type Size = "pequeno" | "medio";

export type SpellProgressionType = "full" | "half" | "third" | "pact" | "none";

export type HitDie = "d6" | "d8" | "d10" | "d12";

export interface TraitDefinition {
  nome: string;
  resumo: string;
  tags: string[];
  params?: Record<string, unknown>;
}

export interface ClassFeatureDefinition {
  nome: string;
  resumo: string;
}

export interface DistribuicaoAtributos {
  quantidade: number;
  max_por_atributo: number;
  regra: string;
}

export interface RaceRecord {
  id: string;
  nome: string;
  descricao_curta: string;
  size: Size;
  speed_m: number;
  atributos_fixos: Partial<Record<Attribute, number>>;
  atributos_distribuiveis: DistribuicaoAtributos | null;
  tracos: string[];
}

export interface HPConfig {
  mode: "full_roll";
  level1_rule: "roll";
  per_level_rule: "roll";
  adds_con_mod_each_level: boolean;
}

export interface MagicPointsConfig {
  enabled: boolean;
  starts_at_level?: number;
  casting_stat?: Attribute;
  table_id?: string;
  multiplier?: number;
  recovery?: "long_rest" | "short_rest";
  note?: string;
}

export interface ClassRecord {
  id: string;
  nome: string;
  hit_die: HitDie;
  hp: HPConfig;
  atributos_chave: Attribute[];
  salvaguardas: Attribute[];
  spell_progression: SpellProgressionType;
  features_by_level: Record<string, string[]>;
  magic_points: MagicPointsConfig;
}

export interface RpgSrdBase {
  schema_version: string;
  system_notes: {
    base_reference: string;
    hp_rule: string;
  };
  enums: {
    attributes: Attribute[];
    sizes: Size[];
    spell_progression_types: SpellProgressionType[];
  };
  magic_point_rules: {
    cost_by_circle: Record<string, number>;
  };
  magic_point_tables: {
    universal_base: Record<string, number>;
  };
  trait_dictionary: Record<string, TraitDefinition>;
  races: RaceRecord[];
  class_feature_dictionary: Record<string, ClassFeatureDefinition>;
  spell_progressions: Record<SpellProgressionType, { notes: string }>;
  classes: ClassRecord[];
}
