// Cykani configuration system — Entity-based design

export type Latency = 'instant' | 'robotic' | 'organic' | 'human' | 'sluggish';

export interface Instincts {
  /** Delay hesitation factor (0-1, higher = slower) */
  hesitation?: number;
  /** Mouse precision / jitter (0-1, higher = more precise) */
  precision?: number;
  /** Tendency to pause and explore (0-1) */
  curiosity?: number;
}

export interface Dynamics {
  /** Randomness in timing (0-1) */
  entropy?: number;
  /** Resistance to changes in behavior (0-1) */
  inertia?: number;
}

export interface Operate {
  /** Response latency profile */
  latency?: Latency;
  /** Operation timeout in ms */
  timeout?: number;
  /** Run in headless mode (default true) */
  headless?: boolean;
}

export interface Entity {
  /** Fingerprint seed 1-10000 */
  fingerprint?: number;
  /** Platform to spoof */
  platform?: 'windows' | 'macos' | 'linux';

  instincts?: Instincts;
  dynamics?: Dynamics;
  operate?: Operate;

  /** HTTP/SOCKS proxy */
  proxy?: string;
  /** Browser locale */
  locale?: string;
  /** Browser timezone */
  timezone?: string;
}

export interface NavigateOpts {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  timeout?: number;
}

export interface ClickOpts {
  /** Wait for navigation after click */
  waitForNavigation?: boolean;
}

export interface TypeOpts {
  /** Disable typo simulation */
  noTypos?: boolean;
  /** Submit form after typing */
  submit?: boolean;
}

export interface ScrollOpts {
  direction?: 'up' | 'down';
  amount?: number;
}

export interface ScreenshotOpts {
  fullPage?: boolean;
  type?: 'png' | 'jpeg';
}

export interface WaitOpts {
  timeout?: number;
}
