export const formatters = {
  /**
   * Format a Discord snowflake ID for display
   */
  formatChannelId: (id: string) => {
    if (!id) return 'Non configuré'
    return `${id.slice(0, 6)}...${id.slice(-4)}`
  },

  /**
   * Format experience points
   */
  formatXP: (xp: number) => {
    if (xp >= 1000000) {
      return `${(xp / 1000000).toFixed(1)}M XP`
    } else if (xp >= 1000) {
      return `${(xp / 1000).toFixed(1)}K XP`
    }
    return `${xp} XP`
  },

  /**
   * Format voice time in minutes/hours
   */
  formatVoiceTime: (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return `${hours}h ${remainingMinutes}m`
    }
    return `${minutes}m`
  },

  /**
   * Format numbers with separators
   */
  formatNumber: (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num)
  },

  /**
   * Format relative time
   */
  formatRelativeTime: (date: Date | string) => {
    const now = new Date()
    const target = new Date(date)
    const diffInSeconds = Math.floor((now.getTime() - target.getTime()) / 1000)

    if (diffInSeconds < 60) return 'À l\'instant'
    if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`
    if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)}h`
    if (diffInSeconds < 604800) return `Il y a ${Math.floor(diffInSeconds / 86400)} jours`
    
    return target.toLocaleDateString('fr-FR')
  }
}