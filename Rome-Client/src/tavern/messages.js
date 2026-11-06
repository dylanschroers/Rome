export const MAX_MESSAGE = 500
const SAME_GROUP_MS = 5 * 60 * 1000

export const authorName = (message) => message.name || message.userId || 'Someone'

// Back-to-back messages from one person within a few minutes read as one turn of speech.
export function groupMessages(messages) {
  const groups = []
  for (const message of messages) {
    const last = groups[groups.length - 1]
    const time = Date.parse(message.timestamp)
    const lastTime = last ? Date.parse(last.messages[last.messages.length - 1].timestamp) : NaN
    if (last && last.userId === message.userId && authorName(message) === last.name && time - lastTime < SAME_GROUP_MS) {
      last.messages.push(message)
    } else {
      groups.push({ key: message.id ?? `${message.userId}-${message.timestamp}`, userId: message.userId, name: authorName(message), messages: [message] })
    }
  }
  return groups
}
