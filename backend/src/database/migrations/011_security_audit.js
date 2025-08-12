/**
 * CS Club Hackathon Platform - Security Audit Migration
 * Phase 6.4: Security testing and audit result storage
 */

exports.up = async function(knex) {
  // Security audit reports
  await knex.schema.createTable('security_audit_reports', function(table) {
    table.increments('id').primary();
    table.string('audit_id').unique().notNullable();
    table.enum('audit_type', ['comprehensive', 'container', 'api', 'injection', 'targeted']).notNullable();
    table.timestamp('started_at').notNullable();
    table.timestamp('completed_at');
    table.json('results').notNullable(); // Full audit results
    table.integer('vulnerabilities_found').defaultTo(0);
    table.integer('tests_run').defaultTo(0);
    table.integer('tests_passed').defaultTo(0);
    table.integer('security_score').defaultTo(0); // 0-100
    table.enum('risk_level', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).defaultTo('LOW');
    table.json('recommendations'); // Security recommendations
    table.integer('triggered_by').references('id').inTable('admins');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['audit_type']);
    table.index(['risk_level']);
    table.index(['security_score']);
    table.index(['started_at']);
    table.index(['vulnerabilities_found']);
  });

  // Security vulnerability details
  await knex.schema.createTable('security_vulnerabilities', function(table) {
    table.increments('id').primary();
    table.string('audit_id').references('audit_id').inTable('security_audit_reports');
    table.string('vulnerability_id').notNullable(); // Unique ID for this vuln
    table.string('test_name').notNullable();
    table.enum('category', ['container', 'injection', 'api', 'auth', 'input', 'privilege', 'network']).notNullable();
    table.enum('severity', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).notNullable();
    table.string('title').notNullable();
    table.text('description').notNullable();
    table.text('technical_details');
    table.json('affected_components'); // Which parts are affected
    table.text('proof_of_concept'); // How to reproduce
    table.text('remediation_steps').notNullable();
    table.integer('cvss_score'); // CVSS 3.1 score if applicable
    table.json('references'); // External references
    table.enum('status', ['open', 'in_progress', 'resolved', 'false_positive']).defaultTo('open');
    table.integer('assigned_to').references('id').inTable('admins');
    table.timestamp('discovered_at').defaultTo(knex.fn.now());
    table.timestamp('resolved_at');
    
    table.unique(['audit_id', 'vulnerability_id']);
    table.index(['category']);
    table.index(['severity']);
    table.index(['status']);
    table.index(['discovered_at']);
  });

  // Security test cases repository
  await knex.schema.createTable('security_test_cases', function(table) {
    table.increments('id').primary();
    table.string('test_id').unique().notNullable();
    table.string('test_name').notNullable();
    table.enum('category', ['container', 'injection', 'api', 'auth', 'input', 'privilege', 'network']).notNullable();
    table.text('description').notNullable();
    table.text('test_code'); // The actual test code/script
    table.string('language'); // Language of test code
    table.json('expected_behavior'); // What should happen
    table.json('vulnerability_indicators'); // What indicates a vulnerability
    table.integer('timeout_ms').defaultTo(10000);
    table.boolean('is_active').defaultTo(true);
    table.enum('severity_if_fails', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).defaultTo('MEDIUM');
    table.json('metadata'); // Additional test metadata
    table.integer('created_by').references('id').inTable('admins');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['category']);
    table.index(['is_active']);
    table.index(['severity_if_fails']);
  });

  // Security test execution history
  await knex.schema.createTable('security_test_executions', function(table) {
    table.increments('id').primary();
    table.string('audit_id').references('audit_id').inTable('security_audit_reports');
    table.integer('test_case_id').references('id').inTable('security_test_cases');
    table.boolean('passed').notNullable();
    table.json('execution_result'); // Full execution details
    table.integer('execution_time_ms');
    table.text('output');
    table.text('error_message');
    table.boolean('timeout').defaultTo(false);
    table.timestamp('executed_at').defaultTo(knex.fn.now());
    
    table.index(['audit_id']);
    table.index(['test_case_id']);
    table.index(['passed']);
    table.index(['executed_at']);
  });

  // Security configuration settings
  await knex.schema.createTable('security_configurations', function(table) {
    table.increments('id').primary();
    table.string('config_key').unique().notNullable();
    table.string('config_category').notNullable(); // container, api, general
    table.text('config_value').notNullable();
    table.text('description');
    table.enum('security_level', ['LOW', 'MEDIUM', 'HIGH', 'PARANOID']).defaultTo('MEDIUM');
    table.boolean('is_active').defaultTo(true);
    table.json('validation_rules'); // Rules to validate the config
    table.integer('updated_by').references('id').inTable('admins');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['config_category']);
    table.index(['security_level']);
    table.index(['is_active']);
  });

  // Container security policies
  await knex.schema.createTable('container_security_policies', function(table) {
    table.increments('id').primary();
    table.string('policy_name').unique().notNullable();
    table.text('description');
    table.json('seccomp_profile'); // Seccomp security profile
    table.json('capability_restrictions'); // Linux capabilities to drop
    table.json('mount_restrictions'); // Mount point restrictions
    table.json('network_restrictions'); // Network access restrictions
    table.json('resource_limits'); // CPU, memory, etc. limits
    table.json('user_namespace_config'); // User namespace configuration
    table.boolean('read_only_root_filesystem').defaultTo(true);
    table.boolean('no_new_privileges').defaultTo(true);
    table.boolean('is_default').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.integer('created_by').references('id').inTable('admins');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['is_default']);
    table.index(['is_active']);
  });

  // API security rules
  await knex.schema.createTable('api_security_rules', function(table) {
    table.increments('id').primary();
    table.string('rule_name').unique().notNullable();
    table.string('endpoint_pattern').notNullable(); // Regex pattern for endpoints
    table.enum('http_method', ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ALL']).defaultTo('ALL');
    table.json('rate_limit_config'); // Rate limiting configuration
    table.json('input_validation_rules'); // Input validation rules
    table.json('output_sanitization_rules'); // Output sanitization
    table.boolean('requires_authentication').defaultTo(true);
    table.boolean('requires_authorization').defaultTo(false);
    table.json('allowed_user_types'); // Which user types can access
    table.boolean('log_requests').defaultTo(true);
    table.boolean('is_active').defaultTo(true);
    table.integer('priority').defaultTo(100); // Rule priority (lower = higher priority)
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['endpoint_pattern']);
    table.index(['is_active', 'priority']);
    table.index(['requires_authentication']);
  });

  // Security incidents log
  await knex.schema.createTable('security_incidents', function(table) {
    table.increments('id').primary();
    table.string('incident_id').unique().notNullable();
    table.enum('incident_type', ['breach_attempt', 'suspicious_activity', 'policy_violation', 'vulnerability_exploit', 'unauthorized_access']).notNullable();
    table.enum('severity', ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).notNullable();
    table.string('title').notNullable();
    table.text('description').notNullable();
    table.string('source_ip');
    table.string('user_agent');
    table.integer('user_id'); // If authenticated user involved
    table.string('endpoint_affected');
    table.json('request_data'); // Request details
    table.json('system_state'); // System state at time of incident
    table.boolean('automatically_detected').defaultTo(true);
    table.enum('status', ['open', 'investigating', 'resolved', 'false_positive']).defaultTo('open');
    table.text('investigation_notes');
    table.text('resolution_notes');
    table.integer('assigned_to').references('id').inTable('admins');
    table.timestamp('occurred_at').notNullable();
    table.timestamp('detected_at').defaultTo(knex.fn.now());
    table.timestamp('resolved_at');
    
    table.index(['incident_type']);
    table.index(['severity']);
    table.index(['status']);
    table.index(['occurred_at']);
    table.index(['source_ip']);
  });

  // Security monitoring rules
  await knex.schema.createTable('security_monitoring_rules', function(table) {
    table.increments('id').primary();
    table.string('rule_name').unique().notNullable();
    table.enum('monitoring_type', ['rate_limit', 'pattern_match', 'anomaly_detection', 'threshold', 'signature']).notNullable();
    table.text('description');
    table.json('rule_config').notNullable(); // Rule-specific configuration
    table.json('condition_config'); // Conditions that trigger the rule
    table.json('action_config'); // Actions to take when triggered
    table.enum('severity', ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).defaultTo('MEDIUM');
    table.boolean('create_incident').defaultTo(true);
    table.boolean('send_notification').defaultTo(false);
    table.boolean('auto_block').defaultTo(false);
    table.integer('trigger_count').defaultTo(0);
    table.timestamp('last_triggered');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['monitoring_type']);
    table.index(['is_active']);
    table.index(['severity']);
  });

  // Security audit schedule
  await knex.schema.createTable('security_audit_schedule', function(table) {
    table.increments('id').primary();
    table.string('schedule_name').notNullable();
    table.enum('audit_type', ['comprehensive', 'container', 'api', 'injection', 'targeted']).notNullable();
    table.string('cron_expression').notNullable(); // When to run
    table.json('test_categories'); // Which categories to test
    table.json('configuration'); // Audit-specific configuration
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_run');
    table.timestamp('next_run');
    table.enum('last_run_status', ['success', 'failed', 'partial']).nullable();
    table.text('last_run_notes');
    table.integer('created_by').references('id').inTable('admins');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['audit_type']);
    table.index(['is_active']);
    table.index(['next_run']);
  });

  // Insert default security test cases
  await knex('security_test_cases').insert([
    {
      test_id: 'CONTAINER_ESCAPE_01',
      test_name: 'Container Escape via /proc/self/exe',
      category: 'container',
      description: 'Tests if container can escape via /proc/self/exe manipulation',
      severity_if_fails: 'CRITICAL',
      timeout_ms: 15000,
      is_active: true
    },
    {
      test_id: 'CONTAINER_ESCAPE_02', 
      test_name: 'Docker Socket Access Test',
      category: 'container',
      description: 'Tests if Docker socket is accessible from within container',
      severity_if_fails: 'CRITICAL',
      timeout_ms: 10000,
      is_active: true
    },
    {
      test_id: 'INJECTION_FORK_BOMB',
      test_name: 'Fork Bomb Prevention',
      category: 'injection',
      description: 'Tests prevention of fork bomb attacks',
      severity_if_fails: 'HIGH',
      timeout_ms: 5000,
      is_active: true
    },
    {
      test_id: 'INJECTION_FILE_SYSTEM',
      test_name: 'File System Attack Prevention',
      category: 'injection', 
      description: 'Tests file system access restrictions',
      severity_if_fails: 'HIGH',
      timeout_ms: 10000,
      is_active: true
    },
    {
      test_id: 'API_SQL_INJECTION',
      test_name: 'SQL Injection Prevention',
      category: 'api',
      description: 'Tests API endpoints for SQL injection vulnerabilities',
      severity_if_fails: 'CRITICAL',
      timeout_ms: 5000,
      is_active: true
    }
  ]);

  // Insert default security configurations
  await knex('security_configurations').insert([
    {
      config_key: 'container.execution_timeout',
      config_category: 'container',
      config_value: '30000',
      description: 'Maximum execution time for containers in milliseconds',
      security_level: 'HIGH'
    },
    {
      config_key: 'container.memory_limit',
      config_category: 'container', 
      config_value: '256MB',
      description: 'Maximum memory limit for execution containers',
      security_level: 'HIGH'
    },
    {
      config_key: 'api.rate_limit_per_minute',
      config_category: 'api',
      config_value: '100',
      description: 'Maximum API requests per minute per IP',
      security_level: 'MEDIUM'
    },
    {
      config_key: 'api.max_request_size',
      config_category: 'api',
      config_value: '1MB', 
      description: 'Maximum size for API request bodies',
      security_level: 'MEDIUM'
    },
    {
      config_key: 'general.audit_frequency',
      config_category: 'general',
      config_value: 'daily',
      description: 'How often to run automatic security audits',
      security_level: 'HIGH'
    }
  ]);

  // Insert default container security policy
  await knex('container_security_policies').insert({
    policy_name: 'default_execution_policy',
    description: 'Default security policy for code execution containers',
    seccomp_profile: JSON.stringify({
      defaultAction: 'SCMP_ACT_ERRNO',
      syscalls: [
        { name: 'read', action: 'SCMP_ACT_ALLOW' },
        { name: 'write', action: 'SCMP_ACT_ALLOW' },
        { name: 'exit', action: 'SCMP_ACT_ALLOW' },
        { name: 'exit_group', action: 'SCMP_ACT_ALLOW' },
        { name: 'brk', action: 'SCMP_ACT_ALLOW' },
        { name: 'mmap', action: 'SCMP_ACT_ALLOW' },
        { name: 'munmap', action: 'SCMP_ACT_ALLOW' }
      ]
    }),
    capability_restrictions: JSON.stringify(['ALL']),
    mount_restrictions: JSON.stringify({ allowedMounts: ['/tmp'] }),
    network_restrictions: JSON.stringify({ blockAll: true }),
    resource_limits: JSON.stringify({
      memory: '256MB',
      cpu: '1.0',
      pids: 64
    }),
    is_default: true,
    is_active: true
  });
};

exports.down = async function(knex) {
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('security_audit_schedule');
  await knex.schema.dropTableIfExists('security_monitoring_rules');
  await knex.schema.dropTableIfExists('security_incidents');
  await knex.schema.dropTableIfExists('api_security_rules');
  await knex.schema.dropTableIfExists('container_security_policies');
  await knex.schema.dropTableIfExists('security_configurations');
  await knex.schema.dropTableIfExists('security_test_executions');
  await knex.schema.dropTableIfExists('security_test_cases');
  await knex.schema.dropTableIfExists('security_vulnerabilities');
  await knex.schema.dropTableIfExists('security_audit_reports');
};