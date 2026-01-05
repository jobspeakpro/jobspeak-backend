import fs from 'fs';
import path from 'path';

const MIGRATION_FILE = 'supabase-migrations/20250103_add_avatar_url.sql';

if (fs.existsSync(path.join(process.cwd(), MIGRATION_FILE))) {
    console.log(`✅ Migration file ${MIGRATION_FILE} created.`);
} else {
    console.error(`❌ Migration file missing.`);
    process.exit(1);
}
