/**
 * ChildSpeech - Text bubble system with age-appropriate vocabulary.
 *
 * Infants: only cry (no text)
 * Toddlers: simple words
 * Children: full sentences
 */

import { AgeGroup } from './Child';
import { EventBus } from '@core/EventBus';

interface SpeechBubble {
  childId: string;
  text: string;
  duration: number;
  startTime: number;
}

const TODDLER_PHRASES: Record<string, string[]> = {
  hungry: ['Hungry!', 'Food!', 'Eat!', 'Tummy!'],
  bored: ['Play!', 'Bored!', 'Fun!'],
  scared: ['Scared!', 'No!', 'Dark!'],
  happy: ['Yay!', 'Hehe!', 'Fun!'],
  tired: ['Sleepy...', 'Night...'],
  want_attention: ['Look!', 'Me!', 'Here!'],
  bathroom: ['Potty!', 'Now!', 'Hurry!'],
};

const CHILD_PHRASES: Record<string, string[]> = {
  hungry: [
    'I\'m hungry!', 'Can I have food?', 'My tummy is growling.',
    'When is dinner?', 'I want a snack!',
  ],
  bored: [
    'I\'m bored!', 'There\'s nothing to do.', 'Can we play something?',
    'This is boring.', 'I want to do something fun!',
  ],
  scared: [
    'I\'m scared...', 'It\'s too dark!', 'I don\'t like that noise.',
    'Can you stay with me?',
  ],
  happy: [
    'This is fun!', 'I like this!', 'You\'re nice!',
    'Can we do this again?', 'Yay!',
  ],
  tired: [
    'I\'m tired...', 'Can I go to bed?', 'I\'m sleepy.',
    '*yawn*',
  ],
  want_attention: [
    'Look at me!', 'Watch this!', 'Come here!',
    'Pay attention to me!',
  ],
  refuse_food: [
    'I don\'t want that!', 'Yuck!', 'I don\'t like it!',
    'No way!',
  ],
  tattling: [
    'They took my toy!', 'They\'re being mean!',
    'They broke something!', 'They won\'t share!',
  ],
  cooperate: [
    'OK!', 'I can do that!', 'I\'ll help!',
    'Sure!',
  ],
  refuse: [
    'No!', 'I don\'t want to!', 'You can\'t make me!',
    'Leave me alone!',
  ],
};

export class ChildSpeech {
  private activeBubbles: Map<string, SpeechBubble> = new Map();
  private time: number = 0;

  /**
   * Make a child say something based on their state.
   */
  speak(childId: string, age: AgeGroup, context: string): void {
    if (age === 'infant') {
      // Infants just cry - handled by audio system
      EventBus.emit('child.cry', childId);
      return;
    }

    const phrases = age === 'toddler' ? TODDLER_PHRASES : CHILD_PHRASES;
    const options = phrases[context];
    if (!options || options.length === 0) return;

    const text = options[Math.floor(Math.random() * options.length)];
    const duration = age === 'toddler' ? 2 : 3;

    this.activeBubbles.set(childId, {
      childId,
      text,
      duration,
      startTime: this.time,
    });

    EventBus.emit('child.speak', childId, text, duration);
  }

  /**
   * Update speech bubbles - remove expired ones.
   */
  update(dt: number): void {
    this.time += dt;

    for (const [id, bubble] of this.activeBubbles.entries()) {
      if (this.time - bubble.startTime >= bubble.duration) {
        this.activeBubbles.delete(id);
        EventBus.emit('child.speechEnd', id);
      }
    }
  }

  /**
   * Get active speech bubble for a child.
   */
  getBubble(childId: string): SpeechBubble | null {
    return this.activeBubbles.get(childId) ?? null;
  }
}
