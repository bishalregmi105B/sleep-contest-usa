/**
 * The shape the rest of the app talks to.
 *
 * Keeping this narrow is what lets the demo run with no database at all while
 * still supporting a real one later: the API routes and pages only ever see
 * these fields.
 */

export type RegistrationStatus = 'pending' | 'paid' | 'refunded';

export type Registration = {
  publicId: string;
  fullName: string;
  email: string;
  mobile: string;
  dateOfBirth: Date;
  cityState: string;
  status: RegistrationStatus;
  matNumber: number | null;
  refCode: string;
  referredBy: string | null;
  paymentProvider: string;
  consentAt: Date;
  createdAt: Date;
  paidAt: Date | null;
};

export type Store = {
  /** Which backend answered. Shown nowhere; used in the build report. */
  readonly kind: 'memory' | 'database';

  create(data: Omit<Registration, 'status' | 'matNumber' | 'paymentProvider' | 'createdAt' | 'paidAt'>): Promise<Registration>;
  findByPublicId(publicId: string): Promise<Registration | null>;
  findByEmail(email: string): Promise<Registration | null>;
  findByRefCode(refCode: string): Promise<Registration | null>;
  markPaid(publicId: string, payment: { provider: string; ref: string | null }): Promise<Registration | null>;
  countPaid(): Promise<number>;
  countAll(): Promise<number>;
  countReferred(): Promise<number>;
  highestMat(): Promise<number>;
  updatePending(publicId: string, patch: { fullName: string; mobile: string; cityState: string; dateOfBirth: Date }): Promise<Registration | null>;
  topRecruiters(limit: number): Promise<{ refCode: string; matNumber: number | null; count: number }[]>;
  /**
   * Paid registrations per calendar day, oldest first, including days with
   * zero so the chart's x-axis is continuous rather than skipping empty days.
   */
  dailyPaid(days: number): Promise<{ date: string; count: number }[]>;
  /** Registrations that did not reach a paid state, for the funnel. */
  countUnpaid(): Promise<number>;
  list(options: { query?: string; skip: number; take: number }): Promise<Registration[]>;
  all(): Promise<Registration[]>;
};
