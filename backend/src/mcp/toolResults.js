// Helpers to build tool results in the same way in every MCP module.
import { BackendError } from './backendClient.js';

// Successful result: a text for the model, plus optional structured data
export function textResult(text, structuredContent) {
  const result = { content: [{ type: 'text', text }] };
  if (structuredContent !== undefined) result.structuredContent = structuredContent;
  return result;
}

// Failed result that the model can read (isError: true) instead of a protocol error.
// Messages of BackendError come from our API and are safe to show; other errors are
// hidden behind a generic message (the details are logged on stderr).
export function errorResult(err) {
  if (err instanceof BackendError) {
    return { isError: true, content: [{ type: 'text', text: err.message }] };
  }
  console.error(err);
  const message = typeof err === 'string' ? err : 'Unexpected error, please try again later';
  return { isError: true, content: [{ type: 'text', text: message }] };
}
