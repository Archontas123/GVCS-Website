const { db } = require('../utils/db');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

class InternationalizationService {
  /**
   * Initialize the Internationalization Service.
   * Sets up translation storage, supported languages, and loads initial data.
   */
  constructor() {
    this.translations = new Map();
    this.supportedLanguages = new Map();
    this.defaultLanguage = 'en';
    this.translationsPath = path.join(process.cwd(), 'locales');
    this.initializeService();
  }

  /**
   * Initialize internationalization service by loading languages and translations.
   * @throws {Error} If initialization fails
   */
  async initializeService() {
    try {
      await this.loadSupportedLanguages();
      await this.loadTranslations();
      logger.info('Internationalization service initialized');
    } catch (error) {
      logger.error('Error initializing i18n service:', error);
    }
  }

  /**
   * Load supported languages from database with their configuration.
   * @throws {Error} If database query fails
   */
  async loadSupportedLanguages() {
    try {
      const languages = await db('supported_languages')
        .where({ is_active: true })
        .select('*')
        .orderBy('sort_order');

      for (const lang of languages) {
        this.supportedLanguages.set(lang.language_code, {
          code: lang.language_code,
          name: lang.language_name,
          native_name: lang.native_name,
          flag_icon: lang.flag_icon,
          text_direction: lang.text_direction || 'ltr',
          date_format: lang.date_format || 'MM/dd/yyyy',
          time_format: lang.time_format || 'HH:mm',
          number_format: lang.number_format || 'en-US',
          is_default: lang.is_default || false
        });

        if (lang.is_default) {
          this.defaultLanguage = lang.language_code;
        }
      }

      logger.info(`Loaded ${this.supportedLanguages.size} supported languages`);
    } catch (error) {
      logger.error('Error loading supported languages:', error);
    }
  }

  /**
   * Load translations from both JSON files and database for all supported languages.
   * Database translations override file translations when conflicts exist.
   * @throws {Error} If translation loading fails
   */
  async loadTranslations() {
    try {
      // Ensure translations directory exists
      await fs.mkdir(this.translationsPath, { recursive: true });

      // Load translations for each supported language
      for (const [langCode] of this.supportedLanguages) {
        await this.loadLanguageTranslations(langCode);
      }

      logger.info(`Loaded translations for ${this.translations.size} languages`);
    } catch (error) {
      logger.error('Error loading translations:', error);
    }
  }

  /**
   * Load translations for a specific language from file and database sources.
   * @param {string} languageCode - Language code to load translations for
   * @throws {Error} If language loading fails
   */
  async loadLanguageTranslations(languageCode) {
    try {
      const translations = new Map();

      // Load from file
      const filePath = path.join(this.translationsPath, `${languageCode}.json`);
      try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const fileTranslations = JSON.parse(fileContent);
        
        for (const [key, value] of Object.entries(fileTranslations)) {
          translations.set(key, value);
        }
      } catch (fileError) {
        logger.warn(`Translation file not found: ${filePath}`);
      }

      // Load from database (overrides file translations)
      const dbTranslations = await db('translation_strings')
        .where({ language_code: languageCode, is_active: true })
        .select('*');

      for (const translation of dbTranslations) {
        translations.set(translation.translation_key, translation.translation_value);
      }

      this.translations.set(languageCode, translations);
      logger.info(`Loaded ${translations.size} translations for ${languageCode}`);
    } catch (error) {
      logger.error(`Error loading translations for ${languageCode}:`, error);
    }
  }

  /**
   * Get translated string for a given key with parameter interpolation.
   * Falls back to default language if translation not found, then to key itself.
   * @param {string} key - Translation key
   * @param {string|null} languageCode - Target language code, uses default if null
   * @param {Object} params - Parameters to interpolate into translation
   * @returns {string} Translated string with interpolated parameters
   */
  translate(key, languageCode = null, params = {}) {
    const lang = languageCode || this.defaultLanguage;
    const langTranslations = this.translations.get(lang);
    
    if (!langTranslations) {
      logger.warn(`Language not supported: ${lang}`);
      return key;
    }

    let translation = langTranslations.get(key);
    
    // Fallback to default language
    if (!translation && lang !== this.defaultLanguage) {
      const defaultTranslations = this.translations.get(this.defaultLanguage);
      translation = defaultTranslations?.get(key);
    }

    // Fallback to key if no translation found
    if (!translation) {
      logger.warn(`Translation not found: ${key} (${lang})`);
      return key;
    }

    // Replace parameters
    return this.interpolateParams(translation, params);
  }

  /**
   * Get multiple translations at once for efficiency.
   * @param {string[]} keys - Array of translation keys
   * @param {string|null} languageCode - Target language code
   * @param {Object} params - Parameters to interpolate into translations
   * @returns {Object} Object mapping keys to translated strings
   */
  translateBatch(keys, languageCode = null, params = {}) {
    const result = {};
    for (const key of keys) {
      result[key] = this.translate(key, languageCode, params);
    }
    return result;
  }

  /**
   * Interpolate parameters in translation string using {{param}} syntax.
   * @param {string} translation - Translation string with parameter placeholders
   * @param {Object} params - Parameters to interpolate
   * @returns {string} Translation string with parameters replaced
   */
  interpolateParams(translation, params) {
    let result = translation;
    
    for (const [key, value] of Object.entries(params)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, value);
    }

    return result;
  }

  /**
   * Add or update translation in both database and memory cache.
   * @param {string} key - Translation key
   * @param {string} value - Translation value
   * @param {string} languageCode - Language code for the translation
   * @param {string} category - Category for organizing translations
   * @returns {Promise<boolean>} True if successful
   * @throws {Error} If database operation fails
   */
  async setTranslation(key, value, languageCode, category = 'general') {
    try {
      // Update in database
      await db('translation_strings')
        .insert({
          translation_key: key,
          language_code: languageCode,
          translation_value: value,
          category: category,
          created_at: new Date().toISOString(),
          is_active: true
        })
        .onConflict(['translation_key', 'language_code'])
        .merge({
          translation_value: value,
          updated_at: new Date().toISOString()
        });

      // Update in memory
      if (!this.translations.has(languageCode)) {
        this.translations.set(languageCode, new Map());
      }
      this.translations.get(languageCode).set(key, value);

      logger.info('Translation updated:', { key, languageCode, category });
      return true;
    } catch (error) {
      logger.error('Error setting translation:', error);
      throw error;
    }
  }

  /**
   * Import translations from JSON file into database and memory cache.
   * @param {string} languageCode - Target language code
   * @param {string} filePath - Path to JSON file containing translations
   * @param {string} category - Category to assign to imported translations
   * @returns {Promise<number>} Number of translations imported
   * @throws {Error} If file reading or import fails
   */
  async importTranslations(languageCode, filePath, category = 'imported') {
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      const translations = JSON.parse(fileContent);

      let importedCount = 0;
      for (const [key, value] of Object.entries(translations)) {
        await this.setTranslation(key, value, languageCode, category);
        importedCount++;
      }

      logger.info(`Imported ${importedCount} translations for ${languageCode}`);
      return importedCount;
    } catch (error) {
      logger.error('Error importing translations:', error);
      throw error;
    }
  }

  /**
   * Export translations to JSON file for backup or distribution.
   * @param {string} languageCode - Language code to export
   * @param {string|null} filePath - Output file path, auto-generated if null
   * @returns {Promise<string>} Path to exported file
   * @throws {Error} If export fails or language not found
   */
  async exportTranslations(languageCode, filePath = null) {
    try {
      const translations = this.translations.get(languageCode);
      if (!translations) {
        throw new Error(`Language not found: ${languageCode}`);
      }

      const exportData = {};
      for (const [key, value] of translations) {
        exportData[key] = value;
      }

      const outputPath = filePath || path.join(this.translationsPath, `${languageCode}_export.json`);
      await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2), 'utf8');

      logger.info(`Exported translations for ${languageCode} to ${outputPath}`);
      return outputPath;
    } catch (error) {
      logger.error('Error exporting translations:', error);
      throw error;
    }
  }

  /**
   * Get translation statistics for one or all languages.
   * @param {string|null} languageCode - Specific language code or null for all
   * @returns {Promise<Object>} Statistics including translation counts and last update times
   * @throws {Error} If statistics query fails
   */
  async getTranslationStats(languageCode = null) {
    try {
      if (languageCode) {
        const translations = this.translations.get(languageCode);
        return {
          language_code: languageCode,
          total_keys: translations ? translations.size : 0,
          last_updated: await this.getLastUpdateTime(languageCode)
        };
      }

      // Stats for all languages
      const stats = {};
      for (const [langCode, translations] of this.translations) {
        stats[langCode] = {
          total_keys: translations.size,
          last_updated: await this.getLastUpdateTime(langCode)
        };
      }

      return stats;
    } catch (error) {
      logger.error('Error getting translation stats:', error);
      throw error;
    }
  }

  /**
   * Find missing translations by comparing against base language.
   * @param {string|null} baseLanguage - Base language to compare against, uses default if null
   * @returns {Promise<Object>} Object mapping language codes to arrays of missing keys
   * @throws {Error} If base language not found
   */
  async findMissingTranslations(baseLanguage = null) {
    const base = baseLanguage || this.defaultLanguage;
    const baseTranslations = this.translations.get(base);
    
    if (!baseTranslations) {
      throw new Error(`Base language not found: ${base}`);
    }

    const missing = {};
    const baseKeys = new Set(baseTranslations.keys());

    for (const [langCode, translations] of this.translations) {
      if (langCode === base) continue;

      missing[langCode] = [];
      for (const key of baseKeys) {
        if (!translations.has(key)) {
          missing[langCode].push(key);
        }
      }
    }

    return missing;
  }

  /**
   * Format date according to language-specific settings and locale.
   * @param {Date} date - Date to format
   * @param {string|null} languageCode - Language code for formatting, uses default if null
   * @param {Object} options - Additional formatting options for Intl.DateTimeFormat
   * @returns {string} Formatted date string
   */
  formatDate(date, languageCode = null, options = {}) {
    const lang = languageCode || this.defaultLanguage;
    const langInfo = this.supportedLanguages.get(lang);
    
    if (!langInfo) {
      return date.toISOString().split('T')[0];
    }

    const formatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...options
    };

    return new Intl.DateTimeFormat(langInfo.number_format, formatOptions).format(date);
  }

  /**
   * Format time according to language-specific settings and locale.
   * @param {Date} date - Date object to extract time from
   * @param {string|null} languageCode - Language code for formatting
   * @param {Object} options - Additional formatting options
   * @returns {string} Formatted time string
   */
  formatTime(date, languageCode = null, options = {}) {
    const lang = languageCode || this.defaultLanguage;
    const langInfo = this.supportedLanguages.get(lang);
    
    if (!langInfo) {
      return date.toISOString().split('T')[1].substring(0, 5);
    }

    const formatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: langInfo.time_format === '12h',
      ...options
    };

    return new Intl.DateTimeFormat(langInfo.number_format, formatOptions).format(date);
  }

  /**
   * Format number according to language-specific locale settings.
   * @param {number} number - Number to format
   * @param {string|null} languageCode - Language code for formatting
   * @param {Object} options - Additional formatting options for Intl.NumberFormat
   * @returns {string} Formatted number string
   */
  formatNumber(number, languageCode = null, options = {}) {
    const lang = languageCode || this.defaultLanguage;
    const langInfo = this.supportedLanguages.get(lang);
    
    if (!langInfo) {
      return number.toString();
    }

    return new Intl.NumberFormat(langInfo.number_format, options).format(number);
  }

  /**
   * Get detailed information for a specific language.
   * @param {string} languageCode - Language code to get information for
   * @returns {Object|undefined} Language information object or undefined if not found
   */
  getLanguageInfo(languageCode) {
    return this.supportedLanguages.get(languageCode);
  }

  /**
   * Get array of all supported languages with their configuration.
   * @returns {Object[]} Array of language information objects
   */
  getSupportedLanguages() {
    return Array.from(this.supportedLanguages.values());
  }

  /**
   * Add new supported language to the system.
   * @param {Object} languageData - Language configuration data
   * @param {string} adminId - ID of admin user adding the language
   * @returns {Promise<Object>} Created language record
   * @throws {Error} If database insertion fails
   */
  async addLanguage(languageData, adminId) {
    try {
      const language = {
        language_code: languageData.code,
        language_name: languageData.name,
        native_name: languageData.native_name,
        flag_icon: languageData.flag_icon || null,
        text_direction: languageData.text_direction || 'ltr',
        date_format: languageData.date_format || 'MM/dd/yyyy',
        time_format: languageData.time_format || 'HH:mm',
        number_format: languageData.number_format || 'en-US',
        is_default: languageData.is_default || false,
        is_active: true,
        created_by: adminId,
        created_at: new Date().toISOString()
      };

      const result = await db('supported_languages').insert(language).returning('*');
      
      // Update in-memory cache
      this.supportedLanguages.set(language.language_code, language);
      this.translations.set(language.language_code, new Map());

      logger.info('New language added:', { code: language.language_code, name: language.language_name });
      return result[0];
    } catch (error) {
      logger.error('Error adding language:', error);
      throw error;
    }
  }

  /**
   * Get contest data with localized strings for a specific language.
   * @param {number} contestId - Contest ID to get data for
   * @param {string} languageCode - Language code for localization
   * @returns {Promise<Object>} Contest data with localized strings
   * @throws {Error} If contest not found or database query fails
   */
  async getLocalizedContestData(contestId, languageCode) {
    try {
      // Get base contest data
      const contest = await db('contests').where({ id: contestId }).first();
      if (!contest) {
        throw new Error('Contest not found');
      }

      // Get localized contest info if available
      const localizedContest = await db('contest_localizations')
        .where({ contest_id: contestId, language_code: languageCode })
        .first();

      // Get localized problems
      const problems = await db('problems')
        .leftJoin('problem_localizations', function() {
          this.on('problems.id', '=', 'problem_localizations.problem_id')
            .andOn('problem_localizations.language_code', '=', db.raw('?', [languageCode]));
        })
        .where({ contest_id: contestId })
        .select(
          'problems.*',
          'problem_localizations.title as localized_title',
          'problem_localizations.description as localized_description',
          'problem_localizations.input_format as localized_input_format',
          'problem_localizations.output_format as localized_output_format'
        );

      return {
        contest: {
          ...contest,
          contest_name: localizedContest?.contest_name || contest.contest_name,
          description: localizedContest?.description || contest.description
        },
        problems: problems.map(problem => ({
          ...problem,
          title: problem.localized_title || problem.title,
          description: problem.localized_description || problem.description,
          input_format: problem.localized_input_format || problem.input_format,
          output_format: problem.localized_output_format || problem.output_format
        }))
      };
    } catch (error) {
      logger.error('Error getting localized contest data:', error);
      throw error;
    }
  }

  /**
   * Auto-translate text using basic patterns (placeholder for real translation service).
   * @param {string} text - Text to translate
   * @param {string} fromLanguage - Source language code
   * @param {string} toLanguage - Target language code
   * @returns {Promise<string>} Translated text (currently just marked as auto-translated)
   */
  async autoTranslate(text, fromLanguage, toLanguage) {
    logger.info(`Auto-translate requested: ${fromLanguage} -> ${toLanguage}`);
    
    return `[AUTO-TRANSLATED from ${fromLanguage}] ${text}`;
  }

  /**
   * Get last update time for translations in a specific language.
   * @param {string} languageCode - Language code to check
   * @returns {Promise<string|null>} ISO timestamp of last update or null if none found
   */
  async getLastUpdateTime(languageCode) {
    try {
      const result = await db('translation_strings')
        .where({ language_code: languageCode })
        .max('updated_at as last_update')
        .first();
      
      return result?.last_update;
    } catch (error) {
      logger.error('Error getting last update time:', error);
      return null;
    }
  }

  /**
   * Validate translation key format (category.subcategory.item pattern).
   * @param {string} key - Translation key to validate
   * @returns {boolean} True if key format is valid
   */
  validateKey(key) {
    // Keys should be in format: category.subcategory.item
    const keyRegex = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/;
    return keyRegex.test(key);
  }

  /**
   * Get list of all translation categories, optionally filtered by language.
   * @param {string|null} languageCode - Language code to filter by, or null for all
   * @returns {Promise<string[]>} Array of category names
   */
  async getCategories(languageCode = null) {
    try {
      let query = db('translation_strings')
        .distinct('category')
        .orderBy('category');

      if (languageCode) {
        query = query.where({ language_code: languageCode });
      }

      const categories = await query;
      return categories.map(c => c.category);
    } catch (error) {
      logger.error('Error getting categories:', error);
      return [];
    }
  }

  /**
   * Clean up unused translations that have been inactive for over 90 days.
   * @returns {Promise<number>} Number of translations deleted
   */
  async cleanupUnusedTranslations() {
    try {
      const result = await db('translation_strings')
        .where({ is_active: false })
        .where('updated_at', '<', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .delete();

      logger.info(`Cleaned up ${result} unused translations`);
      return result;
    } catch (error) {
      logger.error('Error cleaning up translations:', error);
      return 0;
    }
  }
}

module.exports = new InternationalizationService();