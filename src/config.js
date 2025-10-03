import fs from 'fs'
import path from 'path'
import os from 'os'

// Configuration constants
export const CONFIG_DIR = path.join(os.homedir(), '.tipoff')
export const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')
export const CONFIG_BACKUP_FILE = path.join(CONFIG_DIR, 'config.backup.json')

// Default configuration values
export const DEFAULT_CONFIG = {
  favorites: [],
  colors: {
    score: 'white',
    teamName: 'cyan',
    selectedGame: 'yellow',
    liveGame: 'green',
    completedGame: 'gray',
    error: 'red',
    info: 'blue',
    background: 'black'
  },
  display: {
    showVenue: true,
    showTime: true,
    compactMode: false,
    refreshInterval: 5000
  },
  polling: {
    liveGameInterval: 5000,
    scheduledGameInterval: 60000,
    halftimeInterval: 30000
  }
}

// Configuration schema for validation
const CONFIG_SCHEMA = {
  favorites: {
    type: 'array',
    items: { type: 'string' },
    default: []
  },
  colors: {
    type: 'object',
    properties: {
      score: { type: 'string', default: 'white' },
      teamName: { type: 'string', default: 'cyan' },
      selectedGame: { type: 'string', default: 'yellow' },
      liveGame: { type: 'string', default: 'green' },
      completedGame: { type: 'string', default: 'gray' },
      error: { type: 'string', default: 'red' },
      info: { type: 'string', default: 'blue' },
      background: { type: 'string', default: 'black' }
    },
    default: DEFAULT_CONFIG.colors
  },
  display: {
    type: 'object',
    properties: {
      showVenue: { type: 'boolean', default: true },
      showTime: { type: 'boolean', default: true },
      compactMode: { type: 'boolean', default: false },
      refreshInterval: { type: 'number', min: 1000, max: 60000, default: 5000 }
    },
    default: DEFAULT_CONFIG.display
  },
  polling: {
    type: 'object',
    properties: {
      liveGameInterval: { type: 'number', min: 1000, max: 30000, default: 5000 },
      scheduledGameInterval: { type: 'number', min: 10000, max: 300000, default: 60000 },
      halftimeInterval: { type: 'number', min: 5000, max: 120000, default: 30000 }
    },
    default: DEFAULT_CONFIG.polling
  }
}

// Valid color names for terminal
const VALID_COLORS = [
  'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
  'gray', 'grey', 'brightred', 'brightgreen', 'brightyellow', 'brightblue',
  'brightmagenta', 'brightcyan', 'brightwhite'
]

/**
 * Ensures the configuration directory exists
 */
export function ensureConfigDirectory() {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true })
    }
    return true
  } catch (error) {
    console.error('Failed to create config directory:', error.message)
    return false
  }
}

/**
 * Validates a configuration object against the schema
 * @param {Object} config - Configuration object to validate
 * @returns {Object} - { valid: boolean, errors: string[], config: Object }
 */
export function validateConfig(config) {
  const errors = []
  const validatedConfig = {}

  // Validate favorites
  if (config.favorites !== undefined) {
    if (Array.isArray(config.favorites)) {
      validatedConfig.favorites = config.favorites.filter(fav => 
        typeof fav === 'string' && fav.length > 0
      )
    } else {
      errors.push('favorites must be an array of strings')
      validatedConfig.favorites = DEFAULT_CONFIG.favorites
    }
  } else {
    validatedConfig.favorites = DEFAULT_CONFIG.favorites
  }

  // Validate colors
  if (config.colors !== undefined && typeof config.colors === 'object') {
    validatedConfig.colors = { ...DEFAULT_CONFIG.colors }
    
    for (const [key, value] of Object.entries(config.colors)) {
      if (key in DEFAULT_CONFIG.colors) {
        if (typeof value === 'string' && VALID_COLORS.includes(value.toLowerCase())) {
          validatedConfig.colors[key] = value.toLowerCase()
        } else {
          errors.push(`Invalid color '${value}' for ${key}. Must be one of: ${VALID_COLORS.join(', ')}`)
        }
      } else {
        errors.push(`Unknown color setting: ${key}`)
      }
    }
  } else {
    validatedConfig.colors = DEFAULT_CONFIG.colors
  }

  // Validate display options
  if (config.display !== undefined && typeof config.display === 'object') {
    validatedConfig.display = { ...DEFAULT_CONFIG.display }
    
    for (const [key, value] of Object.entries(config.display)) {
      if (key in DEFAULT_CONFIG.display) {
        switch (key) {
          case 'showVenue':
          case 'showTime':
          case 'compactMode':
            if (typeof value === 'boolean') {
              validatedConfig.display[key] = value
            } else {
              errors.push(`${key} must be a boolean`)
            }
            break
          case 'refreshInterval':
            if (typeof value === 'number' && value >= 1000 && value <= 60000) {
              validatedConfig.display[key] = value
            } else {
              errors.push(`refreshInterval must be a number between 1000 and 60000`)
            }
            break
        }
      } else {
        errors.push(`Unknown display setting: ${key}`)
      }
    }
  } else {
    validatedConfig.display = DEFAULT_CONFIG.display
  }

  // Validate polling intervals
  if (config.polling !== undefined && typeof config.polling === 'object') {
    validatedConfig.polling = { ...DEFAULT_CONFIG.polling }
    
    for (const [key, value] of Object.entries(config.polling)) {
      if (key in DEFAULT_CONFIG.polling) {
        if (typeof value === 'number' && value >= 1000) {
          // Set reasonable upper limits for each interval type
          const maxValues = {
            liveGameInterval: 30000,
            scheduledGameInterval: 300000,
            halftimeInterval: 120000
          }
          
          if (value <= maxValues[key]) {
            validatedConfig.polling[key] = value
          } else {
            errors.push(`${key} must be between 1000 and ${maxValues[key]}`)
          }
        } else {
          errors.push(`${key} must be a number >= 1000`)
        }
      } else {
        errors.push(`Unknown polling setting: ${key}`)
      }
    }
  } else {
    validatedConfig.polling = DEFAULT_CONFIG.polling
  }

  return {
    valid: errors.length === 0,
    errors,
    config: validatedConfig
  }
}

/**
 * Loads configuration from file
 * @returns {Promise<Object>} - Configuration object
 */
export async function loadConfigFromFile() {
  try {
    // Ensure config directory exists
    if (!ensureConfigDirectory()) {
      throw new Error('Cannot create configuration directory')
    }

    // Check if config file exists
    if (!fs.existsSync(CONFIG_FILE)) {
      // Create default config file
      await saveConfigToFile(DEFAULT_CONFIG)
      return DEFAULT_CONFIG
    }

    // Read and parse config file
    const configData = fs.readFileSync(CONFIG_FILE, 'utf8')
    const rawConfig = JSON.parse(configData)

    // Validate and merge with defaults
    const validation = validateConfig(rawConfig)
    
    if (!validation.valid) {
      console.warn('Configuration validation errors:', validation.errors)
      // Create backup of invalid config
      await createConfigBackup()
    }

    return validation.config
  } catch (error) {
    console.error('Failed to load configuration:', error.message)
    
    // Try to load backup if main config is corrupted
    if (fs.existsSync(CONFIG_BACKUP_FILE)) {
      try {
        const backupData = fs.readFileSync(CONFIG_BACKUP_FILE, 'utf8')
        const backupConfig = JSON.parse(backupData)
        const validation = validateConfig(backupConfig)
        
        if (validation.valid) {
          console.log('Loaded configuration from backup')
          return validation.config
        }
      } catch (backupError) {
        console.error('Backup config also corrupted:', backupError.message)
      }
    }
    
    // Fall back to defaults
    console.log('Using default configuration')
    return DEFAULT_CONFIG
  }
}

/**
 * Saves configuration to file
 * @param {Object} config - Configuration object to save
 * @returns {Promise<boolean>} - Success status
 */
export async function saveConfigToFile(config) {
  try {
    // Ensure config directory exists
    if (!ensureConfigDirectory()) {
      throw new Error('Cannot create configuration directory')
    }

    // Validate configuration before saving
    const validation = validateConfig(config)
    
    if (!validation.valid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`)
    }

    // Create backup of existing config
    if (fs.existsSync(CONFIG_FILE)) {
      await createConfigBackup()
    }

    // Write new configuration
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(validation.config, null, 2))
    
    return true
  } catch (error) {
    console.error('Failed to save configuration:', error.message)
    return false
  }
}

/**
 * Creates a backup of the current configuration
 * @returns {Promise<boolean>} - Success status
 */
export async function createConfigBackup() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.copyFileSync(CONFIG_FILE, CONFIG_BACKUP_FILE)
      return true
    }
    return false
  } catch (error) {
    console.error('Failed to create config backup:', error.message)
    return false
  }
}

/**
 * Migrates configuration from older versions
 * @param {Object} config - Configuration object to migrate
 * @returns {Object} - Migrated configuration
 */
export function migrateConfig(config) {
  const migrated = { ...config }
  let changed = false

  // Migration for v1.0 -> v1.1: Add new color options
  if (!migrated.colors?.error) {
    migrated.colors = { ...migrated.colors, error: 'red' }
    changed = true
  }
  
  if (!migrated.colors?.info) {
    migrated.colors = { ...migrated.colors, info: 'blue' }
    changed = true
  }

  // Migration for v1.1 -> v1.2: Add display options
  if (!migrated.display) {
    migrated.display = DEFAULT_CONFIG.display
    changed = true
  }

  // Migration for v1.2 -> v1.3: Rename color keys
  if (migrated.colors?.team && !migrated.colors?.teamName) {
    migrated.colors.teamName = migrated.colors.team
    delete migrated.colors.team
    changed = true
  }

  // Migration for v1.3 -> v1.4: Add polling intervals
  if (!migrated.polling) {
    migrated.polling = DEFAULT_CONFIG.polling
    changed = true
  }

  if (changed) {
    console.log('Configuration migrated to latest version')
  }

  return migrated
}

/**
 * Resets configuration to defaults
 * @returns {Promise<boolean>} - Success status
 */
export async function resetConfigToDefaults() {
  try {
    await createConfigBackup()
    return await saveConfigToFile(DEFAULT_CONFIG)
  } catch (error) {
    console.error('Failed to reset configuration:', error.message)
    return false
  }
}

/**
 * Gets configuration file information
 * @returns {Object} - File information
 */
export function getConfigFileInfo() {
  const info = {
    configDir: CONFIG_DIR,
    configFile: CONFIG_FILE,
    backupFile: CONFIG_BACKUP_FILE,
    exists: fs.existsSync(CONFIG_FILE),
    backupExists: fs.existsSync(CONFIG_BACKUP_FILE)
  }

  if (info.exists) {
    try {
      const stats = fs.statSync(CONFIG_FILE)
      info.size = stats.size
      info.modified = stats.mtime
    } catch (error) {
      info.error = error.message
    }
  }

  return info
}

/**
 * Validates a specific configuration value
 * @param {string} key - Configuration key (dot notation supported)
 * @param {*} value - Value to validate
 * @returns {Object} - { valid: boolean, error?: string, normalizedValue?: * }
 */
export function validateConfigValue(key, value) {
  const keyParts = key.split('.')
  
  if (keyParts[0] === 'favorites') {
    if (keyParts.length === 1) {
      // Validating entire favorites array
      if (!Array.isArray(value)) {
        return { valid: false, error: 'Favorites must be an array' }
      }
      const validFavorites = value.filter(fav => typeof fav === 'string' && fav.length > 0)
      return { valid: true, normalizedValue: validFavorites }
    } else {
      // Validating individual favorite
      if (typeof value !== 'string' || value.length === 0) {
        return { valid: false, error: 'Favorite team must be a non-empty string' }
      }
      return { valid: true, normalizedValue: value }
    }
  }
  
  if (keyParts[0] === 'colors') {
    if (keyParts.length === 2) {
      const colorKey = keyParts[1]
      if (!(colorKey in DEFAULT_CONFIG.colors)) {
        return { valid: false, error: `Unknown color setting: ${colorKey}` }
      }
      if (typeof value !== 'string' || !VALID_COLORS.includes(value.toLowerCase())) {
        return { valid: false, error: `Invalid color. Must be one of: ${VALID_COLORS.join(', ')}` }
      }
      return { valid: true, normalizedValue: value.toLowerCase() }
    }
  }
  
  if (keyParts[0] === 'display') {
    if (keyParts.length === 2) {
      const displayKey = keyParts[1]
      if (!(displayKey in DEFAULT_CONFIG.display)) {
        return { valid: false, error: `Unknown display setting: ${displayKey}` }
      }
      
      switch (displayKey) {
        case 'showVenue':
        case 'showTime':
        case 'compactMode':
          if (typeof value !== 'boolean') {
            return { valid: false, error: `${displayKey} must be a boolean` }
          }
          break
        case 'refreshInterval':
          if (typeof value !== 'number' || value < 1000 || value > 60000) {
            return { valid: false, error: 'refreshInterval must be between 1000 and 60000' }
          }
          break
      }
      return { valid: true, normalizedValue: value }
    }
  }
  
  if (keyParts[0] === 'polling') {
    if (keyParts.length === 2) {
      const pollingKey = keyParts[1]
      if (!(pollingKey in DEFAULT_CONFIG.polling)) {
        return { valid: false, error: `Unknown polling setting: ${pollingKey}` }
      }
      
      if (typeof value !== 'number' || value < 1000) {
        return { valid: false, error: `${pollingKey} must be a number >= 1000` }
      }
      
      const maxValues = {
        liveGameInterval: 30000,
        scheduledGameInterval: 300000,
        halftimeInterval: 120000
      }
      
      if (value > maxValues[pollingKey]) {
        return { valid: false, error: `${pollingKey} must be <= ${maxValues[pollingKey]}` }
      }
      
      return { valid: true, normalizedValue: value }
    }
  }
  
  return { valid: false, error: `Unknown configuration key: ${key}` }
}