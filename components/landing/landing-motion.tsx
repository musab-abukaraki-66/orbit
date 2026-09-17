"use client"

import * as React from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SplitText } from "gsap/SplitText"

gsap.registerPlugin(ScrollTrigger, SplitText)

// Client-only boundary for the motion on the public landing route. It renders
// its children unchanged; every effect is gated behind prefers-reduced-motion
// via gsap.matchMedia, so under reduced motion the page is fully visible with
// zero JS animation.
//
// Hooks the page opts into with data attributes:
//   data-hero-section / data-hero-copy / data-hero-title / data-hero-mockup
//   data-mock-card, data-drag-area, data-drag-card, data-drag-source,
//   data-drag-target   (the looped drag demo inside the mockup)
//   data-reveal        (fades and lifts a block when it scrolls into view)
//   data-reveal-group  (staggers its direct children the same way)
//   data-magnetic      (gentle pull toward the cursor on pointer devices)
export function LandingMotion({ children }: { children: React.ReactNode }) {
  const rootRef = React.useRef<HTMLDivElement>(null)

  React.useLayoutEffect(() => {
    const rootEl = rootRef.current
    if (!rootEl || typeof window === "undefined") return

    const cleanups: Array<() => void> = []

    const runFullMotion = () => {
      const root = rootEl
      const hero = root.querySelector<HTMLElement>("[data-hero-section]")
      const copy = root.querySelector<HTMLElement>("[data-hero-copy]")
      const title = root.querySelector<HTMLElement>("[data-hero-title]")
      const mock = root.querySelector<HTMLElement>("[data-hero-mockup]")

      // 1. Entrance: eyebrow, body copy and CTAs fade/slide up on load.
      if (copy) {
        gsap.utils.toArray<HTMLElement>(copy.children).forEach((child, index) => {
          if (child.hasAttribute("data-hero-title")) return
          gsap.fromTo(
            child,
            { y: 18, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.5, ease: "power2.out", delay: 0.12 + index * 0.08 },
          )
        })
      }

      // 2. Headline: word-by-word rise, then the DOM is reverted so
      //    text-balance and semantics stay intact.
      if (title) {
        const split = SplitText.create(title, { type: "words" })
        gsap.set(split.words, { y: 14, opacity: 0 })
        gsap.to(split.words, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", stagger: 0.05, delay: 0.2 })
        gsap.delayedCall(0.2 + split.words.length * 0.05 + 0.6, () => split.revert())
        cleanups.push(() => split.revert())
      }

      // 3. Mockup: the whole frame rises, then its cards populate.
      if (mock) {
        gsap.fromTo(mock, { y: 32, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: "power2.out", delay: 0.35 })
        const cards = mock.querySelectorAll<HTMLElement>("[data-mock-card]")
        gsap.fromTo(
          cards,
          { y: 10, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.4, ease: "power2.out", stagger: 0.04, delay: 0.6 },
        )
      }

      // 4. Looped drag demo: a ghost of the "source" card lifts out of its
      //    column and lands on the "target" card while the hero is on screen.
      if (hero && mock) {
        const area = mock.querySelector<HTMLElement>("[data-drag-area]")
        const ghost = mock.querySelector<HTMLElement>("[data-drag-card]")
        const source = mock.querySelector<HTMLElement>("[data-drag-source]")
        const target = mock.querySelector<HTMLElement>("[data-drag-target]")
        if (area && ghost && source && target) {
          const measure = () => {
            const areaRect = area.getBoundingClientRect()
            const from = source.getBoundingClientRect()
            const to = target.getBoundingClientRect()
            gsap.set(ghost, {
              left: from.left - areaRect.left,
              top: from.top - areaRect.top,
              width: from.width,
              x: 0,
              y: 0,
              scale: 1,
              rotation: 0,
              autoAlpha: 0,
            })
            return { tx: to.left - from.left, ty: to.top - from.top }
          }
          let offset = measure()
          const onResize = () => {
            offset = measure()
          }
          window.addEventListener("resize", onResize)
          cleanups.push(() => window.removeEventListener("resize", onResize))

          gsap.set(ghost, { willChange: "transform" })
          const dragTimeline = gsap.timeline({ repeat: -1, repeatDelay: 2.2, delay: 1.6 })
          dragTimeline
            .to(ghost, { autoAlpha: 1, scale: 1.05, duration: 0.25, ease: "power1.out" })
            .to(ghost, { x: () => offset.tx, y: () => offset.ty, rotation: 2, duration: 0.8, ease: "power1.inOut" })
            .to(ghost, { autoAlpha: 0, scale: 1, duration: 0.2 })

          ScrollTrigger.create({
            trigger: hero,
            start: "top bottom",
            end: "bottom top",
            onToggle: (self) => {
              if (self.isActive) dragTimeline.play()
              else dragTimeline.pause()
            },
          })
        }
      }

      // 5. Scroll reveals: single blocks and staggered groups.
      root.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 20, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.55, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } },
        )
      })
      root.querySelectorAll<HTMLElement>("[data-reveal-group]").forEach((group) => {
        gsap.fromTo(
          group.children,
          { y: 24, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.5, ease: "power2.out", stagger: 0.08, scrollTrigger: { trigger: group, start: "top 85%", once: true } },
        )
      })

      // 6. Pointer devices only: a soft brand glow follows the cursor inside
      //    the hero, and CTAs marked data-magnetic get a gentle pull.
      if (hero && window.matchMedia("(pointer: fine)").matches) {
        const glow = document.createElement("div")
        Object.assign(glow.style, {
          position: "absolute",
          top: "0",
          left: "0",
          zIndex: "-1",
          width: "30rem",
          height: "30rem",
          pointerEvents: "none",
          borderRadius: "9999px",
          background:
            "radial-gradient(circle 280px at center, color-mix(in oklch, var(--brand) 18%, transparent) 0%, transparent 70%)",
        })
        hero.appendChild(glow)
        const glowX = gsap.quickTo(glow, "x", { duration: 0.5, ease: "power3.out" })
        const glowY = gsap.quickTo(glow, "y", { duration: 0.5, ease: "power3.out" })
        gsap.set(glow, { xPercent: -50, yPercent: -50, autoAlpha: 0 })
        const onMove = (event: PointerEvent) => {
          const rect = hero.getBoundingClientRect()
          glowX(event.clientX - rect.left)
          glowY(event.clientY - rect.top)
          gsap.to(glow, { autoAlpha: 1, duration: 0.25 })
        }
        const onLeave = () => gsap.to(glow, { autoAlpha: 0, duration: 0.4 })
        hero.addEventListener("pointermove", onMove)
        hero.addEventListener("pointerleave", onLeave)
        cleanups.push(() => {
          hero.removeEventListener("pointermove", onMove)
          hero.removeEventListener("pointerleave", onLeave)
          glow.remove()
        })

        root.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((button) => {
          const moveX = gsap.quickTo(button, "x", { duration: 0.3, ease: "power3.out" })
          const moveY = gsap.quickTo(button, "y", { duration: 0.3, ease: "power3.out" })
          const onPointerMove = (event: PointerEvent) => {
            const rect = button.getBoundingClientRect()
            moveX((event.clientX - (rect.left + rect.width / 2)) * 0.18)
            moveY((event.clientY - (rect.top + rect.height / 2)) * 0.35)
          }
          const onPointerLeave = () => {
            moveX(0)
            moveY(0)
          }
          button.addEventListener("pointermove", onPointerMove)
          button.addEventListener("pointerleave", onPointerLeave)
          cleanups.push(() => {
            button.removeEventListener("pointermove", onPointerMove)
            button.removeEventListener("pointerleave", onPointerLeave)
          })
        })
      }
    }

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      mm.add({ motionOk: "(prefers-reduced-motion: no-preference)" }, runFullMotion)
    }, rootEl)

    return () => {
      ctx.revert()
      cleanups.forEach((cleanup) => cleanup())
      cleanups.length = 0
    }
  }, [])

  return (
    <div ref={rootRef} className="contents">
      {children}
    </div>
  )
}
