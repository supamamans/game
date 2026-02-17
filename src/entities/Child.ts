/**
 * Child - Child entity with profile, appearance, and age-specific properties.
 *
 * Each child is procedurally generated from the session seed.
 */

import * as THREE from 'three';
import { SeededRandom } from '@utils/SeededRandom';
import { MoodVector, MoodValues } from './MoodVector';

export type AgeGroup = 'infant' | 'toddler' | 'child';

export interface ChildPersonality {
  shyness: number;
  curiosity: number;
  energy: number;
  clinginess: number;
  stubbornness: number;
}

export interface ChildPreferences {
  favoriteFood: string;
  hatedFood: string;
  favoriteToy: string;
  fearOf: 'dark' | 'loud_noises' | 'water' | 'none';
}

export interface ChildAppearance {
  skinTone: number;
  hairColor: number;
  hairStyle: number;
  clothingPalette: number;
  height: number;
}

export interface ChildProfile {
  id: string;
  name: string;
  age: AgeGroup;
  appearance: ChildAppearance;
  personality: ChildPersonality;
  preferences: ChildPreferences;
}

const CHILD_NAMES = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason',
  'Isabella', 'Logan', 'Mia', 'Lucas', 'Charlotte', 'Oliver', 'Amelia',
  'Aiden', 'Harper', 'Elijah', 'Evelyn', 'James',
];

const FOODS = ['cereal', 'pasta', 'fruit', 'soup', 'sandwich', 'eggs', 'vegetables'];
const TOYS = ['blocks', 'stuffed_animal', 'crayons', 'ball', 'puzzle', 'truck', 'doll'];
const FEARS: ChildPreferences['fearOf'][] = ['dark', 'loud_noises', 'water', 'none'];

const AGE_HEIGHTS: Record<AgeGroup, { min: number; max: number }> = {
  infant: { min: 0.3, max: 0.4 },
  toddler: { min: 0.6, max: 0.8 },
  child: { min: 0.9, max: 1.2 },
};

export class Child {
  public profile: ChildProfile;
  public mood: MoodVector;
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public currentRoom: number = 0;

  /** Whether the child is currently being carried */
  public isBeingCarried: boolean = false;
  /** Whether the child is sleeping */
  public isSleeping: boolean = false;
  /** Whether the child is playing */
  public isPlaying: boolean = false;
  /** Whether the child has been bathed today */
  public isBathed: boolean = false;
  /** Whether the child has been fed (count of meals) */
  public mealsEaten: number = 0;
  /** Whether the child has had a bedtime story */
  public hadBedtimeStory: boolean = false;

  constructor(profile: ChildProfile, initialMood?: Partial<MoodValues>) {
    this.profile = profile;
    this.mood = new MoodVector(initialMood);
    this.position = new THREE.Vector3();
    this.mesh = this.buildMesh();
  }

  /**
   * Generate a child profile from a seed.
   */
  static generate(seed: string, index: number, ageGroup?: AgeGroup): Child {
    const rng = new SeededRandom(`${seed}_child_${index}`);

    const age: AgeGroup = ageGroup ?? rng.pick(['infant', 'toddler', 'child'] as AgeGroup[]);
    const heightRange = AGE_HEIGHTS[age];

    const profile: ChildProfile = {
      id: `child_${index}`,
      name: rng.pick(CHILD_NAMES),
      age,
      appearance: {
        skinTone: rng.nextFloat(0, 1),
        hairColor: rng.nextFloat(0, 1),
        hairStyle: rng.nextInt(0, 4),
        clothingPalette: rng.nextInt(0, 6),
        height: rng.nextFloat(heightRange.min, heightRange.max),
      },
      personality: {
        shyness: rng.nextFloat(0, 1),
        curiosity: rng.nextFloat(0, 1),
        energy: rng.nextFloat(0.3, 1),
        clinginess: rng.nextFloat(0, 1),
        stubbornness: rng.nextFloat(0, 1),
      },
      preferences: {
        favoriteFood: rng.pick(FOODS),
        hatedFood: rng.pick(FOODS),
        favoriteToy: rng.pick(TOYS),
        fearOf: rng.pick(FEARS),
      },
    };

    // Ensure favorite and hated food are different
    while (profile.preferences.hatedFood === profile.preferences.favoriteFood) {
      profile.preferences.hatedFood = rng.pick(FOODS);
    }

    const initialMood: Partial<MoodValues> = {
      hunger: rng.nextFloat(0.1, 0.4),
      boredom: rng.nextFloat(0.0, 0.3),
      fatigue: age === 'infant' ? rng.nextFloat(0.4, 0.7) : rng.nextFloat(0.1, 0.3),
      trust: rng.nextFloat(0.3, 0.6),
      mischief: rng.nextFloat(0.0, 0.2),
      comfort: rng.nextFloat(0.6, 0.9),
    };

    return new Child(profile, initialMood);
  }

  /**
   * Build a simple procedural mesh representing the child.
   */
  private buildMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = this.profile.id;

    const height = this.profile.appearance.height;
    const skinColor = this.getSkinColor();
    const clothingColor = this.getClothingColor();

    // Body
    const bodyHeight = height * 0.5;
    const bodyGeo = new THREE.BoxGeometry(height * 0.4, bodyHeight, height * 0.25);
    const bodyMat = new THREE.MeshStandardMaterial({ color: clothingColor, roughness: 0.8 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = bodyHeight / 2 + height * 0.15;
    body.castShadow = true;
    group.add(body);

    // Head
    const headRadius = height * 0.15;
    const headGeo = new THREE.SphereGeometry(headRadius, 12, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.65 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = bodyHeight + height * 0.15 + headRadius;
    head.castShadow = true;
    group.add(head);

    // Hair
    const hairGeo = new THREE.SphereGeometry(headRadius * 1.05, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const hairMat = new THREE.MeshStandardMaterial({ color: this.getHairColor(), roughness: 0.9 });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = head.position.y + headRadius * 0.1;
    group.add(hair);

    // Legs
    for (const side of [-1, 1]) {
      const legGeo = new THREE.BoxGeometry(height * 0.12, height * 0.15, height * 0.12);
      const legMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.65 });
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(side * height * 0.1, height * 0.075, 0);
      leg.castShadow = true;
      group.add(leg);
    }

    return group;
  }

  private getSkinColor(): number {
    const tone = this.profile.appearance.skinTone;
    const colors = [0xffe0c0, 0xf0c8a0, 0xd4a878, 0xb88860, 0x8c6840, 0x604830];
    const idx = Math.floor(tone * (colors.length - 1));
    return colors[Math.min(idx, colors.length - 1)];
  }

  private getHairColor(): number {
    const tone = this.profile.appearance.hairColor;
    const colors = [0xffd700, 0xcc8844, 0x8b4513, 0x4a2a0a, 0x1a1a1a, 0xff4500];
    const idx = Math.floor(tone * (colors.length - 1));
    return colors[Math.min(idx, colors.length - 1)];
  }

  private getClothingColor(): number {
    const palette = this.profile.appearance.clothingPalette;
    const colors = [0xff6666, 0x6688ff, 0x66cc66, 0xffcc44, 0xff88cc, 0x88ddff, 0xddaaff];
    return colors[palette % colors.length];
  }

  /**
   * Can this child speak full words?
   */
  canSpeak(): boolean {
    return this.profile.age === 'child';
  }

  /**
   * Can this child say simple words?
   */
  canSaySimple(): boolean {
    return this.profile.age === 'toddler' || this.profile.age === 'child';
  }

  /**
   * Can this child walk?
   */
  canWalk(): boolean {
    return this.profile.age !== 'infant';
  }

  /**
   * Can this child follow instructions?
   */
  canFollowInstructions(): boolean {
    return this.profile.age === 'child' && this.mood.values.trust > 0.5;
  }
}
