const DEFAULT_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
};

export function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: { ...DEFAULT_HEADERS, ...headers },
    body: JSON.stringify(body),
  };
}

export function error(statusCode, message, headers) {
  return json(statusCode, { error: message }, headers);
}

export function noContent(headers = {}) {
  return {
    statusCode: 204,
    headers: { ...headers },
    body: '',
  };
}

export function parseJsonBody(event) {
  if (!event.body) {
    return { valid: false, error: 'request body is required' };
  }
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;
  try {
    return { valid: true, value: JSON.parse(raw) };
  } catch {
    return { valid: false, error: 'request body must be valid JSON' };
  }
}
