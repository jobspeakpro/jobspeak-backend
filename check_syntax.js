async function check() {
    try {
        await import('./routes/referrals.js');
        console.log('Referrals: OK');
        await import('./routes/affiliates.js');
        console.log('Affiliates: OK');
        await import('./routes/support.js');
        console.log('Support: OK');
        await import('./routes/mockInterview.js');
        console.log('MockInterview: OK');
    } catch (e) {
        console.error('Error importing:', e);
    }
}
check();
