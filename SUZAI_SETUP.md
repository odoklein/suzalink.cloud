# SUZai AI Integration Setup Guide

## 🚀 Mistral AI Integration

SUZai now uses Mistral AI for intelligent understanding and content generation. Follow these steps to set up the integration:

### 1. Get Mistral API Key

1. Visit [Mistral AI Platform](https://console.mistral.ai/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the API key

### 2. Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# Mistral AI API Key
MISTRAL_API_KEY=your_mistral_api_key_here
```

### 3. Features Enabled

With Mistral AI integration, SUZai can now:

#### 🤖 **Intelligent Understanding**
- Understand natural language requests in French
- Extract entities (names, emails, dates, amounts)
- Identify user intentions with high confidence
- Context-aware responses based on current page

#### ✉️ **Email Generation**
- Generate professional email content
- Create optimized subject lines
- Format emails in HTML and text
- Support different tones (professional, friendly, formal)

#### 📄 **Invoice Content**
- Generate detailed project descriptions
- Create professional payment terms
- Add appropriate notes and context
- Support multiple currencies

#### 🎯 **Smart Actions**
- Automatically execute CRM actions
- Create bookings with extracted details
- Generate invoices with AI content
- Create clients with proper formatting

### 4. Example Interactions

#### Email Generation
```
User: "Envoie un email à john@example.com pour lui demander les factures de juillet"
SUZai: *Generates professional email with subject and content*
```

#### Booking Creation
```
User: "Crée un rendez-vous avec Marie Dupont demain à 14h"
SUZai: *Creates booking with extracted details*
```

#### Invoice Generation
```
User: "Génère une facture pour le projet web de 5000€"
SUZai: *Generates invoice with detailed description*
```

### 5. API Endpoints

#### Chat Processing
```
POST /api/suzai/chat
{
  "message": "User message",
  "context": {
    "currentPage": "email",
    "availableActions": ["send_email", "compose_email"]
  }
}
```

#### Content Generation
```
PUT /api/suzai/chat
{
  "action": "generate_email",
  "recipient": "john@example.com",
  "subject": "Factures juillet",
  "context": "Demande de factures"
}
```

### 6. Error Handling

The system includes:
- Fallback processing if AI is unavailable
- Error messages in French
- Graceful degradation
- User-friendly error notifications

### 7. Security

- API keys are stored in environment variables
- No sensitive data is logged
- All requests are validated
- Rate limiting support

### 8. Testing

Test the integration with:
1. Simple requests: "Bonjour"
2. Email requests: "Envoie un email"
3. Complex requests: "Crée un rendez-vous avec Jean pour demain à 15h pour discuter du projet"

### 9. Troubleshooting

#### Common Issues:
- **API Key Error**: Check your Mistral API key in `.env.local`
- **Network Error**: Verify internet connection
- **Rate Limit**: Mistral has rate limits, check your plan

#### Debug Mode:
Check browser console for detailed logs of AI processing.

---

## 🎉 Ready to Use!

Once configured, SUZai will provide intelligent, context-aware assistance across your entire CRM system! 