// jobspeak-backend/routes/account.js
// Account management: deletion with soft-delete and restore

import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// Initialize Supabase client with service role for admin operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("⚠️  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Account deletion will fail.");
}

const supabaseAdmin = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

/**
 * DELETE /api/account
 * Soft-delete user account with 7-day restore window
 * 
 * Body: { userKey: string }
 * 
 * Returns: { success: true, restore_until: ISO date }
 */
router.delete("/account", async (req, res) => {
    try {
        const { userKey } = req.body;

        if (!userKey) {
            return res.status(400).json({ error: "userKey required" });
        }

        if (!supabaseAdmin) {
            return res.status(500).json({ error: "Account deletion not configured" });
        }

        // Set deleted_at timestamp (soft delete)
        const deletedAt = new Date().toISOString();
        const restoreUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now

        const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update({ deleted_at: deletedAt })
            .eq("id", userKey);

        if (profileError) {
            console.error("Profile soft-delete error:", profileError);
            return res.status(500).json({ error: "Failed to delete account" });
        }

        // Best-effort: Delete avatar from storage
        try {
            const { data: files } = await supabaseAdmin.storage
                .from("avatars")
                .list(userKey);

            if (files && files.length > 0) {
                const filePaths = files.map(f => `${userKey}/${f.name}`);
                await supabaseAdmin.storage
                    .from("avatars")
                    .remove(filePaths);
                console.log(`[ACCOUNT DELETE] Removed ${filePaths.length} avatar files for ${userKey}`);
            }
        } catch (storageError) {
            console.warn("[ACCOUNT DELETE] Avatar cleanup failed (non-critical):", storageError.message);
        }

        console.log(`[ACCOUNT DELETE] User ${userKey} soft-deleted. Restore until: ${restoreUntil}`);

        return res.json({
            success: true,
            deleted_at: deletedAt,
            restore_until: restoreUntil,
            message: "Account deleted. You have 7 days to restore it."
        });

    } catch (error) {
        console.error("Account deletion error:", error);
        return res.status(500).json({ error: "Failed to delete account" });
    }
});

/**
 * POST /api/account/restore
 * Restore soft-deleted account within 7-day window
 * 
 * Body: { userKey: string }
 * 
 * Returns: { success: true, restored: true }
 */
router.post("/account/restore", async (req, res) => {
    try {
        const { userKey } = req.body;

        if (!userKey) {
            return res.status(400).json({ error: "userKey required" });
        }

        if (!supabaseAdmin) {
            return res.status(500).json({ error: "Account restore not configured" });
        }

        // Get current profile
        const { data: profile, error: fetchError } = await supabaseAdmin
            .from("profiles")
            .select("deleted_at")
            .eq("id", userKey)
            .single();

        if (fetchError || !profile) {
            return res.status(404).json({ error: "Account not found" });
        }

        if (!profile.deleted_at) {
            return res.status(400).json({ error: "Account is not deleted" });
        }

        // Check if within 7-day restore window
        const deletedAt = new Date(profile.deleted_at);
        const now = new Date();
        const daysSinceDeleted = (now - deletedAt) / (1000 * 60 * 60 * 24);

        if (daysSinceDeleted > 7) {
            return res.status(403).json({
                error: "Restore window expired (7 days)",
                deleted_at: profile.deleted_at
            });
        }

        // Restore account (clear deleted_at)
        const { error: restoreError } = await supabaseAdmin
            .from("profiles")
            .update({ deleted_at: null })
            .eq("id", userKey);

        if (restoreError) {
            console.error("Account restore error:", restoreError);
            return res.status(500).json({ error: "Failed to restore account" });
        }

        console.log(`[ACCOUNT RESTORE] User ${userKey} restored`);

        return res.json({
            success: true,
            restored: true,
            message: "Account restored successfully"
        });

    } catch (error) {
        console.error("Account restore error:", error);
        return res.status(500).json({ error: "Failed to restore account" });
    }
});

export default router;
