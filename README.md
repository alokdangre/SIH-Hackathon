# Oilseed Hedging Platform

A Next.js + FastAPI platform for oilseed commodity forward contracts and hedging.

## Features

- **JWT Authentication** - Secure login for farmers and buyers
- **Listings Management** - Create and browse commodity listings with photos
- **Contract Flow** - Make offers, accept contracts, track status
- **Notifications** - Real-time updates on offers and contract changes
- **Audit Logs** - Complete transaction history
- **Mobile-first UI** - Responsive design with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, React Query, React Hook Form
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL, JWT auth
- **Database**: PostgreSQL with Docker Compose
- **File Storage**: Local file system with static serving

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+ and pip
- Docker and Docker Compose

### 1. Database Setup

```bash
# Start PostgreSQL database
docker-compose up -d
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Run database migrations and seed data
python seed_data.py

# Start FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at http://localhost:8000
API docs at http://localhost:8000/docs

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at http://localhost:3000

## Sample Login Credentials

After running the seed script:

- **Farmer**: `rajesh@farmer.com` / `password123`
- **Buyer**: `buyer@agrotech.com` / `password123`

All seeded users use password: `password123`

## API Endpoints

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login

### Listings
- `GET /listings` - List all listings (with filters)
- `POST /listings` - Create new listing (farmers only)
- `GET /listings/{id}` - Get listing details

### Contracts
- `GET /contracts` - List user's contracts
- `POST /contracts` - Create offer (buyers only)
- `POST /contracts/{id}/accept` - Accept offer (sellers only)
- `POST /contracts/{id}/confirm-delivery` - Confirm delivery
- `POST /contracts/{id}/raise-dispute` - Raise dispute

### Notifications
- `GET /notifications` - Get user notifications
- `POST /notifications/mark-read` - Mark notifications as read

## Demo Flow

1. **Signup/Login** as farmer or buyer
2. **Farmer**: Create listing with commodity details and photos
3. **Buyer**: Browse listings and make offers
4. **Farmer**: Accept offers to create contracts
5. **Track**: Contract status and receive notifications
6. **Complete**: Delivery confirmation and contract closure

## Development

### Backend Structure
```
backend/
├── app/
│   ├── core/          # Config and database
│   ├── models/        # SQLAlchemy models
│   ├── schemas/       # Pydantic schemas
│   ├── routers/       # FastAPI routes
│   ├── services/      # Business logic
│   └── utils/         # Utilities (auth, file storage)
├── seed_data.py       # Database seeding script
└── requirements.txt   # Python dependencies
```

### Frontend Structure
```
frontend/
├── src/
│   ├── app/           # Next.js app router pages
│   ├── lib/           # Utilities (API, auth, types)
│   └── components/    # Reusable UI components
├── package.json       # Node dependencies
└── tailwind.config.js # Tailwind configuration
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://alok:alok123@localhost:5433/hedge_db
JWT_SECRET_KEY=your-secret-key
CORS_ORIGINS=http://localhost:3000
```

### Frontend
No additional environment variables required for development.

## Production Deployment

1. Set production environment variables
2. Build frontend: `npm run build`
3. Use production WSGI server for backend
4. Configure reverse proxy (nginx)
5. Set up SSL certificates
6. Use managed PostgreSQL database

## License

MIT License - see LICENSE file for details.
