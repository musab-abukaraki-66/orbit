# Orbit — Product Requirements Document

We're building a project management app similar to Linear. The app enables teams to collaborate on tasks.

## App functionality

- User onboarding (team creation)
- Workspace and boards
- Kanban layouts with drag and drop
- Team and user management

## Tech

- Next.js 16 (using proxy.ts)
- Supabase (locally first, running on Docker)
- Stripe for payments (app subscriptions for Lite and Pro)
- Resend for welcome emails
- AI SDK for AI features

## Look & feel

- Use shadcn/ui for components
- Dark mode by default
- Light mode toggle

## Process

- Break app build into logical milestones
- Use MCP for integrations
