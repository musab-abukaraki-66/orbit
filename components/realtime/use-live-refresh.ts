"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { ensureRealtimeAuth } from "@/lib/supabase/realtime"

type Subscription = { table: string; filter?: string }

// Subscribes to Postgres changes and re-renders the server tree (debounced)
// whenever any of them fire. Also refreshes when the tab becomes visible again
// so a laptop waking from sleep never shows stale data.
export function useLiveRefresh(subscriptions: Subscription[], channelKey: string) {
  const router = useRouter()
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const key = JSON.stringify(subscriptions)
  // Unique per mount: the browser client is a singleton and a reused topic
  // would return a channel that is still being torn down.
  const uid = React.useId()

  React.useEffect(() => {
    const supabase = createClient()
    const schedule = () => {
      if (timer.current) return
      timer.current = setTimeout(() => {
        timer.current = null
        router.refresh()
      }, 400)
    }

    let channel = supabase.channel(`live-${channelKey}-${uid}`)
    for (const sub of JSON.parse(key) as Subscription[]) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: sub.table, ...(sub.filter ? { filter: sub.filter } : {}) },
        schedule,
      )
    }
    let wasDisconnected = false
    let cancelled = false
    void ensureRealtimeAuth(supabase).then(() => {
      if (cancelled) return
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED" && wasDisconnected) schedule()
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") wasDisconnected = true
      })
    })

    const onVisible = () => {
      if (document.visibilityState === "visible") schedule()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", onVisible)
      if (timer.current) clearTimeout(timer.current)
      timer.current = null
      void supabase.removeChannel(channel)
    }
  }, [key, channelKey, uid, router])
}

export function LiveRefresh({ subscriptions, channelKey }: { subscriptions: Subscription[]; channelKey: string }) {
  useLiveRefresh(subscriptions, channelKey)
  return null
}
