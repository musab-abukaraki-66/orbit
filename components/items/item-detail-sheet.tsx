"use client"

import { usePathname, useRouter } from "next/navigation"

import { ItemDetail, type ItemDetailProps } from "@/components/items/item-detail"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"

export function ItemDetailSheet(props: Omit<ItemDetailProps, "onClose">) {
  const router = useRouter()
  const pathname = usePathname()
  const close = () => router.push(pathname, { scroll: false })
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <SheetContent showCloseButton={false} className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        <SheetTitle className="sr-only">
          {props.item.key} {props.item.title}
        </SheetTitle>
        <SheetDescription className="sr-only">Task details</SheetDescription>
        <ItemDetail {...props} onClose={close} />
      </SheetContent>
    </Sheet>
  )
}
