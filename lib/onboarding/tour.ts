import type { User } from "@supabase/supabase-js"

export const ONBOARDING_TOUR_KEY = "onboarding_tour_completed_at"

export function hasCompletedOnboardingTour(user: User) {
  return Boolean(user.user_metadata?.[ONBOARDING_TOUR_KEY])
}
