import crypto from 'crypto';

type QueryResult<T = any> = {
  data: T;
  error: any;
  count: number | null;
  status: number;
  statusText: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const postgrestUrl =
  process.env.POSTGREST_URL ||
  (supabaseUrl ? `${supabaseUrl}/rest/v1` : '');

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const jwtSecret = (() => {
  if (supabaseServiceRoleKey) return '';

  const value = process.env.POSTGREST_JWT_SECRET;
  if (!value) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY is required for hosted Supabase, or POSTGREST_JWT_SECRET is required for self-hosted PostgREST'
      );
    }
    return 'build-placeholder-secret-that-is-long-enough';
  }
  if (value.length < 32) throw new Error('POSTGREST_JWT_SECRET must be at least 32 characters');
  return value;
})();

function base64Url(value: string) {
  return Buffer.from(value).toString('base64url');
}

function createSelfHostedServiceJwt() {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));

  const payload = base64Url(
    JSON.stringify({
      role: 'service_role',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
    })
  );

  const unsigned = `${header}.${payload}`;

  const signature = crypto
    .createHmac('sha256', jwtSecret)
    .update(unsigned)
    .digest('base64url');

  return `${unsigned}.${signature}`;
}

const serviceKey = supabaseServiceRoleKey || createSelfHostedServiceJwt();

function encodeValue(value: unknown) {
  return encodeURIComponent(String(value));
}

function parseResponseBody(text: string): any {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function makeError(body: any, status: number, statusText: string) {
  if (body && typeof body === 'object') return body;

  return {
    message: typeof body === 'string' ? body : statusText,
    details: null,
    hint: null,
    code: `HTTP_${status}`,
  };
}

class QueryBuilder {
  private table: string;
  private method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET';
  private columns = '*';
  private filters: string[] = [];
  private orderings: string[] = [];
  private limitValue: number | null = null;
  private body: unknown = undefined;
  private returnRepresentation = false;
  private singleMode: 'single' | 'maybeSingle' | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = '*') {
    this.columns = columns;
    this.returnRepresentation = true;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push(
      `${encodeURIComponent(column)}=eq.${encodeValue(value)}`
    );
    return this;
  }

  in(column: string, values: unknown[]) {
    const encoded = values.map((value) => encodeValue(value)).join(',');
    this.filters.push(
      `${encodeURIComponent(column)}=in.(${encoded})`
    );
    return this;
  }

  is(column: string, value: null | boolean) {
    const operator = value === null ? 'is.null' : `is.${value}`;
    this.filters.push(
      `${encodeURIComponent(column)}=${operator}`
    );
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    const direction =
      options?.ascending === false ? 'desc' : 'asc';

    this.orderings.push(
      `${encodeURIComponent(column)}.${direction}`
    );

    return this;
  }

  limit(value: number) {
    this.limitValue = Math.max(0, Math.floor(value));
    return this;
  }

  insert(values: unknown) {
    this.method = 'POST';
    this.body = values;
    return this;
  }

  update(values: unknown) {
    this.method = 'PATCH';
    this.body = values;
    return this;
  }

  delete() {
    this.method = 'DELETE';
    return this;
  }

  single() {
    this.singleMode = 'single';
    return this;
  }

  maybeSingle() {
    this.singleMode = 'maybeSingle';
    return this;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<QueryResult> {
    if (!postgrestUrl) {
      throw new Error(
        'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.'
      );
    }

    const url = new URL(
`${postgrestUrl.replace(/\/$/, '')}/${this.table}`
    );

    if (this.method === 'GET') {
      url.searchParams.set('select', this.columns);
    } else if (this.returnRepresentation) {
      url.searchParams.set('select', this.columns);
    }

    for (const filter of this.filters) {
      const separator = filter.indexOf('=');
      const key = filter.slice(0, separator);
      const value = filter.slice(separator + 1);
      url.searchParams.append(key, decodeURIComponent(value));
    }

    if (this.orderings.length) {
      url.searchParams.set('order', this.orderings.join(','));
    }

    if (this.limitValue !== null) {
      url.searchParams.set('limit', String(this.limitValue));
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      Accept: 'application/json',
      'Accept-Profile': 'public',
    };

    if (this.method !== 'GET' && this.method !== 'DELETE') {
      headers['Content-Type'] = 'application/json';
    }

    if (this.returnRepresentation && this.method !== 'GET') {
      headers.Prefer = 'return=representation';
    }

    const response = await fetch(url.toString(), {
      method: this.method,
      headers,
      body:
        this.body === undefined
          ? undefined
          : JSON.stringify(this.body),
    });

    const text = await response.text();
    const parsed = parseResponseBody(text);

    if (!response.ok) {
      return {
        data: null,
        error: makeError(parsed, response.status, response.statusText),
        count: null,
        status: response.status,
        statusText: response.statusText,
      };
    }

    let data = parsed;

    if (this.singleMode) {
      if (Array.isArray(data)) {
        if (this.singleMode === 'single' && data.length !== 1) {
          return {
            data: null,
            error: {
              code: 'PGRST116',
              details:
                data.length === 0
                  ? 'JSON object requested, multiple (or no) rows returned'
                  : `Results contain ${data.length} rows`,
              hint: null,
              message:
                'JSON object requested, multiple (or no) rows returned',
            },
            count: null,
            status: 406,
            statusText: 'Not Acceptable',
          };
        }

        data =
          data.length === 0
            ? null
            : data[0];
      }
    }

    return {
      data,
      error: null,
      count: null,
      status: response.status,
      statusText: response.statusText,
    };
  }
}

async function callRpc(functionName: string, args: Record<string, unknown>) {
  if (!postgrestUrl) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.'
    );
  }

  const response = await fetch(
    `${postgrestUrl.replace(/\/$/, '')}/rpc/${encodeURIComponent(functionName)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Content-Profile': 'public',
      },
      body: JSON.stringify(args),
    }
  );

  const text = await response.text();
  const parsed = parseResponseBody(text);
  if (!response.ok) {
    return {
      data: null,
      error: makeError(parsed, response.status, response.statusText),
      count: null,
      status: response.status,
      statusText: response.statusText,
    };
  }

  return {
    data: parsed,
    error: null,
    count: null,
    status: response.status,
    statusText: response.statusText,
  };
}

export const supabaseAdmin = {
  from(table: string) {
    return new QueryBuilder(table);
  },
  rpc(functionName: string, args: Record<string, unknown>) {
    return callRpc(functionName, args);
  },
};

export function getPostgrestUrl() {
  return postgrestUrl;
}
