"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  ExternalLink,
  FileBadge,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Save,
  Settings2,
  Sparkles,
  Upload,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

interface SiteAsset {
  key: string
  value: string
  label: string
}

export default function AssetsManagePage() {
  const [loading, setLoading] = useState(true)
  const [handbookLink, setHandbookLink] = useState("")
  const [headerImageUrl, setHeaderImageUrl] = useState("")
  const [scoreSheetHeaderUrl, setScoreSheetHeaderUrl] = useState("")
  const [updatingLink, setUpdatingLink] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingScoreSheetImage, setUploadingScoreSheetImage] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [scoreSheetUploadError, setScoreSheetUploadError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const scoreSheetInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchAssets() {
      try {
        setLoading(true)

        const { data, error } = await (supabase.from("site_assets") as any)
          .select("*")
          .in("key", ["rulebook_link", "admit_card_header", "score_sheet_header"])

        if (error) throw error

        if (data) {
          const assets = data as SiteAsset[]
          const linkAsset = assets.find((asset) => asset.key === "rulebook_link")
          const imageAsset = assets.find((asset) => asset.key === "admit_card_header")
          const scoreSheetAsset = assets.find((asset) => asset.key === "score_sheet_header")

          if (linkAsset) setHandbookLink(linkAsset.value)
          if (imageAsset) setHeaderImageUrl(imageAsset.value)
          if (scoreSheetAsset) setScoreSheetHeaderUrl(scoreSheetAsset.value)
        }
      } catch (error) {
        console.error("Error fetching assets:", error)
        toast.error("Failed to load assets")
      } finally {
        setLoading(false)
      }
    }
    fetchAssets()
  }, [])

  const handleUpdateLink = async () => {
    if (!handbookLink.trim()) return

    try {
      setUpdatingLink(true)

      const { error } = await (supabase.from("site_assets") as any)
        .update({ value: handbookLink, updated_at: new Date().toISOString() })
        .eq("key", "rulebook_link")

      if (error) throw error
      toast.success("Handbook link updated successfully")
    } catch (error) {
      console.error("Error updating link:", error)
      toast.error("Failed to update link")
    } finally {
      setUpdatingLink(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setUploadError(null)

    if (!file) return

    if (!file.type.startsWith("image/")) {
      const msg = "Invalid file type. Please upload an image (PNG, JPG)."
      setUploadError(msg)
      toast.error(msg)
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      const msg = `File is too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Max size is 2MB.`
      setUploadError(msg)
      toast.error(msg)
      return
    }

    try {
      setUploadingImage(true)

      const fileExt = file.name.split(".").pop()
      const fileName = `admit-header-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from("site-assets")
        .getPublicUrl(fileName)

      const { error: dbError } = await (supabase.from("site_assets") as any)
        .update({ value: publicUrl, updated_at: new Date().toISOString() })
        .eq("key", "admit_card_header")

      if (dbError) throw dbError

      setHeaderImageUrl(publicUrl)
      toast.success("Admit Card Header updated successfully")
    } catch (error: any) {
      console.error("Upload failed:", error)
      setUploadError(error.message || "Failed to upload image")
      toast.error("Failed to upload image")
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleScoreSheetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setScoreSheetUploadError(null)

    if (!file) return

    if (!file.type.startsWith("image/")) {
      const msg = "Invalid file type. Please upload an image (PNG, JPG)."
      setScoreSheetUploadError(msg)
      toast.error(msg)
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      const msg = `File is too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Max size is 2MB.`
      setScoreSheetUploadError(msg)
      toast.error(msg)
      return
    }

    try {
      setUploadingScoreSheetImage(true)

      const fileExt = file.name.split(".").pop()
      const fileName = `score-sheet-header-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from("site-assets")
        .getPublicUrl(fileName)

      const { error: dbError } = await (supabase.from("site_assets") as any)
        .update({ value: publicUrl, updated_at: new Date().toISOString() })
        .eq("key", "score_sheet_header")

      if (dbError) throw dbError

      setScoreSheetHeaderUrl(publicUrl)
      toast.success("Judgment Sheet Header updated successfully")
    } catch (error: any) {
      console.error("Upload failed:", error)
      setScoreSheetUploadError(error.message || "Failed to upload image")
      toast.error("Failed to upload image")
    } finally {
      setUploadingScoreSheetImage(false)
      if (scoreSheetInputRef.current) scoreSheetInputRef.current.value = ""
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-6rem)] w-full items-center justify-center">
        <div className="surface-elevated flex items-center gap-3 rounded-3xl px-5 py-4">
          <Loader2 className="size-5 animate-spin text-gold" />
          <span className="text-sm font-bold text-navy">Loading asset studio</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-6rem)] space-y-5 pb-20 md:pb-4">
      <section className="surface-dark relative overflow-hidden rounded-[2rem] p-5 sm:p-6">

        <div className="relative grid gap-5 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <Badge variant="gold" className="h-8 gap-2 px-3">
              <Sparkles className="size-3.5" />
              Asset Studio
            </Badge>
            <h1 className="text-display mt-4 text-3xl text-ivory sm:text-4xl">Manage public resources.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-ivory/62">
              Configure handbook links and document headers used by admit cards, score sheets, and captain workflows.
            </p>
          </div>

          <div className="rounded-3xl border border-ivory/10 bg-ivory/8 p-4">
            <div className="flex items-center gap-3">
              <Settings2 className="size-5 text-gold" />
              <div>
                <p className="text-sm font-black text-ivory">Storage bucket</p>
                <p className="text-xs font-semibold text-ivory/48">site-assets / public URLs</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(320px,0.75fr)_minmax(0,1fr)]">
        <div className="surface-elevated rounded-[2rem] p-5">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-navy text-gold">
              <LinkIcon className="size-5" />
            </div>
            <div>
              <h2 className="text-title text-xl text-navy">Event Handbook</h2>
              <p className="text-xs font-semibold text-slatebrand">Captain rulebook or drive document link.</p>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="handbook-url" className="text-xs font-black uppercase tracking-[0.12em] text-slatebrand">
              External Link
            </Label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slatebrand" />
              <Input
                id="handbook-url"
                placeholder="https://drive.google.com/..."
                value={handbookLink}
                onChange={(e) => setHandbookLink(e.target.value)}
                className="h-12 rounded-2xl pl-10 font-mono text-sm"
              />
            </div>
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slatebrand">
              <span>Use a publicly accessible URL.</span>
              {handbookLink && (
                <a href={handbookLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-navy hover:text-gold">
                  Test Link <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </div>

          <Button onClick={handleUpdateLink} disabled={updatingLink || !handbookLink} className="mt-6 w-full">
            {updatingLink ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            Save Changes
          </Button>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <ImageAssetPanel
            title="Admit Card Header"
            helper="Banner displayed on generated admit cards."
            recommendation="Recommended: 2000x350px"
            icon={ImageIcon}
            value={headerImageUrl}
            error={uploadError}
            uploading={uploadingImage}
            inputRef={fileInputRef}
            onUpload={handleImageUpload}
            accent="gold"
          />

          <ImageAssetPanel
            title="Judgment Sheet Header"
            helper="Logo or banner for judge score sheets."
            recommendation="Recommended: 1500x300px"
            icon={FileBadge}
            value={scoreSheetHeaderUrl}
            error={scoreSheetUploadError}
            uploading={uploadingScoreSheetImage}
            inputRef={scoreSheetInputRef}
            onUpload={handleScoreSheetUpload}
            accent="blue"
          />
        </div>
      </section>
    </div>
  )
}

function ImageAssetPanel({
  title,
  helper,
  recommendation,
  icon: Icon,
  value,
  error,
  uploading,
  inputRef,
  onUpload,
  accent,
}: {
  title: string
  helper: string
  recommendation: string
  icon: typeof ImageIcon
  value: string
  error: string | null
  uploading: boolean
  inputRef: React.RefObject<HTMLInputElement | null>
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  accent: "gold" | "blue"
}) {
  const accentClass = accent === "gold" ? "bg-gold/12 text-gold" : "bg-deepblue text-ivory"

  return (
    <div className="surface-elevated flex min-h-[520px] flex-col rounded-[2rem] p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex size-11 items-center justify-center rounded-2xl ${accentClass}`}>
            <Icon className="size-5" />
          </div>
          <div>
            <h2 className="text-title text-lg text-navy">{title}</h2>
            <p className="text-xs font-semibold text-slatebrand">{helper}</p>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0 text-[10px]">{recommendation}</Badge>
      </div>

      <div className="relative flex min-h-56 flex-1 items-center justify-center overflow-hidden rounded-3xl border border-navy/10 bg-mist p-3">
        {uploading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-ivory/90 backdrop-blur-sm">
            <Loader2 className="size-10 animate-spin text-gold" />
            <span className="text-sm font-bold text-navy">Uploading...</span>
          </div>
        )}

        {value ? (
          <div className="relative flex h-full w-full items-center justify-center">
            <img src={value} alt={title} className="max-h-[240px] w-full rounded-2xl object-contain shadow-sm" />
            <div className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success px-2.5 py-1 text-[10px] font-black text-ivory shadow-lg">
              <CheckCircle2 className="size-3" /> ACTIVE
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-10 text-slatebrand">
            <ImageIcon className="mb-3 size-9 opacity-40" />
            <p className="text-sm font-bold">No image set</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-3">
          <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-bold text-destructive">Upload failed</p>
            <p className="mt-1 text-xs font-semibold text-destructive/80">{error}</p>
          </div>
        </div>
      )}

      <input type="file" accept="image/*" ref={inputRef} onChange={onUpload} className="hidden" />
      <Button variant="outline" className="mt-5 h-12 w-full border-dashed" onClick={() => inputRef.current?.click()} disabled={uploading}>
        <Upload className="mr-2 size-4" />
        Upload new image
      </Button>
    </div>
  )
}
