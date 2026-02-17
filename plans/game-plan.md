# The Guardian's Vigil - Complete Game Plan

> A hyper-realistic, first-person babysitting simulation pushing the absolute limits of 2026 browser technology. WebGPU. Procedural everything. AI children that feel alive.

---

## 1. Vision Statement

You are dropped into a stranger's home. The parents are gone. The kids are yours for the next 16 hours. Every house is different. Every child is different. Every object can be touched, moved, broken, or used. The kids have moods, memories, and agendas of their own. You have to cook real meals, run real baths, dodge real tantrums, and survive until the parents come home.

This is not a casual game. This is a simulation that makes you *feel* the weight of responsibility.

**Target aesthetic**: Stylized realism -- think "Firewatch meets Untitled Goose Game" with the lighting quality of a AAA indie title. Low-poly geometry elevated by world-class shaders, volumetric lighting, and atmospheric effects.

---

## 2. Technical Foundation

### 2.1 Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Build | Vite 6.x | Sub-second HMR, native ESM, optimized chunking |
| Language | TypeScript 5.7+ | Strict mode, decorators for component registration |
| Renderer | Three.js r170+ WebGPU backend | Native WebGPU via TSL, automatic WebGL2 fallback |
| Shading | TSL (Three Shading Language) | Node-based shader graphs, compiles to WGSL/GLSL |
| Physics | Rapier 3D WASM via WebWorker | Deterministic, high-performance rigid body + collider system |
| Audio | Web Audio API + Howler.js | Spatial 3D audio, procedural sound synthesis for ambient |
| AI | Custom HFSM + Utility AI hybrid | Children make decisions based on weighted utility scores |
| Pathfinding | Custom A* on room-graph + local steering | Lightweight, no navmesh library needed |
| UI | HTML/CSS overlay via DOM | Clean separation from WebGPU canvas |
| Deployment | GitHub Actions -> GitHub Pages | Zero-cost, automated on every push |

### 2.2 WebGPU Capabilities We Will Exploit

WebGPU is not just "faster WebGL." It unlocks compute shaders, which means the GPU does work that used to require a server:

- **Compute Shaders for Particles**: Water from taps, steam from cooking, dust motes in sunlight -- all calculated on the GPU at 60fps with tens of thousands of particles
- **GPU-driven Lighting**: Light culling via compute pass means we can have 64+ active point lights without frame drops (every lamp, candle, stove burner, nightlight)
- **Indirect Draw Calls**: Furniture instancing -- the GPU decides what to draw, not the CPU, enabling dense room clutter
- **Storage Buffers for AI**: Child mood vectors and interaction weights can be batch-updated via compute for zero-cost AI ticks

### 2.3 Performance Targets

| Metric | Target | Stretch Goal |
|--------|--------|-------------|
| FPS | 60 fps @ 1080p on GTX 1660 / M1 | 60 fps @ 1440p on RTX 3060 / M2 |
| Initial load | < 4 seconds on 50 Mbps | < 2 seconds with service worker cache |
| Memory | < 400 MB GPU | < 256 MB with LOD streaming |
| Bundle | < 8 MB gzipped | < 5 MB with aggressive tree-shaking |
| Physics objects | 200+ active rigid bodies | 500+ with sleep optimization |

### 2.4 Browser Support

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome 113+ | Full WebGPU | Primary target |
| Edge 113+ | Full WebGPU | Same engine as Chrome |
| Firefox Nightly | WebGPU behind flag | Warn user, still functional |
| Safari 18+ | Partial WebGPU | Test thoroughly, may need workarounds |
| Older browsers | WebGL2 fallback | Reduced lighting, no compute particles, still playable |

Detection splash screen on load: checks `navigator.gpu`, warns if unavailable, offers quality presets.

---

## 3. Game Design - Deep Dive

### 3.1 The Day Structure

The in-game day runs from **6:00 AM to 10:00 PM** (16 hours). Real-time ratio: **1 real minute = 16 in-game minutes**, making the full session **~60 real minutes**.

Each phase has emergent gameplay pressure:

```
EARLY MORNING (6:00 - 8:00)
  - Kids wake up at staggered times
  - Infants cry immediately (hunger)
  - Older kids may wander into kitchen unsupervised
  - Player should prepare breakfast

MORNING (8:00 - 12:00)
  - Peak activity time
  - Kids have highest energy and mischief potential
  - Good time for structured play (reduces boredom buildup)
  - TV can be used as a "babysitting crutch" (reduces mischief but also trust)

LUNCH (12:00 - 1:00)
  - All kids get hungry simultaneously
  - Cooking multiple meals while managing chaos
  - Food prep involves actual steps: get ingredients, use stove, plate food

AFTERNOON (1:00 - 5:00)
  - Nap window for infants and toddlers
  - Older kids get bored faster
  - Mischief peaks if boredom is unmanaged
  - Good time for player to eat and recover stress

DINNER (5:00 - 7:00)
  - Second meal preparation
  - Kids may refuse food if trust is low
  - Bath time should start after dinner

EVENING (7:00 - 9:00)
  - Bath time (one kid at a time, others unsupervised)
  - Bedtime routine: pajamas, story, lights off
  - Infants need final feeding
  - Toddlers may resist bedtime

WRAP-UP (9:00 - 10:00)
  - All kids should be asleep
  - Bonus points for cleaning the house
  - Parents arrive, scoring screen
```

### 3.2 Player Systems - Extreme Detail

#### 3.2.1 Stats

| Stat | Range | Decay/sec | Critical Threshold | Effect at Critical |
|------|-------|-----------|-------------------|-------------------|
| Hydration | 0 - 100 | -0.08 | < 15 | Screen desaturation, slower movement |
| Hunger | 0 - 100 | -0.12 | < 15 | Screen vignette, hand tremor on interactions |
| Energy | 0 - 100 | -0.06 | < 10 | Movement speed halved, interaction time doubled |
| Stress | 0 - 100 | +variable | > 85 | Tunnel vision, audio distortion, panic heartbeat |

#### 3.2.2 Movement and Controls

- **WASD**: Move (with acceleration/deceleration for weight feel)
- **Mouse**: Look (pointer lock)
- **E**: Primary interact
- **Q**: Secondary interact / context action
- **Tab**: Open inventory (carried items)
- **F**: Toggle crouch (needed to interact with low objects, talk to kids at eye level)
- **Shift**: Sprint (drains energy faster, scares nervous kids)
- **Space**: Stand up from sitting
- **ESC**: Pause menu

#### 3.2.3 Hands System

The player has two hands, visible at the bottom of the screen:

- **Left hand**: Can hold a small item (bottle, cup, phone)
- **Right hand**: Primary interaction hand (cooking, turning knobs, picking up kids)
- **Both hands**: Required for large items (serving tray, carrying a child)
- Carrying a child locks both hands -- you cannot cook or open doors while holding an infant
- Visual hand models with procedural animation (reaching, gripping, turning)

#### 3.2.4 Cooking System

Cooking is a mini-simulation within the simulation:

```
RECIPE FLOW:
  1. Open fridge -> Select ingredient (milk, eggs, vegetables, etc.)
  2. Place on counter
  3. Interact with stove -> Select burner -> Turn knob (flame appears)
  4. Place pan on lit burner
  5. Add ingredients to pan
  6. Wait (timer based on recipe)
  7. Overcooking triggers smoke -> smoke alarm -> all kids panic
  8. Plate food -> Carry to table -> Place in front of child
```

Available meals scale with difficulty:
- **Easy**: Cereal + milk, sandwiches, fruit
- **Medium**: Scrambled eggs, pasta, soup
- **Hard**: Full cooked meals (multiple ingredients, timing-dependent)

Kids have food preferences baked into their profile. A picky eater may refuse soup but love sandwiches.

### 3.3 Child AI - The Heart of the Game

#### 3.3.1 Child Profiles

Each child is procedurally generated from the session seed:

```typescript
interface ChildProfile {
  name: string              // From a name pool
  age: 'infant' | 'toddler' | 'child'
  appearance: {
    skinTone: number        // 0-1 mapped to color ramp
    hairColor: number
    hairStyle: number       // Index into style set per age
    clothingPalette: number
    height: number          // Varies within age range
  }
  personality: {
    shyness: number         // 0-1: affects trust gain rate
    curiosity: number       // 0-1: affects exploration behavior
    energy: number          // 0-1: affects activity level
    clinginess: number      // 0-1: affects how much they follow player
    stubbornness: number    // 0-1: affects compliance with instructions
  }
  preferences: {
    favoriteFood: string
    hatedFood: string
    favoriteToy: string
    fearOf: string          // 'dark' | 'loud_noises' | 'water' | 'none'
  }
  initialMood: MoodVector
}
```

#### 3.3.2 Mood Vector - Continuous Emotional State

```typescript
interface MoodVector {
  hunger: number      // 0-1, decays over time, replenished by eating
  boredom: number     // 0-1, decays during play, builds during inactivity
  fatigue: number     // 0-1, builds over time, reduced by sleep
  trust: number       // 0-1, builds through positive interaction, drops on neglect
  mischief: number    // 0-1, builds when bored + energetic, reduced by structured play
  comfort: number     // 0-1, affected by diaper state, temperature, fear triggers
  happiness: number   // 0-1, composite of other stats, main scoring metric
}
```

**Happiness calculation**:
```
happiness = (1 - hunger) * 0.25
          + (1 - boredom) * 0.20
          + (1 - fatigue) * 0.15
          + trust * 0.20
          + comfort * 0.20
```

#### 3.3.3 Hierarchical FSM + Utility AI Hybrid

The HFSM handles high-level state transitions. Within each state, a **Utility AI** scores available actions and picks the highest-value one. This creates emergent, unpredictable behavior.

```
ROOT STATES:
  SLEEPING
    - Transitions to WAKING when fatigue < 0.3 or loud noise detected
    
  CONTENT
    Sub-states scored by Utility AI:
      - Playing_Alone (picks nearest toy, plays with it)
      - Playing_With_Sibling (if another child nearby and both content)
      - Watching_TV (if TV is on, reduces boredom but also trust slightly)
      - Following_Player (if clinginess > 0.6 and player nearby)
      - Exploring (if curiosity > 0.5, wanders to unexplored rooms)
      - Sitting_Idle (fallback)
    
  NEEDY
    Triggered when any need > 0.7
    Sub-states:
      - Requesting_Food (walks to player, tugs, gestures at kitchen)
      - Requesting_Attention (follows player, makes noise)
      - Requesting_Comfort (if scared or uncomfortable, seeks player)
      - Requesting_Bathroom (toddlers only, urgent timer)
    
  UPSET  
    Triggered when need > 0.85 or trust < 0.2
    Sub-states:
      - Crying (stationary, produces audio, affects other kids' comfort)
      - Hiding (goes to bedroom, hides behind furniture)
      - Refusing_Interaction (won't accept food or comfort from player)
      - Breaking_Things (picks up objects and throws them)
    
  TANTRUM
    Triggered when upset for too long or multiple needs critical
    Sub-states:
      - Screaming (loud, continuous, raises player stress rapidly)
      - Throwing (physics-enabled projectiles)
      - Floor_Tantrum (lies on floor, kicks, blocks pathways)
      - Contagious_Crying (triggers nearby children to also cry)
```

#### 3.3.4 Age-Specific Behaviors

**Infants (0-1)**:
- Cannot move independently, must be carried
- Only communication: crying (intensity varies with need severity)
- Needs: feeding (bottle), diaper changes, burping, holding
- Falls asleep when fatigue > 0.9 and being held or in crib
- If left crying too long, other kids get upset (comfort drops)

**Toddlers (2-3)**:
- Walk erratically, fall occasionally (physics ragdoll moment)
- Put random objects in mouth (hazard trigger if near small/sharp objects)
- Can say simple words: "hungry," "no," "play," "scared"
- Need bathroom assistance (urgent timer, accident if ignored)
- Can open low cabinets and drawers (hazard access)
- Will try to climb furniture if mischief is high

**Children (4-7)**:
- Walk normally, can run
- Full speech: make requests, refuse instructions, express feelings
- Can follow verbal commands if trust > 0.5 ("go to your room," "wash your hands")
- Can play independently for longer periods
- Can help with simple tasks if trust > 0.8 ("bring me the towel")
- May bully younger siblings if mischief > 0.7
- Understand cause and effect (know stove is hot, know to flush toilet)

#### 3.3.5 Inter-Child Dynamics

Children interact with each other, not just the player:

- **Sharing**: Content children near the same toy may share (or fight over it)
- **Contagion**: One child crying can trigger others, especially infants
- **Bullying**: High-mischief older kids may take toys from younger ones
- **Cooperation**: High-trust children may play together, boosting both happiness
- **Teaching**: Older children can "teach" toddlers (e.g., how to stack blocks)
- **Tattling**: Children may come tell the player about a sibling's misbehavior

### 3.4 Interaction System - Everything is Touchable

#### 3.4.1 Object Categories

```typescript
type ObjectTag = 
  | 'edible'          // Can be consumed
  | 'drinkable'       // Can be drunk
  | 'cookable'        // Can be placed on stove
  | 'breakable'       // Shatters on impact
  | 'hazardous'       // Dangerous to children
  | 'hot'             // Burns on contact (dynamic, only when heated)
  | 'toy'             // Children interact with it
  | 'container'       // Has inventory (fridge, cabinet, drawer)
  | 'electronic'      // Can be turned on/off
  | 'furniture'       // Can be sat on or climbed
  | 'clothing'        // Pajamas, bibs
  | 'hygiene'         // Soap, towels, diapers
  | 'liquid_source'   // Taps, bottles
```

#### 3.4.2 Full Interaction Map

**Kitchen**:
| Object | Actions | Physics | Hazard |
|--------|---------|---------|--------|
| Fridge | Open/Close, Browse contents | Door swings with weight | No |
| Stove | Turn burners on/off individually | Pan slides on surface | Yes (hot) |
| Oven | Open/Close, Set temperature | Door weight physics | Yes (hot) |
| Microwave | Open/Close, Start/Stop, Set time | Door spring | No |
| Sink | Turn tap on/off, Fill container | Water particles | Flood if left on |
| Cabinets | Open/Close each door | Hinge physics | Cleaning supplies inside |
| Drawers | Pull open/Push closed | Slide physics | Knives and sharp objects |
| Knife block | Take/Replace knives | Grabbable | Yes (sharp) |
| Cutting board | Place food, Chop | Food splits into pieces | No |
| Plates/Bowls | Pick up, Place, Fill | Breakable on drop | Shards |
| Cups/Bottles | Pick up, Fill, Pour | Liquid inside tracks | Glass ones break |
| High chair | Place child in/Take out | Tray flips down | No |

**Bathroom**:
| Object | Actions | Physics | Hazard |
|--------|---------|---------|--------|
| Bathtub | Turn taps (hot/cold), Fill, Drain | Water level rises, temperature mixes | Hot water, drowning if infant alone |
| Toilet | Flush, Lid up/down | Water swirl particle | No |
| Sink | Tap on/off | Water particles | Flood |
| Medicine cabinet | Open/Close | Hinge | Yes (medications) |
| Towels | Pick up, Use on child | Cloth physics (simplified) | No |
| Soap/Shampoo | Pick up, Use | Bubbles particle effect | Slippery floor |
| Rubber duck | Pick up, Place in bath | Floats on water | No (toy) |

**Living Room**:
| Object | Actions | Physics | Hazard |
|--------|---------|---------|--------|
| TV | Turn on/off, Change channel | Screen emits light | No |
| Couch | Sit (restores energy) | Cushion deform | No |
| Coffee table | Place items | Normal | Sharp corners |
| Bookshelves | Take/Replace books | Books are physics objects | Top-heavy if climbed |
| Toy box | Open, Take toys | Toys scatter | No |
| Building blocks | Stack, Knock over | Full rigid body | Small pieces (choking) |
| Crayons | Give to child | Drawing appears on paper/walls | Stains |
| Windows | Open/Close, Curtains | Breeze particle if open | Fall hazard if child climbs |
| Light switch | Toggle | Instant lighting change | No |
| Electrical outlets | Cover/Uncover | Small interaction | Yes (shock hazard for toddlers) |

**Bedrooms**:
| Object | Actions | Physics | Hazard |
|--------|---------|---------|--------|
| Bed/Crib | Place child, Tuck in | Blanket deform | Crib bars (infant can't escape) |
| Dresser | Open drawers, Get pajamas | Drawer slide | Tip-over if climbed |
| Nightlight | Toggle | Warm glow | No |
| Books | Pick up, Read to child | Pages turn | No |
| Stuffed animals | Give to child, Toss | Soft body approximate | No |
| Closet | Open/Close | Sliding or hinge | Kids hide inside |
| Baby monitor | Turn on/off | Audio relay from room | No |

#### 3.4.3 Ray-Cast Interaction Pipeline

```
Every Frame:
  1. Cast ray from camera center
  2. Check hit against interaction collider layer
  3. If hit:
     a. Highlight object (emission boost + outline shader)
     b. Show context prompt: "E: Open" / "Q: Inspect"
     c. If within range (2 meters), enable interaction
  4. On interact:
     a. Read object's InteractionMetadata
     b. Determine available actions based on context
        (e.g., cup near sink = "Fill", cup near child = "Give")
     c. Play interaction animation
     d. Update world state
```

### 3.5 Procedural House Generation

#### 3.5.1 Generation Algorithm

Uses a **constraint-based room placement** system:

```
STEP 1: Determine house size from difficulty
  Easy:   4-5 rooms, 1-2 kids
  Medium: 5-7 rooms, 2-3 kids  
  Hard:   6-8 rooms, 3-4 kids

STEP 2: Place mandatory rooms
  - Kitchen (always connects to living room)
  - Living Room (central hub)
  - Bathroom (at least one)
  - Bedroom per child + master bedroom

STEP 3: Add optional rooms (from seed)
  - Second bathroom
  - Playroom
  - Laundry room
  - Garage (locked, distraction for curious kids)
  - Hallway/Corridor

STEP 4: Room connection graph
  - Living room connects to 2-4 rooms
  - Kitchen connects to living room + optionally dining area
  - Bedrooms connect to hallway or living room
  - Bathroom accessible from hallway or bedroom

STEP 5: Physical layout
  - Convert graph to 2D grid positions
  - Size each room (3x3 to 6x6 meters)
  - Place doorways at shared walls
  - Validate: all rooms reachable, no overlaps

STEP 6: Furnish
  - Each room type has furniture sets
  - Placement uses anchor points (against walls, centered)
  - Randomize which items from set are placed (seed-based)
  - Place hazards according to difficulty
  
STEP 7: Lighting
  - Each room gets 1-3 light sources
  - Windows on exterior walls
  - Light color/intensity matches room type
```

#### 3.5.2 House Layouts Visualization

```
Example Easy House (4 rooms):

+-------------+----------+
|             |          |
|   KITCHEN   | BATHROOM |
|             |          |
+------+------+----+-----+
       |           |
+------+-----------+-----+
|                        |
|     LIVING ROOM        |
|                        |
+------+-----------+-----+
       |           |
+------+------+----+-----+
|             |          |
|  BEDROOM 1  | BEDROOM 2|
|             |          |
+-------------+----------+

Example Hard House (8 rooms):

+----------+--------+---------+
|          |        |         |
| KITCHEN  | DINING | LAUNDRY |
|          |        |         |
+----+-----+---+----+---------+
     |         |
+----+---------+----+----------+
|                   |          |
|   LIVING ROOM     | PLAYROOM |
|                   |          |
+----+---------+----+----+-----+
     |         |         |
+----+----+----+----+----+-----+
|         |         |          |
|BEDROOM 1|BATHROOM |BEDROOM 2 |
|         |         |          |
+---------+---------+----+-----+
                         |
                    +----+-----+
                    |          |
                    |BEDROOM 3 |
                    |          |
                    +----------+
```

### 3.6 Hazard and Emergency System

Hazards create tension and require constant vigilance:

| Hazard | Trigger | Consequence | Prevention |
|--------|---------|-------------|-----------|
| Hot stove | Burner left on, child touches | Child gets hurt, trust drops to 0, massive score penalty | Turn off burners, use stove guard |
| Sharp objects | Child accesses drawer with knives | Injury event | Keep drawers closed, move knives high |
| Cleaning supplies | Toddler opens cabinet under sink | Poison event | Child-lock cabinets (interaction) |
| Bathtub | Infant left unattended in water | Drowning timer (30 seconds warning) | Never leave infant in bath |
| Hot water | Bath temp too high | Burn, child screams | Check temperature before placing child |
| Electrical outlet | Toddler pokes uncovered outlet | Shock event | Cover outlets |
| Falling furniture | Child climbs bookshelf/dresser | Crush hazard, furniture tips | Anchor furniture (interaction) |
| Small objects | Infant/toddler puts blocks in mouth | Choking event (QTE to resolve) | Keep small objects away |
| Stairs (if present) | Toddler near stairway | Fall injury | Use baby gate |
| Open windows | Child climbs near open window | Fall hazard | Close windows, lock them |

**Emergency Resolution**: Some hazards trigger a **Quick Time Event (QTE)** -- the player has 3-5 seconds to press the correct key to prevent the worst outcome. Successful QTE = minor scare. Failed = incident logged, major score penalty.

### 3.7 Scoring System

```
END OF DAY SCORE CALCULATION:

CHILD HAPPINESS (40% weight)
  Average final happiness across all children
  Bonus: +5% per child with happiness > 0.8
  Penalty: -10% per child with happiness < 0.3

SAFETY (25% weight)  
  Base: 100%
  -15% per serious incident (burn, cut, fall)
  -25% per critical incident (drowning scare, poisoning)
  -5% per minor incident (bonk, scare)
  
HOUSE CONDITION (15% weight)
  -2% per broken object
  -3% per uncleaned spill
  -5% per room left in chaos (>5 displaced objects)
  +5% bonus for spotless house
  
PLAYER HEALTH (10% weight)
  Average of player stats at end
  Bonus if no stat went critical all day

BONUS OBJECTIVES (10% weight)
  +2% All kids asleep by 9:00 PM
  +2% All kids ate 3 meals
  +2% All kids bathed
  +2% No TV used all day
  +2% Read bedtime story to each child

STAR RATING:
  90-100% = 5 stars (Perfect Guardian)
  75-89%  = 4 stars (Great Job)
  60-74%  = 3 stars (Good Enough)
  40-59%  = 2 stars (Needs Improvement)
  0-39%   = 1 star  (Disaster)

SPECIAL ENDINGS:
  - "Breakdown": Player stress hit 100% -> game ends early
  - "Emergency": Critical incident unresolved -> game ends, 0 stars
  - "Perfect Day": 100% score -> special animation, unlock next difficulty
```

---

## 4. Graphics Pipeline - Going Overboard

### 4.1 Rendering Architecture

```
FRAME PIPELINE:

1. SCENE UPDATE
   - Update transforms, animations, AI positions
   - Cull objects outside camera frustum
   
2. SHADOW PASS
   - Cascaded shadow maps for sun/moon through windows
   - Point light shadow cubemaps for 4 nearest lights
   
3. G-BUFFER PASS (WebGPU Compute)
   - Render albedo, normals, roughness, metalness, depth
   - Custom TSL materials for each surface type
   
4. LIGHTING PASS (Compute Shader)
   - Tile-based light culling: divide screen into 16x16 tiles
   - Each tile processes only affecting lights
   - Supports 64+ point lights at full speed
   
5. VOLUMETRIC PASS
   - God rays from windows (screen-space ray march)
   - Dust particles in light beams (GPU instanced)
   - Steam from cooking (volumetric noise)
   
6. WATER/FLUID PASS
   - GPU particle simulation for running water
   - Surface tension approximation for puddles
   - Foam and splash sub-emitters
   
7. POST-PROCESSING
   - Screen-space reflections (SSR) for tile and wet floors
   - Ambient occlusion (GTAO)
   - Bloom on bright lights
   - Depth of field when stressed (tunnel vision)
   - Color grading (warm morning, cool evening, harsh fluorescent)
   - Film grain + subtle chromatic aberration at high stress
   
8. UI COMPOSITE
   - DOM overlay for HUD, rendered on top of canvas
```

### 4.2 Custom TSL Shaders

Each material type gets a bespoke TSL shader:

#### Wood (floors, furniture, cabinets)
- Procedural grain using layered noise
- Parallax mapping for depth
- Roughness variation (polished table vs. raw shelf)
- Scratches and wear on high-traffic surfaces

#### Tile (kitchen, bathroom)
- Grid pattern with grout lines
- Per-tile color variation
- Specular highlights that reflect lights
- Wet tile variant (higher reflectivity after water spill)

#### Fabric (couch, curtains, clothing)
- Subsurface scattering approximation for light through curtains
- Microfiber noise for couch texture
- Wrinkle normal maps (procedural)

#### Skin (children)
- Subsurface scattering for realistic skin
- Subtle color variation (cheeks, ears slightly redder)
- Different settings per skin tone
- Shader responds to "crying" state (reddened cheeks and nose)

#### Water
- Screen-space refraction for bathtub water
- Caustic projection on bathtub floor
- Foam particles on surface
- Color changes with soap addition (becomes milky)

#### Glass (windows, cups, bottles)
- Transmission with absorption color
- Refraction offset
- Condensation effect (bathroom steam)

#### Food
- Per-food-type color and roughness
- "Cooking" state transition (raw -> cooked -> burnt via shader uniform)
- Steam particles above hot food

### 4.3 Lighting Design

The lighting sells the entire visual experience:

**Time-of-Day System**:
```
6:00 AM  - Warm golden sunrise through east windows
8:00 AM  - Bright daylight, shadows shorten
12:00 PM - Overhead sun, maximum brightness
3:00 PM  - Warm afternoon, long shadows return  
6:00 PM  - Golden hour, everything glows
8:00 PM  - Blue twilight, interior lights become dominant
9:00 PM  - Night, only interior lights and moonlight
```

**Interior Lights**:
- Ceiling fixtures: warm white, medium intensity
- Table lamps: warm yellow, low intensity, cozy
- Kitchen fluorescents: cool white, harsh (intentionally less pleasant)
- Nightlights: dim orange glow, just enough to navigate
- Stove burner: flickering orange, casts dramatic shadows
- TV: animated color wash that bounces off walls
- Candles (if present): fire shader with flicker, volumetric glow

### 4.4 Particle Systems

All computed on GPU via compute shaders:

| System | Particle Count | Purpose |
|--------|---------------|---------|
| Tap water | 2,000 | Stream from faucet, splashes on impact |
| Bath fill | 5,000 | Water surface particles + splash |
| Steam | 1,000 | Rising from hot food, bath, stove |
| Dust motes | 500 | Float in sunbeams, settle on surfaces |
| Food crumbs | 200 | Scatter when child eats messily |
| Soap bubbles | 300 | During bath time |
| Smoke | 800 | When food burns, triggers alarm |
| Broken glass | 100 | When breakable objects shatter |
| Confetti | 500 | Celebration effect on 5-star ending |

### 4.5 Animation System

- **Player hands**: IK-driven procedural animation (reach toward interaction point, grip, turn, release)
- **Children**: Blend tree of idle/walk/run/sit/sleep/cry animations, all procedural (no mocap files needed)
- **Doors/Drawers**: Hinge and slider physics-driven animation
- **Water level**: Shader-driven bathtub fill with wave simulation
- **Cooking**: Food state morphs (egg cracks, liquid pours, steam rises)
- **Day/Night**: Continuous smooth interpolation of sky color, shadow angle, light intensity

---

## 5. Audio Design

### 5.1 Sound Categories

| Category | Examples | Implementation |
|----------|---------|---------------|
| Ambient | House creaks, wind outside, clock ticking, fridge hum | Looping audio sprites, volume varies with proximity |
| Children | Crying (3 intensities), laughing, babbling, words | Pitch-shifted base samples per age |
| Interaction | Door open/close, drawer slide, tap water, stove click, plate clink | One-shot samples triggered by interaction events |
| Cooking | Sizzling, boiling, microwave hum, timer ding | Looping while cooking active |
| Alert | Smoke alarm, child scream, glass break, bump/thud | Loud, distinct, designed to spike stress |
| Music | Calm ambient score during content phases, tense strings during emergencies | Adaptive music system that crossfades based on game state |

### 5.2 Spatial Audio

All sounds are positioned in 3D space using Web Audio API's `PannerNode`:

- Crying from a specific room tells you which child needs attention
- Running water from the bathroom reminds you the tap is on
- A crash from the kitchen means something broke
- Footsteps of children give away their location through walls

### 5.3 Adaptive Music

The background soundtrack responds to the game state:

```
State: CALM (all kids content, low stress)
  -> Gentle piano, major key, sparse

State: BUSY (multiple kids needy, moderate stress)
  -> Add strings, increase tempo slightly

State: TENSE (hazard active, child crying, high stress)
  -> Minor key, staccato strings, heartbeat undertone

State: EMERGENCY (critical hazard, tantrum)
  -> Full orchestra swell, alarm-like motifs

State: BEDTIME (evening, kids sleeping)
  -> Music box melody, very quiet, soothing
```

Transitions are crossfaded over 3-5 seconds so they feel natural.

---

## 6. Architecture

### 6.1 Project Structure

```
/
  src/
    core/
      Engine.ts              -- Game loop: fixed timestep physics, variable render
      Clock.ts               -- In-game time, real-time conversion, phase tracking
      EventBus.ts            -- Pub/sub for decoupled communication
      StateMachine.ts        -- Generic FSM used by game state and child AI
      EntityManager.ts       -- ECS-lite: entity creation, component storage, system dispatch
      SaveSystem.ts          -- localStorage serialization for mid-session saves

    renderer/
      WebGPURenderer.ts      -- Three.js WebGPU setup, render pipeline orchestration
      FallbackRenderer.ts    -- WebGL2 path with reduced features
      PostProcessing.ts      -- SSR, GTAO, bloom, DOF, color grading
      LightManager.ts        -- Tile-based light culling, shadow atlas
      ParticleSystem.ts      -- GPU compute particle manager
      ShaderLibrary.ts       -- Registry of all TSL material shaders

    shaders/
      wood.tsl.ts
      tile.tsl.ts
      fabric.tsl.ts
      skin.tsl.ts
      water.tsl.ts
      glass.tsl.ts
      food.tsl.ts
      sky.tsl.ts
      particles.wgsl         -- Compute shader for particle sim

    world/
      HouseGenerator.ts      -- Seed-based procedural house layout
      RoomBuilder.ts         -- Constructs room geometry from template
      FurnitureFactory.ts    -- Procedural furniture from primitives
      DoorSystem.ts          -- Door state, animation, physics
      ObjectRegistry.ts      -- All interactable objects and their metadata
      TimeOfDay.ts           -- Sun position, light color, phase transitions

    interaction/
      RayCaster.ts           -- Camera ray-cast, hit detection
      InteractionManager.ts  -- Context-aware action resolution
      HighlightSystem.ts     -- Object outline and emission on hover
      HandController.ts      -- Dual-hand system, carrying, animation
      CookingSystem.ts       -- Recipe state machine, food transformations
      HygieneSystem.ts       -- Bath, diaper, handwashing logic

    entities/
      Player.ts              -- First-person controller, stats, inventory
      Child.ts               -- Child entity, profile, appearance generation
      ChildAI.ts             -- HFSM + Utility AI decision making
      MoodVector.ts          -- Mood decay, boost, and composite calculations
      ChildPathfinding.ts    -- A* on room graph + local obstacle avoidance
      ChildAnimation.ts      -- Procedural animation blend trees
      ChildSpeech.ts         -- Text bubble system, age-appropriate vocabulary

    systems/
      PhysicsSystem.ts       -- Rapier WebWorker bridge, collision events
      NeedsSystem.ts         -- Player stat decay, replenishment
      HazardSystem.ts        -- Hazard detection, warning, QTE triggers
      ScoringSystem.ts       -- Running score accumulator
      ChildInteraction.ts    -- Child-object and child-child interactions
      EmergencySystem.ts     -- Critical event handling, QTE system

    audio/
      AudioManager.ts        -- Howler.js wrapper, spatial audio
      MusicSystem.ts         -- Adaptive music state machine, crossfading
      SoundEffects.ts        -- Sound effect registry and triggers

    ui/
      HUD.ts                 -- Player stats, clock, alerts (DOM overlay)
      InteractionPrompt.ts   -- "Press E to..." context display
      PauseMenu.ts           -- Pause, settings, quality presets, quit
      StartScreen.ts         -- Title, seed input, difficulty, controls
      ScoreScreen.ts         -- End-of-day results, star rating
      QTEOverlay.ts          -- Quick time event display
      TutorialSystem.ts      -- First-run contextual hints
      ChildStatusPanel.ts    -- Shows mood indicators for each child

    utils/
      SeededRandom.ts        -- Deterministic PRNG from seed string
      MathUtils.ts           -- Lerp, clamp, remap, noise functions
      DebugOverlay.ts        -- FPS, draw calls, entity count (dev only)

  public/
    index.html
    audio/
      ambient/               -- Compressed ambient loops (<1 MB total)
      sfx/                   -- Interaction sound effects (<2 MB total)
      music/                 -- Adaptive music stems (<3 MB total)
    
  .github/
    workflows/
      deploy.yml             -- Build + deploy to gh-pages
    
  vite.config.ts
  tsconfig.json
  package.json
  README.md
```

### 6.2 Core Game Loop

```typescript
// Fixed timestep for physics and AI, variable for rendering
const PHYSICS_STEP = 1 / 60  // 60 Hz
let accumulator = 0

function gameLoop(timestamp: number) {
  const dt = timestamp - lastTime
  lastTime = timestamp
  accumulator += dt / 1000

  // Fixed-step updates (physics, AI, needs)
  while (accumulator >= PHYSICS_STEP) {
    physicsSystem.step(PHYSICS_STEP)
    needsSystem.update(PHYSICS_STEP)
    childAISystem.update(PHYSICS_STEP)
    hazardSystem.check(PHYSICS_STEP)
    scoringSystem.accumulate(PHYSICS_STEP)
    clock.advance(PHYSICS_STEP)
    accumulator -= PHYSICS_STEP
  }

  // Variable-step updates (rendering, audio, UI)
  interactionSystem.update()
  audioManager.update()
  particleSystem.update(dt / 1000)
  renderer.render(scene, camera)
  hud.update()

  requestAnimationFrame(gameLoop)
}
```

### 6.3 Event Bus Architecture

Systems communicate through events, not direct references:

```
Example event flow when player feeds a child:

Player interacts with food           -> emit('item.pickup', food)
Player interacts with child          -> emit('child.feed', childId, food)
  -> CookingSystem validates food    -> emit('food.consumed', foodId, childId)
  -> Child MoodVector updates        -> emit('mood.changed', childId, moodDelta)
  -> Animation plays                 -> emit('animation.play', childId, 'eating')
  -> ScoringSystem logs meal         -> emit('score.event', 'meal_served')
  -> NeedsSystem updates child hunger -> emit('need.satisfied', childId, 'hunger')
  -> AudioManager plays eating sound -> emit('audio.play', 'eating', position)
```

---

## 7. Implementation Phases

### Phase 1: Scaffold and Render
- [ ] Vite + TypeScript project setup
- [ ] Three.js WebGPU renderer initialization
- [ ] WebGL2 fallback detection
- [ ] First-person camera with pointer lock
- [ ] WASD movement with acceleration
- [ ] Single test room (box with floor, walls, ceiling)
- [ ] Basic directional light (sunlight)
- [ ] GitHub Actions deploy.yml
- [ ] Deploy empty room to GitHub Pages

**Milestone**: Walk around an empty room in the browser.

### Phase 2: Procedural World
- [ ] SeededRandom utility
- [ ] Room graph generation algorithm
- [ ] Room geometry builder (walls, floor, ceiling, doorways)
- [ ] Door system with open/close animation
- [ ] Window cutouts with exterior sky
- [ ] Procedural skybox with time-of-day
- [ ] Basic furniture factory (boxes/primitives for each room type)
- [ ] Light placement per room
- [ ] Shadow maps on key lights

**Milestone**: Walk through a randomly generated, lit, furnished house.

### Phase 3: Materials and Visuals
- [ ] TSL wood shader
- [ ] TSL tile shader
- [ ] TSL fabric shader
- [ ] TSL glass shader (windows)
- [ ] TSL sky shader with sun position
- [ ] Post-processing pipeline (bloom, AO, color grading)
- [ ] Time-of-day light color transitions
- [ ] Quality settings menu (low/med/high/ultra)

**Milestone**: House looks visually polished with stylized materials.

### Phase 4: Physics and Interaction
- [ ] Rapier WASM integration in WebWorker
- [ ] Collision meshes for all furniture
- [ ] Ray-cast interaction system
- [ ] Object highlight shader
- [ ] Context-aware interaction prompts
- [ ] Pick up / put down any small object
- [ ] Open/close all doors, drawers, cabinets
- [ ] Hand controller with dual-hand system
- [ ] Carrying system (one-hand vs two-hand items)

**Milestone**: Interact with every object in the house.

### Phase 5: Kitchen and Cooking
- [ ] Individual stove burner toggle
- [ ] Stove fire particle effect
- [ ] Pan/pot placement and heating
- [ ] Food item system (raw, cooked, burnt states)
- [ ] Fridge inventory system
- [ ] Microwave interaction
- [ ] Sink with water particles
- [ ] Smoke particle and smoke alarm trigger
- [ ] Food plating and serving

**Milestone**: Cook a complete meal from ingredients.

### Phase 6: Bathroom and Hygiene
- [ ] Bathtub tap controls (hot/cold mixing)
- [ ] Water fill level system
- [ ] Temperature check interaction
- [ ] Bath particle effects (water, bubbles, splash)
- [ ] Child bathing sequence
- [ ] Towel and drying interaction
- [ ] Diaper change system (infants)
- [ ] Toilet and handwashing

**Milestone**: Full bath time sequence works.

### Phase 7: Player Systems
- [ ] HUD overlay (HTML/CSS)
- [ ] Stat bars (hydration, hunger, energy, stress)
- [ ] Stat decay and replenishment
- [ ] Eating and drinking interactions
- [ ] Sitting to rest mechanic
- [ ] Critical stat visual effects (blur, vignette, heartbeat)
- [ ] Stress system (increases from crying, tantrums, hazards)
- [ ] Breakdown ending condition

**Milestone**: Player must manage their own needs throughout the day.

### Phase 8: Child AI Core
- [ ] Child profile generation from seed
- [ ] Procedural child appearance (low-poly, age-appropriate)
- [ ] Skin SSS shader
- [ ] Child walking/movement system
- [ ] MoodVector implementation with decay rates
- [ ] HFSM framework
- [ ] Content state behaviors (play, idle, follow, watch TV)
- [ ] Needy state behaviors (request food, request attention)
- [ ] Basic pathfinding (room-to-room A*, local steering)

**Milestone**: Children walk around, have needs, and seek the player.

### Phase 9: Advanced Child AI
- [ ] Upset state behaviors (crying, hiding, refusing)
- [ ] Tantrum state behaviors (screaming, throwing, floor tantrum)
- [ ] Inter-child dynamics (sharing, fighting, contagious crying)
- [ ] Age-specific behaviors (infant carry, toddler mouth objects, child follow instructions)
- [ ] Trust system (builds with care, drops with neglect)
- [ ] Speech system (text bubbles, age-appropriate words)
- [ ] Child-object interaction (play with toys, open cabinets, climb)
- [ ] Mischief system (toddlers accessing hazards, drawing on walls)

**Milestone**: Children feel alive with distinct personalities and emergent behavior.

### Phase 10: Hazards and Emergencies
- [ ] Hazard detection system
- [ ] Hot surface burns
- [ ] Sharp object injuries
- [ ] Chemical/poison hazards
- [ ] Water hazards (unattended bath)
- [ ] Fall hazards (windows, furniture climbing)
- [ ] Choking hazards (small objects)
- [ ] QTE system for emergency resolution
- [ ] Warning indicators (visual + audio)

**Milestone**: The house is genuinely dangerous and requires constant vigilance.

### Phase 11: Audio
- [ ] Audio manager with spatial positioning
- [ ] Ambient house sounds
- [ ] Child vocalizations (cry, laugh, babble, words)
- [ ] Interaction sound effects
- [ ] Cooking audio
- [ ] Water audio
- [ ] Alert sounds (alarm, crash, scream)
- [ ] Adaptive music system
- [ ] Music stems for each game state

**Milestone**: The game sounds immersive and responsive.

### Phase 12: Polish and Game Loop
- [ ] Start screen (title, seed input, difficulty select)
- [ ] Tutorial / first-run hints
- [ ] Scoring system implementation
- [ ] End-of-day score screen with star rating
- [ ] Pause menu with settings
- [ ] Save/resume via localStorage
- [ ] Advanced particles (dust motes, god rays, steam)
- [ ] SSR for wet/reflective floors
- [ ] Performance profiling and optimization
- [ ] Cross-browser testing
- [ ] README with controls, screenshots, credits

**Milestone**: Complete, polished game loop from start to score.

---

## 8. Dependencies

```json
{
  "name": "the-guardians-vigil",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "three": "^0.170.0",
    "@dimforge/rapier3d-compat": "^0.14.0",
    "howler": "^2.2.4"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vite": "^6.1.0",
    "@types/three": "^0.170.0",
    "@types/howler": "^2.2.0"
  }
}
```

Three dependencies. That's it. Everything else is custom TypeScript.

---

## 9. GitHub Pages Deployment

### 9.1 Constraints

| Constraint | Limit | Our Usage |
|-----------|-------|-----------|
| Repo size | 1 GB | < 50 MB (all procedural) |
| Bandwidth | ~100 GB/month | ~5 MB per visitor |
| Backend | None | All client-side |
| Build | GitHub Actions | Vite production build |

### 9.2 Deploy Workflow

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### 9.3 Vite Config

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/game/',  // matches repo name
  build: {
    target: 'esnext',  // needed for WebGPU APIs
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          rapier: ['@dimforge/rapier3d-compat']
        }
      }
    }
  },
  worker: {
    format: 'es'  // needed for Rapier WebWorker
  }
})
```

---

## 10. What Gemini Overpromised vs. What We Actually Build

| Gemini Claim | Reality | Our Approach |
|-------------|---------|-------------|
| "500+ dynamic lights" | WebGPU can handle it but shadow maps for 500 lights would kill perf | 64 point lights with tile-based culling, shadows on 4 nearest |
| "SPH fluid simulation" | True SPH is PhD-level complexity | GPU-instanced particles with velocity and gravity -- looks like water, cheaper than fluid sim |
| "PS4-era graphics" | Not with procedural low-poly assets | "Stylized indie" with AAA-quality lighting and shaders -- looks intentionally artistic, not cheap |
| "Subsurface scattering" | Actually feasible in TSL | Yes, implementing this for skin -- it's a screen-space approximation, not ray-traced |
| "100,000 lines of code" | Would be unmaintainable | ~8,000-12,000 lines of clean, modular TypeScript |
| "One-shot generation" | No model can do this | 12 phases of iterative development with testing at each stage |
| "Deferred rendering from scratch" | Three.js WebGPU already handles this | Use Three.js built-in pipeline, extend with custom TSL shaders and compute passes |

---

## 11. Stretch Goals (Post-MVP)

If the core game works well:

- **Multiplayer mode**: Two players co-op babysitting via WebRTC (no server needed)
- **Photo mode**: Freeze time, move camera freely, screenshot and share
- **Custom house editor**: Design your own house layout, share via seed
- **Accessibility**: Colorblind modes, reduced-motion, screen reader for UI
- **Mobile touch controls**: Virtual joystick and tap interactions
- **Leaderboard**: localStorage-based personal best tracking per seed
- **Mod system**: User-uploaded furniture/child personality JSON files
- **Seasonal events**: Halloween (costumes, spooky house), Holiday (decorations, cookies)
