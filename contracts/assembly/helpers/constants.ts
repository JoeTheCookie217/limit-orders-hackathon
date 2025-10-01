export const THREADS: u8 = 32;
export const THREAD_DURATION: u64 = 500;
export const PERIOD_DURATION: u64 = THREADS * THREAD_DURATION;
export const PERIODS_PER_HOUR: u64 = 3_600_000 / PERIOD_DURATION;
export const ONE_MINUTE: u64 = 60_000;
export const ONE_WEEK: u64 = ONE_MINUTE * 60 * 24 * 7 - ONE_MINUTE * 2;

export const MAX_GAS_ASC_CALL: u64 = 1_000_000_000;
