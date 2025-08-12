const { verifyToken } = require('../utils/auth');
const { db } = require('../utils/db');

const authenticateTeam = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = new Error('No token provided');
      error.name = 'AuthenticationError';
      return next(error);
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    const decoded = verifyToken(token);
    
    if (!decoded.teamId) {
      const error = new Error('Invalid token payload');
      error.name = 'AuthenticationError';
      return next(error);
    }
    
    const team = await db('teams')
      .where({ id: decoded.teamId })
      .andWhere({ is_active: true })
      .first();
    
    if (!team) {
      const error = new Error('Team not found or inactive');
      error.name = 'AuthenticationError';
      return next(error);
    }
    
    await db('teams')
      .where({ id: team.id })
      .update({ 
        last_activity: db.fn.now() 
      });
    
    req.team = {
      id: team.id,
      name: team.team_name,
      contestCode: team.contest_code,
      registeredAt: team.registered_at,
      lastActivity: new Date()
    };
    
    next();
  } catch (error) {
    if (error.name === 'AuthenticationError') {
      return next(error);
    }
    
    const authError = new Error('Token verification failed');
    authError.name = 'AuthenticationError';
    next(authError);
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (decoded.teamId) {
      const team = await db('teams')
        .where({ id: decoded.teamId })
        .andWhere({ is_active: true })
        .first();
      
      if (team) {
        req.team = {
          id: team.id,
          name: team.team_name,
          contestCode: team.contest_code,
          registeredAt: team.registered_at,
          lastActivity: team.last_activity
        };
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  authenticateTeam,
  optionalAuth
};