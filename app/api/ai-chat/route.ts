import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// import your AI model API client here (e.g., fetch for Mistral)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper: Check user session and role
async function getUser(req: NextRequest) {
  // This example assumes JWT in Authorization header (adapt for your auth method)
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  // Optionally check user role here
  return user;
}

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  let { conversation_id, message } = body;
  if (!message) {
    return NextResponse.json({ error: 'No message provided' }, { status: 400 });
  }

  // Ensure conversation exists or create a new one
  if (!conversation_id) {
    // Create a new conversation for this user
    const { data: newConv, error: convErr } = await supabase.from('ai_conversations').insert([
      {
        user_id: user.id,
        status: 'active',
      },
    ]).select().single();
    if (convErr) {
      return NextResponse.json({ error: convErr.message }, { status: 500 });
    }
    conversation_id = newConv.id;
  } else {
    // Check if conversation exists
    const { data: existingConv } = await supabase.from('ai_conversations').select('id').eq('id', conversation_id).single();
    if (!existingConv) {
      // Create if not found
      const { data: newConv, error: convErr } = await supabase.from('ai_conversations').insert([
        {
          user_id: user.id,
          status: 'active',
          started_at: new Date().toISOString(),
        },
      ]).select().single();
      if (convErr) {
        return NextResponse.json({ error: convErr.message }, { status: 500 });
      }
      conversation_id = newConv.id;
    }
  }

  // 1. Store user message
  const { data: userMsg, error: msgErr } = await supabase.from('ai_chat_messages').insert([
    {
      conversation_id,
      sender_id: user.id,
      sender_type: 'user',
      content: message,
    },
  ]).select().single();

  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }

  // 2. Call Gemini AI model (Google Gemini API)
  let aiResponseText = '';
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    // Debug: Check if API key is present
    console.log('API Key present:', !!geminiApiKey);
    
    // Make sure API key is not undefined for TypeScript
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }
    
    const geminiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiApiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: message }
            ]
          }
        ]
      }),
    });
    
    // Debug: Log response status
    console.log('Gemini API response status:', geminiRes.status);
    
    const geminiData = await geminiRes.json();
    
    // Debug: Log full response for inspection
    console.log('Gemini API response:', JSON.stringify(geminiData, null, 2));
    
    if (geminiData.error) {
      aiResponseText = `API Error: ${geminiData.error.message || 'Unknown error'}`;
    } else {
      aiResponseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';
    }
  } catch (err) {
    console.error('Gemini API error:', err);
    aiResponseText = 'AI error: ' + (err instanceof Error ? err.message : String(err));
  }

  // 3. Store AI response
  const { data: aiMsg, error: aiErr } = await supabase.from('ai_chat_messages').insert([
    {
      conversation_id,
      sender_id: user.id, // or a special AI user id
      sender_type: 'ai',
      content: aiResponseText,
    },
  ]).select().single();

  if (aiErr) {
    return NextResponse.json({ error: aiErr.message }, { status: 500 });
  }

  // 4. Optionally log AI interaction
  await supabase.from('ai_model_logs').insert([
    {
      message_id: aiMsg.id,
      request_payload: { prompt: message },
      response_payload: { response: aiResponseText },
    },
  ]);

  return NextResponse.json({ userMsg, aiMsg });
}
