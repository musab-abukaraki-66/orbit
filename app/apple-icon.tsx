import { ImageResponse } from "next/og"

import { BrandMarkVisual } from "@/components/brand-mark-visual"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: 180,
        height: 180,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
      }}
    >
      <BrandMarkVisual size={132} />
    </div>,
    { ...size }
  )
}
