// Shared password rules for password recovery. Used on the client for
// instant feedback and again in the server action — the server check is the
// one that counts.

export const PASSWORD_MIN_LENGTH = 6

export function validateNewPassword(password: string, confirm?: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Your password must be at least ${PASSWORD_MIN_LENGTH} characters long.`
  }
  if (!/[a-zA-Z]/.test(password)) return "Your password must include at least one letter."
  if (!/\d/.test(password)) return "Your password must include at least one number."
  if (confirm !== undefined && password !== confirm) return "The passwords don't match."
  return null
}

// Good-enough shape check before asking Supabase; not a deliverability test.
export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
}
