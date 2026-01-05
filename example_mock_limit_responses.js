// example_mock_limit_responses.js
// Example JSON responses for mock interview limit status

console.log('='.repeat(60));
console.log('MOCK INTERVIEW LIMIT STATUS - EXAMPLE RESPONSES');
console.log('='.repeat(60));
console.log('');

// Example 1: Blocked (Free user hit weekly limit)
console.log('EXAMPLE 1: BLOCKED - Free user hit weekly limit');
console.log('-'.repeat(60));
const blockedResponse = {
    canStartMock: false,
    blocked: true,
    reason: "FREE_LIMIT_REACHED",
    message: "You've used your free mock interview for this week. Resets in 3 days.",
    nextAllowedAt: "2026-01-06T13:45:00.000Z",
    resetInDays: 3
};
console.log(JSON.stringify(blockedResponse, null, 2));
console.log('');

// Example 2: Allowed (Free user eligible)
console.log('EXAMPLE 2: ALLOWED - Free user eligible');
console.log('-'.repeat(60));
const allowedFreeResponse = {
    canStartMock: true,
    blocked: false,
    nextAllowedAt: null,
    resetInDays: 0
};
console.log(JSON.stringify(allowedFreeResponse, null, 2));
console.log('');

// Example 3: Allowed (Pro user)
console.log('EXAMPLE 3: ALLOWED - Pro user (unlimited)');
console.log('-'.repeat(60));
const allowedProResponse = {
    canStartMock: true,
    blocked: false
};
console.log(JSON.stringify(allowedProResponse, null, 2));
console.log('');

// Example 4: Auth Required (Guest/Unauthenticated)
console.log('EXAMPLE 4: AUTH REQUIRED - Guest/Unauthenticated');
console.log('-'.repeat(60));
const authRequiredResponse = {
    canStartMock: false,
    isGuest: true,
    reason: "AUTH_REQUIRED"
};
console.log(JSON.stringify(authRequiredResponse, null, 2));
console.log('');

// Validation Rules
console.log('='.repeat(60));
console.log('VALIDATION RULES');
console.log('='.repeat(60));
console.log('✅ resetInDays: Always >= 0 (never negative)');
console.log('✅ canStartMock: true → blocked: false (always paired)');
console.log('✅ blocked: true → includes reason, message, nextAllowedAt, resetInDays');
console.log('✅ All dates in ISO 8601 format');
console.log('='.repeat(60));
