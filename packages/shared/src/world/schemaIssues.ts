import type { ZodIssue } from 'zod';

export const pathOf = (path: readonly (string | number)[]): string =>
  path.reduce<string>((text, segment) => (typeof segment === 'number' ? `${text}[${segment}]` : text === '' ? segment : `${text}.${segment}`), '');

export const describeIssue = (issue: ZodIssue): string => {
  const where = pathOf(issue.path);
  return where === '' ? issue.message : `${where}: ${issue.message}`;
};
