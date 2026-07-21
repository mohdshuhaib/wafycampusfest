"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { User } from "lucide-react"
import { toDriveImageViewUrl } from "@/lib/student-images"
import { cn } from "@/lib/utils"

interface StudentPhotoProps {
  imageLink?: string | null
  name: string
  className?: string
  fallbackClassName?: string
}

export function StudentPhoto({ imageLink, name, className, fallbackClassName }: StudentPhotoProps) {
  const [failed, setFailed] = useState(false)
  const src = useMemo(() => toDriveImageViewUrl(imageLink), [imageLink])
  const sizeClass = className || "size-12"

  useEffect(() => {
    setFailed(false)
  }, [src])

  if (src && !failed) {
    return (
      <Image
        src={src}
        alt={`${name} photo`}
        width={96}
        height={96}
        className={cn("shrink-0 rounded-2xl border border-navy/10 object-cover shadow-sm", sizeClass)}
        loading="lazy"
        unoptimized
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    )
  }

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-2xl border border-navy/10 bg-navy/8 text-xs font-black text-navy shadow-sm",
        sizeClass,
        fallbackClassName
      )}
      aria-label={`${name} photo placeholder`}
    >
      <User className="size-4" />
    </div>
  )
}
