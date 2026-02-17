/**
 * ObjectRegistry - Central registry of all interactable objects and their metadata.
 *
 * Every object in the house gets registered here with its interaction tags,
 * available actions, and current state. The interaction system queries this
 * registry to determine what actions are available when the player looks at an object.
 */

export type ObjectTag =
  | 'edible'
  | 'drinkable'
  | 'cookable'
  | 'breakable'
  | 'hazardous'
  | 'hot'
  | 'toy'
  | 'container'
  | 'electronic'
  | 'furniture'
  | 'clothing'
  | 'hygiene'
  | 'liquid_source';

export interface ObjectAction {
  name: string;
  label: string;
  key: 'E' | 'Q';
  /** Condition that must be true for this action to be available */
  condition?: (state: ObjectState) => boolean;
}

export interface ObjectState {
  id: string;
  name: string;
  tags: ObjectTag[];
  actions: ObjectAction[];
  /** Custom state data per object type */
  data: Record<string, unknown>;
  /** Reference to the Three.js mesh/group */
  meshRef?: unknown;
  /** Room ID this object belongs to */
  roomId: number;
  /** Whether the object is currently held by the player */
  isHeld: boolean;
  /** Whether the object is currently active (e.g., stove is on) */
  isActive: boolean;
}

export class ObjectRegistry {
  private objects: Map<string, ObjectState> = new Map();
  private nextId: number = 1;

  /**
   * Register a new object and return its ID.
   */
  register(
    name: string,
    tags: ObjectTag[],
    roomId: number,
    meshRef?: unknown,
    customData?: Record<string, unknown>,
  ): string {
    const id = `obj_${this.nextId++}`;
    const actions = this.deriveActions(tags);

    this.objects.set(id, {
      id,
      name,
      tags,
      actions,
      data: customData ?? {},
      meshRef,
      roomId,
      isHeld: false,
      isActive: false,
    });

    return id;
  }

  /**
   * Get an object by ID.
   */
  get(id: string): ObjectState | undefined {
    return this.objects.get(id);
  }

  /**
   * Get all objects with a specific tag.
   */
  getByTag(tag: ObjectTag): ObjectState[] {
    return Array.from(this.objects.values()).filter((obj) => obj.tags.includes(tag));
  }

  /**
   * Get all objects in a specific room.
   */
  getByRoom(roomId: number): ObjectState[] {
    return Array.from(this.objects.values()).filter((obj) => obj.roomId === roomId);
  }

  /**
   * Update object state data.
   */
  updateData(id: string, data: Partial<Record<string, unknown>>): void {
    const obj = this.objects.get(id);
    if (obj) {
      Object.assign(obj.data, data);
    }
  }

  /**
   * Remove an object (e.g., consumed food, broken item).
   */
  remove(id: string): void {
    this.objects.delete(id);
  }

  /**
   * Get all registered objects.
   */
  getAll(): ObjectState[] {
    return Array.from(this.objects.values());
  }

  /**
   * Derive default actions from object tags.
   */
  private deriveActions(tags: ObjectTag[]): ObjectAction[] {
    const actions: ObjectAction[] = [];

    if (tags.includes('container')) {
      actions.push({ name: 'open', label: 'Open', key: 'E' });
    }
    if (tags.includes('electronic')) {
      actions.push({ name: 'toggle', label: 'Toggle', key: 'E' });
    }
    if (tags.includes('edible')) {
      actions.push({ name: 'eat', label: 'Eat', key: 'E' });
    }
    if (tags.includes('drinkable')) {
      actions.push({ name: 'drink', label: 'Drink', key: 'E' });
    }
    if (tags.includes('toy')) {
      actions.push({ name: 'pickup', label: 'Pick Up', key: 'E' });
    }
    if (tags.includes('liquid_source')) {
      actions.push({ name: 'toggle_tap', label: 'Turn Tap', key: 'E' });
    }
    if (tags.includes('hygiene')) {
      actions.push({ name: 'use', label: 'Use', key: 'E' });
    }
    if (tags.includes('furniture')) {
      actions.push({ name: 'interact', label: 'Interact', key: 'E' });
    }
    if (tags.includes('cookable')) {
      actions.push({ name: 'cook', label: 'Cook', key: 'E' });
    }

    // Secondary action: inspect
    actions.push({ name: 'inspect', label: 'Inspect', key: 'Q' });

    return actions;
  }

  clear(): void {
    this.objects.clear();
    this.nextId = 1;
  }
}
