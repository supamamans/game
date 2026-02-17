/**
 * ChildPathfinding - A* on room graph + local steering.
 *
 * Children navigate between rooms using A* pathfinding on the room graph,
 * then use simple local steering to move within rooms.
 */

import * as THREE from 'three';
import { RoomNode } from '@world/RoomTypes';

interface PathNode {
  roomId: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

export class ChildPathfinding {
  private rooms: RoomNode[] = [];
  private currentPath: number[] = [];
  private currentPathIndex: number = 0;
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private moveSpeed: number = 1.5; // meters per second

  setRooms(rooms: RoomNode[]): void {
    this.rooms = rooms;
  }

  /**
   * Find a path from one room to another using A*.
   */
  findPath(fromRoom: number, toRoom: number): number[] {
    if (fromRoom === toRoom) return [fromRoom];

    const openSet: PathNode[] = [];
    const closedSet = new Set<number>();

    const startNode: PathNode = {
      roomId: fromRoom,
      g: 0,
      h: this.heuristic(fromRoom, toRoom),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;
    openSet.push(startNode);

    while (openSet.length > 0) {
      // Get node with lowest f
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;

      if (current.roomId === toRoom) {
        // Reconstruct path
        const path: number[] = [];
        let node: PathNode | null = current;
        while (node) {
          path.unshift(node.roomId);
          node = node.parent;
        }
        return path;
      }

      closedSet.add(current.roomId);

      // Expand neighbors
      const room = this.rooms[current.roomId];
      if (!room) continue;

      for (const neighborId of room.connections) {
        if (closedSet.has(neighborId)) continue;

        const g = current.g + this.distance(current.roomId, neighborId);
        const h = this.heuristic(neighborId, toRoom);
        const f = g + h;

        const existing = openSet.find((n) => n.roomId === neighborId);
        if (existing && g >= existing.g) continue;

        if (existing) {
          existing.g = g;
          existing.h = h;
          existing.f = f;
          existing.parent = current;
        } else {
          openSet.push({ roomId: neighborId, g, h, f, parent: current });
        }
      }
    }

    // No path found
    return [];
  }

  /**
   * Set a navigation target.
   */
  navigateTo(fromRoom: number, toRoom: number, targetPos: THREE.Vector3): void {
    this.currentPath = this.findPath(fromRoom, toRoom);
    this.currentPathIndex = 0;
    this.targetPosition.copy(targetPos);
  }

  /**
   * Update child movement along the path.
   * Returns the new position.
   */
  updateMovement(currentPos: THREE.Vector3, dt: number): { position: THREE.Vector3; reachedTarget: boolean; currentRoom: number } {
    if (this.currentPath.length === 0) {
      return { position: currentPos, reachedTarget: true, currentRoom: -1 };
    }

    const targetRoomId = this.currentPath[this.currentPathIndex];
    const targetRoom = this.rooms[targetRoomId];
    if (!targetRoom) {
      return { position: currentPos, reachedTarget: true, currentRoom: -1 };
    }

    // Move toward the room center (or final target if in last room)
    const isLastRoom = this.currentPathIndex === this.currentPath.length - 1;
    const moveTo = isLastRoom
      ? this.targetPosition
      : new THREE.Vector3(targetRoom.worldX, 0, targetRoom.worldZ);

    const direction = new THREE.Vector3().subVectors(moveTo, currentPos);
    direction.y = 0; // Keep on ground plane
    const distance = direction.length();

    if (distance < 0.3) {
      // Reached this waypoint
      if (isLastRoom) {
        return { position: currentPos, reachedTarget: true, currentRoom: targetRoomId };
      } else {
        this.currentPathIndex++;
        return { position: currentPos, reachedTarget: false, currentRoom: targetRoomId };
      }
    }

    // Move toward target
    direction.normalize();
    const step = Math.min(this.moveSpeed * dt, distance);
    const newPos = currentPos.clone().add(direction.multiplyScalar(step));

    return { position: newPos, reachedTarget: false, currentRoom: targetRoomId };
  }

  private heuristic(fromRoom: number, toRoom: number): number {
    return this.distance(fromRoom, toRoom);
  }

  private distance(roomA: number, roomB: number): number {
    const a = this.rooms[roomA];
    const b = this.rooms[roomB];
    if (!a || !b) return Infinity;

    const dx = a.worldX - b.worldX;
    const dz = a.worldZ - b.worldZ;
    return Math.sqrt(dx * dx + dz * dz);
  }

  setMoveSpeed(speed: number): void {
    this.moveSpeed = speed;
  }
}
