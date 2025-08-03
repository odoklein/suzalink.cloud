export interface ActionContext {
  currentPage: string;
  userData?: any;
  availableActions: string[];
  currentData?: any;
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
  nextActions?: string[];
}

export class SuzaiActionEngine {
  private context: ActionContext;

  constructor(context: ActionContext) {
    this.context = context;
  }

  async processMessage(message: string): Promise<ActionResult> {
    try {
      // Simple chat with Mistral AI
      const response = await fetch('/api/suzai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          context: {
            currentPage: this.context.currentPage,
            availableActions: this.context.availableActions,
            userData: this.context.userData,
            currentData: this.context.currentData
          },
          userId: this.context.userData?.userId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process message with AI');
      }

      const result = await response.json();
      
      return {
        success: result.success,
        message: result.message,
        data: result.data,
        nextActions: result.suggestedActions || []
      };
    } catch (error) {
      console.error('Error processing message with AI:', error);
      
      return {
        success: false,
        message: "Désolé, j'ai rencontré une erreur. Pouvez-vous reformuler votre demande ?",
        nextActions: []
      };
    }
  }
} 