"use server"

import { createClient } from "@/lib/supabase/server"
import { ONBOARDING_TOUR_KEY } from "@/lib/onboarding/tour"

export type OnboardingActionResult = {
  ok: boolean
  message?: string
}

export async function completeOnboardingTour(): Promise<OnboardingActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    data: { [ONBOARDING_TOUR_KEY]: new Date().toISOString() },
  })

  if (error) {
    return { ok: false, message: error.message }
  }
  return { ok: true }
}
