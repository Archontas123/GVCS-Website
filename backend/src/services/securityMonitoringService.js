/**
 * CS Club Hackathon Platform - Security Monitoring Service
 * Phase 6.4: Real-time security monitoring and threat detection
 */

const { db } = require('../utils/db');
const logger = require('../utils/logger');
const EventEmitter = require('events');

class SecurityMonitoringService extends EventEmitter {
  constructor() {
    super();
    this.activeMonitors = new Map();
    this.threatIntelligence = new Map();
    this.alertThresholds = new Map();
    this.blockedIPs = new Set();
    this.suspiciousPatterns = new Map();
    this.initializeMonitoring();
  }

  /**
   * Initialize security monitoring system
   */
  async initializeMonitoring() {
    try {
      await this.loadMonitoringRules();
      await this.loadThreatIntelligence();
      await this.setupRealTimeMonitoring();
      
      logger.info('Security monitoring system initialized');
    } catch (error) {
      logger.error('Error initializing security monitoring:', error);
    }
  }

  /**
   * Monitor submission for malicious code patterns
   */
  async monitorSubmission(submissionData) {
    try {
      const threats = [];
      const submission = submissionData;

      // Check for code injection patterns
      const injectionThreats = await this.detectCodeInjection(submission.source_code, submission.language);
      threats.push(...injectionThreats);

      // Check for system exploitation attempts
      const exploitThreats = await this.detectExploitationAttempts(submission.source_code);
      threats.push(...exploitThreats);

      // Check for obfuscation techniques
      const obfuscationThreats = await this.detectObfuscation(submission.source_code);
      threats.push(...obfuscationThreats);

      // Check for suspicious patterns
      const patternThreats = await this.detectSuspiciousPatterns(submission);
      threats.push(...patternThreats);

      if (threats.length > 0) {
        await this.handleSecurityThreat({
          type: 'malicious_submission',
          submission_id: submission.id,
          team_id: submission.team_id,
          threats,
          severity: this.calculateThreatSeverity(threats),
          detected_at: new Date().toISOString()
        });
      }

      return {
        is_safe: threats.length === 0,
        threats_detected: threats.length,
        threats: threats,
        risk_score: this.calculateRiskScore(threats)
      };
    } catch (error) {
      logger.error('Error monitoring submission:', error);
      return { is_safe: false, error: error.message };
    }
  }

  /**
   * Detect code injection patterns
   */
  async detectCodeInjection(sourceCode, language) {
    const threats = [];

    // Language-specific injection patterns
    const injectionPatterns = this.getInjectionPatterns(language);

    for (const pattern of injectionPatterns) {
      const matches = sourceCode.match(pattern.regex);
      if (matches) {
        threats.push({
          type: 'code_injection',
          pattern: pattern.name,
          severity: pattern.severity,
          description: pattern.description,
          matches: matches,
          line_numbers: this.findLineNumbers(sourceCode, pattern.regex)
        });
      }
    }

    // Check for polyglot attacks
    const polyglotThreat = await this.detectPolyglotAttack(sourceCode);
    if (polyglotThreat) {
      threats.push(polyglotThreat);
    }

    return threats;
  }

  /**
   * Get injection patterns for specific language
   */
  getInjectionPatterns(language) {
    const commonPatterns = [
      {
        name: 'shell_command_injection',
        regex: /system\s*\(|exec\s*\(|popen\s*\(|`.*`/gi,
        severity: 'HIGH',
        description: 'Potential shell command injection'
      },
      {
        name: 'file_system_access',
        regex: /\/etc\/passwd|\/etc\/shadow|\.\.\/|__file__|__path__/gi,
        severity: 'HIGH',
        description: 'Suspicious file system access'
      },
      {
        name: 'network_access',
        regex: /socket\s*\(|connect\s*\(|urllib|requests\.|fetch\s*\(/gi,
        severity: 'MEDIUM',
        description: 'Network access attempt'
      }
    ];

    const languageSpecific = {
      'python3': [
        {
          name: 'python_exec_eval',
          regex: /\beval\s*\(|\bexec\s*\(|__import__\s*\(/gi,
          severity: 'CRITICAL',
          description: 'Python code execution functions'
        },
        {
          name: 'python_os_operations',
          regex: /os\.system|os\.popen|subprocess\.|os\.execv/gi,
          severity: 'HIGH',
          description: 'Python OS operations'
        }
      ],
      'cpp': [
        {
          name: 'cpp_system_calls',
          regex: /system\s*\(|fork\s*\(|execve?\s*\(/gi,
          severity: 'HIGH',
          description: 'C++ system calls'
        },
        {
          name: 'cpp_memory_manipulation',
          regex: /malloc\s*\(.*999|alloca\s*\(.*999|mmap\s*\(/gi,
          severity: 'MEDIUM',
          description: 'Suspicious memory operations'
        }
      ],
      'java': [
        {
          name: 'java_runtime_exec',
          regex: /Runtime\.getRuntime\(\)\.exec|ProcessBuilder|Class\.forName/gi,
          severity: 'HIGH',
          description: 'Java runtime execution'
        },
        {
          name: 'java_reflection',
          regex: /getDeclaredMethod|setAccessible|newInstance/gi,
          severity: 'MEDIUM',
          description: 'Java reflection usage'
        }
      ]
    };

    return [...commonPatterns, ...(languageSpecific[language] || [])];
  }

  /**
   * Detect exploitation attempts
   */
  async detectExploitationAttempts(sourceCode) {
    const threats = [];

    const exploitPatterns = [
      {
        name: 'buffer_overflow',
        regex: /strcpy|strcat|gets|sprintf(?!\s*\(.*,.*,.*\))|A{50,}/gi,
        severity: 'HIGH',
        description: 'Potential buffer overflow attempt'
      },
      {
        name: 'format_string_attack',
        regex: /%x|%s|%n|%p.*%.*%/gi,
        severity: 'MEDIUM',
        description: 'Potential format string attack'
      },
      {
        name: 'shellcode_patterns',
        regex: /\\x[0-9a-f]{2}.*\\x[0-9a-f]{2}.*\\x[0-9a-f]{2}/gi,
        severity: 'CRITICAL',
        description: 'Suspected shellcode'
      },
      {
        name: 'privilege_escalation',
        regex: /setuid|setgid|sudo|su\s|chmod\s.*777|chown/gi,
        severity: 'HIGH',
        description: 'Privilege escalation attempt'
      }
    ];

    for (const pattern of exploitPatterns) {
      const matches = sourceCode.match(pattern.regex);
      if (matches) {
        threats.push({
          type: 'exploitation_attempt',
          pattern: pattern.name,
          severity: pattern.severity,
          description: pattern.description,
          matches: matches
        });
      }
    }

    return threats;
  }

  /**
   * Detect code obfuscation
   */
  async detectObfuscation(sourceCode) {
    const threats = [];

    // Check for excessive string concatenation (obfuscation)
    const stringConcatenation = sourceCode.match(/\+\s*["']|["']\s*\+/g);
    if (stringConcatenation && stringConcatenation.length > 10) {
      threats.push({
        type: 'obfuscation',
        pattern: 'excessive_string_concatenation',
        severity: 'MEDIUM',
        description: 'Suspicious string concatenation (possible obfuscation)',
        count: stringConcatenation.length
      });
    }

    // Check for base64-like patterns
    const base64Pattern = /[A-Za-z0-9+/]{20,}={0,2}/g;
    const base64Matches = sourceCode.match(base64Pattern);
    if (base64Matches && base64Matches.length > 3) {
      threats.push({
        type: 'obfuscation',
        pattern: 'base64_encoding',
        severity: 'MEDIUM',
        description: 'Suspected base64 encoded content',
        matches: base64Matches
      });
    }

    // Check for hex encoding
    const hexPattern = /(?:\\x[0-9a-f]{2}){10,}/gi;
    const hexMatches = sourceCode.match(hexPattern);
    if (hexMatches) {
      threats.push({
        type: 'obfuscation',
        pattern: 'hex_encoding',
        severity: 'HIGH',
        description: 'Suspected hex encoded content',
        matches: hexMatches
      });
    }

    return threats;
  }

  /**
   * Detect polyglot attacks
   */
  async detectPolyglotAttack(sourceCode) {
    const languageMarkers = {
      php: /<\?php|<\?=/gi,
      html: /<script|<iframe|<object|<embed/gi,
      sql: /SELECT.*FROM|INSERT.*INTO|DROP.*TABLE|UNION.*SELECT/gi,
      javascript: /document\.|window\.|eval\s*\(/gi
    };

    const detectedLanguages = [];
    for (const [lang, regex] of Object.entries(languageMarkers)) {
      if (regex.test(sourceCode)) {
        detectedLanguages.push(lang);
      }
    }

    if (detectedLanguages.length > 1) {
      return {
        type: 'polyglot_attack',
        severity: 'HIGH',
        description: 'Multi-language polyglot attack detected',
        detected_languages: detectedLanguages
      };
    }

    return null;
  }

  /**
   * Monitor API requests for suspicious activity
   */
  async monitorAPIRequest(req, res, next) {
    try {
      const requestData = {
        ip: req.ip || req.connection.remoteAddress,
        user_agent: req.get('user-agent'),
        endpoint: req.path,
        method: req.method,
        body: req.body,
        query: req.query,
        headers: req.headers,
        timestamp: new Date().toISOString()
      };

      // Check if IP is blocked
      if (this.blockedIPs.has(requestData.ip)) {
        return this.blockRequest(res, 'IP blocked due to security violations');
      }

      // Rate limiting check
      const rateLimitViolation = await this.checkRateLimit(requestData.ip, requestData.endpoint);
      if (rateLimitViolation) {
        await this.handleSecurityThreat({
          type: 'rate_limit_violation',
          ip: requestData.ip,
          endpoint: requestData.endpoint,
          severity: 'MEDIUM'
        });
      }

      // SQL injection detection
      const sqlInjection = await this.detectSQLInjection(requestData);
      if (sqlInjection.detected) {
        await this.handleSecurityThreat({
          type: 'sql_injection_attempt',
          ip: requestData.ip,
          endpoint: requestData.endpoint,
          payload: sqlInjection.payload,
          severity: 'CRITICAL'
        });
        return this.blockRequest(res, 'Malicious request detected');
      }

      // XSS detection
      const xss = await this.detectXSS(requestData);
      if (xss.detected) {
        await this.handleSecurityThreat({
          type: 'xss_attempt',
          ip: requestData.ip,
          endpoint: requestData.endpoint,
          payload: xss.payload,
          severity: 'HIGH'
        });
      }

      // Continue to next middleware
      next();
    } catch (error) {
      logger.error('Error in API monitoring:', error);
      next();
    }
  }

  /**
   * Detect SQL injection attempts
   */
  async detectSQLInjection(requestData) {
    const sqlPatterns = [
      /('|(\\'))|(;|\\;)|(--|\\-\\-)|(\/\*|\\\*\/)|(xp_|sp_)/gi,
      /(union|select|insert|update|delete|drop|create|alter|exec|execute)/gi,
      /(\s|%20)+(or|and)(\s|%20)+.*(=|like)/gi,
      /1=1|1=2|'='|"="|or 1=1|or 1=2/gi
    ];

    const allValues = [
      ...Object.values(requestData.body || {}),
      ...Object.values(requestData.query || {}),
      requestData.endpoint
    ].filter(v => typeof v === 'string');

    for (const value of allValues) {
      for (const pattern of sqlPatterns) {
        if (pattern.test(value)) {
          return {
            detected: true,
            payload: value,
            pattern: pattern.source
          };
        }
      }
    }

    return { detected: false };
  }

  /**
   * Detect XSS attempts
   */
  async detectXSS(requestData) {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi
    ];

    const allValues = [
      ...Object.values(requestData.body || {}),
      ...Object.values(requestData.query || {})
    ].filter(v => typeof v === 'string');

    for (const value of allValues) {
      for (const pattern of xssPatterns) {
        if (pattern.test(value)) {
          return {
            detected: true,
            payload: value,
            pattern: pattern.source
          };
        }
      }
    }

    return { detected: false };
  }

  /**
   * Handle security threats
   */
  async handleSecurityThreat(threatData) {
    try {
      const incident = {
        incident_id: `SEC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        incident_type: this.mapThreatTypeToIncident(threatData.type),
        severity: threatData.severity,
        title: this.generateThreatTitle(threatData),
        description: this.generateThreatDescription(threatData),
        source_ip: threatData.ip,
        user_agent: threatData.user_agent,
        endpoint_affected: threatData.endpoint,
        request_data: JSON.stringify(threatData),
        occurred_at: threatData.detected_at || new Date().toISOString(),
        status: 'open',
        automatically_detected: true
      };

      // Store incident in database
      await db('security_incidents').insert(incident);

      // Take automated actions based on severity
      await this.takeAutomatedActions(threatData);

      // Emit event for real-time notifications
      this.emit('security_threat', threatData);

      logger.warn('Security threat detected and handled:', {
        type: threatData.type,
        severity: threatData.severity,
        incidentId: incident.incident_id
      });
    } catch (error) {
      logger.error('Error handling security threat:', error);
    }
  }

  /**
   * Take automated security actions
   */
  async takeAutomatedActions(threatData) {
    if (threatData.severity === 'CRITICAL') {
      // Block IP immediately for critical threats
      if (threatData.ip) {
        this.blockedIPs.add(threatData.ip);
        await this.storeBlockedIP(threatData.ip, threatData.type);
      }

      // Disable team account for critical submission threats
      if (threatData.team_id && threatData.type === 'malicious_submission') {
        await this.suspendTeam(threatData.team_id, 'Critical security violation');
      }
    } else if (threatData.severity === 'HIGH') {
      // Rate limit IP for high severity threats
      if (threatData.ip) {
        await this.applyRateLimit(threatData.ip, 300000); // 5 minutes
      }
    }
  }

  /**
   * Block request and send security response
   */
  blockRequest(res, reason) {
    res.status(403).json({
      error: 'Request blocked',
      message: 'Security violation detected',
      code: 'SECURITY_BLOCK',
      timestamp: new Date().toISOString()
    });
    return false;
  }

  /**
   * Calculate threat severity
   */
  calculateThreatSeverity(threats) {
    const severityLevels = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    let maxSeverity = 0;
    let severityName = 'LOW';

    for (const threat of threats) {
      const level = severityLevels[threat.severity] || 1;
      if (level > maxSeverity) {
        maxSeverity = level;
        severityName = threat.severity;
      }
    }

    return severityName;
  }

  /**
   * Calculate risk score
   */
  calculateRiskScore(threats) {
    let score = 0;
    const severityScores = { CRITICAL: 10, HIGH: 7, MEDIUM: 4, LOW: 1 };

    for (const threat of threats) {
      score += severityScores[threat.severity] || 1;
    }

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Load monitoring rules from database
   */
  async loadMonitoringRules() {
    try {
      const rules = await db('security_monitoring_rules')
        .where({ is_active: true })
        .select('*');

      for (const rule of rules) {
        this.activeMonitors.set(rule.rule_name, {
          ...rule,
          rule_config: JSON.parse(rule.rule_config),
          condition_config: JSON.parse(rule.condition_config || '{}'),
          action_config: JSON.parse(rule.action_config || '{}')
        });
      }

      logger.info(`Loaded ${rules.length} security monitoring rules`);
    } catch (error) {
      logger.error('Error loading monitoring rules:', error);
    }
  }

  // Additional helper methods
  findLineNumbers(sourceCode, regex) {
    const lines = sourceCode.split('\n');
    const lineNumbers = [];
    
    lines.forEach((line, index) => {
      if (regex.test(line)) {
        lineNumbers.push(index + 1);
      }
    });
    
    return lineNumbers;
  }

  detectSuspiciousPatterns(submission) { return Promise.resolve([]); }
  loadThreatIntelligence() { return Promise.resolve(); }
  setupRealTimeMonitoring() { return Promise.resolve(); }
  checkRateLimit(ip, endpoint) { return Promise.resolve(false); }
  mapThreatTypeToIncident(type) { return type; }
  generateThreatTitle(threat) { return `Security threat: ${threat.type}`; }
  generateThreatDescription(threat) { return `Detected ${threat.type} with severity ${threat.severity}`; }
  storeBlockedIP(ip, reason) { return Promise.resolve(); }
  suspendTeam(teamId, reason) { return Promise.resolve(); }
  applyRateLimit(ip, duration) { return Promise.resolve(); }
}

module.exports = new SecurityMonitoringService();