export interface EmailTemplateData {
  guestName: string;
  guestEmail: string;
  hostName: string;
  hostEmail: string;
  meetingType: string;
  startTime: string;
  endTime: string;
  meetingLink?: string;
  location?: string;
  notes?: string;
  bookingId: string;
}

export const emailTemplates = {
  // Email sent to guest confirming their booking
  guestConfirmation: (data: EmailTemplateData) => ({
    subject: `Confirmation de votre rendez-vous - ${data.meetingType}`,
    html: `
      <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Confirmation de votre rendez-vous</h2>
          
          <p style="color: #666; line-height: 1.6;">Bonjour ${data.guestName},</p>
          
          <p style="color: #666; line-height: 1.6;">Votre rendez-vous a été confirmé avec succès !</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Détails du rendez-vous</h3>
            <p><strong>Type de réunion:</strong> ${data.meetingType}</p>
            <p><strong>Date et heure:</strong> ${data.startTime}</p>
            <p><strong>Durée:</strong> ${data.endTime}</p>
            ${data.location ? `<p><strong>Lieu:</strong> ${data.location}</p>` : ''}
            ${data.meetingLink ? `<p><strong>Lien de réunion:</strong> <a href="${data.meetingLink}" style="color: #007bff;">${data.meetingLink}</a></p>` : ''}
            ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
          </div>
          
          <p style="color: #666; line-height: 1.6;">Si vous avez des questions ou si vous devez modifier ce rendez-vous, n'hésitez pas à nous contacter.</p>
          
          <p style="color: #666; line-height: 1.6;">Cordialement,<br>${data.hostName}</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">Cet email a été envoyé automatiquement. Veuillez ne pas y répondre.</p>
        </div>
      </div>
    `,
    text: `
Confirmation de votre rendez-vous - ${data.meetingType}

Bonjour ${data.guestName},

Votre rendez-vous a été confirmé avec succès !

Détails du rendez-vous:
- Type de réunion: ${data.meetingType}
- Date et heure: ${data.startTime}
- Durée: ${data.endTime}
${data.location ? `- Lieu: ${data.location}` : ''}
${data.meetingLink ? `- Lien de réunion: ${data.meetingLink}` : ''}
${data.notes ? `- Notes: ${data.notes}` : ''}

Si vous avez des questions ou si vous devez modifier ce rendez-vous, n'hésitez pas à nous contacter.

Cordialement,
${data.hostName}
    `
  }),

  // Email sent to host notifying them of a new booking
  hostNotification: (data: EmailTemplateData) => ({
    subject: `Nouveau rendez-vous - ${data.guestName}`,
    html: `
      <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Nouveau rendez-vous confirmé</h2>
          
          <p style="color: #666; line-height: 1.6;">Bonjour ${data.hostName},</p>
          
          <p style="color: #666; line-height: 1.6;">Un nouveau rendez-vous a été réservé dans votre calendrier.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Détails du rendez-vous</h3>
            <p><strong>Invité:</strong> ${data.guestName}</p>
            <p><strong>Email:</strong> ${data.guestEmail}</p>
            <p><strong>Type de réunion:</strong> ${data.meetingType}</p>
            <p><strong>Date et heure:</strong> ${data.startTime}</p>
            <p><strong>Durée:</strong> ${data.endTime}</p>
            ${data.location ? `<p><strong>Lieu:</strong> ${data.location}</p>` : ''}
            ${data.meetingLink ? `<p><strong>Lien de réunion:</strong> <a href="${data.meetingLink}" style="color: #007bff;">${data.meetingLink}</a></p>` : ''}
            ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
          </div>
          
          <p style="color: #666; line-height: 1.6;">Ce rendez-vous a été ajouté à votre calendrier automatiquement.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">Cet email a été envoyé automatiquement. Veuillez ne pas y répondre.</p>
        </div>
      </div>
    `,
    text: `
Nouveau rendez-vous - ${data.guestName}

Bonjour ${data.hostName},

Un nouveau rendez-vous a été réservé dans votre calendrier.

Détails du rendez-vous:
- Invité: ${data.guestName}
- Email: ${data.guestEmail}
- Type de réunion: ${data.meetingType}
- Date et heure: ${data.startTime}
- Durée: ${data.endTime}
${data.location ? `- Lieu: ${data.location}` : ''}
${data.meetingLink ? `- Lien de réunion: ${data.meetingLink}` : ''}
${data.notes ? `- Notes: ${data.notes}` : ''}

Ce rendez-vous a été ajouté à votre calendrier automatiquement.
    `
  }),

  // Reminder email sent to guest before meeting
  guestReminder: (data: EmailTemplateData) => ({
    subject: `Rappel - Votre rendez-vous dans 1 heure - ${data.meetingType}`,
    html: `
      <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Rappel de votre rendez-vous</h2>
          
          <p style="color: #666; line-height: 1.6;">Bonjour ${data.guestName},</p>
          
          <p style="color: #666; line-height: 1.6;">Ceci est un rappel que votre rendez-vous commence dans 1 heure.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Détails du rendez-vous</h3>
            <p><strong>Type de réunion:</strong> ${data.meetingType}</p>
            <p><strong>Date et heure:</strong> ${data.startTime}</p>
            <p><strong>Durée:</strong> ${data.endTime}</p>
            ${data.location ? `<p><strong>Lieu:</strong> ${data.location}</p>` : ''}
            ${data.meetingLink ? `<p><strong>Lien de réunion:</strong> <a href="${data.meetingLink}" style="color: #007bff;">${data.meetingLink}</a></p>` : ''}
          </div>
          
          <p style="color: #666; line-height: 1.6;">Nous vous attendons !</p>
          
          <p style="color: #666; line-height: 1.6;">Cordialement,<br>${data.hostName}</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">Cet email a été envoyé automatiquement. Veuillez ne pas y répondre.</p>
        </div>
      </div>
    `,
    text: `
Rappel - Votre rendez-vous dans 1 heure - ${data.meetingType}

Bonjour ${data.guestName},

Ceci est un rappel que votre rendez-vous commence dans 1 heure.

Détails du rendez-vous:
- Type de réunion: ${data.meetingType}
- Date et heure: ${data.startTime}
- Durée: ${data.endTime}
${data.location ? `- Lieu: ${data.location}` : ''}
${data.meetingLink ? `- Lien de réunion: ${data.meetingLink}` : ''}

Nous vous attendons !

Cordialement,
${data.hostName}
    `
  }),

  // Reminder email sent to host before meeting
  hostReminder: (data: EmailTemplateData) => ({
    subject: `Rappel - Rendez-vous dans 1 heure avec ${data.guestName}`,
    html: `
      <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Rappel de votre rendez-vous</h2>
          
          <p style="color: #666; line-height: 1.6;">Bonjour ${data.hostName},</p>
          
          <p style="color: #666; line-height: 1.6;">Ceci est un rappel que votre rendez-vous commence dans 1 heure.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Détails du rendez-vous</h3>
            <p><strong>Invité:</strong> ${data.guestName}</p>
            <p><strong>Email:</strong> ${data.guestEmail}</p>
            <p><strong>Type de réunion:</strong> ${data.meetingType}</p>
            <p><strong>Date et heure:</strong> ${data.startTime}</p>
            <p><strong>Durée:</strong> ${data.endTime}</p>
            ${data.location ? `<p><strong>Lieu:</strong> ${data.location}</p>` : ''}
            ${data.meetingLink ? `<p><strong>Lien de réunion:</strong> <a href="${data.meetingLink}" style="color: #007bff;">${data.meetingLink}</a></p>` : ''}
          </div>
          
          <p style="color: #666; line-height: 1.6;">Préparez-vous pour votre réunion !</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">Cet email a été envoyé automatiquement. Veuillez ne pas y répondre.</p>
        </div>
      </div>
    `,
    text: `
Rappel - Rendez-vous dans 1 heure avec ${data.guestName}

Bonjour ${data.hostName},

Ceci est un rappel que votre rendez-vous commence dans 1 heure.

Détails du rendez-vous:
- Invité: ${data.guestName}
- Email: ${data.guestEmail}
- Type de réunion: ${data.meetingType}
- Date et heure: ${data.startTime}
- Durée: ${data.endTime}
${data.location ? `- Lieu: ${data.location}` : ''}
${data.meetingLink ? `- Lien de réunion: ${data.meetingLink}` : ''}

Préparez-vous pour votre réunion !
    `
  })
}; 