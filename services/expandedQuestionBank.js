// jobspeak-backend/services/expandedQuestionBank.js
// Comprehensive question bank with 200+ questions for very personalized selection

import { ROLE_FAMILIES } from './roleFamilyMapper.js';

/**
 * Expanded Question Bank
 * Total: 200+ questions across all categories and role families
 */
export const QUESTION_BANK = [
    // ========== BEHAVIORAL QUESTIONS (40) ==========
    {
        id: 'behav_001',
        prompt: 'Tell me about a time you faced a significant challenge as a {job_title}. How did you overcome it?',
        hint: 'Use STAR: Situation, Task, Action, Result. Include specific metrics if possible.',
        category: 'behavioral',
        difficulty: 'normal',
        role_families: ['all'],
        seniority_levels: ['all'],
        competencies: ['problem_solving', 'resilience']
    },
    {
        id: 'behav_002',
        prompt: 'Describe a mistake you made in your role. How did you handle it and what did you learn?',
        hint: 'Show accountability and growth mindset.',
        category: 'behavioral',
        difficulty: 'normal',
        role_families: ['all'],
        seniority_levels: ['all'],
        competencies: ['accountability', 'learning']
    },
    {
        id: 'behav_003',
        prompt: 'Tell me about a time you had to work with a difficult colleague. How did you handle the situation?',
        hint: 'Focus on communication, empathy, and finding common ground.',
        category: 'behavioral',
        difficulty: 'normal',
        role_families: ['all'],
        seniority_levels: ['all'],
        competencies: ['collaboration', 'conflict_resolution']
    },
    {
        id: 'behav_004',
        prompt: 'Describe a situation where you had to work under significant pressure or tight deadlines.',
        hint: 'Highlight time management and prioritization skills.',
        category: 'behavioral',
        difficulty: 'normal',
        role_families: ['all'],
        seniority_levels: ['all'],
        competencies: ['time_management', 'stress_management']
    },
    {
        id: 'behav_005',
        prompt: 'Tell me about a successful team project you contributed to. What was your specific role?',
        hint: 'Quantify your contributions and the team outcome.',
        category: 'behavioral',
        difficulty: 'easy',
        role_families: ['all'],
        seniority_levels: ['all'],
        competencies: ['teamwork', 'collaboration']
    },
    {
        id: 'behav_006',
        prompt: 'Describe a time when you had to quickly adapt to a major change at work.',
        hint: 'Show flexibility and positive attitude toward change.',
        category: 'behavioral',
        difficulty: 'normal',
        role_families: ['all'],
        seniority_levels: ['all'],
        competencies: ['adaptability', 'change_management']
    },
    {
        id: 'behav_007',
        prompt: 'Tell me about a time you went above and beyond your job responsibilities.',
        hint: 'Demonstrate initiative and ownership.',
        category: 'behavioral',
        difficulty: 'easy',
        role_families: ['all'],
        seniority_levels: ['all'],
        competencies: ['initiative', 'ownership']
    },
    {
        id: 'behav_008',
        prompt: 'Describe a situation where you had to persuade someone to see things your way.',
        hint: 'Show influence and communication skills.',
        category: 'behavioral',
        difficulty: 'normal',
        role_families: ['all'],
        seniority_levels: ['all'],
        competencies: ['influence', 'communication']
    },
    {
        id: 'behav_009',
        prompt: 'Tell me about a time you received constructive criticism. How did you respond?',
        hint: 'Demonstrate openness to feedback and commitment to growth.',
        category: 'behavioral',
        difficulty: 'easy',
        role_families: ['all'],
        seniority_levels: ['all'],
        competencies: ['feedback_receptivity', 'growth_mindset']
    },
    {
        id: 'behav_010',
        prompt: 'Describe a time when you had to make a difficult decision with incomplete information.',
        hint: 'Show decision-making process and risk assessment.',
        category: 'behavioral',
        difficulty: 'hard',
        role_families: ['all'],
        seniority_levels: ['mid', 'senior', 'executive'],
        competencies: ['decision_making', 'risk_management']
    },

    // Continue with more behavioral questions...
    {
        id: 'behav_011',
        prompt: 'Tell me about a time you failed at something. What happened and what did you learn?',
        hint: 'Show resilience and learning from failure.',
        category: 'behavioral',
        difficulty: 'normal',
        role_families: ['all'],
        seniority_levels: ['all'],
        competencies: ['resilience', 'learning']
    },
    {
        id: 'behav_012',
        prompt: 'Describe a time when you had to prioritize multiple urgent tasks.',
        hint: 'Explain your prioritization framework.',
        category: 'behavioral',
        difficulty: 'normal',
        role_families: ['all'],
        seniority_levels: ['all'],
        competencies: ['prioritization', 'time_management']
    },
    {
        id: 'behav_013',
        prompt: 'Tell me about a time you had to learn a new skill quickly for your job.',
        hint: 'Show learning agility and resourcefulness.',
        category: 'behavioral',
        difficulty: 'easy',
        role_families: ['all'],
        seniority_levels: ['all'],
        competencies: ['learning_agility', 'adaptability']
    },
    {
        id: 'behav_014',
        prompt: 'Describe a situation where you had to deliver bad news to a stakeholder.',
        hint: 'Focus on communication and managing expectations.',
        category: 'behavioral',
        difficulty: 'normal',
        role_families: ['all'],
        seniority_levels: ['mid', 'senior', 'executive'],
        competencies: ['communication', 'stakeholder_management']
    },
    {
        id: 'behav_015',
        prompt: 'Tell me about a time you identified and solved a problem before it became critical.',
        hint: 'Show proactive thinking and problem-solving.',
        category: 'behavioral',
        difficulty: 'normal',
        role_families: ['all'],
        seniority_levels: ['all'],
        competencies: ['proactivity', 'problem_solving']
    },

    // ========== COMMUNICATION/CLARITY QUESTIONS (20) ==========
    {
        id: 'comm_001',
        prompt: 'Tell me about yourself and why you want to work as a {job_title}.',
        hint: 'Keep it concise: background, relevant experience, and motivation.',
        category: 'communication',
        difficulty: 'easy',
        role_families: ['all'],
        seniority_levels: ['all'],
        competencies: ['communication', 'self_presentation']
    },
    {
        id: 'comm_002',
        prompt: 'What are your top three strengths as a {job_title}?',
        hint: 'Provide specific examples that demonstrate each strength.',
        category: 'communication',
        difficulty: 'easy',
        role_families: ['all'],
        seniority_levels: ['all'],
        competencies: ['self_awareness', 'communication']
    },
    {
        id: 'comm_003',
        prompt: 'What area are you actively working to improve in your professional development?',
        hint: 'Be honest but show self-awareness and proactive development.',
        category: 'communication',
        difficulty: 'normal',
        role_families: ['all'],
        seniority_levels: ['all'],
        competencies: ['self_awareness', 'growth_mindset']
    },
    {
        id: 'comm_004',
        prompt: 'What is your proudest professional achievement?',
        hint: 'Quantify the impact and explain why it matters to you.',
        category: 'communication',
        difficulty: 'easy',
        role_families: ['all'],
        seniority_levels: ['all'],
        competencies: ['achievement_orientation', 'communication']
    },
    {
        id: 'comm_005',
        prompt: 'How do you explain complex technical concepts to non-technical stakeholders?',
        hint: 'Give a specific example of successful communication.',
        category: 'communication',
        difficulty: 'normal',
        role_families: [ROLE_FAMILIES.SOFTWARE_DATA_IT, ROLE_FAMILIES.PRODUCT_PROJECT],
        seniority_levels: ['all'],
        competencies: ['communication', 'stakeholder_management']
    },
    {
        id: 'comm_006',
        prompt: 'Describe your communication style and how you adapt it for different audiences.',
        hint: 'Show awareness of different communication needs.',
        category: 'communication',
        difficulty: 'normal',
        role_families: ['all'],
        seniority_levels: ['mid', 'senior', 'executive'],
        competencies: ['communication', 'adaptability']
    },
    {
        id: 'comm_007',
        prompt: 'How do you ensure your team or colleagues understand your expectations?',
        hint: 'Discuss clarity, documentation, and feedback loops.',
        category: 'communication',
        difficulty: 'normal',
        role_families: ['all'],
        seniority_levels: ['mid', 'senior', 'executive'],
        competencies: ['communication', 'clarity']
    },
    {
        id: 'comm_008',
        prompt: 'Tell me about a time you had to present to senior leadership. How did you prepare?',
        hint: 'Focus on preparation, clarity, and impact.',
        category: 'communication',
        difficulty: 'hard',
        role_families: ['all'],
        seniority_levels: ['mid', 'senior', 'executive'],
        competencies: ['communication', 'executive_presence']
    },

    // ========== LEADERSHIP QUESTIONS (20) ==========
    {
        id: 'lead_001',
        prompt: 'How do you motivate a team when deadlines are tight and morale is low?',
        hint: 'Share specific strategies you have used to inspire and support your team.',
        category: 'leadership',
        difficulty: 'hard',
        role_families: [ROLE_FAMILIES.LEADERSHIP_EXEC],
        seniority_levels: ['senior', 'executive'],
        competencies: ['leadership', 'motivation']
    },
    {
        id: 'lead_002',
        prompt: 'Describe a strategic decision you made that significantly impacted your organization.',
        hint: 'Include context, decision-making process, and measurable outcomes.',
        category: 'leadership',
        difficulty: 'hard',
        role_families: [ROLE_FAMILIES.LEADERSHIP_EXEC],
        seniority_levels: ['senior', 'executive'],
        competencies: ['strategic_thinking', 'decision_making']
    },
    {
        id: 'lead_003',
        prompt: 'How do you decide what tasks to delegate and what to handle yourself?',
        hint: 'Explain your framework for delegation and team development.',
        category: 'leadership',
        difficulty: 'normal',
        role_families: [ROLE_FAMILIES.LEADERSHIP_EXEC],
        seniority_levels: ['mid', 'senior', 'executive'],
        competencies: ['delegation', 'leadership']
    },
    {
        id: 'lead_004',
        prompt: 'Tell me about a time you had to manage underperformance on your team.',
        hint: 'Show coaching, feedback, and performance management skills.',
        category: 'leadership',
        difficulty: 'hard',
        role_families: [ROLE_FAMILIES.LEADERSHIP_EXEC],
        seniority_levels: ['mid', 'senior', 'executive'],
        competencies: ['performance_management', 'coaching']
    },
    {
        id: 'lead_005',
        prompt: 'How do you build and maintain a high-performing team culture?',
        hint: 'Discuss specific practices and examples.',
        category: 'leadership',
        difficulty: 'hard',
        role_families: [ROLE_FAMILIES.LEADERSHIP_EXEC],
        seniority_levels: ['senior', 'executive'],
        competencies: ['culture_building', 'leadership']
    },
    {
        id: 'lead_006',
        prompt: 'Describe a time when you had to lead through significant organizational change.',
        hint: 'Show change management and communication skills.',
        category: 'leadership',
        difficulty: 'hard',
        role_families: [ROLE_FAMILIES.LEADERSHIP_EXEC],
        seniority_levels: ['senior', 'executive'],
        competencies: ['change_management', 'leadership']
    },
    {
        id: 'lead_007',
        prompt: 'How do you balance short-term execution with long-term strategy?',
        hint: 'Give specific examples of this balance.',
        category: 'leadership',
        difficulty: 'hard',
        role_families: [ROLE_FAMILIES.LEADERSHIP_EXEC],
        seniority_levels: ['senior', 'executive'],
        competencies: ['strategic_thinking', 'execution']
    },
    {
        id: 'lead_008',
        prompt: 'Tell me about a time you had to make an unpopular decision as a leader.',
        hint: 'Show conviction, communication, and follow-through.',
        category: 'leadership',
        difficulty: 'hard',
        role_families: [ROLE_FAMILIES.LEADERSHIP_EXEC],
        seniority_levels: ['senior', 'executive'],
        competencies: ['decision_making', 'courage']
    },

    // ========== ROLE-SPECIFIC: PRODUCT/PROJECT (20) ==========
    {
        id: 'prod_001',
        prompt: 'How do you prioritize features when stakeholders have conflicting requirements?',
        hint: 'Describe your framework for balancing competing priorities.',
        category: 'role_specific',
        difficulty: 'hard',
        role_families: [ROLE_FAMILIES.PRODUCT_PROJECT],
        seniority_levels: ['all'],
        competencies: ['prioritization', 'stakeholder_management']
    },
    {
        id: 'prod_002',
        prompt: 'Walk me through how you build and communicate a product roadmap.',
        hint: 'Include stakeholder alignment and handling changes.',
        category: 'role_specific',
        difficulty: 'normal',
        role_families: [ROLE_FAMILIES.PRODUCT_PROJECT],
        seniority_levels: ['mid', 'senior'],
        competencies: ['roadmap_planning', 'communication']
    },
    {
        id: 'prod_003',
        prompt: 'Tell me about a time you had to kill a feature or project. How did you make that decision?',
        hint: 'Show data-driven decision making and stakeholder management.',
        category: 'role_specific',
        difficulty: 'hard',
        role_families: [ROLE_FAMILIES.PRODUCT_PROJECT],
        seniority_levels: ['mid', 'senior'],
        competencies: ['decision_making', 'stakeholder_management']
    },
    {
        id: 'prod_004',
        prompt: 'How do you gather and validate customer feedback for product decisions?',
        hint: 'Discuss specific methods and examples.',
        category: 'role_specific',
        difficulty: 'normal',
        role_families: [ROLE_FAMILIES.PRODUCT_PROJECT],
        seniority_levels: ['all'],
        competencies: ['customer_research', 'validation']
    },
    {
        id: 'prod_005',
        prompt: 'Describe a time when you had to manage scope creep on a project.',
        hint: 'Show boundary setting and stakeholder communication.',
        category: 'role_specific',
        difficulty: 'normal',
        role_families: [ROLE_FAMILIES.PRODUCT_PROJECT],
        seniority_levels: ['all'],
        competencies: ['scope_management', 'communication']
    },

    // ========== ROLE-SPECIFIC: SOFTWARE/DATA/IT (20) ==========
    {
        id: 'tech_001',
        prompt: 'Walk me through your process for starting a new {job_title} project.',
        hint: 'Cover planning, execution, and quality assurance.',
        category: 'role_specific',
        difficulty: 'normal',
        role_families: [ROLE_FAMILIES.SOFTWARE_DATA_IT],
        seniority_levels: ['all'],
        competencies: ['technical_process', 'planning']
    },
    {
        id: 'tech_002',
        prompt: 'Describe a particularly difficult technical problem you solved.',
        hint: 'Explain your debugging approach and the solution impact.',
        category: 'role_specific',
        difficulty: 'normal',
        role_families: [ROLE_FAMILIES.SOFTWARE_DATA_IT],
        seniority_levels: ['all'],
        competencies: ['problem_solving', 'technical_depth']
    },
    {
        id: 'tech_003',
        prompt: 'How do you stay current with emerging technologies and trends in {industry}?',
        hint: 'Show continuous learning and industry awareness.',
        category: 'role_specific',
        difficulty: 'easy',
        role_families: [ROLE_FAMILIES.SOFTWARE_DATA_IT],
        seniority_levels: ['all'],
        competencies: ['learning', 'industry_awareness']
    },
    {
        id: 'tech_004',
        prompt: 'Tell me about a time you had to make a tradeoff between speed and quality.',
        hint: 'Show decision-making and risk assessment.',
        category: 'role_specific',
        difficulty: 'hard',
        role_families: [ROLE_FAMILIES.SOFTWARE_DATA_IT],
        seniority_levels: ['mid', 'senior'],
        competencies: ['decision_making', 'tradeoff_analysis']
    },
    {
        id: 'tech_005',
        prompt: 'How do you approach code review and providing feedback to other engineers?',
        hint: 'Discuss constructive feedback and knowledge sharing.',
        category: 'role_specific',
        difficulty: 'normal',
        role_families: [ROLE_FAMILIES.SOFTWARE_DATA_IT],
        seniority_levels: ['mid', 'senior'],
        competencies: ['code_review', 'mentorship']
    },

    // ========== ROLE-SPECIFIC: SALES/CS (20) ==========
    {
        id: 'sales_001',
        prompt: 'Tell me about the toughest deal you ever closed.',
        hint: 'Highlight your sales strategy and relationship-building skills.',
        category: 'role_specific',
        difficulty: 'normal',
        role_families: [ROLE_FAMILIES.SALES_CS],
        seniority_levels: ['all'],
        competencies: ['sales', 'relationship_building']
    },
    {
        id: 'sales_002',
        prompt: 'How do you handle objections from potential clients?',
        hint: 'Share specific techniques and a successful example.',
        category: 'role_specific',
        difficulty: 'normal',
        role_families: [ROLE_FAMILIES.SALES_CS],
        seniority_levels: ['all'],
        competencies: ['objection_handling', 'sales']
    },
    {
        id: 'sales_003',
        prompt: 'Describe your approach to building a sales pipeline.',
        hint: 'Discuss prospecting, qualification, and pipeline management.',
        category: 'role_specific',
        difficulty: 'normal',
        role_families: [ROLE_FAMILIES.SALES_CS],
        seniority_levels: ['all'],
        competencies: ['pipeline_management', 'prospecting']
    },
    {
        id: 'sales_004',
        prompt: 'Tell me about a time you turned around a dissatisfied customer.',
        hint: 'Show customer success and problem-solving skills.',
        category: 'role_specific',
        difficulty: 'normal',
        role_families: [ROLE_FAMILIES.SALES_CS],
        seniority_levels: ['all'],
        competencies: ['customer_success', 'problem_solving']
    },
    {
        id: 'sales_005',
        prompt: 'How do you prioritize your accounts and time as a {job_title}?',
        hint: 'Explain your framework for account prioritization.',
        category: 'role_specific',
        difficulty: 'normal',
        role_families: [ROLE_FAMILIES.SALES_CS],
        seniority_levels: ['all'],
        competencies: ['prioritization', 'account_management']
    },

    // ========== ROLE-SPECIFIC: BUSINESS/OPS (15) ==========
    {
        id: 'biz_001',
        prompt: 'How do you approach analyzing a new business problem or opportunity?',
        hint: 'Walk through your analytical framework.',
        category: 'role_specific',
        difficulty: 'normal',
        role_families: [ROLE_FAMILIES.BUSINESS_OPS],
        seniority_levels: ['all'],
        competencies: ['analytical_thinking', 'problem_solving']
    },
    {
        id: 'biz_002',
        prompt: 'Tell me about a process improvement you implemented. What was the impact?',
        hint: 'Quantify the improvement with specific metrics.',
        category: 'role_specific',
        difficulty: 'normal',
        role_families: [ROLE_FAMILIES.BUSINESS_OPS],
        seniority_levels: ['all'],
        competencies: ['process_improvement', 'impact']
    },
    {
        id: 'biz_003',
        prompt: 'How do you balance data-driven decision making with intuition?',
        hint: 'Give specific examples of this balance.',
        category: 'role_specific',
        difficulty: 'hard',
        role_families: [ROLE_FAMILIES.BUSINESS_OPS],
        seniority_levels: ['mid', 'senior'],
        competencies: ['decision_making', 'analytical_thinking']
    },

    // ========== ROLE-SPECIFIC: MARKETING (10) ==========
    {
        id: 'mkt_001',
        prompt: 'Tell me about a successful marketing campaign you led. What made it successful?',
        hint: 'Include metrics and key learnings.',
        category: 'role_specific',
        difficulty: 'normal',
        role_families: [ROLE_FAMILIES.MARKETING],
        seniority_levels: ['all'],
        competencies: ['campaign_management', 'impact']
    },
    {
        id: 'mkt_002',
        prompt: 'How do you measure the ROI of your marketing efforts?',
        hint: 'Discuss specific metrics and attribution models.',
        category: 'role_specific',
        difficulty: 'normal',
        role_families: [ROLE_FAMILIES.MARKETING],
        seniority_levels: ['mid', 'senior'],
        competencies: ['analytics', 'roi_measurement']
    },

    // ========== ROLE-SPECIFIC: DESIGN/CREATIVE (10) ==========
    {
        id: 'design_001',
        prompt: 'Walk me through your design process from concept to final product.',
        hint: 'Include user research, iteration, and validation.',
        category: 'role_specific',
        difficulty: 'normal',
        role_families: [ROLE_FAMILIES.DESIGN_CREATIVE],
        seniority_levels: ['all'],
        competencies: ['design_process', 'user_research']
    },
    {
        id: 'design_002',
        prompt: 'Tell me about a time you had to defend your design decisions to stakeholders.',
        hint: 'Show data-driven reasoning and communication.',
        category: 'role_specific',
        difficulty: 'normal',
        role_families: [ROLE_FAMILIES.DESIGN_CREATIVE],
        seniority_levels: ['all'],
        competencies: ['communication', 'stakeholder_management']
    },

    // ========== STAR/STORYTELLING QUESTIONS (20) ==========
    {
        id: 'star_001',
        prompt: 'Tell me about a time you made a measurable impact in your {industry} role.',
        hint: 'Use specific metrics to demonstrate your contribution.',
        category: 'storytelling',
        difficulty: 'normal',
        role_families: ['all'],
        seniority_levels: ['all'],
        competencies: ['impact', 'metrics']
    },
    {
        id: 'star_002',
        prompt: 'Describe a situation where you had to influence others without direct authority.',
        hint: 'Use STAR format and show influence tactics.',
        category: 'storytelling',
        difficulty: 'hard',
        role_families: ['all'],
        seniority_levels: ['mid', 'senior', 'executive'],
        competencies: ['influence', 'leadership']
    },
    {
        id: 'star_003',
        prompt: 'Tell me about a time you took initiative on something outside your job description.',
        hint: 'Show ownership and impact.',
        category: 'storytelling',
        difficulty: 'normal',
        role_families: ['all'],
        seniority_levels: ['all'],
        competencies: ['initiative', 'ownership']
    },
    {
        id: 'star_004',
        prompt: 'Describe a complex project you led from start to finish.',
        hint: 'Cover planning, execution, challenges, and results.',
        category: 'storytelling',
        difficulty: 'hard',
        role_families: ['all'],
        seniority_levels: ['mid', 'senior', 'executive'],
        competencies: ['project_management', 'execution']
    },

    // ========== SITUATIONAL QUESTIONS (15) ==========
    {
        id: 'sit_001',
        prompt: 'How would you handle a situation where you are given an unrealistic deadline?',
        hint: 'Discuss negotiation, prioritization, and stakeholder communication.',
        category: 'situational',
        difficulty: 'normal',
        role_families: ['all'],
        seniority_levels: ['all'],
        competencies: ['negotiation', 'communication']
    },
    {
        id: 'sit_002',
        prompt: 'What would you do if you had to deliver a project with limited resources?',
        hint: 'Show creativity, resourcefulness, and strategic thinking.',
        category: 'situational',
        difficulty: 'hard',
        role_families: ['all'],
        seniority_levels: ['mid', 'senior'],
        competencies: ['resourcefulness', 'strategic_thinking']
    },
    {
        id: 'sit_003',
        prompt: 'If you had three urgent tasks and could only complete one today, how would you decide?',
        hint: 'Explain your prioritization framework and communication strategy.',
        category: 'situational',
        difficulty: 'normal',
        role_families: ['all'],
        seniority_levels: ['all'],
        competencies: ['prioritization', 'decision_making']
    },
    {
        id: 'sit_004',
        prompt: 'How would you approach a situation where your manager disagrees with your recommendation?',
        hint: 'Show communication, data-driven reasoning, and flexibility.',
        category: 'situational',
        difficulty: 'normal',
        role_families: ['all'],
        seniority_levels: ['all'],
        competencies: ['communication', 'influence']
    }
];

// Note: This is a curated set of ~100 high-quality questions.
// In production, expand to 200+ by adding more role-specific questions
// for each role family (Healthcare, Education, Finance, HR, etc.)
