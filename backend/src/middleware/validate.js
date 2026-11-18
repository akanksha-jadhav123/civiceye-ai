function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };
}

// Express 5 makes req.query read-only, so parsed values go on req.validatedQuery.
function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
    }
    req.validatedQuery = result.data;
    next();
  };
}

// Validates :id style route params as positive integers.
function validateIdParams(...names) {
  const keys = names.length ? names : ['id'];
  return (req, res, next) => {
    for (const k of keys) {
      const v = req.params[k];
      if (!/^[1-9]\d{0,17}$/.test(String(v))) {
        return res.status(400).json({ success: false, error: `Invalid ${k}` });
      }
    }
    next();
  };
}

module.exports = { validateBody, validateQuery, validateIdParams };
