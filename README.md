# CHACK

A comprehensive security assessment platform for managing blackbox and whitebox penetration testing workflows.

## 🚀 Features

### Authentication & User Management
- **OAuth Integration**
  - Google OAuth authentication
  - GitHub OAuth authentication
  - Secure session management with NextAuth.js
  - Automatic user data sync to Convex database

- **User Onboarding**
  - First-time login detection
  - Organization creation flow
  - Automatic redirect to onboarding for new users
  - User profile management

- **Session Management**
  - Persistent sessions with JWT
  - User information display in navbar
  - Sign out functionality
  - Provider type tracking (Google/GitHub)

### Organization Management
- **Multi-tenant Architecture**
  - Create and manage organizations
  - Organization switching (for users with multiple orgs)
  - Organization plans (free, pro, enterprise)
  - Organization statistics and overview

- **Team Management**
  - Role-based access control (owner, admin, analyst, viewer)
  - Members list with roles
  - Membership management
  - User roles display

### Project Management
- **Project Organization**
  - Create projects within organizations
  - Project descriptions and metadata
  - Project status tracking (active, archived)
  - Project listing and navigation

### Security Assessments
- **Assessment Types**
  - Blackbox assessments
  - Whitebox assessments
  - Multiple target types (web_app, api, mobile, network)

- **Automated Scanning**
  - Automatic assessment execution on creation
  - 5-second simulated scan with loading state
  - Real-time status updates (pending, running, completed, failed)
  - Automatic findings and results generation

- **Assessment Management**
  - Create assessments with detailed configuration
  - Target URL specification
  - Assessment status tracking
  - Assessment history and listing

### Findings & Results
- **Security Findings**
  - Severity classification (critical, high, medium, low, info)
  - CWE ID tracking
  - CVSS score support
  - Location and evidence tracking
  - Remediation recommendations
  - Status management (open, confirmed, false_positive, resolved)

- **Scan Results**
  - Multiple result types (scan_data, vulnerability, configuration, log)
  - JSON data storage for flexible result formats
  - Metadata support
  - Results visualization

### Dashboard & User Interface
- **Dashboard Sidebar**
  - Current organization display
  - Organization switching
  - Quick stats (projects, assessments counts)
  - Members list with show/hide toggle
  - Projects list (up to 5 recent)
  - Assessments list with status indicators

- **Navigation**
  - Responsive navbar with user info
  - Breadcrumb navigation
  - Quick access to projects and assessments
  - Status indicators with color coding

- **UI Features**
  - Dark theme (slate color scheme)
  - Loading states and spinners
  - Real-time data updates via Convex
  - Responsive design

### Database & Backend
- **Convex Database**
  - Real-time data synchronization
  - Type-safe queries and mutations
  - Automatic type generation
  - Efficient indexing for fast queries

- **Data Models**
  - Users (synced from NextAuth)
  - Organizations
  - Memberships (user-org relationships)
  - Projects
  - Assessments
  - Findings
  - Results

## 🏗️ Architecture

### Technology Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js
- **Database**: Convex (real-time database)
- **Deployment**: Ready for Vercel

### Project Structure
```
├── app/                    # Next.js App Router pages
│   ├── api/auth/          # NextAuth API routes
│   ├── auth/login/        # Login page
│   ├── onboarding/         # Onboarding flow
│   ├── dashboard/         # Main dashboard
│   ├── projects/          # Project detail pages
│   └── assessments/       # Assessment detail pages
├── components/             # React components
│   ├── dashboard-sidebar/ # Sidebar with org info
│   ├── projects-list/     # Projects management
│   ├── assessments-list/  # Assessments management
│   ├── findings-list/     # Findings display
│   └── results-list/      # Results display
├── convex/                # Convex backend functions
│   ├── schema.ts          # Database schema
│   ├── users.ts           # User management
│   ├── organizations.ts   # Organization functions
│   ├── projects.ts        # Project functions
│   ├── assessments.ts     # Assessment functions
│   ├── findings.ts        # Findings functions
│   └── results.ts         # Results functions
└── lib/                   # Utility functions
    └── auth.ts            # NextAuth configuration
```

## 📋 Data Hierarchy

```
Organization
  ├── Projects
  │   ├── Assessments
  │   │   ├── Findings
  │   │   └── Results
```

## 🔐 Environment Variables

Create a `.env.local` file with the following:

```env
# NextAuth
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth (optional)
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret

# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, or pnpm
- Convex account (for database)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/justinwkUKM/Chack.git
cd CHack
```

2. Install dependencies:
```bash
npm install
```

3. Set up Convex:
```bash
npx convex dev
```
This will:
- Create a Convex project
- Generate deployment URL
- Add it to your `.env.local`

4. Configure OAuth providers:
- [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- [GitHub Developer Settings](https://github.com/settings/developers)

5. Add environment variables to `.env.local`

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

## 📝 Workflow

1. **First-time Login**
   - User signs in with Google/GitHub
   - Redirected to onboarding
   - Creates organization
   - Redirected to dashboard

2. **Create Project**
   - Navigate to dashboard
   - Create a new project
   - Project appears in sidebar

3. **Run Assessment**
   - Open project
   - Create assessment
   - Assessment runs automatically (5-second simulation)
   - Findings and results generated automatically

4. **View Results**
   - Navigate to assessment detail page
   - View findings with severity levels
   - View scan results and data

## 🛠️ Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Convex Functions
- Run `npx convex dev` to start Convex development mode
- Functions are automatically deployed and type-checked
- Real-time updates in development

## 📦 Key Dependencies

- `next` - React framework
- `react` - UI library
- `next-auth` - Authentication
- `convex` - Real-time database
- `tailwindcss` - Styling
- `typescript` - Type safety

## 🔄 Current Status

✅ Authentication (Google + GitHub)  
✅ User onboarding flow  
✅ Organization management  
✅ Project management  
✅ Assessment creation and execution  
✅ Automatic findings generation  
✅ Results storage and display  
✅ Dashboard sidebar with navigation  
✅ Members management  
✅ Real-time data synchronization  

## 🚧 Future Enhancements

- [ ] Real security scanning integration
- [ ] Advanced finding management (edit, delete, update)
- [ ] Report generation
- [ ] Email notifications
- [ ] Advanced filtering and search
- [ ] Export functionality
- [ ] API integrations
- [ ] Webhook support

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

This is a private project. For questions or issues, please contact the repository owner.

---

Built with ❤️ using Next.js, Convex, and NextAuth
