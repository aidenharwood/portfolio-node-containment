export interface ThrottlePolicy {
  readonly maxFailures: number;
  readonly windowMs: number;
}

export class LoginThrottle {
  private readonly failures = new Map<string, number[]>();
  private readonly policy: ThrottlePolicy;

  constructor(policy: ThrottlePolicy = { maxFailures: 5, windowMs: 60_000 }) {
    this.policy = policy;
  }

  isLocked(key: string, now = Date.now()): boolean {
    return this.recentFailures(key, now).length >= this.policy.maxFailures;
  }

  recordFailure(key: string, now = Date.now()): void {
    this.failures.set(key, [...this.recentFailures(key, now), now]);
  }

  clear(key: string): void {
    this.failures.delete(key);
  }

  private recentFailures(key: string, now: number): number[] {
    return (this.failures.get(key) ?? []).filter((timestamp) => now - timestamp < this.policy.windowMs);
  }
}
