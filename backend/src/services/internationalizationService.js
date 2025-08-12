/**
 * CS Club Hackathon Platform - Internationalization Service
 * Phase 6.3: Multi-language support and localization
 */

const { db } = require('../utils/db');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

class InternationalizationService {
  constructor() {
    this.translations = new Map();
    this.supportedLanguages = new Map();
    this.defaultLanguage = 'en';
    this.translationsPath = path.join(process.cwd(), 'locales');
    this.initializeService();
  }

  /**
   * Initialize internationalization service
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
   * Load supported languages from database
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
   * Load translations from files and database
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
   * Load translations for a specific language
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
   * Get translated string
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
   * Get multiple translations at once
   */
  translateBatch(keys, languageCode = null, params = {}) {
    const result = {};
    for (const key of keys) {
      result[key] = this.translate(key, languageCode, params);
    }
    return result;
  }

  /**
   * Interpolate parameters in translation string
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
   * Add or update translation
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
   * Import translations from JSON file
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
   * Export translations to JSON file
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
   * Get translation statistics
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
   * Find missing translations
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
   * Format date according to language settings
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
   * Format time according to language settings
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
   * Format number according to language settings
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
   * Get language information
   */
  getLanguageInfo(languageCode) {
    return this.supportedLanguages.get(languageCode);
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages() {
    return Array.from(this.supportedLanguages.values());
  }

  /**
   * Add new supported language
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
   * Get localized contest data
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
   * Auto-translate using basic patterns (placeholder for real translation service)
   */
  async autoTranslate(text, fromLanguage, toLanguage) {
    // This is a placeholder - in production, integrate with translation APIs like Google Translate
    logger.info(`Auto-translate requested: ${fromLanguage} -> ${toLanguage}`);
    
    // For now, just return the original text with a note
    return `[AUTO-TRANSLATED from ${fromLanguage}] ${text}`;
  }

  /**
   * Helper methods
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
   * Validate translation key format
   */
  validateKey(key) {
    // Keys should be in format: category.subcategory.item
    const keyRegex = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/;
    return keyRegex.test(key);
  }

  /**
   * Get translation categories
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
   * Clean up unused translations
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