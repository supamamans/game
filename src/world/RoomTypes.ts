/**
 * RoomTypes - Shared types for the procedural house generation system.
 */

export enum RoomType {
  Kitchen = 'kitchen',
  LivingRoom = 'living_room',
  Bathroom = 'bathroom',
  Bedroom = 'bedroom',
  MasterBedroom = 'master_bedroom',
  Playroom = 'playroom',
  LaundryRoom = 'laundry_room',
  DiningRoom = 'dining_room',
  Hallway = 'hallway',
  Garage = 'garage',
}

export interface RoomNode {
  id: number;
  type: RoomType;
  /** Grid position (column, row) */
  gridX: number;
  gridY: number;
  /** Room dimensions in meters */
  width: number;
  depth: number;
  height: number;
  /** Connected room IDs */
  connections: number[];
  /** World-space position of room center */
  worldX: number;
  worldZ: number;
}

export interface DoorInfo {
  roomA: number;
  roomB: number;
  /** Position along the shared wall (0-1) */
  position: number;
  /** World-space coordinates */
  worldX: number;
  worldZ: number;
  /** Rotation in radians */
  rotation: number;
  /** Door width */
  width: number;
  isOpen: boolean;
}

export interface HouseLayout {
  rooms: RoomNode[];
  doors: DoorInfo[];
  totalWidth: number;
  totalDepth: number;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyConfig {
  minRooms: number;
  maxRooms: number;
  minChildren: number;
  maxChildren: number;
}

export const DIFFICULTY_CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: { minRooms: 4, maxRooms: 5, minChildren: 1, maxChildren: 2 },
  medium: { minRooms: 5, maxRooms: 7, minChildren: 2, maxChildren: 3 },
  hard: { minRooms: 6, maxRooms: 8, minChildren: 3, maxChildren: 4 },
};
