import type { ClaudeCodeResponse } from './claude-code-process.js';

interface StreamJsonEvent {
  type: string;
  subtype?: string;
  content?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_result?: string;
  cost_usd?: number;
  duration_ms?: number;
  duration_api_ms?: number;
  num_turns?: number;
  is_error?: boolean;
  result?: string;
  session_id?: string;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  [key: string]: unknown;
}

export class OutputParser {
  static parse(rawOutput: string): ClaudeCodeResponse {
    const trimmed = rawOutput.trim();

    if (!trimmed) {
      return { content: '' };
    }

    const jsonResult = OutputParser.tryParseJson(trimmed);
    if (jsonResult) {
      return jsonResult;
    }

    const ndjsonResult = OutputParser.tryParseNdjson(trimmed);
    if (ndjsonResult) {
      return ndjsonResult;
    }

    return {
      content: trimmed,
    };
  }

  static extractToolCalls(
    output: string,
  ): Array<{ name: string; input: Record<string, unknown> }> {
    const toolCalls: Array<{ name: string; input: Record<string, unknown> }> =
      [];

    const lines = output.split('\n');
    for (const line of lines) {
      const parsed = OutputParser.safeJsonParse<StreamJsonEvent>(line.trim());
      if (!parsed) continue;

      if (parsed.type === 'tool_use' && parsed.tool_name) {
        toolCalls.push({
          name: parsed.tool_name,
          input: (parsed.tool_input as Record<string, unknown>) ?? {},
        });
      }
    }

    return toolCalls;
  }

  static extractContent(output: string): string {
    const lines = output.split('\n');
    const contentParts: string[] = [];

    for (const line of lines) {
      const parsed = OutputParser.safeJsonParse<StreamJsonEvent>(line.trim());
      if (!parsed) {
        if (line.trim()) contentParts.push(line.trim());
        continue;
      }

      if (parsed.type === 'assistant' && parsed.content) {
        contentParts.push(parsed.content);
      } else if (parsed.type === 'result' && parsed.result) {
        contentParts.push(parsed.result);
      }
    }

    return contentParts.join('');
  }

  static isError(output: string): boolean {
    const parsed = OutputParser.safeJsonParse<StreamJsonEvent>(output.trim());
    if (parsed?.is_error) return true;

    const lines = output.split('\n');
    for (const line of lines) {
      const lineObj = OutputParser.safeJsonParse<StreamJsonEvent>(line.trim());
      if (lineObj?.type === 'error' || lineObj?.is_error) return true;
    }

    return false;
  }

  static extractError(
    output: string,
  ): { code: string; message: string } | null {
    const lines = output.split('\n');

    for (const line of lines) {
      const parsed = OutputParser.safeJsonParse<StreamJsonEvent>(line.trim());
      if (!parsed) continue;

      if (parsed.type === 'error' || parsed.is_error) {
        return {
          code: (parsed.subtype as string) ?? 'UNKNOWN_ERROR',
          message:
            (parsed.content as string) ??
            (parsed.result as string) ??
            'Unknown error occurred',
        };
      }
    }

    return null;
  }

  private static tryParseJson(raw: string): ClaudeCodeResponse | null {
    const parsed = OutputParser.safeJsonParse<StreamJsonEvent>(raw);
    if (!parsed) return null;

    const content =
      (parsed.result as string) ?? (parsed.content as string) ?? '';

    const response: ClaudeCodeResponse = { content };

    if (parsed.usage) {
      response.tokensUsed =
        (parsed.usage.input_tokens ?? 0) + (parsed.usage.output_tokens ?? 0);
    }

    if (parsed.duration_ms) {
      response.duration = parsed.duration_ms;
    }

    return response;
  }

  private static tryParseNdjson(raw: string): ClaudeCodeResponse | null {
    const lines = raw.split('\n').filter((l) => l.trim());

    if (lines.length < 2) return null;

    let hasValidJson = false;
    const contentParts: string[] = [];
    const toolCalls: Array<{
      name: string;
      input: Record<string, unknown>;
      result?: string;
    }> = [];
    let tokensUsed: number | undefined;
    let duration: number | undefined;
    let pendingToolName: string | undefined;
    let pendingToolInput: Record<string, unknown> | undefined;

    for (const line of lines) {
      const parsed = OutputParser.safeJsonParse<StreamJsonEvent>(line.trim());
      if (!parsed) continue;

      hasValidJson = true;

      if (
        parsed.type === 'assistant' &&
        parsed.subtype === 'text' &&
        parsed.content
      ) {
        contentParts.push(parsed.content);
      } else if (parsed.type === 'result' && parsed.result) {
        contentParts.push(parsed.result);
      } else if (parsed.type === 'tool_use') {
        pendingToolName = parsed.tool_name;
        pendingToolInput = (parsed.tool_input as Record<string, unknown>) ?? {};
      } else if (parsed.type === 'tool_result') {
        if (pendingToolName) {
          toolCalls.push({
            name: pendingToolName,
            input: pendingToolInput ?? {},
            result: parsed.content ?? parsed.result,
          });
          pendingToolName = undefined;
          pendingToolInput = undefined;
        }
      }

      if (parsed.usage) {
        tokensUsed =
          (parsed.usage.input_tokens ?? 0) + (parsed.usage.output_tokens ?? 0);
      }

      if (parsed.duration_ms) {
        duration = parsed.duration_ms;
      }
    }

    if (!hasValidJson) return null;

    return {
      content: contentParts.join(''),
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      tokensUsed,
      duration,
    };
  }

  private static safeJsonParse<T>(str: string): T | null {
    try {
      return JSON.parse(str) as T;
    } catch {
      return null;
    }
  }
}
