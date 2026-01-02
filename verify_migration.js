// Verify Supabase tables exist and test endpoints
import { supabase } from './services/supabase.js';

console.log('='.repeat(60));
console.log('SUPABASE MIGRATION VERIFICATION');
console.log('='.repeat(60));

async function verifyTables() {
    console.log('\n📋 Checking if tables exist...\n');

    // Check practice_attempts
    const { data: practiceTest, error: practiceError } = await supabase
        .from('practice_attempts')
        .select('*')
        .limit(1);

    if (practiceError) {
        console.log('❌ practice_attempts table: NOT FOUND');
        console.log(`   Error: ${practiceError.message}`);
    } else {
        console.log('✅ practice_attempts table: EXISTS');
    }

    // Check mock_sessions
    const { data: mockSessionsTest, error: mockSessionsError } = await supabase
        .from('mock_sessions')
        .select('*')
        .limit(1);

    if (mockSessionsError) {
        console.log('❌ mock_sessions table: NOT FOUND');
        console.log(`   Error: ${mockSessionsError.message}`);
    } else {
        console.log('✅ mock_sessions table: EXISTS');
    }

    // Check mock_attempts
    const { data: mockAttemptsTest, error: mockAttemptsError } = await supabase
        .from('mock_attempts')
        .select('*')
        .limit(1);

    if (mockAttemptsError) {
        console.log('❌ mock_attempts table: NOT FOUND');
        console.log(`   Error: ${mockAttemptsError.message}`);
    } else {
        console.log('✅ mock_attempts table: EXISTS');
    }

    return !practiceError && !mockSessionsError && !mockAttemptsError;
}

async function testEndpoints() {
    console.log('\n🔌 Testing endpoints...\n');

    try {
        // Test GET /api/progress
        const progressRes = await fetch('http://127.0.0.1:3000/api/progress?userKey=test-user');
        console.log(`GET /api/progress: ${progressRes.status} ${progressRes.statusText}`);

        // Test GET /api/mock-interview/summary
        const summaryRes = await fetch('http://127.0.0.1:3000/api/mock-interview/summary?sessionId=test');
        console.log(`GET /api/mock-interview/summary: ${summaryRes.status} ${summaryRes.statusText}`);

        // Test GET /api/practice/summary
        const practiceSummaryRes = await fetch('http://127.0.0.1:3000/api/practice/summary?sessionId=test');
        console.log(`GET /api/practice/summary: ${practiceSummaryRes.status} ${practiceSummaryRes.statusText}`);

        return progressRes.status === 200 && summaryRes.status === 200 && practiceSummaryRes.status === 200;
    } catch (error) {
        console.log(`❌ Endpoint test failed: ${error.message}`);
        return false;
    }
}

// Run verification
const tablesExist = await verifyTables();
const endpointsWork = await testEndpoints();

console.log('\n' + '='.repeat(60));
if (tablesExist && endpointsWork) {
    console.log('✅ ALL CHECKS PASSED');
    console.log('   - Tables exist in Supabase');
    console.log('   - Endpoints return 200');
} else {
    console.log('❌ VERIFICATION FAILED');
    if (!tablesExist) {
        console.log('   - Run migration: supabase-migrations/answer_persistence.sql');
    }
    if (!endpointsWork) {
        console.log('   - Check server is running on port 3000');
    }
}
console.log('='.repeat(60));
