export interface UserProfile {
  id: string;
  userId: string;
  displayName: string;
  currency: string;
  timezone?: string | null;
  onboardingCompleted: boolean;
  onboardingCompletedAt?: string | null;
}

export type UpdateProfilePayload = Pick<UserProfile, 'displayName' | 'currency' | 'timezone'>;
