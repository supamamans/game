/**
 * EntityManager - ECS-lite entity/component system.
 *
 * Entities are just numeric IDs.
 * Components are stored in typed Maps keyed by entity ID.
 * Systems iterate over entities with specific component combinations.
 */

export type EntityId = number;

export class EntityManager {
  private nextId: EntityId = 1;
  private entities: Set<EntityId> = new Set();
  private components: Map<string, Map<EntityId, unknown>> = new Map();
  private tags: Map<string, Set<EntityId>> = new Map();

  /**
   * Create a new entity and return its ID.
   */
  createEntity(): EntityId {
    const id = this.nextId++;
    this.entities.add(id);
    return id;
  }

  /**
   * Destroy an entity and all its components.
   */
  destroyEntity(id: EntityId): void {
    this.entities.delete(id);
    for (const store of this.components.values()) {
      store.delete(id);
    }
    for (const tagSet of this.tags.values()) {
      tagSet.delete(id);
    }
  }

  /**
   * Add a component to an entity.
   */
  addComponent<T>(entityId: EntityId, componentName: string, data: T): void {
    if (!this.components.has(componentName)) {
      this.components.set(componentName, new Map());
    }
    this.components.get(componentName)!.set(entityId, data);
  }

  /**
   * Get a component from an entity.
   */
  getComponent<T>(entityId: EntityId, componentName: string): T | undefined {
    return this.components.get(componentName)?.get(entityId) as T | undefined;
  }

  /**
   * Remove a component from an entity.
   */
  removeComponent(entityId: EntityId, componentName: string): void {
    this.components.get(componentName)?.delete(entityId);
  }

  /**
   * Check if an entity has a specific component.
   */
  hasComponent(entityId: EntityId, componentName: string): boolean {
    return this.components.get(componentName)?.has(entityId) ?? false;
  }

  /**
   * Tag an entity (lightweight labeling without data).
   */
  addTag(entityId: EntityId, tag: string): void {
    if (!this.tags.has(tag)) {
      this.tags.set(tag, new Set());
    }
    this.tags.get(tag)!.add(entityId);
  }

  /**
   * Check if an entity has a specific tag.
   */
  hasTag(entityId: EntityId, tag: string): boolean {
    return this.tags.get(tag)?.has(entityId) ?? false;
  }

  /**
   * Get all entities that have ALL specified components.
   */
  query(...componentNames: string[]): EntityId[] {
    const result: EntityId[] = [];
    for (const id of this.entities) {
      if (componentNames.every((name) => this.hasComponent(id, name))) {
        result.push(id);
      }
    }
    return result;
  }

  /**
   * Get all entities with a specific tag.
   */
  queryTag(tag: string): EntityId[] {
    return Array.from(this.tags.get(tag) ?? []);
  }

  /**
   * Get total entity count.
   */
  get count(): number {
    return this.entities.size;
  }

  /**
   * Clear all entities and components.
   */
  clear(): void {
    this.entities.clear();
    this.components.clear();
    this.tags.clear();
    this.nextId = 1;
  }
}
