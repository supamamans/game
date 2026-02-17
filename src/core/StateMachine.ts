/**
 * StateMachine - Generic hierarchical finite state machine.
 *
 * Used for game state management and child AI behavior trees.
 * Supports enter/exit/update callbacks and sub-states.
 */

export interface State<TContext> {
  name: string;
  onEnter?: (ctx: TContext) => void;
  onExit?: (ctx: TContext) => void;
  onUpdate?: (ctx: TContext, dt: number) => void;
  transitions?: StateTransition<TContext>[];
  /** Optional sub-state machine for hierarchical behavior */
  subStates?: StateMachine<TContext>;
}

export interface StateTransition<TContext> {
  to: string;
  condition: (ctx: TContext) => boolean;
  /** Higher priority transitions are checked first */
  priority?: number;
}

export class StateMachine<TContext> {
  private states: Map<string, State<TContext>> = new Map();
  private currentState: State<TContext> | null = null;
  private context: TContext;

  constructor(context: TContext) {
    this.context = context;
  }

  get current(): State<TContext> | null {
    return this.currentState;
  }

  get currentName(): string {
    return this.currentState?.name ?? 'none';
  }

  addState(state: State<TContext>): this {
    this.states.set(state.name, state);
    return this;
  }

  /**
   * Force transition to a specific state.
   */
  transitionTo(stateName: string): void {
    const newState = this.states.get(stateName);
    if (!newState) {
      console.warn(`StateMachine: state "${stateName}" not found`);
      return;
    }

    if (this.currentState) {
      this.currentState.subStates?.exit();
      this.currentState.onExit?.(this.context);
    }

    this.currentState = newState;
    this.currentState.onEnter?.(this.context);
  }

  /**
   * Update the current state and check for transitions.
   */
  update(dt: number): void {
    if (!this.currentState) return;

    // Check transitions sorted by priority
    if (this.currentState.transitions) {
      const sorted = [...this.currentState.transitions].sort(
        (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
      );

      for (const transition of sorted) {
        if (transition.condition(this.context)) {
          this.transitionTo(transition.to);
          return; // Don't update the new state this tick
        }
      }
    }

    // Update current state
    this.currentState.onUpdate?.(this.context, dt);

    // Update sub-states if any
    this.currentState.subStates?.update(dt);
  }

  /**
   * Exit the current state (cleanup).
   */
  exit(): void {
    if (this.currentState) {
      this.currentState.subStates?.exit();
      this.currentState.onExit?.(this.context);
      this.currentState = null;
    }
  }
}
