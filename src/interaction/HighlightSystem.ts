/**
 * HighlightSystem - Object outline and emission boost on hover.
 *
 * When the player looks at an interactable object, it gets a subtle
 * emissive glow to indicate it can be interacted with.
 */

import * as THREE from 'three';

export class HighlightSystem {
  private currentHighlight: THREE.Object3D | null = null;
  private originalEmissive: Map<THREE.Mesh, THREE.Color> = new Map();
  private highlightColor: THREE.Color = new THREE.Color(0x333333);

  /**
   * Highlight an object (add emissive glow).
   */
  highlight(object: THREE.Object3D): void {
    if (object === this.currentHighlight) return;

    // Remove previous highlight
    this.unhighlight();

    this.currentHighlight = object;

    // Store original emissive and boost it
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        this.originalEmissive.set(child, child.material.emissive.clone());
        child.material.emissive.copy(this.highlightColor);
        child.material.emissiveIntensity = 0.3;
      }
    });
  }

  /**
   * Remove highlight from current object.
   */
  unhighlight(): void {
    if (!this.currentHighlight) return;

    this.currentHighlight.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        const original = this.originalEmissive.get(child);
        if (original) {
          child.material.emissive.copy(original);
          child.material.emissiveIntensity = 0;
        }
      }
    });

    this.originalEmissive.clear();
    this.currentHighlight = null;
  }

  /**
   * Update highlight based on interaction context.
   */
  update(target: THREE.Object3D | null): void {
    if (target) {
      this.highlight(target);
    } else {
      this.unhighlight();
    }
  }

  dispose(): void {
    this.unhighlight();
  }
}
