/**
 * ShaderLibrary - Registry of all material shaders for easy access.
 */

import { createWoodMaterial, WoodParams } from '@shaders/wood.tsl';
import { createTileMaterial, TileParams } from '@shaders/tile.tsl';
import { createFabricMaterial, FabricParams } from '@shaders/fabric.tsl';
import { createSkinMaterial, SkinParams } from '@shaders/skin.tsl';
import { createWaterMaterial, WaterParams } from '@shaders/water.tsl';
import { createGlassMaterial, GlassParams } from '@shaders/glass.tsl';
import { createFoodMaterial, FoodParams } from '@shaders/food.tsl';
import { createSkyMaterial } from '@shaders/sky.tsl';

export class ShaderLibrary {
  static wood(params?: WoodParams) { return createWoodMaterial(params); }
  static tile(params?: TileParams) { return createTileMaterial(params); }
  static fabric(params?: FabricParams) { return createFabricMaterial(params); }
  static skin(params?: SkinParams) { return createSkinMaterial(params); }
  static water(params?: WaterParams) { return createWaterMaterial(params); }
  static glass(params?: GlassParams) { return createGlassMaterial(params); }
  static food(params?: FoodParams) { return createFoodMaterial(params); }
  static sky() { return createSkyMaterial(); }
}
