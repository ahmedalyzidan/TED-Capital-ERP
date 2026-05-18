const pool = require('../config/db');

/**
 * Data Isolation Middleware
 * Ensures users only see data related to their linked company or project.
 * Admins/SuperAdmins bypass this restriction.
 */
const isolateData = (req, res, next) => {
    const isMtayem = req.user && req.user.username && req.user.username.toUpperCase() === 'MTAYEM';
    const isMsobhi = req.user && req.user.username && req.user.username.toUpperCase() === 'MSOBHI';
    if (isMtayem) {
        req.companyFilter = 'TED Capital';
        req.projectFilter = '';
        req.queryValues = [];
        req.isolation = {
            company: 'TED Capital',
            project: '',
            sql: ` AND (company IN ('TED Capital', 'PRIMEMED PHARMA', 'TED CAPITAL', 'Primemed Pharma', 'TED Capital ERP') OR company IS NULL)`,
            params: []
        };
        return next();
    }
    if (isMsobhi) {
        req.companyFilter = 'Design Concept';
        req.projectFilter = '';
        req.queryValues = [];
        req.isolation = {
            company: 'Design Concept',
            project: '',
            sql: ` AND (company IN ('Design Concept', 'DESIGN CONCEPT', 'ديزاين كونسبت', 'ديزاين كونسيبت') OR company IS NULL)`,
            params: []
        };
        return next();
    }

    // 1. Skip isolation for Super Admins
    if (!req.user.linkedCompany) {
        req.companyFilter = '';
        req.projectFilter = '';
        req.queryValues = [];
        return next();
    }

    // 2. Prepare SQL fragments for isolation
    const company = req.user.linkedCompany;
    const project = req.user.linkedProject;

    // We store these in req so controllers can easily append them to queries
    req.isolation = {
        company: company,
        project: project,
        sql: ` AND (company = $${req.queryValues?.length + 1 || 1} OR company IS NULL)`,
        params: [company]
    };

    // If project is also restricted
    if (project) {
        req.isolation.sql += ` AND (project_name = $${req.isolation.params.length + 1} OR project_name IS NULL)`;
        req.isolation.params.push(project);
    }

    next();
};

module.exports = { isolateData };
