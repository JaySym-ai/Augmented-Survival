/**
 * States a citizen can be in during gameplay.
 */
export enum CitizenState {
  Idle = 'Idle',
  Walking = 'Walking',
  Gathering = 'Gathering',
  Carrying = 'Carrying',
  Delivering = 'Delivering',
  Building = 'Building',
}

/**
 * Mood levels that affect citizen behaviour and productivity.
 */
export enum Mood {
  Joyful = 'Joyful',
  Content = 'Content',
  Neutral = 'Neutral',
  Sad = 'Sad',
  Angry = 'Angry',
}

/**
 * Long-term life goals that drive citizen autonomous decisions.
 */
export enum LifeGoal {
  Survive = 'Survive',
  Prosper = 'Prosper',
  Explore = 'Explore',
  Socialize = 'Socialize',
  Build = 'Build',
}

