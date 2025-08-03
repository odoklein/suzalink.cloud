# Suzali CRM - Complete Business Management System

A comprehensive Customer Relationship Management (CRM) system built with Next.js 15, Supabase, and NextAuth. This modern web application provides a complete solution for managing clients, prospects, projects, communications, and business operations.

## 🚀 Features

### Core CRM Features
- **Client Management**: Complete client database with profiles, history, and relationship tracking
- **Prospect Management**: Lead tracking with folder organization and conversion workflows
- **Project Management**: Project lifecycle management with status tracking
- **Email Integration**: Full email client with IMAP/POP3 support, compose, and management
- **Calendar & Booking**: Meeting scheduling with availability management
- **Communication Hub**: Real-time messaging system with voice messages
- **Financial Management**: Invoice generation, expense tracking, and financial reporting

### User Management & Security
- **Role-Based Access Control**: Admin, Manager, and User roles with granular permissions
- **NextAuth Integration**: Secure authentication with multiple providers
- **Session Management**: Persistent sessions with automatic refresh
- **Profile Management**: User profiles with activity tracking

### Advanced Features
- **Real-time Notifications**: Push notifications for important events
- **Data Import/Export**: CSV import/export for bulk data management
- **Advanced Search**: Full-text search across all entities
- **Responsive Design**: Mobile-first design with modern UI/UX
- **Multi-language Support**: Internationalization ready
- **Voice Messages**: Audio recording and playback in chat system

## 🛠 Tech Stack

### Frontend
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **Lucide React**: Modern icon library
- **React Query**: Server state management
- **Zustand**: Client state management

### Backend & Database
- **Supabase**: PostgreSQL database with real-time features
- **NextAuth.js v5**: Authentication framework
- **Node.js**: Server-side runtime
- **TypeScript**: Type-safe backend development

### Additional Libraries
- **TipTap**: Rich text editor
- **Handsontable**: Spreadsheet-like data editing
- **Recharts**: Data visualization
- **PDF-lib**: PDF generation
- **Wavesurfer.js**: Audio visualization
- **Three.js**: 3D graphics (for future features)

## 📁 Project Structure

```
suzalink.cloud/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── api/               # API routes
│   ├── dashboard/         # Main dashboard and features
│   │   ├── bookings/      # Calendar and booking management
│   │   ├── chat/          # Messaging system
│   │   ├── clients/       # Client management
│   │   ├── email/         # Email client
│   │   ├── finance/       # Financial management
│   │   ├── prospects/     # Prospect management
│   │   └── utilisateurs/  # User management
│   └── book/              # Public booking pages
├── components/            # Reusable React components
│   ├── ui/               # Base UI components
│   └── dashboard/        # Dashboard-specific components
├── lib/                  # Utility libraries and configurations
├── supabase/            # Database migrations
├── types/               # TypeScript type definitions
└── utils/               # Helper utilities
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, or pnpm
- Supabase account
- Email provider (Gmail, Outlook, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd suzalink.cloud
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Environment Setup**
   Create a `.env.local` file with the following variables:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # NextAuth Configuration
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_nextauth_secret

   # Email Configuration
   EMAIL_SERVER_HOST=your_email_host
   EMAIL_SERVER_PORT=587
   EMAIL_SERVER_USER=your_email_user
   EMAIL_SERVER_PASSWORD=your_email_password
   EMAIL_FROM=noreply@yourdomain.com

   # Optional: OAuth Providers
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

4. **Database Setup**
   ```bash
   # Run Supabase migrations
   npx supabase db push
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

6. **Access the Application**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📊 Key Features Explained

### Dashboard
The main dashboard provides an overview of:
- Recent activity and notifications
- Quick access to main features
- Key metrics and statistics
- User session information

### Client Management
- **Client Profiles**: Complete client information with contact details
- **Client Dashboard**: Analytics and insights for each client
- **Assignment System**: Assign clients to specific users or teams
- **History Tracking**: Complete interaction history

### Prospect Management
- **Folder Organization**: Hierarchical organization of prospects
- **List Management**: Group prospects into targeted lists
- **Conversion Tracking**: Track prospect-to-client conversion
- **Import/Export**: Bulk data management with CSV support

### Email System
- **Email Client**: Full-featured email client with IMAP support
- **Compose Interface**: Rich text editor for email composition
- **Attachment Handling**: File upload and management
- **Email Templates**: Reusable email templates
- **Integration**: Seamless integration with client/prospect records

### Calendar & Booking
- **Meeting Types**: Configurable meeting types with durations
- **Availability Management**: Set and manage availability schedules
- **Booking System**: Public booking interface for clients
- **Reminders**: Automated reminder system
- **Calendar Integration**: Sync with external calendars

### Communication Hub
- **Real-time Chat**: Instant messaging between users
- **Voice Messages**: Audio recording and playback
- **File Sharing**: Secure file sharing within conversations
- **User Status**: Online/offline status indicators

### Financial Management
- **Invoice Generation**: Automated invoice creation
- **Expense Tracking**: Track business expenses
- **Financial Reports**: Comprehensive financial analytics
- **PDF Export**: Professional document generation

## 🔐 Security Features

- **Row Level Security (RLS)**: Database-level security policies
- **Role-Based Access**: Granular permissions based on user roles
- **Session Security**: Secure session management with automatic refresh
- **Data Encryption**: Encrypted data transmission and storage
- **Input Validation**: Comprehensive input sanitization

## 🎨 UI/UX Features

- **Modern Design**: Clean, professional interface
- **Responsive Layout**: Works seamlessly on all devices
- **Dark/Light Mode**: Theme switching capability
- **Accessibility**: WCAG compliant components
- **Loading States**: Smooth loading animations
- **Error Handling**: User-friendly error messages

## 📈 Performance Optimizations

- **Server-Side Rendering**: Fast initial page loads
- **Code Splitting**: Optimized bundle sizes
- **Image Optimization**: Automatic image optimization
- **Caching**: Intelligent data caching strategies
- **Database Indexing**: Optimized database queries

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run send-reminders # Send scheduled reminders
```

### Code Style
- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting
- Conventional commits for version control

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your repository to Vercel
2. Configure environment variables
3. Deploy automatically on push

### Other Platforms
- **Netlify**: Static site deployment
- **Railway**: Full-stack deployment
- **DigitalOcean**: App Platform deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Contact the development team

## 🔮 Roadmap

- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] AI-powered insights
- [ ] Multi-tenant architecture
- [ ] Advanced reporting
- [ ] Integration marketplace
- [ ] Workflow automation
- [ ] Advanced security features

---

**Suzali CRM** - Empowering businesses with modern, efficient customer relationship management.
