"use client"

import * as React from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SplitText } from "gsap/SplitText"

gsap.registerPlugin(ScrollTrigger, SplitText)

// Client-only boundary for the GSAP signature moment on the public landing
// route. It simply renders its children; every effect is gated behind
// prefers-reduced-motion via gsap.matchMedia, so under reduced motion the
// page renders in its fully visible (final) state with zero JS animation.
export function LandingMotion({ children }: { children: React.ReactNode }) {
  const rootRef = React.useRef<HTMLDivElement>(null)

  React.useLayoutEffect(() => {
    const rootEl = rootRef.current
    if (!rootEl || typeof window === "undefined") return

    const heroEl = rootEl.querySelector<HTMLElement>("[data-hero-section]")
    if (!heroEl) return

    const cleanups: Array<() => void> = []

    const runFullMotion = () => {
      const root = rootEl
      const hero = heroEl
      const copy = root.querySelector<HTMLElement>("[data-hero-copy]")
      const title = root.querySelector<HTMLElement>("[data-hero-title]")
      const mock = root.querySelector<HTMLElement>("[data-hero-mockup]")

      // 1. Entrance: eyebrow, body copy, and CTAs fade/slide up on load.
      if (copy) {
        gsap.utils
          .toArray<HTMLElement>(copy.children)
          .forEach((child, index) => {
            if (child.hasAttribute("data-hero-title")) return
            gsap.fromTo(
              child,
              { y: 18, autoAlpha: 0 },
              {
                y: 0,
                autoAlpha: 1,
                duration: 0.5,
                ease: "power2.out",
                delay: 0.12 + index * 0.08,
              }
            )
          })
      }

      // 2. Headline: word-by-word rise via SplitText (subtle, ~600ms total),
      //    then the DOM is reverted so text-balance and semantics stay intact.
      if (title) {
        const split = SplitText.create(title, { type: "words" })
        gsap.set(split.words, { y: 14, opacity: 0 })
        gsap.to(split.words, {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: "power3.out",
          stagger: 0.06,
          delay: 0.2,
        })
        const total = 0.2 + split.words.length * 0.06 + 0.6
        gsap.delayedCall(total, () => split.revert())
        cleanups.push(() => split.revert())
      }

      // 3. Mockup populate: the board's task cards step in the first time the
      //    hero is seen (on load here), mirroring the product filling up.
      if (mock) {
        const cards = mock.querySelectorAll<HTMLElement>("[data-mock-card]")
        gsap.fromTo(
          cards,
          { y: 12, autoAlpha: 0, scale: 0.97 },
          {
            y: 0,
            autoAlpha: 1,
            scale: 1,
            duration: 0.45,
            ease: "power2.out",
            stagger: 0.05,
            delay: 0.4,
          }
        )
      }

      // 4. Hero recedes as you scroll toward features: the mockup parallaxes
      //    down + scales slightly, the copy lifts and softens.
      const recede = {
        trigger: hero,
        start: "top top",
        end: "bottom 45%",
        scrub: 0.4,
      }
      if (mock) {
        gsap.to(mock, {
          yPercent: 6,
          scale: 0.94,
          autoAlpha: 0.92,
          scrollTrigger: recede,
        })
      }
      gsap.to(copy, {
        yPercent: -6,
        autoAlpha: 0.85,
        scrollTrigger: recede,
      })

      // 5. SIGNATURE: looped scripted drag demonstrating drag-and-drop. A ghost
      //    card lifts out of "In Progress" and flies to "Done" while the hero
      //    is on screen; the loop pauses the moment the hero scrolls away.
      if (mock) {
        const area = mock.querySelector<HTMLElement>("[data-drag-area]")
        const allCards = mock.querySelectorAll<HTMLElement>("[data-mock-card]")
        const ghost = mock.querySelector<HTMLElement>("[data-drag-card]")
        if (area && ghost && allCards.length > 9) {
          const source = allCards[5]
          const target = allCards[9]
          const measure = () => {
            const areaRect = area.getBoundingClientRect()
            const from = source.getBoundingClientRect()
            const to = target.getBoundingClientRect()
            gsap.set(ghost, {
              left: from.left - areaRect.left,
              top: from.top - areaRect.top,
              x: 0,
              y: 0,
              scale: 1,
              rotation: 0,
              autoAlpha: 0,
            })
            return {
              tx: to.left - from.left,
              ty: to.top - from.top,
            }
          }
          let offset = measure()
          const onResize = () => {
            offset = measure()
          }
          window.addEventListener("resize", onResize)
          cleanups.push(() => window.removeEventListener("resize", onResize))

          gsap.set(ghost, { willChange: "transform" })
          const dragTimeline = gsap.timeline({ repeat: -1, repeatDelay: 1.8 })
          dragTimeline
            .to(ghost, { autoAlpha: 1, scale: 1.08, duration: 0.25, ease: "power1.out" })
            .to(ghost, {
              x: () => offset.tx,
              y: () => offset.ty,
              rotation: 3,
              duration: 0.7,
              ease: "power1.inOut",
            })
            .to(ghost, { autoAlpha: 0, duration: 0.2 })

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

      // 6. Features: the grid heading fades, then the four cards stagger in.
      const grid = root.querySelector<HTMLElement>("[data-features-grid]")
      if (grid) {
        const featuresCopy = root.querySelector<HTMLElement>(
          "[data-features-copy]"
        )
        if (featuresCopy) {
          gsap.fromTo(
            featuresCopy,
            { y: 16, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.5,
              ease: "power2.out",
              scrollTrigger: { trigger: grid, start: "top 90%", once: true },
            }
          )
        }
        const cards = grid.querySelectorAll<HTMLElement>("[data-feature-card]")
        gsap.fromTo(
          cards,
          { y: 24, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.5,
            ease: "power2.out",
            stagger: 0.1,
            scrollTrigger: { trigger: grid, start: "top 82%", once: true },
          }
        )
      }

      // 7. Cursor-reactive detail (pointer devices only): a soft brand glow
      //    trails the cursor within the hero, and the two primary CTAs get a
      //    gentle magnetic pull.
      if (window.matchMedia("(pointer: fine)").matches) {
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

        Array.from(root.querySelectorAll<HTMLElement>("[data-magnetic]")).forEach(
          (button) => {
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
          }
        )
      }
    }

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      mm.add(
        { motionOk: "(prefers-reduced-motion: no-preference)" },
        runFullMotion
      )
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