import { ImageResponse } from "next/og"

import { BrandMarkVisual } from "@/components/brand-mark-visual"

export const size = { width: 512, height: 512 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(<BrandMarkVisual size={512} />, { ...size })
}
