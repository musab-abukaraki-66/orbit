import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { initialsOf } from "@/lib/members/format"
import { cn } from "@/lib/utils"

export function UserAvatar({
  name,
  avatarUrl,
  className,
  fallbackClassName,
}: {
  name: string | null | undefined
  avatarUrl?: string | null
  className?: string
  fallbackClassName?: string
}) {
  return (
    <Avatar className={cn("size-6", className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
      <AvatarFallback className={cn("bg-brand/15 text-[10px] font-medium text-brand", fallbackClassName)}>
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  )
}
