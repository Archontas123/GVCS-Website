const { db } = require('../utils/db');

/**
 * Contest Template Service for managing reusable contest configurations
 * Provides predefined templates and custom template management
 */
class ContestTemplateService {
  /**
   * Initialize contest template service with default templates
   */
  constructor() {
    this.templates = new Map();
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default contest templates
   */
  initializeDefaultTemplates() {
    // Programming contest template
    this.templates.set('programming_contest', {
      name: 'Programming Contest',
      description: 'Standard programming contest format with ICPC-style scoring',
      settings: {
        duration: 300, // 5 hours
        freeze_time: 60, // 1 hour before end
        scoring_system: 'icpc',
        max_teams: 100,
        registration_required: true,
        show_standings: true,
        allow_clarifications: true,
        language_restrictions: ['cpp', 'java', 'python3'],
        problem_count_range: [8, 15],
        difficulty_distribution: {
          easy: 0.3,
          medium: 0.5,
          hard: 0.2
        }
      },
      problem_templates: [
        {
          type: 'implementation',
          difficulty: 'easy',
          time_limit: 1000,
          memory_limit: 256
        },
        {
          type: 'data_structures',
          difficulty: 'medium',
          time_limit: 2000,
          memory_limit: 512
        },
        {
          type: 'algorithms',
          difficulty: 'hard',
          time_limit: 3000,
          memory_limit: 1024
        }
      ]
    });

    // Educational template
    this.templates.set('educational', {
      name: 'Educational Contest',
      description: 'Learning-focused contest with hints and tutorials',
      settings: {
        duration: 120, // 2 hours
        freeze_time: 0, // No freeze
        scoring_system: 'educational',
        max_teams: 50,
        registration_required: false,
        show_standings: true,
        allow_clarifications: true,
        hints_enabled: true,
        tutorial_links: true,
        language_restrictions: null,
        problem_count_range: [4, 8],
        difficulty_distribution: {
          easy: 0.6,
          medium: 0.3,
          hard: 0.1
        }
      }
    });

    // Speed programming template
    this.templates.set('speed', {
      name: 'Speed Programming',
      description: 'Fast-paced contest with simple problems',
      settings: {
        duration: 60, // 1 hour
        freeze_time: 0,
        scoring_system: 'time_based',
        max_teams: 200,
        registration_required: false,
        show_standings: true,
        allow_clarifications: false,
        language_restrictions: ['cpp', 'python3'],
        problem_count_range: [6, 10],
        difficulty_distribution: {
          easy: 0.8,
          medium: 0.2,
          hard: 0.0
        }
      }
    });

    // Marathon/optimization template
    this.templates.set('marathon', {
      name: 'Marathon Contest',
      description: 'Long-duration optimization contest',
      settings: {
        duration: 1440, // 24 hours
        freeze_time: 120, // 2 hours before end
        scoring_system: 'optimization',
        max_teams: 50,
        registration_required: true,
        show_standings: true,
        allow_clarifications: true,
        submission_limit: 50,
        language_restrictions: null,
        problem_count_range: [1, 3],
        difficulty_distribution: {
          easy: 0.0,
          medium: 0.3,
          hard: 0.7
        }
      }
    });
  }

  /**
   * Get all available templates including built-in and custom ones
   * @returns {Array<Object>} Array of template objects with id and configuration
   */
  getTemplates() {
    return Array.from(this.templates.entries()).map(([id, template]) => ({
      id,
      ...template
    }));
  }

  /**
   * Get a specific template by ID
   * @param {string} templateId - Template identifier
   * @returns {Object|undefined} Template object or undefined if not found
   */
  getTemplate(templateId) {
    return this.templates.get(templateId);
  }

  /**
   * Create contest from template with merged settings
   * @param {string} templateId - Template identifier
   * @param {Object} contestData - Contest-specific data
   * @param {number} adminId - Admin user ID
   * @returns {Promise<Object>} Created contest object
   * @throws {Error} When template not found or creation fails
   */
  async createContestFromTemplate(templateId, contestData, adminId) {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    try {
      // Merge template settings with provided data
      const contest = {
        contest_name: contestData.contest_name,
        description: contestData.description || template.description,
        start_time: contestData.start_time,
        duration: contestData.duration || template.settings.duration,
        freeze_time: contestData.freeze_time !== undefined ? contestData.freeze_time : template.settings.freeze_time,
        status: 'upcoming',
        template_id: templateId,
        settings: {
          ...template.settings,
          ...contestData.settings
        },
        created_by: adminId,
        created_at: new Date().toISOString()
      };

      // Create contest in database
      const result = await db('contests').insert(contest).returning('*');
      const createdContest = result[0];

        contestId: createdContest.id,
        template: templateId,
        adminId
      });

      return createdContest;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Save custom template
   */
  async saveTemplate(templateData, adminId) {
    try {
      const template = {
        name: templateData.name,
        description: templateData.description,
        settings: JSON.stringify(templateData.settings),
        problem_templates: JSON.stringify(templateData.problem_templates || []),
        created_by: adminId,
        created_at: new Date().toISOString(),
        is_custom: true
      };

      const result = await db('contest_templates').insert(template).returning('*');
      const savedTemplate = result[0];

      // Add to in-memory templates
      this.templates.set(`custom_${savedTemplate.id}`, {
        ...templateData,
        id: savedTemplate.id,
        is_custom: true
      });

        templateId: savedTemplate.id,
        name: templateData.name,
        adminId
      });

      return savedTemplate;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Load custom templates from database
   */
  async loadCustomTemplates() {
    try {
      const customTemplates = await db('contest_templates')
        .where({ is_custom: true })
        .select('*');

      customTemplates.forEach(template => {
        this.templates.set(`custom_${template.id}`, {
          id: template.id,
          name: template.name,
          description: template.description,
          settings: JSON.parse(template.settings),
          problem_templates: JSON.parse(template.problem_templates || '[]'),
          is_custom: true,
          created_by: template.created_by,
          created_at: template.created_at
        });
      });

    } catch (error) {
    }
  }

  /**
   * Clone existing contest as template
   */
  async cloneContestAsTemplate(contestId, templateName, adminId) {
    try {
      const contest = await db('contests')
        .where({ id: contestId })
        .first();

      if (!contest) {
        throw new Error('Contest not found');
      }

      const problems = await db('problems')
        .where({ contest_id: contestId })
        .select('*');

      const templateData = {
        name: templateName,
        description: `Cloned from contest: ${contest.contest_name}`,
        settings: {
          duration: contest.duration,
          freeze_time: contest.freeze_time,
          scoring_system: contest.settings?.scoring_system || 'icpc',
          max_teams: contest.settings?.max_teams || 100,
          registration_required: contest.settings?.registration_required || true,
          show_standings: contest.settings?.show_standings !== false,
          allow_clarifications: contest.settings?.allow_clarifications !== false
        },
        problem_templates: problems.map(problem => ({
          type: problem.category || 'implementation',
          difficulty: problem.difficulty || 'medium',
          time_limit: problem.time_limit,
          memory_limit: problem.memory_limit,
          title_template: problem.title,
          description_template: problem.description
        }))
      };

      return await this.saveTemplate(templateData, adminId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate problems from template
   */
  async generateProblemsFromTemplate(contestId, templateId) {
    const template = this.getTemplate(templateId);
    if (!template || !template.problem_templates) {
      return [];
    }

    try {
      const problems = [];
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      
      for (let i = 0; i < template.problem_templates.length; i++) {
        const problemTemplate = template.problem_templates[i];
        
        const problem = {
          contest_id: contestId,
          problem_letter: letters[i],
          title: problemTemplate.title_template || `Problem ${letters[i]}`,
          description: problemTemplate.description_template || 'Problem description here...',
          input_format: 'Input format description',
          output_format: 'Output format description',
          sample_input: '',
          sample_output: '',
          constraints: 'Constraints description',
          time_limit: problemTemplate.time_limit || 1000,
          memory_limit: problemTemplate.memory_limit || 256,
          difficulty: problemTemplate.difficulty || 'medium',
          category: problemTemplate.type || 'implementation',
          points: this.calculatePoints(problemTemplate.difficulty),
          created_at: new Date().toISOString()
        };

        problems.push(problem);
      }

      if (problems.length > 0) {
        await db('problems').insert(problems);
          contestId,
          templateId
        });
      }

      return problems;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Calculate points based on difficulty
   */
  calculatePoints(difficulty) {
    const pointsMap = {
      easy: 100,
      medium: 200,
      hard: 300,
      expert: 500
    };
    return pointsMap[difficulty] || 100;
  }

  /**
   * Validate template data
   */
  validateTemplate(templateData) {
    const errors = [];

    if (!templateData.name || templateData.name.trim().length === 0) {
      errors.push('Template name is required');
    }

    if (!templateData.settings) {
      errors.push('Template settings are required');
    } else {
      if (!templateData.settings.duration || templateData.settings.duration <= 0) {
        errors.push('Valid duration is required');
      }

      if (templateData.settings.freeze_time < 0) {
        errors.push('Freeze time cannot be negative');
      }

      if (templateData.settings.max_teams && templateData.settings.max_teams <= 0) {
        errors.push('Max teams must be positive');
      }
    }

    return errors;
  }

  /**
   * Get template usage statistics
   */
  async getTemplateUsage(templateId) {
    try {
      const usage = await db('contests')
        .where({ template_id: templateId })
        .count('* as count')
        .first();

      const recentUsage = await db('contests')
        .where({ template_id: templateId })
        .where('created_at', '>', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .count('* as count')
        .first();

      return {
        total_usage: parseInt(usage.count),
        recent_usage: parseInt(recentUsage.count),
        last_used: await db('contests')
          .where({ template_id: templateId })
          .max('created_at as last_used')
          .first()
      };
    } catch (error) {
      return { total_usage: 0, recent_usage: 0, last_used: null };
    }
  }

  /**
   * Delete custom template
   */
  async deleteTemplate(templateId, adminId) {
    if (!templateId.startsWith('custom_')) {
      throw new Error('Cannot delete built-in template');
    }

    try {
      const numericId = templateId.replace('custom_', '');
      
      // Check if template is in use
      const usage = await this.getTemplateUsage(templateId);
      if (usage.total_usage > 0) {
        throw new Error('Cannot delete template that is in use');
      }

      await db('contest_templates')
        .where({ id: numericId })
        .delete();

      this.templates.delete(templateId);

        templateId,
        adminId
      });

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Import template from JSON
   */
  async importTemplate(templateJson, adminId) {
    try {
      const templateData = JSON.parse(templateJson);
      const errors = this.validateTemplate(templateData);
      
      if (errors.length > 0) {
        throw new Error(`Invalid template: ${errors.join(', ')}`);
      }

      return await this.saveTemplate(templateData, adminId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Export template to JSON
   */
  exportTemplate(templateId) {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    return JSON.stringify({
      name: template.name,
      description: template.description,
      settings: template.settings,
      problem_templates: template.problem_templates || []
    }, null, 2);
  }
}

module.exports = new ContestTemplateService();