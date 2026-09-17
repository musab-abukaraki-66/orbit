import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getItemByKey } from "@/lib/items/data"
import { requireWorkspace } from "@/lib/workspaces/context"
import { ItemPageLoader } from "@/components/items/item-sheet-loader"

type Props = { params: Promise<{ slug: string; key: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, key } = await params
  const context = await requireWorkspace(slug)
  const item = await getItemByKey(context.id, key)
  return { title: item ? `${item.key} ${item.title}` : "Task" }
}

export default async function ItemPage({ params }: Props) {
  const { slug, key } = await params
  const context = await requireWorkspace(slug)
  const page = await ItemPageLoader({ context, itemKey: key })
  if (!page) notFound()
  return <div className="flex flex-1 flex-col">{page}</div>
}
