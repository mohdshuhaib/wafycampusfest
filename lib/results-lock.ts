import { createAdminClient } from "@/lib/supabase-admin"

/**
 * Checks whether the public results are currently locked (Curiosity / Suspense Mode).
 * Reads from app_config.results_locked with site_assets fallback.
 */
export async function isResultsLocked(): Promise<boolean> {
  const supabase = createAdminClient()

  // 1. Check app_config table
  try {
    const { data: config, error } = await (supabase.from("app_config") as any)
      .select("results_locked")
      .eq("id", 1)
      .maybeSingle()

    if (!error && config && typeof config.results_locked === "boolean") {
      return config.results_locked
    }
  } catch (err) {
    // Migration might not have run on the remote DB yet
  }

  // 2. Check site_assets fallback
  try {
    const { data: asset } = await supabase
      .from("site_assets")
      .select("value")
      .eq("key", "results_locked")
      .maybeSingle()

    if (asset?.value) {
      return asset.value === "true" || asset.value === "1"
    }
  } catch (err) {
    console.error("Error checking site_assets fallback for results_locked:", err)
  }

  return false
}

/**
 * Sets the public results lock state in both app_config and site_assets.
 */
export async function setResultsLocked(locked: boolean): Promise<void> {
  const supabase = createAdminClient()

  // 1. Update app_config
  try {
    await (supabase.from("app_config") as any)
      .update({ results_locked: locked })
      .eq("id", 1)
  } catch (err) {
    console.warn("Failed to update app_config.results_locked:", err)
  }

  // 2. Update site_assets fallback
  try {
    await supabase.from("site_assets").upsert(
      {
        key: "results_locked",
        label: "Results Suspense Lock",
        type: "link",
        value: locked ? "true" : "false",
        description: "When true, public main page hides results behind suspense dots/blur (Curiosity Mode).",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    )
  } catch (err) {
    console.warn("Failed to update site_assets results_locked:", err)
  }
}
