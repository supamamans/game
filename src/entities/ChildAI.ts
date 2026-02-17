/**
 * ChildAI - HFSM + Utility AI hybrid decision making.
 *
 * The HFSM handles high-level state transitions.
 * Within each state, a Utility AI scores available actions
 * and picks the highest-value one.
 */

import { Child, AgeGroup } from './Child';
import { MoodVector } from './MoodVector';
import { EventBus } from '@core/EventBus';
import { StateMachine, State } from '@core/StateMachine';

export enum ChildState {
  Sleeping = 'sleeping',
  Content = 'content',
  Needy = 'needy',
  Upset = 'upset',
  Tantrum = 'tantrum',
}

export enum ContentAction {
  PlayAlone = 'play_alone',
  PlayWithSibling = 'play_sibling',
  WatchTV = 'watch_tv',
  FollowPlayer = 'follow_player',
  Explore = 'explore',
  SitIdle = 'sit_idle',
}

export enum NeedyAction {
  RequestFood = 'request_food',
  RequestAttention = 'request_attention',
  RequestComfort = 'request_comfort',
  RequestBathroom = 'request_bathroom',
}

export enum UpsetAction {
  Crying = 'crying',
  Hiding = 'hiding',
  RefusingInteraction = 'refusing',
  BreakingThings = 'breaking',
}

export enum TantrumAction {
  Screaming = 'screaming',
  Throwing = 'throwing',
  FloorTantrum = 'floor_tantrum',
  ContagiousCrying = 'contagious_crying',
}

interface AIContext {
  child: Child;
  playerDistance: number;
  tvIsOn: boolean;
  nearestSibling: Child | null;
  nearestToy: string | null;
}

export class ChildAI {
  private child: Child;
  private fsm: StateMachine<AIContext>;
  private currentAction: string = 'sit_idle';
  private actionTimer: number = 0;
  private context: AIContext;

  constructor(child: Child) {
    this.child = child;
    this.context = {
      child,
      playerDistance: Infinity,
      tvIsOn: false,
      nearestSibling: null,
      nearestToy: null,
    };

    this.fsm = new StateMachine<AIContext>(this.context);
    this.buildStates();

    // Start in sleeping or content based on fatigue
    const startState = child.mood.values.fatigue > 0.8 ? ChildState.Sleeping : ChildState.Content;
    this.fsm.transitionTo(startState);
  }

  private buildStates(): void {
    // SLEEPING
    this.fsm.addState({
      name: ChildState.Sleeping,
      onEnter: (ctx) => {
        ctx.child.isSleeping = true;
        EventBus.emit('child.stateChange', ctx.child.profile.id, 'sleeping');
      },
      onExit: (ctx) => {
        ctx.child.isSleeping = false;
      },
      onUpdate: (_ctx, _dt) => {
        // Sleep reduces fatigue in MoodVector update
      },
      transitions: [
        {
          to: ChildState.Content,
          condition: (ctx) => ctx.child.mood.values.fatigue < 0.3,
          priority: 1,
        },
        {
          to: ChildState.Needy,
          condition: (ctx) => ctx.child.mood.values.hunger > 0.8,
          priority: 2, // Hunger wakes children
        },
      ],
    });

    // CONTENT
    this.fsm.addState({
      name: ChildState.Content,
      onEnter: (ctx) => {
        EventBus.emit('child.stateChange', ctx.child.profile.id, 'content');
        this.pickContentAction();
      },
      onUpdate: (ctx, dt) => {
        this.actionTimer += dt;
        if (this.actionTimer > 10) {
          this.pickContentAction();
          this.actionTimer = 0;
        }

        // Update playing state
        ctx.child.isPlaying = this.currentAction === ContentAction.PlayAlone ||
          this.currentAction === ContentAction.PlayWithSibling;
      },
      transitions: [
        {
          to: ChildState.Needy,
          condition: (ctx) => ctx.child.mood.hasUrgentNeed(0.7),
          priority: 1,
        },
        {
          to: ChildState.Sleeping,
          condition: (ctx) => ctx.child.mood.values.fatigue > 0.9,
          priority: 2,
        },
      ],
    });

    // NEEDY
    this.fsm.addState({
      name: ChildState.Needy,
      onEnter: (ctx) => {
        EventBus.emit('child.stateChange', ctx.child.profile.id, 'needy');
        this.pickNeedyAction();
      },
      onUpdate: (_ctx, dt) => {
        this.actionTimer += dt;
        if (this.actionTimer > 15) {
          this.pickNeedyAction();
          this.actionTimer = 0;
        }
      },
      transitions: [
        {
          to: ChildState.Content,
          condition: (ctx) => !ctx.child.mood.hasUrgentNeed(0.5),
          priority: 1,
        },
        {
          to: ChildState.Upset,
          condition: (ctx) => ctx.child.mood.isCritical(0.85) || ctx.child.mood.values.trust < 0.2,
          priority: 2,
        },
      ],
    });

    // UPSET
    this.fsm.addState({
      name: ChildState.Upset,
      onEnter: (ctx) => {
        EventBus.emit('child.stateChange', ctx.child.profile.id, 'upset');
        this.pickUpsetAction();
      },
      onUpdate: (ctx, dt) => {
        this.actionTimer += dt;
        // Being upset increases stress for the player
        EventBus.emit('child.upset', ctx.child.profile.id, dt);
      },
      transitions: [
        {
          to: ChildState.Needy,
          condition: (ctx) => ctx.child.mood.values.trust > 0.35 && !ctx.child.mood.isCritical(),
          priority: 1,
        },
        {
          to: ChildState.Tantrum,
          condition: (ctx) => {
            return this.actionTimer > 30 || // Upset too long
              (ctx.child.mood.values.hunger > 0.9 && ctx.child.mood.values.fatigue > 0.8);
          },
          priority: 2,
        },
      ],
    });

    // TANTRUM
    this.fsm.addState({
      name: ChildState.Tantrum,
      onEnter: (ctx) => {
        EventBus.emit('child.stateChange', ctx.child.profile.id, 'tantrum');
        this.pickTantrumAction();
        EventBus.emit('child.tantrum', ctx.child.profile.id);
      },
      onUpdate: (ctx, dt) => {
        this.actionTimer += dt;
        // Tantrums are very stressful for the player
        EventBus.emit('child.tantrum.tick', ctx.child.profile.id, dt);

        // Contagious crying affects nearby children
        if (this.currentAction === TantrumAction.ContagiousCrying) {
          EventBus.emit('child.contagiousCry', ctx.child.profile.id);
        }
      },
      transitions: [
        {
          to: ChildState.Upset,
          condition: (ctx) => {
            // Tantrums resolve after exhaustion or comfort
            return this.actionTimer > 45 || ctx.child.mood.values.fatigue > 0.95;
          },
          priority: 1,
        },
        {
          to: ChildState.Sleeping,
          condition: (ctx) => ctx.child.mood.values.fatigue > 0.98,
          priority: 2,
        },
      ],
    });
  }

  /**
   * Use Utility AI to pick best content action.
   */
  private pickContentAction(): void {
    const mood = this.child.mood.values;
    const personality = this.child.profile.personality;

    const scores: [string, number][] = [
      [ContentAction.PlayAlone, mood.boredom * 0.6 + (1 - mood.fatigue) * 0.3],
      [ContentAction.WatchTV, mood.boredom * 0.4 + mood.fatigue * 0.3],
      [ContentAction.FollowPlayer, personality.clinginess * 0.5 + (1 - mood.trust) * 0.3],
      [ContentAction.Explore, personality.curiosity * 0.5 + mood.boredom * 0.3],
      [ContentAction.SitIdle, mood.fatigue * 0.6],
    ];

    if (this.context.nearestSibling) {
      scores.push([ContentAction.PlayWithSibling, mood.boredom * 0.5 + 0.3]);
    }

    scores.sort((a, b) => b[1] - a[1]);
    this.currentAction = scores[0][0];
    this.actionTimer = 0;

    EventBus.emit('child.action', this.child.profile.id, this.currentAction);
  }

  private pickNeedyAction(): void {
    const need = this.child.mood.urgentNeed;
    switch (need) {
      case 'hunger': this.currentAction = NeedyAction.RequestFood; break;
      case 'boredom': this.currentAction = NeedyAction.RequestAttention; break;
      case 'comfort': this.currentAction = NeedyAction.RequestComfort; break;
      default: this.currentAction = NeedyAction.RequestAttention;
    }
    this.actionTimer = 0;
    EventBus.emit('child.action', this.child.profile.id, this.currentAction);
  }

  private pickUpsetAction(): void {
    const personality = this.child.profile.personality;
    if (personality.shyness > 0.6) {
      this.currentAction = UpsetAction.Hiding;
    } else if (personality.stubbornness > 0.6) {
      this.currentAction = UpsetAction.RefusingInteraction;
    } else if (personality.energy > 0.6 && this.child.mood.values.mischief > 0.5) {
      this.currentAction = UpsetAction.BreakingThings;
    } else {
      this.currentAction = UpsetAction.Crying;
    }
    this.actionTimer = 0;
    EventBus.emit('child.action', this.child.profile.id, this.currentAction);
  }

  private pickTantrumAction(): void {
    const personality = this.child.profile.personality;
    if (personality.energy > 0.7) {
      this.currentAction = TantrumAction.Throwing;
    } else if (personality.stubbornness > 0.7) {
      this.currentAction = TantrumAction.FloorTantrum;
    } else {
      this.currentAction = TantrumAction.Screaming;
    }
    this.actionTimer = 0;
    EventBus.emit('child.action', this.child.profile.id, this.currentAction);
  }

  /**
   * Update AI state and mood each fixed timestep.
   */
  update(dt: number, playerDistance: number, tvIsOn: boolean): void {
    this.context.playerDistance = playerDistance;
    this.context.tvIsOn = tvIsOn;

    // Update mood vector
    this.child.mood.update(
      dt,
      this.child.isSleeping,
      this.child.isPlaying,
      this.child.isBeingCarried,
    );

    // Update FSM
    this.fsm.update(dt);
  }

  get state(): string {
    return this.fsm.currentName;
  }

  get action(): string {
    return this.currentAction;
  }

  getPersonality() {
    return this.child.profile.personality;
  }
}
