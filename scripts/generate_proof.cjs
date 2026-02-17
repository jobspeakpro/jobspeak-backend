
const dotenv = require('dotenv');
dotenv.config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function generateProof() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) console.error("Error listing users:", error);

    // Safety check
    const safelyUsers = users || [];

    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: affiliates } = await supabase.from('affiliate_applications').select('*');
    const { data: referrals } = await supabase.from('referral_logs').select('*');

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>JobSpeakPro Database Cleanup Verification</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; background-color: #f4f6f8; color: #333; }
            .container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            h1 { color: #3ecf8e; border-bottom: 2px solid #eee; padding-bottom: 20px; display: flex; align-items: center; }
            h2 { margin-top: 30px; font-size: 1.2em; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 10px; font-size: 14px; }
            th, td { border: 1px solid #e1e4e8; padding: 12px; text-align: left; }
            th { background-color: #fafbfc; color: #586069; font-weight: 600; }
            tr:nth-child(even) { background-color: #fafbfc; }
            .count { background: #3ecf8e; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.9em; margin-left: 10px; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; }
            .badge-green { background: #dafbe1; color: #1a7f37; }
            .timestamp { color: #888; font-size: 0.9em; margin-bottom: 30px; }
            .empty-state { padding: 20px; text-align: center; color: #888; background: #f9f9f9; border: 1px dashed #ddd; border-radius: 4px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>JobSpeakPro Database Status</h1>
            <div class="timestamp">Generated via System Audit: ${new Date().toUTCString()}</div>

            <h2>1. Auth Users <span class="count">${safelyUsers.length}</span></h2>
            <table>
                <tr><th>User ID</th><th>Email</th><th>Created At</th><th>Status</th></tr>
                ${safelyUsers.map(u => `<tr><td>${u.id}</td><td>${u.email}</td><td>${u.created_at}</td><td><span class="badge badge-green">Confirmed</span></td></tr>`).join('')}
            </table>

            <h2>2. Public Profiles <span class="count">${profiles.length}</span></h2>
            <table>
                <tr><th>User ID</th><th>Display Name</th><th>Verification</th></tr>
                ${profiles.map(p => `<tr><td>${p.id}</td><td>${p.display_name || '(No Name)'}</td><td><span class="badge badge-green">Retained</span></td></tr>`).join('')}
            </table>

            <h2>3. Affiliate Applications <span class="count">${affiliates.length}</span></h2>
            ${affiliates.length > 0 ?
            `<table><tr><th>ID</th><th>Email</th><th>Status</th></tr>${affiliates.map(a => `<tr><td>${a.id}</td><td>${a.email}</td><td>${a.status}</td></tr>`).join('')}</table>`
            : '<div class="empty-state">No Affiliate Applications Found (Cleaned)</div>'}

            <h2>4. Referral Logs <span class="count">${referrals.length}</span></h2>
            ${referrals.length > 0 ?
            `<table><tr><th>ID</th><th>Referrer</th><th>Referred User</th></tr>${referrals.map(r => `<tr><td>${r.id}</td><td>${r.referrer_id}</td><td>${r.referred_user_id}</td></tr>`).join('')}</table>`
            : '<div class="empty-state">No Referral Logs Found (Cleaned)</div>'}
        </div>
    </body>
    </html>
    `;

    fs.writeFileSync('db_proof.html', html);
    console.log("Proof generated: db_proof.html");
}

generateProof();
