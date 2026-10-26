import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// In-memory simple rate limiting: max 20 requests per minute per IP
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= 25) {
    return false;
  }
  entry.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.ip || 'local-ip';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a minute before sending more prompts.' },
        { status: 429 }
      );
    }

    const { messages, userSummary, mode } = await req.json();

    const provider = process.env.AI_PROVIDER || 'groq';
    const baseUrl =
      process.env.AI_BASE_URL ||
      (provider === 'nvidia'
        ? 'https://integrate.api.nvidia.com/v1'
        : 'https://api.groq.com/openai/v1');
    const apiKey = process.env.AI_API_KEY;
    const model =
      process.env.AI_MODEL ||
      (provider === 'nvidia'
        ? 'meta/llama-3.1-70b-instruct'
        : 'llama-3.3-70b-versatile');

    // If API key is not configured, throw error
    if (!apiKey || apiKey === 'placeholder') {
      return NextResponse.json(
        {
          error: 'AI_API_KEY not configured. To enable AI Coach features, add your API key to .env.local. See README.md for setup instructions.',
        },
        { status: 503 }
      );
    }

    // Build system prompt based on user prompt requirements
    const systemPrompt = `You are the Daily Planner AI Coach for a 3rd-year CSE student in Chennai preparing for software engineering placements, badminton tournaments, and startup execution.

Student Context Summary:
${JSON.stringify(userSummary || {})}

Core Directives:
1. Be concise, honest, and direct. Push for from-blank practice (no notes first).
2. Avoid generic flattery or filler. Focus on execution and active recall.
3. Attack known student weaknesses: recognition without recall, late bedtimes, inconsistent focus.
${
  mode === 'parse_task'
    ? 'IMPORTANT: Return strictly valid JSON in format: {"title": "string", "at_time": "HH:mm" or null, "duration_min": number or null}. No markdown wrappers.'
    : mode === 'generate_schedule'
    ? 'IMPORTANT: Return a clean schedule routine. Output ONLY lines in format: "HH:mm - Activity name (core/heavy/soft/fixed) // optional guidance note". No preamble, no explanation, no markdown backticks.'
    : ''
}`;

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        stream: true,
        temperature: mode === 'parse_task' ? 0.1 : 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI provider error:', response.status, errText);
      return NextResponse.json(
        { error: `AI provider error (${response.status})` },
        { status: 502 }
      );
    }

    // Stream transformation to SSE/plain text chunks
    const readable = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ')) {
                const dataStr = trimmed.slice(6);
                if (dataStr === '[DONE]') {
                  controller.close();
                  return;
                }
                try {
                  const parsed = JSON.parse(dataStr);
                  const delta = parsed.choices?.[0]?.delta?.content;
                  if (delta) {
                    controller.enqueue(new TextEncoder().encode(delta));
                  }
                } catch {
                  // parse errors in chunk ignored
                }
              }
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    console.error('Assistant route exception:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
