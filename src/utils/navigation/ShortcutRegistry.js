class ShortcutRegistry {
  constructor() {
    this.shortcuts = new Map()
    this.categories = new Set()
  }

  register(id, shortcut) {
    this.shortcuts.set(id, {
      id,
      keys: Array.isArray(shortcut.keys) ? shortcut.keys : [shortcut.keys],
      description: shortcut.description,
      category: shortcut.category || 'General',
      global: shortcut.global || false,
      ...shortcut
    })

    this.categories.add(shortcut.category || 'General')
  }

  unregister(id) {
    this.shortcuts.delete(id)
  }

  getByCategory(category) {
    return Array.from(this.shortcuts.values())
      .filter(shortcut => shortcut.category === category)
  }

  getGlobalShortcuts() {
    return Array.from(this.shortcuts.values())
      .filter(shortcut => shortcut.global)
  }

  generateHelpText(category = null) {
    let shortcuts

    if (category) {
      shortcuts = this.getByCategory(category)
    } else {
      shortcuts = Array.from(this.shortcuts.values())
    }

    if (shortcuts.length === 0) {
      return 'No keyboard shortcuts available.'
    }

    // Group by category
    const grouped = shortcuts.reduce((acc, shortcut) => {
      const cat = shortcut.category
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(shortcut)
      return acc
    }, {})

    let helpText = ''

    Object.entries(grouped).forEach(([cat, catShortcuts]) => {
      helpText += `\n${cat}:\n`
      helpText += '='.repeat(cat.length + 1) + '\n'

      catShortcuts.forEach(shortcut => {
        const keys = shortcut.keys.join(', ')
        helpText += `  ${keys.padEnd(15)} ${shortcut.description}\n`
      })
    })

    return helpText
  }

  clear() {
    this.shortcuts.clear()
    this.categories.clear()
  }
}

const globalShortcutRegistry = new ShortcutRegistry()

// Register default global shortcuts
globalShortcutRegistry.register('quit-q', {
  keys: 'q',
  description: 'Quit application',
  category: 'Global',
  global: true
})

globalShortcutRegistry.register('quit-esc', {
  keys: 'ESC',
  description: 'Quit application',
  category: 'Global',
  global: true
})

globalShortcutRegistry.register('quit-ctrl-c', {
  keys: 'Ctrl+C',
  description: 'Quit application',
  category: 'Global',
  global: true
})

module.exports = {
  ShortcutRegistry,
  globalShortcutRegistry
}
