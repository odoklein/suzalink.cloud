import { NotificationService } from '../lib/notification-service';

async function sendReminders() {
  try {
    console.log('Starting reminder sending process...');
    
    const upcomingBookings = await NotificationService.getUpcomingBookingsForReminders();
    console.log(`Found ${upcomingBookings.length} bookings that need reminders`);
    
    for (const booking of upcomingBookings) {
      try {
        await NotificationService.sendBookingReminder(booking);
        console.log(`✅ Reminder sent for booking ${booking.id}`);
      } catch (error) {
        console.error(`❌ Failed to send reminder for booking ${booking.id}:`, error);
      }
    }
    
    console.log('Reminder sending process completed');
  } catch (error) {
    console.error('Error in reminder sending process:', error);
  }
}

// Run the function
sendReminders();