import type { RpgSrdBase } from "../types/rpg-srd";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateRpgData(data: RpgSrdBase): ValidationResult {
  const errors: string[] = [];

  const traitIds = new Set(Object.keys(data.trait_dictionary || {}));
  const featureIds = new Set(Object.keys(data.class_feature_dictionary || {}));

  for (const race of data.races || []) {
    for (const traitId of race.tracos || []) {
      if (!traitIds.has(traitId)) {
        errors.push(`Race ${race.id} referencia trait inexistente: ${traitId}`);
      }
    }
  }

  for (const cls of data.classes || []) {
    if (!cls.magic_points) {
      errors.push(`Classe ${cls.id} sem magic_points.`);
    }
    for (const levelFeatures of Object.values(cls.features_by_level || {})) {
      for (const featureId of levelFeatures) {
        if (!featureIds.has(featureId)) {
          errors.push(`Classe ${cls.id} referencia feature inexistente: ${featureId}`);
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}
