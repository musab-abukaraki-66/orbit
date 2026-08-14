import * as React from "react"

export function BrandMarkVisual({ size }: { size: number }) {
  const ring = size * 0.86
  const height = ring * 0.625
  const border = Math.max(2, Math.round(size * 0.055))
  const star = ring * 0.2375
  const planet = ring * 0.1875
  const starLeft = ring * 0.1097
  const planetLeft = ring
  const middle = height / 2

  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: (size - ring) / 2,
          top: (size - height) / 2,
          width: ring,
          height,
          display: "flex",
          border: `${border}px solid #9767ff`,
          borderRadius: "50%",
          transform: "rotate(-26deg)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: starLeft,
            top: middle,
            width: star,
            height: star,
            borderRadius: "50%",
            background: "#9767ff",
            transform: "translate(-50%, -50%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: planetLeft,
            top: middle,
            width: planet,
            height: planet,
            borderRadius: "50%",
            background: "#9767ff",
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>
    </div>
  )
}
