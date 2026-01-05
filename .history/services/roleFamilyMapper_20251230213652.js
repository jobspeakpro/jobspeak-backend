// jobspeak-backend/services/roleFamilyMapper.js
// Maps job titles to role families for personalized question selection

/**
 * Role Family Categories
 */
export const ROLE_FAMILIES = {
    PRODUCT_PROJECT: 'Product/Project',
    SOFTWARE_DATA_IT: 'Software/Data/IT',
    BUSINESS_OPS: 'Business/Ops',
    SALES_CS: 'Sales/CS',
    MARKETING: 'Marketing',
    FINANCE: 'Finance',
    HR_PEOPLE: 'HR/People',
    HEALTHCARE: 'Healthcare',
    EDUCATION: 'Education',
    LEGAL_COMPLIANCE: 'Legal/Compliance',
    DESIGN_CREATIVE: 'Design/Creative',
    LEADERSHIP_EXEC: 'Leadership/Exec',
    TRADES_FIELD_LOGISTICS: 'Trades/Field/Logistics',
    STUDENT_EARLY_CAREER: 'Student/Early Career'
};

/**
 * Known job title mappings
 */
const KNOWN_TITLES = {
    // Product/Project
    'product manager': ROLE_FAMILIES.PRODUCT_PROJECT,
    'project manager': ROLE_FAMILIES.PRODUCT_PROJECT,
    'program manager': ROLE_FAMILIES.PRODUCT_PROJECT,
    'product owner': ROLE_FAMILIES.PRODUCT_PROJECT,
    'scrum master': ROLE_FAMILIES.PRODUCT_PROJECT,

    // Software/Data/IT
    'software engineer': ROLE_FAMILIES.SOFTWARE_DATA_IT,
    'developer': ROLE_FAMILIES.SOFTWARE_DATA_IT,
    'programmer': ROLE_FAMILIES.SOFTWARE_DATA_IT,
    'data scientist': ROLE_FAMILIES.SOFTWARE_DATA_IT,
    'data analyst': ROLE_FAMILIES.SOFTWARE_DATA_IT,
    'data engineer': ROLE_FAMILIES.SOFTWARE_DATA_IT,
    'devops engineer': ROLE_FAMILIES.SOFTWARE_DATA_IT,
    'sre': ROLE_FAMILIES.SOFTWARE_DATA_IT,
    'qa engineer': ROLE_FAMILIES.SOFTWARE_DATA_IT,
    'it specialist': ROLE_FAMILIES.SOFTWARE_DATA_IT,
    'systems administrator': ROLE_FAMILIES.SOFTWARE_DATA_IT,
    'network engineer': ROLE_FAMILIES.SOFTWARE_DATA_IT,

    // Business/Ops
    'business analyst': ROLE_FAMILIES.BUSINESS_OPS,
    'operations manager': ROLE_FAMILIES.BUSINESS_OPS,
    'operations analyst': ROLE_FAMILIES.BUSINESS_OPS,
    'strategy consultant': ROLE_FAMILIES.BUSINESS_OPS,
    'management consultant': ROLE_FAMILIES.BUSINESS_OPS,

    // Sales/CS
    'account executive': ROLE_FAMILIES.SALES_CS,
    'sales representative': ROLE_FAMILIES.SALES_CS,
    'sales manager': ROLE_FAMILIES.SALES_CS,
    'bdr': ROLE_FAMILIES.SALES_CS,
    'sdr': ROLE_FAMILIES.SALES_CS,
    'customer success manager': ROLE_FAMILIES.SALES_CS,
    'account manager': ROLE_FAMILIES.SALES_CS,

    // Marketing
    'marketing manager': ROLE_FAMILIES.MARKETING,
    'content marketer': ROLE_FAMILIES.MARKETING,
    'digital marketer': ROLE_FAMILIES.MARKETING,
    'growth marketer': ROLE_FAMILIES.MARKETING,
    'brand manager': ROLE_FAMILIES.MARKETING,

    // Finance
    'financial analyst': ROLE_FAMILIES.FINANCE,
    'accountant': ROLE_FAMILIES.FINANCE,
    'controller': ROLE_FAMILIES.FINANCE,
    'cfo': ROLE_FAMILIES.FINANCE,
    'investment banker': ROLE_FAMILIES.FINANCE,

    // HR/People
    'hr manager': ROLE_FAMILIES.HR_PEOPLE,
    'recruiter': ROLE_FAMILIES.HR_PEOPLE,
    'talent acquisition': ROLE_FAMILIES.HR_PEOPLE,
    'people operations': ROLE_FAMILIES.HR_PEOPLE,

    // Healthcare
    'nurse': ROLE_FAMILIES.HEALTHCARE,
    'doctor': ROLE_FAMILIES.HEALTHCARE,
    'physician': ROLE_FAMILIES.HEALTHCARE,
    'medical assistant': ROLE_FAMILIES.HEALTHCARE,
    'healthcare administrator': ROLE_FAMILIES.HEALTHCARE,

    // Education
    'teacher': ROLE_FAMILIES.EDUCATION,
    'professor': ROLE_FAMILIES.EDUCATION,
    'instructor': ROLE_FAMILIES.EDUCATION,
    'tutor': ROLE_FAMILIES.EDUCATION,

    // Legal/Compliance
    'lawyer': ROLE_FAMILIES.LEGAL_COMPLIANCE,
    'attorney': ROLE_FAMILIES.LEGAL_COMPLIANCE,
    'paralegal': ROLE_FAMILIES.LEGAL_COMPLIANCE,
    'compliance officer': ROLE_FAMILIES.LEGAL_COMPLIANCE,

    // Design/Creative
    'designer': ROLE_FAMILIES.DESIGN_CREATIVE,
    'ux designer': ROLE_FAMILIES.DESIGN_CREATIVE,
    'ui designer': ROLE_FAMILIES.DESIGN_CREATIVE,
    'graphic designer': ROLE_FAMILIES.DESIGN_CREATIVE,
    'creative director': ROLE_FAMILIES.DESIGN_CREATIVE,

    // Leadership/Exec
    'ceo': ROLE_FAMILIES.LEADERSHIP_EXEC,
    'cto': ROLE_FAMILIES.LEADERSHIP_EXEC,
    'vp': ROLE_FAMILIES.LEADERSHIP_EXEC,
    'director': ROLE_FAMILIES.LEADERSHIP_EXEC,
    'head of': ROLE_FAMILIES.LEADERSHIP_EXEC,

    // Trades/Field/Logistics
    'electrician': ROLE_FAMILIES.TRADES_FIELD_LOGISTICS,
    'plumber': ROLE_FAMILIES.TRADES_FIELD_LOGISTICS,
    'mechanic': ROLE_FAMILIES.TRADES_FIELD_LOGISTICS,
    'logistics coordinator': ROLE_FAMILIES.TRADES_FIELD_LOGISTICS,
    'supply chain manager': ROLE_FAMILIES.TRADES_FIELD_LOGISTICS,

    // Student/Early Career
    'intern': ROLE_FAMILIES.STUDENT_EARLY_CAREER,
    'student': ROLE_FAMILIES.STUDENT_EARLY_CAREER,
    'graduate': ROLE_FAMILIES.STUDENT_EARLY_CAREER
};

/**
 * Keyword-based classification rules
 */
const KEYWORD_RULES = [
    { keywords: ['product', 'project', 'program', 'scrum', 'agile'], family: ROLE_FAMILIES.PRODUCT_PROJECT },
    { keywords: ['engineer', 'developer', 'programmer', 'software', 'data', 'devops', 'sre', 'qa', 'it', 'tech'], family: ROLE_FAMILIES.SOFTWARE_DATA_IT },
    { keywords: ['business', 'operations', 'ops', 'strategy', 'consultant', 'analyst'], family: ROLE_FAMILIES.BUSINESS_OPS },
    { keywords: ['sales', 'account', 'bdr', 'sdr', 'customer success', 'cs'], family: ROLE_FAMILIES.SALES_CS },
    { keywords: ['marketing', 'growth', 'brand', 'content', 'digital'], family: ROLE_FAMILIES.MARKETING },
    { keywords: ['finance', 'financial', 'accountant', 'cfo', 'controller'], family: ROLE_FAMILIES.FINANCE },
    { keywords: ['hr', 'human resources', 'recruiter', 'talent', 'people'], family: ROLE_FAMILIES.HR_PEOPLE },
    { keywords: ['nurse', 'doctor', 'physician', 'medical', 'healthcare', 'clinical'], family: ROLE_FAMILIES.HEALTHCARE },
    { keywords: ['teacher', 'professor', 'instructor', 'education', 'tutor'], family: ROLE_FAMILIES.EDUCATION },
    { keywords: ['lawyer', 'attorney', 'legal', 'compliance', 'paralegal'], family: ROLE_FAMILIES.LEGAL_COMPLIANCE },
    { keywords: ['designer', 'design', 'ux', 'ui', 'creative', 'graphic'], family: ROLE_FAMILIES.DESIGN_CREATIVE },
    { keywords: ['ceo', 'cto', 'coo', 'vp', 'vice president', 'director', 'head of', 'chief', 'executive'], family: ROLE_FAMILIES.LEADERSHIP_EXEC },
    { keywords: ['electrician', 'plumber', 'mechanic', 'logistics', 'supply chain', 'warehouse', 'driver'], family: ROLE_FAMILIES.TRADES_FIELD_LOGISTICS },
    { keywords: ['intern', 'student', 'graduate', 'entry level', 'junior'], family: ROLE_FAMILIES.STUDENT_EARLY_CAREER }
];

/**
 * Map job title to role family
 */
export function mapToRoleFamily(jobTitle, seniority = '') {
    if (!jobTitle) {
        // Default based on seniority
        const lowerSeniority = seniority.toLowerCase();
        if (lowerSeniority.includes('senior') || lowerSeniority.includes('lead') || lowerSeniority.includes('principal')) {
            return ROLE_FAMILIES.LEADERSHIP_EXEC;
        }
        return ROLE_FAMILIES.BUSINESS_OPS; // Generic fallback
    }

    const lowerTitle = jobTitle.toLowerCase();

    // Check known titles first (exact match)
    for (const [title, family] of Object.entries(KNOWN_TITLES)) {
        if (lowerTitle.includes(title)) {
            return family;
        }
    }

    // Apply keyword rules
    for (const rule of KEYWORD_RULES) {
        if (rule.keywords.some(keyword => lowerTitle.includes(keyword))) {
            return rule.family;
        }
    }

    // Check seniority for leadership classification
    const lowerSeniority = seniority.toLowerCase();
    if (lowerSeniority.includes('director') || lowerSeniority.includes('vp') ||
        lowerSeniority.includes('head') || lowerSeniority.includes('chief') ||
        lowerSeniority.includes('executive')) {
        return ROLE_FAMILIES.LEADERSHIP_EXEC;
    }

    // Default fallback
    return ROLE_FAMILIES.BUSINESS_OPS;
}

/**
 * Get seniority level category
 */
export function getSeniorityLevel(seniority = '') {
    const lower = seniority.toLowerCase();

    if (lower.includes('entry') || lower.includes('junior') || lower.includes('associate') || lower.includes('intern')) {
        return 'entry';
    }
    if (lower.includes('senior') || lower.includes('lead') || lower.includes('staff') || lower.includes('principal')) {
        return 'senior';
    }
    if (lower.includes('director') || lower.includes('vp') || lower.includes('head') || lower.includes('chief') || lower.includes('executive')) {
        return 'executive';
    }

    return 'mid'; // Default
}
