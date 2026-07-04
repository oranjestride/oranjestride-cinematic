// ============================================================================
// content.js — single source of truth for all site copy (build prompt §1, §5).
// Edit copy here; section modules in src/sections/ consume these constants.
// ============================================================================

export const brand = {
  name: 'OranjeStride',
  motto: 'From data to decisions. From decisions to outcomes.',
  tagline: 'Stride into Decision Intelligence',
  legal: 'OranjeStride Consultancy Pvt. Ltd.',
};

export const nav = {
  links: [
    { id: 'about', label: 'About' },
    { id: 'expertise', label: 'Expertise' },
    { id: 'programmes', label: 'Programmes' },
    { id: 'consulting', label: 'Consulting' },
    { id: 'tour', label: 'India Tour' },
    { id: 'clients', label: 'Clients' },
    { id: 'contact', label: 'Contact' },
  ],
  // section id → short dot label (includes interstitials)
  dots: {
    hero: 'Hero', stats: 'Impact', about: 'About', expertise: 'Expertise',
    testimonials: 'Voices', 'mascot-lab': 'Mascot', programmes: 'Programmes',
    consulting: 'Consulting', tour: 'India Tour', clients: 'Clients', contact: 'Contact',
  },
};

export const hero = {
  video: 'hero-opening',
  eyebrow: 'Generative AI · Machine Learning · Analytics',
  headlineA: 'Stride into ',
  headlineAccent: 'Decision Intelligence',
  subhead: "India's premier Gen AI & Data Science training consultancy — turning complex algorithms into competitive advantage for professionals, executives, and institutions.",
  ctaPrimary: { label: 'Explore Programmes', target: '#programmes' },
  ctaSecondary: { label: 'Talk to Us', target: '#contact' },
};

export const stats = [
  { value: 1000, decimals: 0, suffix: '+', label: 'Professionals & Students Trained' },
  { value: 4.8, decimals: 1, suffix: '/5', label: 'Average Feedback Score' },
  { value: 90, decimals: 0, suffix: '%+', label: 'Post-Training Skill Adoption' },
  { value: 15, decimals: 0, suffix: '+', label: 'Premier Institutional Clients' },
];

export const about = {
  // Video retired — the About visual is now the live/flat character mascot (§1).
  label: 'About OranjeStride',
  headA: 'Nothing Is ',
  headAccent: 'Unattainable',
  principles: [
    { n: '01', h: 'Relevance With Industry', p: 'Curriculum crafted by practitioners mapped to real job roles in AI, Data Engineering, and Analytics.' },
    { n: '02', h: 'Expert Experienced Faculty', p: 'Dedicated data scientists and educators with hundreds of hours of live training delivery across elite institutions.' },
    { n: '03', h: 'Analytics For All', p: 'Case-study methodology ensuring participants from finance, ops, and HR grasp practical applications immediately.' },
    { n: '04', h: 'Certified Analytics Professional', p: 'Our OAP certification helps professionals stand apart in a crowded talent market.' },
  ],
};

export const expertise = {
  video: 'expertise-array',
  label: 'What We Do',
  headA: 'Areas of Deep ',
  headAccent: 'Expertise',
  sub: 'End-to-end capability across the modern AI stack — from foundational statistics to cutting-edge agentic systems.',
  cards: [
    { prop: 'brain', h: 'Generative AI & Agentic AI', p: 'LLMs, prompt engineering, RAG architectures, AI agents, autonomous workflows.', tags: ['LLMs', 'RAG', 'Agents', 'Prompt Eng.'] },
    { prop: 'chip', h: 'Machine Learning & Statistical Modeling', p: 'Supervised & unsupervised learning, regression, classification, ensemble methods, interpretability.', tags: ['Scikit-learn', 'XGBoost', 'Python/R', 'Stats'] },
    { prop: 'gem', h: 'Data Science & Advanced Analytics', p: 'End-to-end pipelines, EDA, feature engineering, fraud detection, risk scoring, forecasting.', tags: ['Pandas', 'SQL', 'Forecasting', 'A/B Testing'] },
    { prop: 'chart', h: 'Business Intelligence & Visualization', p: 'Tableau, Power BI, Python viz labs, executive dashboards.', tags: ['Tableau', 'Power BI', 'Plotly', 'Dashboards'] },
    { prop: 'arrow', h: 'Corporate & Executive AI Strategy', p: 'Workshops for C-suite on AI adoption, ROI mapping, transformation roadmaps.', tags: ['Strategy', 'AI Roadmap', 'Change Mgmt'] },
    { prop: 'node', h: 'Deep Learning & Neural Networks', p: 'CNNs, RNNs, Transformers, computer vision.', tags: ['TensorFlow', 'PyTorch', 'Transformers', 'CV'] },
  ],
};

export const testimonials = {
  label: 'What Learners Say',
  headA: 'Results That ',
  headAccent: 'Speak',
  items: [
    { initial: 'D', quote: 'When theoretical concepts go hand in hand with practical implementation, the mind forces itself to explore beyond the vanilla concepts.', name: 'Dilpreet', org: 'Sopra Steria' },
    { initial: 'A', quote: 'One of the best teachers I have ever had... you make difficult things easy to understand.', name: 'Ashish Aggarwal', org: 'Shri Vishwakarma Skill University' },
    { initial: 'L', quote: 'A great hands-on introduction to ML... The R & Python coverage is exceptional and immediately actionable.', name: 'Lakshay Guglani', org: 'Maharaja Agrasen College of Engg.' },
  ],
};

// Interstitial · Mascot Lab — spotlight card with the live 3D character (§6).
export const mascotLab = {
  label: 'Interactive 3D',
  headA: 'Meet the ',
  headAccent: 'Stride Runner',
  sub: 'The OranjeStride mark, brought to life — a fully rigged 3D character rendered live in your browser, carrying the momentum we build into every programme.',
  hint: 'Take him for a spin:',
  clips: [
    { clip: 'wave', label: 'Wave' },
    { clip: 'run', label: 'Run' },
    { clip: 'cheer', label: 'Clap' },
  ],
};

export const programmes = {
  video: 'programmes-ascent',
  label: 'Programmes',
  headA: 'Our Training ',
  headAccent: 'Streams',
  sub: "Three streams, one goal — turning knowledge into real capability. Each is built for a specific audience, delivered by people who've done the work, not just taught it.",
  cert: 'Certificate jointly signed by OranjeStride & a university of repute in India.',
  tabs: [
    {
      id: 'corporate', label: 'Corporate & Leadership',
      steps: [
        { h: 'Sector Tracks', p: 'Banking & Financial Services (Credit Risk, Fraud ML, Forecasting, Gen AI), Healthcare & Pharma, Insurance (Claims AI, Churn, Risk Pricing), FMCG & Retail (Demand Forecast, CLV, Supply Chain AI), Government & Public Sector, Media/Tech/Telecom.' },
        { h: 'Leadership Tracks', p: 'AI for Leaders — Strategic Fluency (flagship); AI Adoption Roadmap Workshop; Executive Analytics for Decision-Makers; Strategic Innovation with AI.' },
        { h: 'Generative AI & Agentic AI Bootcamp', flagship: true, p: 'LLMs, RAG, Prompt Engineering, MCP, Deployment.' },
      ],
    },
    {
      id: 'university', label: 'University & College',
      steps: [
        { h: 'Undergraduate Track', p: 'Data Analytics for Undergraduates (Excel → MySQL → Tableau/Power BI → Python → Business Stats → capstone).', cert: true },
        { h: 'Postgraduate / MBA Track', p: 'Business Analytics & ML for Managers (Python, regression, ML, credit/churn/revenue modelling, capstone).', cert: true },
        { h: 'Generative AI & Agentic AI Bootcamp', flagship: true, p: 'LLMs, RAG, Prompt Engineering, MCP, Deployment — for UG/PG cohorts.' },
      ],
    },
  ],
};

export const consulting = {
  video: 'consulting-vault',
  label: 'Consulting Practice',
  headA: 'Data & Analytics ',
  headAccent: 'Consulting',
  sub: 'Beyond training, OranjeStride brings deep domain expertise to complex analytical problems — working with quant firms, sovereign funds, and government research bodies on high-stakes data challenges.',
  items: [
    { prop: 'chart', h: 'Quant Research & Risk Analytics', p: 'Statistical modeling, factor analysis, risk scoring, backtesting → portfolio analytics.' },
    { prop: 'chip', h: 'Financial Forecasting & Fraud Detection', p: 'ML fraud detection, credit risk models, forecasting pipelines.' },
    { prop: 'node', h: 'Government & Policy Research Analytics', p: 'Analytics roadmaps, data governance, policy impact modeling.' },
  ],
  hudTitle: 'Engagement Metrics',
  metrics: [
    { label: 'Post-training technique adoption', value: '90%+' },
    { label: 'Within-30-day application rate', value: '90%+' },
    { label: 'Post-session community engagement', value: '90%+' },
    { label: 'Average cohort completion', value: '85%+' },
    { label: 'Sustained feedback', value: '4.8/5' },
  ],
  bars: [
    { label: 'Learner Satisfaction', value: 96 },
    { label: 'Completion Rate', value: 85 },
    { label: 'Skill Adoption', value: 90 },
  ],
};

export const tour = {
  video: 'india-tour-globe',
  label: 'International Programme',
  headA: 'India AI ',
  headAccent: 'Learning Tour',
  sub: 'Experience AI & Data Science education at its source. An immersive learning journey in India — combining world-class curriculum, hands-on labs, and the academic credibility of a co-signed certificate from a university of repute in India.',
  features: [
    { h: 'Come to India. Learn at the Source.', p: 'Structured, immersive programme on a partner university campus or executive training facility.' },
    { h: 'Practitioner-Led Curriculum', p: 'OranjeStride faculty with live corporate experience (Accenture, EXL Services, global financial institutions). No pre-recorded content.' },
    { h: 'Hands-On Labs & Real Projects', p: "Real datasets from participants' own sectors (banking, insurance, government, FMCG); leave with deployable code/dashboards." },
    { h: 'Cultural Immersion + Networking', p: 'Campus visits, industry interfaces, peer cohorts from across the globe.' },
    { h: 'University-Backed Certificate', p: 'Jointly signed by OranjeStride & a university of repute in India.' },
  ],
};

export const clients = {
  video: 'clients-monument',
  label: 'Our Reach',
  headA: 'Trusted By Elite ',
  headAccent: 'Institutions',
  sub: "From India's premier management schools to Fortune 500 leadership teams and government ministries — OranjeStride's programmes build capability where it matters most.",
  cta: 'View Our Clients & Partners',
  hint: '16 organisations across academia, enterprise & government — explore the full roster.',
  // Roster from legacy content source. Logos rendered as wordmark cards
  // (no logo image files were shipped); rel = hover caption (§7).
  roster: [
    { n: 'IIM Visakhapatnam', t: 'Management School', c: 'academic', rel: 'Postgraduate analytics cohort partner' },
    { n: 'IIM Sambalpur', t: 'Management School', c: 'academic', rel: 'MBA business-analytics faculty engagement' },
    { n: 'Christ University', t: 'University', c: 'academic', rel: 'Undergraduate data-analytics programme' },
    { n: 'ISBF', t: 'Business School', c: 'academic', rel: 'Applied ML elective delivery' },
    { n: 'Great Learning', t: 'Ed-Tech Platform', c: 'academic', rel: 'Curriculum & live-session partner' },
    { n: 'NIIT', t: 'Training Institute', c: 'academic', rel: 'Corporate upskilling collaborator' },
    { n: 'Imarticus', t: 'Training Institute', c: 'academic', rel: 'Data science bootcamp faculty' },
    { n: 'IMS Proschool', t: 'Training Institute', c: 'academic', rel: 'Analytics certification partner' },
    { n: 'EduEdgePro', t: 'Ed-Tech Platform', c: 'academic', rel: 'Gen AI content collaboration' },
    { n: 'EY (Ernst & Young)', t: 'Big 4 Consulting', c: 'corporate', rel: 'Executive AI-strategy workshops' },
    { n: 'Hexaware Technologies', t: 'IT Enterprise', c: 'corporate', rel: 'ML upskilling for delivery teams' },
    { n: 'Havells India', t: 'Manufacturing', c: 'corporate', rel: 'Analytics for operations leadership' },
    { n: 'Colt Technology', t: 'Telecom', c: 'corporate', rel: 'Data science enablement programme' },
    { n: 'Room to Read', t: 'NGO / Social Sector', c: 'corporate', rel: 'Impact-analytics capacity building' },
    { n: 'Bennett & Coleman', t: 'Media Group', c: 'corporate', rel: 'Newsroom analytics training' },
    { n: 'AJNIFM (Govt. of India)', t: 'Government Ministry', c: 'corporate', rel: 'Public-sector AI research advisory' },
  ],
};

export const contact = {
  video: 'closing-emblem',
  label: 'Get In Touch',
  headA: "Let's Build ",
  headAccent: 'Outcomes',
  headB: ' Together',
  sub: "Whether you're an institution designing a curriculum, a company upskilling teams, or a fund needing analytics depth — we'd love to hear from you.",
  trust: ['Practitioner-Led', 'University-Backed Certificate', '1000+ Trained', '4.8/5 Rated'],
  tokens: [
    { icon: 'mail', strong: 'contactus@oranjestride.com', span: 'Email us' },
    { icon: 'phone', strong: '+91 93117 90400', span: 'Call us' },
    { icon: 'pin', strong: 'Safdarjung Enclave, New Delhi', span: 'India' },
  ],
  formAction: 'https://formspree.io/f/mjgaovpl',
  enquiryOptions: [
    'Corporate AI / ML Training - Banking & Finance',
    'Corporate AI / ML Training - Healthcare & Pharma',
    'Corporate AI / ML Training - Insurance',
    'Corporate AI / ML Training - FMCG & Retail',
    'Corporate AI / ML Training - Government & Public Sector',
    'Corporate AI / ML Training - Media, Tech & Telecom',
    'University Partnership - Undergraduate Programme',
    'University Partnership - Postgraduate / MBA Programme',
    'C-Suite & Leadership Workshop',
    'Blue Ocean Strategy + AI Workshop',
    'India AI Learning Tour',
    'Data & Analytics Consulting',
    'Quant / Fund Analytics',
    'Government Research Advisory',
    'Other',
  ],
};

export const datastride = {
  badge: '◆ DataStride',
  pill: 'New from OranjeStride',
  title: 'DataStride',
  subtitle: 'Interactive SQL Learning Platform by OranjeStride',
  desc: "Master SQL from the ground up through a fully browser-based, hands-on learning environment. DataStride is OranjeStride's dedicated platform for building real query-writing fluency — no installation, no setup. Write live SQL, solve business-scenario challenges, and progress from SELECT basics to advanced window functions and joins, all in one place.",
  features: [
    { ico: '⚡', h: 'Live SQL Editor', p: 'Write and run real SQL queries directly in your browser with instant feedback.' },
    { ico: '📚', h: 'Structured Curriculum', p: 'From SELECT & WHERE to JOINs, subqueries, aggregations, and window functions.' },
    { ico: '🎯', h: 'Business Challenges', p: 'Real-world datasets drawn from finance, retail, and HR to build job-ready skills.' },
  ],
  url: 'https://data-stride.vercel.app/',
};

export const ribbon = {
  text: 'New cohort enrolling — limited seats · India AI Learning Tour 2026',
};

// Brand-moment band (§6.2) — the one copy addition of the Marut build: a short
// eyebrow/headline pair over the soaring footage, in the hero's voice.
export const band = {
  video: 'mascot-soaring-banner',
  eyebrow: 'The Mark in Motion',
  headA: 'Carry the ',
  headAccent: 'Momentum',
  dots: { brand: 'Stride' },
};
