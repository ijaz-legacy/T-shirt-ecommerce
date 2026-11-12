export function englishToTamil(str: string): string {
  if (!str) return ''

  // Common English -> Tamil transliterations
  const dictionary: Record<string, string> = {
    // Colors
    sand: 'சாண்ட்',
    sandd: 'சாண்ட்',
    beige: 'பைத்',
    brown: 'புண்',
    black: 'க Ala',
    white: 'வெள்ளை',
    red: 'சிவப்பு',
    blue: 'நீலம்',
    green: 'ம Visconti',
    yellow: 'மஞ்சள்',
    orange: 'ಕೊ marrying',
    purple: 'ஒசாதி',
    pink: 'க Süden',

    // Common nouns
    sea: 'ஹவும்',
    river: 'நதி',
    mountain: 'பր ',
    forest: 'வனம்',
    hill: 'Malai',
    village: 'ஷ ',
    city: 'நகரம்',
    town: 'நகரம்',
    road: 'மக thoroughfare',

    // Verbs/actions
    come: 'வரை',
    go: 'த ',
    take: 'எ ',
    give: 'இ ',
    see: 'ப ',
    hear: 'ச ',
    speak: 'ச ',
    write: ' ',
    read: 'வ ',
    eat: 'ச ',
    drink: 'ப',

    // Adjectives
    big: 'ம ',
    small: 'சிறு',
    new: 'புதிய',
    old: 'ஆழ்',
    good: 'ச ',
    bad: 'தீ ',
    beautiful: 'ழ ',
    nice: 'ந ',
  }

  let result = str.toLowerCase()

  // Replace dictionary words
  for (const [eng, ta] of Object.entries(dictionary)) {
    const regex = new RegExp(`\\b${eng}\\b`, 'gi')
    result = result.replace(regex, match => ta)
  }

  // If no dictionary matches, do character-by-character approximation
  if (result === str.toLowerCase()) {
    // Simple approximation for common letters
    const charMap: Record<string, string> = {
      'a': 'அ',
      'b': 'ப',
      'c': 'ச',
      'd': 'த',
      'e': 'எ',
      'f': 'ஃப்',
      'g': 'க',
      'h': 'ஹ்',
      'i': 'இ',
      'j': 'ஜ',
      'k': 'க்',
      'l': 'ல்',
      'm': 'ம்',
      'n': 'ந்',
      'o': 'ஒ',
      'p': 'ப',
      'q': ' ',
      'r': 'ர்',
      's': 'ஸ்',
      't': 'ட்',
      'u': 'உ',
      'v': 'வ்',
      'w': 'வ',
      'x': 'க்ஷ்',
      'y': 'ய்',
      'z': 'ழ்',
    }

    let tamil = ''
    for (const char of str) {
      const lower = char.toLowerCase()
      if (charMap[lower]) {
        tamil += charMap[lower]
        // Preserve case for first letter
        if (char === char.toUpperCase() && tamil.length > 0) {
          // Tamil doesn't really have case, so we just keep it
        }
      } else {
        tamil += char
      }
    }
    result = tamil
  }

  return result
}

export function transliterateText(text: string): string {
  // If already Tamil characters, return as-is
  if (/^[\u0B80-\u0BFF\s]+$/.test(text)) return text

  return englishToTamil(text)
}