// jobspeak-backend/routes/heardAbout.js
// Safe endpoint for setting "heard_about_us" field with write-once semantics
// Uses Supabase Auth user_metadata (zero-migration approach)
// Supports JWT authentication (preferred) or userKey from body (fallback)

import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { getAuthenticatedUser } from "../middleware/auth.js";

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
 * Set the "heard_about_us" field with write-once semantics (ignores if already set)
 * Stores value in Supabase Auth user_metadata (no database migration required)
 * 
 * Authentication: 
 *   - Preferred: JWT token in Authorization header (Bearer token)
 *   - Fallback: userKey in request body
 * 
 * Body: { userKey?: string, value: string }
 * 
 * Returns: { success: true, value: string, updated: boolean }
 */
router.post("/heard-about", async (req, res) => {
    try {
        const { userKey: bodyUserKey, value } = req.body;

        // Validate value
        if (!value) {
            return res.status(400).json({ error: "value required" });
        }

        // Resolve user ID: prefer JWT authentication, fallback to userKey from body
        let userKey = null;
        
        // Try to get authenticated user from JWT token
        const { userId, isGuest } = await getAuthenticatedUser(req);
        
        if (!isGuest && userId) {
            // User authenticated via JWT token
            userKey = userId;
            console.log(`[HEARD_ABOUT] Using authenticated user ID: ${userKey}`);
        } else if (bodyUserKey) {
            // Fallback to userKey from body (backward compatibility)
            userKey = bodyUserKey;
            console.log(`[HEARD_ABOUT] Using userKey from body: ${userKey}`);
        } else {
            // No authentication method provided
            return res.status(401).json({ 
                error: "Authentication required. Provide JWT token in Authorization header or userKey in body." 
            });
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

        // Get current user to check if heard_about_us is already set in user_metadata
        const { data: userData, error: fetchError } = await supabaseAdmin.auth.admin.getUserById(userKey);

        if (fetchError) {
            console.error("[HEARD_ABOUT] User fetch error:", fetchError);
            // Fail open: return success
            return res.json({
                success: true,
                value: value,
                updated: false,
                message: "User not found"
            });
        }

        // Check if heard_about_us already exists in user_metadata
        const currentValue = userData.user.user_metadata?.heard_about_us;

        // Write-once logic: only update if current value is undefined/null
        if (currentValue !== undefined && currentValue !== null) {
            // Value already set, do not overwrite
            console.log(`[HEARD_ABOUT] User ${userKey} already has value: ${currentValue}, not overwriting with ${value}`);
            return res.json({
                success: true,
                value: currentValue,
                updated: false,
                message: "Value already set"
            });
        }

        // Value is not set, update user_metadata
        const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userKey,
            {
                user_metadata: {
                    ...userData.user.user_metadata,
                    heard_about_us: value
                }
            }
        );

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
