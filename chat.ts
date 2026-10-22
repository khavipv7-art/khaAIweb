type Env = {
  AI_API_KEY?: string;
  AI_BASE_URL?: string;
  AI_MODEL?: string;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });

function moodFor(text: string): string {
  const value = text.toLowerCase();
  if (/buồn|mệt|stress|cô đơn|khóc|áp lực|tệ quá/.test(value)) return 'empathetic';
  if (/haha|😂|🤣|vui|tuyệt|đỉnh|hay quá|cảm ơn/.test(value)) return 'happy';
  if (/là gì|tại sao|vì sao|thế nào|sao vậy|giải thích/.test(value)) return 'curious';
  return 'speaking';
}

const styleInstructions: Record<string, string> = {
  genz: 'Nói tiếng Việt tự nhiên, thân thiện, trẻ trung vừa đủ; không lạm dụng tiếng lóng hoặc emoji.',
  warm: 'Nói tiếng Việt ấm áp, nhẹ nhàng, kiên nhẫn và biết lắng nghe. Không giả vờ có cảm xúc hay trải nghiệm của con người.',
  clever: 'Nói tiếng Việt rõ ràng, thông minh, có cấu trúc, dí dỏm vừa phải. Giải thích dễ hiểu và nêu rõ khi không chắc.',
};

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  let body: { message?: unknown; style?: unknown; history?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return json({ error: 'Dữ liệu gửi lên không phải JSON hợp lệ.' }, 400);
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) return json({ error: 'Bạn hãy nhập tin nhắn trước nhé.' }, 400);
  if (message.length > 4000) return json({ error: 'Tin nhắn quá dài. Hãy rút gọn dưới 4.000 ký tự nhé.' }, 413);

  const apiKey = env.AI_API_KEY;
  if (!apiKey) {
    return json({
      error: 'Chưa cấu hình AI_API_KEY. Hãy thêm API key trong Cloudflare Pages Settings → Variables and Secrets.',
    }, 503);
  }

  const requestedStyle = typeof body.style === 'string' ? body.style : 'genz';
  const style = styleInstructions[requestedStyle] ? requestedStyle : 'genz';
  const rawHistory = Array.isArray(body.history) ? body.history : [];
  const history: ChatMessage[] = rawHistory
    .filter((item): item is { role: string; content: string } =>
      !!item && typeof item === 'object' &&
      typeof (item as { role?: unknown }).role === 'string' &&
      typeof (item as { content?: unknown }).content === 'string')
    .filter(item => (item.role === 'user' || item.role === 'assistant') && item.content.trim().length > 0)
    .slice(-12)
    .map(item => ({ role: item.role as ChatMessage['role'], content: item.content.slice(0, 4000) }));

  const baseUrl = (env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = env.AI_MODEL || 'gpt-4o-mini';

  try {
    const upstream = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.75,
        max_tokens: 700,
        messages: [
          {
            role: 'system',
            content: `Bạn là CYAN, trợ lý AI đồng hành thân thiện, trả lời bằng tiếng Việt trừ khi người dùng yêu cầu ngôn ngữ khác. ${styleInstructions[style]} Trả lời hữu ích, trung thực, dễ đọc. Không khẳng định bạn có cảm xúc, cơ thể hoặc ký ức ngoài nội dung được cung cấp. Nếu câu hỏi có rủi ro cao, hãy thận trọng và khuyến khích tìm nguồn chuyên môn phù hợp.`,
          },
          ...history,
          { role: 'user', content: message },
        ],
      }),
    });

    if (!upstream.ok) {
      // Do not expose upstream response bodies, which may contain provider details.
      return json({ error: `Nhà cung cấp AI trả về lỗi HTTP ${upstream.status}. Hãy kiểm tra API key, model và hạn mức.` }, 502);
    }

    const data = await upstream.json() as {
      choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    const reply = typeof content === 'string'
      ? content.trim()
      : Array.isArray(content)
        ? content.map(part => part.text || '').join('').trim()
        : '';

    if (!reply) return json({ error: 'AI chưa trả về nội dung. Bạn thử gửi lại nhé.' }, 502);
    return json({ reply, mood: moodFor(reply), demo: false });
  } catch {
    return json({ error: 'Không kết nối được nhà cung cấp AI. Hãy kiểm tra AI_BASE_URL và thử lại.' }, 502);
  }
}
