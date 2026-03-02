import { Injectable } from '@nestjs/common';
import { normalize, isAbsolute } from 'path';

const DANGEROUS_TAG_RE =
  /<\s*\/?\s*(script|iframe|object|embed|applet|form|base)\b[^>]*>/gi;
const EVENT_ATTR_RE = /\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JS_URL_RE =
  /(?:href|src|action)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi;

const HTML_ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
};

const SAFE_ID_RE = /[^a-zA-Z0-9_-]/g;

@Injectable()
export class SanitizationService {
  sanitizeHtml(input: string): string {
    let result = input;
    result = result.replace(DANGEROUS_TAG_RE, '');
    result = result.replace(EVENT_ATTR_RE, '');
    result = result.replace(JS_URL_RE, '');
    return result;
  }

  sanitizePath(input: string): string {
    if (isAbsolute(input)) {
      throw new Error('Absolute paths are not allowed');
    }

    const normalized = normalize(input);

    if (
      normalized.startsWith('..') ||
      normalized.includes('/..') ||
      normalized.includes('\\..')
    ) {
      throw new Error('Path traversal is not allowed');
    }

    const sanitized = normalized.replace(/\0/g, '');
    return sanitized;
  }

  sanitizeId(input: string): string {
    return input.replace(SAFE_ID_RE, '');
  }

  escapeHtml(input: string): string {
    return input.replace(/[&<>"']/g, (char) => HTML_ENTITY_MAP[char] ?? char);
  }

  sanitizeJson(input: string): string {
    const parsed: unknown = JSON.parse(input);

    if (parsed === null || typeof parsed !== 'object') {
      return JSON.stringify(parsed);
    }

    return JSON.stringify(parsed, (_key, value: unknown) => {
      if (
        typeof value === 'string' &&
        (value === '__proto__' ||
          value === 'constructor' ||
          value === 'prototype')
      ) {
        return undefined;
      }
      return value;
    });
  }
}
