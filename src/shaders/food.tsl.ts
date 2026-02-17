/**
 * Food Shader - Materials for food items with cooking state transitions.
 *
 * Supports raw -> cooked -> burnt states via a single uniform.
 */

import * as THREE from 'three';

export enum FoodState {
  Raw = 0,
  Cooking = 0.5,
  Cooked = 1,
  Burnt = 1.5,
}

export interface FoodParams {
  rawColor?: THREE.Color;
  cookedColor?: THREE.Color;
  burntColor?: THREE.Color;
  cookState?: number; // 0 = raw, 1 = cooked, 1.5 = burnt
}

export function createFoodMaterial(params?: FoodParams): THREE.MeshStandardMaterial {
  const rawColor = params?.rawColor ?? new THREE.Color(0xffccaa);
  const cookedColor = params?.cookedColor ?? new THREE.Color(0xcc8844);
  const burntColor = params?.burntColor ?? new THREE.Color(0x332211);

  const mat = new THREE.MeshStandardMaterial({
    color: rawColor,
    roughness: 0.6,
    metalness: 0,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uCookState = { value: params?.cookState ?? 0 };
    shader.uniforms.uRawColor = { value: rawColor };
    shader.uniforms.uCookedColor = { value: cookedColor };
    shader.uniforms.uBurntColor = { value: burntColor };

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
      uniform float uCookState;
      uniform vec3 uRawColor;
      uniform vec3 uCookedColor;
      uniform vec3 uBurntColor;`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      if (uCookState <= 1.0) {
        diffuseColor.rgb = mix(uRawColor, uCookedColor, uCookState);
      } else {
        diffuseColor.rgb = mix(uCookedColor, uBurntColor, uCookState - 1.0);
      }`,
    );
  };

  return mat;
}
