const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://wlxacpqlokoiqqhgaads.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndseGFjcHFsb2tvaXFxaGdhYWRzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY4OTExNywiZXhwIjoyMDgyMjY1MTE3fQ.W77uE7U-MgtmLnC7Yuv9x9gO3ezJvvC6CtzJ1UjeMcQ'
);

async function checkAffiliateApplication() {
    const { data, error } = await supabase
        .from('affiliate_applications')
        .select('*')
        .eq('id', '44d23f67-0a7c-426d-bf7f-42ea4eabde14')
        .single();

    if (error) {
        console.error('Error:', JSON.stringify(error, null, 2));
        process.exit(1);
    }

    console.log('✅ Database Write Verified!');
    console.log('\nAffiliate Application Row:');
    console.log(JSON.stringify(data, null, 2));
}

checkAffiliateApplication();
