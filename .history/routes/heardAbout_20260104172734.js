// jobspeak-backend/routes/heardAbout.js
// Minimal endpoint for setting "heard_about_us" field with write-once semantics

import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Initialize Supabase client with service role for admin operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("⚠️  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. heard_about endpoint will fail.");
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

/**
 * POST /api/profile/heard-about
 * Set the "heard_about_us" field with write-once semantics
 * 
 * Body: { userKey: string, value: string }
 * 
 * Returns: { success: true, value: string, updated: boolean }
 */
router.post("/heard-about", async (req, res) => {
    try {
        const { userKey, value } = req.body;

        // Validate input
        if (!userKey) {
            return res.status(400).json({ error: "userKey required" });
        }

        if (!value) {
            return res.status(400).json({ error: "value required" });
        }

        if (!supabaseAdmin) {
            // Fail open: return success but log warning
            console.warn("[HEARD_ABOUT] Supabase not configured, failing open");
            return res.json({
                success: true,
                value: value,
                updated: false,
                message: "Service not configured"
            });
        }

        // Get current profile to check if heard_about_us is already set
        const { data: profile, error: fetchError } = await supabaseAdmin
            .from("profiles")
            .select("heard_about_us")
            .eq("id", userKey)
            .single();

        if (fetchError) {
            console.error("[HEARD_ABOUT] Profile fetch error:", fetchError);
            // Fail open: return success
            return res.json({
                success: true,
                value: value,
                updated: false,
                message: "Profile not found"
            });
        }

        // Write-once logic: only update if current value is NULL
        if (profile.heard_about_us !== null) {
            // Value already set, do not overwrite
            console.log(`[HEARD_ABOUT] User ${userKey} already has value: ${profile.heard_about_us}, not overwriting with ${value}`);
            return res.json({
                success: true,
                value: profile.heard_about_us,
                updated: false,
                message: "Value already set"
            });
        }

        // Value is NULL, update it
        const { error: updateError } = await supabaseAdmin
            .from("profiles")
            .update({
                heard_about_us: value,
                updated_at: new Date().toISOString()
            })
            .eq("id", userKey);

        if (updateError) {
            console.error("[HEARD_ABOUT] Update error:", updateError);
            // Fail open: return success
            return res.json({
                success: true,
                value: value,
                updated: false,
                message: "Update failed"
            });
        }

        console.log(`[HEARD_ABOUT] User ${userKey} set to: ${value}`);

        return res.json({
            success: true,
            value: value,
            updated: true
        });

    } catch (error) {
        console.error("[HEARD_ABOUT] Unexpected error:", error);
        // Fail open: return success to prevent frontend crashes
        return res.json({
            success: true,
            value: req.body.value || "unknown",
            updated: false,
            message: "Error occurred"
        });
    }
});

export default router;
