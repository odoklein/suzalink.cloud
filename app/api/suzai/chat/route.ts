import { NextRequest, NextResponse } from 'next/server';
import { MistralAI } from '@/lib/suzai/mistralAI';

const mistralAI = new MistralAI(process.env.MISTRAL_API_KEY || '');

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { message, context } = await req.json();

    if (!message) {
      return NextResponse.json({ 
        success: false, 
        message: 'Message is required' 
      }, { status: 400 });
    }

    // Simple conversational chat with Mistral
    const response = await mistralAI.generateResponse([
      { role: 'user', content: message }
    ], context || { currentPage: 'dashboard', availableActions: [] });

    return NextResponse.json({
      success: true,
      message: response,
      data: null,
      suggestedActions: []
    });

  } catch (error) {
    console.error('Error in SUZai chat:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Désolé, j\'ai rencontré une erreur. Pouvez-vous reformuler votre demande ?' 
    }, { status: 500 });
  }
} 