import type { MemoryCategory } from '@/types/index';

interface ExtractedMemory {
  category: MemoryCategory;
  title: string;
  description: string;
}

const PATTERNS: {
  regex: RegExp;
  category: MemoryCategory;
  extract: (match: RegExpExecArray) => { title: string; description: string };
}[] = [
  {
    regex: /i(?:'m| am) saving (?:up |)for (?:a |an |the |)(.+)/i,
    category: 'Goals',
    extract: (m) => ({
      title: `Saving for ${m[1].trim()}`,
      description: `User is saving for ${m[1].trim()}`,
    }),
  },
  {
    regex:
      /(?:my |)(?:birthday|birth date|born on) (?:is |)(?:the |)(\d{1,2}(?:st|nd|rd|th)?(?:\s+of)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\s*,?\s*\d{4})?)/i,
    category: 'Personal Information',
    extract: (m) => ({
      title: `Birthday: ${m[1].trim()}`,
      description: `User's birthday is ${m[1].trim()}`,
    }),
  },
  {
    regex: /i (?:work|am working) (?:as |)(?:a |)(.+?)(?:\.|,| at| for|$)/i,
    category: 'People',
    extract: (m) => ({
      title: `Works as ${m[1].trim()}`,
      description: `User works as ${m[1].trim()}`,
    }),
  },
  {
    regex: /i(?:'m| am) (?:building|working on|creating|making|developing) (.+)/i,
    category: 'Projects',
    extract: (m) => ({
      title: `Building ${m[1].trim()}`,
      description: `User is building ${m[1].trim()}`,
    }),
  },
  {
    regex: /i (?:live|reside|stay) (?:in |at |)(.+)/i,
    category: 'Personal Information',
    extract: (m) => ({
      title: `Lives in ${m[1].trim()}`,
      description: `User lives in ${m[1].trim()}`,
    }),
  },
  {
    regex: /i(?:'m| am) (?:learning|studying|practicing) (.+)/i,
    category: 'Goals',
    extract: (m) => ({
      title: `Learning ${m[1].trim()}`,
      description: `User is learning ${m[1].trim()}`,
    }),
  },
  {
    regex: /i(?:'d| would) like to (.+)/i,
    category: 'Goals',
    extract: (m) => ({
      title: `Wants to ${m[1].trim()}`,
      description: `User would like to ${m[1].trim()}`,
    }),
  },
  {
    regex: /i (?:love|enjoy|like|prefer) (.+)/i,
    category: 'Preferences',
    extract: (m) => ({
      title: `Likes ${m[1].trim()}`,
      description: `User likes ${m[1].trim()}`,
    }),
  },
  {
    regex: /i (?:hate|dislike|don't like|can't stand) (.+)/i,
    category: 'Preferences',
    extract: (m) => ({
      title: `Dislikes ${m[1].trim()}`,
      description: `User dislikes ${m[1].trim()}`,
    }),
  },
  {
    regex: /i (?:need to|have to|must|should) (.+)/i,
    category: 'Reminders',
    extract: (m) => ({
      title: `Need to ${m[1].trim()}`,
      description: `User needs to ${m[1].trim()}`,
    }),
  },
  {
    regex: /i(?:'m| am) trying to (.+)/i,
    category: 'Goals',
    extract: (m) => ({
      title: `Trying to ${m[1].trim()}`,
      description: `User is trying to ${m[1].trim()}`,
    }),
  },
];

export function extractMemories(text: string): ExtractedMemory[] {
  const results: ExtractedMemory[] = [];

  for (const { regex, category, extract } of PATTERNS) {
    const match = regex.exec(text);
    if (match) {
      const { title, description } = extract(match);
      results.push({ category, title, description });
    }
  }

  return results;
}

export function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}
