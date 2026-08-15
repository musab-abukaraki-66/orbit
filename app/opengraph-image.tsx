import { ImageResponse } from "next/og"

import { BrandMarkVisual } from "@/components/brand-mark-visual"

export const alt =
  "Orbit — Plan, track, and ship together, in perfect orbit."
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 630,
        display: "flex",
        position: "relative",
        flexDirection: "column",
        background: "#0a0a0a",
        color: "#fafafa",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 60,
          top: 60,
          right: 60,
          bottom: 60,
          borderRadius: 40,
          border: "1px solid rgba(255,255,255,0.08)",
          background:
            "radial-gradient(circle 480px at 12% 50%, rgba(151,103,255,0.14) 0%, rgba(151,103,255,0) 70%)",
        }}
      />
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          gap: 56,
          padding: "0 96px",
        }}
      >
        <BrandMarkVisual size={208} />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              color: "#9767ff",
              fontSize: 17,
              letterSpacing: 4,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              textTransform: "uppercase",
            }}
          >
            Orbit · project management for teams
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 62,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.05,
            }}
          >
            <span>Plan, track, and ship</span>
            <span>together.</span>
          </div>
          <div
            style={{ fontSize: 28, color: "#a2a1ac", lineHeight: 1.35 }}
          >
            Everything your team needs, in perfect orbit.
          </div>
        </div>
      </div>
    </div>,
    { ...size }
  )
}
