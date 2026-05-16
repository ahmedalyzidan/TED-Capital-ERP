const pool = require('../config/db');

/**
 * Data Isolation Middleware
 * Ensures users only see data related to their linked company or project.
 * Admins/SuperAdmins bypass this restriction.
 */
const isolateData = (req, res, next) => {
    // 1. Skip isolation for Super Admins
    if (req.user.isSuperAdmin || !req.user.linkedCompany) {
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
