/**
 * HouseGenerator - Seed-based procedural house layout generation.
 *
 * Uses constraint-based room placement:
 * 1. Determine house size from difficulty
 * 2. Place mandatory rooms (kitchen, living room, bathroom, bedrooms)
 * 3. Add optional rooms from seed
 * 4. Build room connection graph
 * 5. Convert to 2D grid positions
 * 6. Place doorways at shared walls
 */

import { SeededRandom } from '@utils/SeededRandom';
import {
  RoomType,
  RoomNode,
  DoorInfo,
  HouseLayout,
  Difficulty,
  DIFFICULTY_CONFIGS,
} from './RoomTypes';

const ROOM_SIZES: Record<RoomType, { minW: number; maxW: number; minD: number; maxD: number }> = {
  [RoomType.Kitchen]: { minW: 4, maxW: 5, minD: 3, maxD: 4 },
  [RoomType.LivingRoom]: { minW: 5, maxW: 6, minD: 4, maxD: 6 },
  [RoomType.Bathroom]: { minW: 3, maxW: 3.5, minD: 3, maxD: 3.5 },
  [RoomType.Bedroom]: { minW: 3.5, maxW: 5, minD: 3.5, maxD: 4.5 },
  [RoomType.MasterBedroom]: { minW: 4.5, maxW: 6, minD: 4, maxD: 5 },
  [RoomType.Playroom]: { minW: 4, maxW: 5, minD: 3.5, maxD: 4.5 },
  [RoomType.LaundryRoom]: { minW: 3, maxW: 3.5, minD: 3, maxD: 3 },
  [RoomType.DiningRoom]: { minW: 3.5, maxW: 4.5, minD: 3, maxD: 4 },
  [RoomType.Hallway]: { minW: 2, maxW: 2.5, minD: 4, maxD: 8 },
  [RoomType.Garage]: { minW: 4, maxW: 5, minD: 4, maxD: 5 },
};

const WALL_HEIGHT = 3;
const DOOR_WIDTH = 1.0;

export class HouseGenerator {
  private rng: SeededRandom;

  constructor(seed: string) {
    this.rng = new SeededRandom(seed);
  }

  generate(difficulty: Difficulty): HouseLayout {
    const config = DIFFICULTY_CONFIGS[difficulty];
    const numRooms = this.rng.nextInt(config.minRooms, config.maxRooms);
    const numChildren = this.rng.nextInt(config.minChildren, config.maxChildren);

    // Step 1: Determine mandatory rooms
    const roomTypes: RoomType[] = [
      RoomType.LivingRoom,
      RoomType.Kitchen,
      RoomType.Bathroom,
    ];

    // Add bedrooms for children
    for (let i = 0; i < numChildren; i++) {
      roomTypes.push(RoomType.Bedroom);
    }

    // Add master bedroom
    roomTypes.push(RoomType.MasterBedroom);

    // Step 2: Fill remaining slots with optional rooms
    const optionalRooms = [
      RoomType.Playroom,
      RoomType.DiningRoom,
      RoomType.LaundryRoom,
      RoomType.Hallway,
      RoomType.Bathroom, // Second bathroom
    ];
    this.rng.shuffle(optionalRooms);

    while (roomTypes.length < numRooms && optionalRooms.length > 0) {
      roomTypes.push(optionalRooms.pop()!);
    }

    // Step 3: Create room nodes with sizes
    const rooms: RoomNode[] = roomTypes.map((type, i) => {
      const sizes = ROOM_SIZES[type];
      return {
        id: i,
        type,
        gridX: 0,
        gridY: 0,
        width: this.rng.nextFloat(sizes.minW, sizes.maxW),
        depth: this.rng.nextFloat(sizes.minD, sizes.maxD),
        height: WALL_HEIGHT,
        connections: [],
        worldX: 0,
        worldZ: 0,
      };
    });

    // Step 4: Layout rooms on a grid
    this.layoutRooms(rooms);

    // Step 5: Build connections (adjacent rooms get doors)
    this.buildConnections(rooms);

    // Step 6: Place doors
    const doors = this.placeDoors(rooms);

    // Calculate total bounds
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const room of rooms) {
      minX = Math.min(minX, room.worldX - room.width / 2);
      maxX = Math.max(maxX, room.worldX + room.width / 2);
      minZ = Math.min(minZ, room.worldZ - room.depth / 2);
      maxZ = Math.max(maxZ, room.worldZ + room.depth / 2);
    }

    return {
      rooms,
      doors,
      totalWidth: maxX - minX,
      totalDepth: maxZ - minZ,
    };
  }

  private layoutRooms(rooms: RoomNode[]): void {
    // Simple grid-based layout
    // Living room is center, other rooms branch off
    const livingRoom = rooms.find((r) => r.type === RoomType.LivingRoom)!;
    livingRoom.gridX = 0;
    livingRoom.gridY = 0;
    livingRoom.worldX = 0;
    livingRoom.worldZ = 0;

    const placed = new Set<number>([livingRoom.id]);
    const queue = [livingRoom];

    // Grid offsets: right, below, left, above
    const offsets = [
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: -1 },
    ];

    const occupiedGrid = new Map<string, number>();
    occupiedGrid.set('0,0', livingRoom.id);

    let offsetIdx = 0;

    for (const room of rooms) {
      if (placed.has(room.id)) continue;

      // Find an open slot adjacent to an already-placed room
      let foundSlot = false;

      for (const parent of queue) {
        for (let tries = 0; tries < 4; tries++) {
          const off = offsets[(offsetIdx + tries) % 4];
          const gx = parent.gridX + off.dx;
          const gy = parent.gridY + off.dy;
          const key = `${gx},${gy}`;

          if (!occupiedGrid.has(key)) {
            room.gridX = gx;
            room.gridY = gy;

            // Calculate world position based on adjacent room
            room.worldX = parent.worldX + off.dx * (parent.width / 2 + room.width / 2);
            room.worldZ = parent.worldZ + off.dy * (parent.depth / 2 + room.depth / 2);

            occupiedGrid.set(key, room.id);
            placed.add(room.id);
            queue.push(room);
            foundSlot = true;
            offsetIdx = (offsetIdx + 1) % 4;
            break;
          }
        }
        if (foundSlot) break;
      }

      // Fallback: place further out
      if (!foundSlot) {
        const lastPlaced = queue[queue.length - 1];
        room.gridX = lastPlaced.gridX + 1;
        room.gridY = lastPlaced.gridY;
        room.worldX = lastPlaced.worldX + lastPlaced.width / 2 + room.width / 2;
        room.worldZ = lastPlaced.worldZ;
        const key = `${room.gridX},${room.gridY}`;
        occupiedGrid.set(key, room.id);
        placed.add(room.id);
        queue.push(room);
      }
    }
  }

  private buildConnections(rooms: RoomNode[]): void {
    // Connect adjacent rooms on the grid
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const a = rooms[i];
        const b = rooms[j];
        const dx = Math.abs(a.gridX - b.gridX);
        const dy = Math.abs(a.gridY - b.gridY);

        // Adjacent if exactly 1 step apart (not diagonal)
        if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
          a.connections.push(b.id);
          b.connections.push(a.id);
        }
      }
    }

    // Ensure kitchen connects to living room if not already
    const kitchen = rooms.find((r) => r.type === RoomType.Kitchen);
    const living = rooms.find((r) => r.type === RoomType.LivingRoom);
    if (kitchen && living) {
      if (!kitchen.connections.includes(living.id)) {
        kitchen.connections.push(living.id);
        living.connections.push(kitchen.id);
      }
    }
  }

  private placeDoors(rooms: RoomNode[]): DoorInfo[] {
    const doors: DoorInfo[] = [];
    const processed = new Set<string>();

    for (const room of rooms) {
      for (const connId of room.connections) {
        const key = [Math.min(room.id, connId), Math.max(room.id, connId)].join('-');
        if (processed.has(key)) continue;
        processed.add(key);

        const other = rooms[connId];

        // Determine shared wall direction
        const dx = other.gridX - room.gridX;
        const dy = other.gridY - room.gridY;

        let doorX: number;
        let doorZ: number;
        let rotation: number;

        if (dx !== 0) {
          // Horizontal adjacency - door on vertical wall
          doorX = (room.worldX + other.worldX) / 2;
          doorZ = (room.worldZ + other.worldZ) / 2;
          rotation = 0;
        } else {
          // Vertical adjacency - door on horizontal wall
          doorX = (room.worldX + other.worldX) / 2;
          doorZ = (room.worldZ + other.worldZ) / 2;
          rotation = Math.PI / 2;
        }

        doors.push({
          roomA: room.id,
          roomB: connId,
          position: 0.5,
          worldX: doorX,
          worldZ: doorZ,
          rotation,
          width: DOOR_WIDTH,
          isOpen: false,
        });
      }
    }

    return doors;
  }
}
