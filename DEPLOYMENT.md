# Docker Deployment Guide

This guide covers deploying the Oilseed Hedging Platform using Docker, both locally and on Render.

## Project Structure

```
SIH-Hackathon/
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── app/
├── frontend/
│   ├── Dockerfile
│   ├── .dockerignore
│   └── src/
├── docker-compose.yml
├── render.yaml
└── .env.example
```

## Local Development with Docker

### Prerequisites
- Docker and Docker Compose installed
- Git repository cloned

### Steps

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd SIH-Hackathon
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Build and run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Database: localhost:5433

### Docker Compose Services

- **db**: PostgreSQL 16 database
- **backend**: FastAPI application
- **frontend**: Next.js application

## Render Deployment

### Method 1: Using render.yaml (Recommended)

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Add Docker configuration"
   git push origin main
   ```

2. **Connect to Render**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect `render.yaml`

3. **Services Created**
   - `oilseed-db`: PostgreSQL database (free tier)
   - `oilseed-backend`: FastAPI backend service
   - `oilseed-frontend`: Next.js frontend service

### Method 2: Manual Service Creation

#### Database Service
1. Create new PostgreSQL service
2. Set database name: `hedge_db`
3. Set user: `alok`
4. Note the connection string

#### Backend Service
1. Create new Web Service
2. Connect GitHub repository
3. Set build command: `docker build -f backend/Dockerfile backend`
4. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables:
   - `DATABASE_URL`: (from database service)
   - `SECRET_KEY`: (generate secure key)
   - `ALGORITHM`: `HS256`
   - `ACCESS_TOKEN_EXPIRE_MINUTES`: `30`

#### Frontend Service
1. Create new Web Service
2. Connect GitHub repository
3. Set build command: `docker build -f frontend/Dockerfile frontend`
4. Add environment variables:
   - `NEXT_PUBLIC_API_URL`: (backend service URL)
   - `NODE_ENV`: `production`

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@host:port/database
SECRET_KEY=your-super-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
```

## Health Checks

Both services include health check endpoints:
- Backend: `/health`
- Frontend: `/api/health`

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Verify DATABASE_URL format
   - Check database service is running
   - Ensure network connectivity

2. **Frontend API Connection**
   - Verify NEXT_PUBLIC_API_URL is correct
   - Check CORS settings in backend
   - Ensure backend is accessible

3. **Build Failures**
   - Check Dockerfile syntax
   - Verify all dependencies in requirements.txt/package.json
   - Check .dockerignore files

### Logs
```bash
# Local development
docker-compose logs backend
docker-compose logs frontend

# Individual service logs
docker logs <container-name>
```

## Production Considerations

1. **Security**
   - Use strong SECRET_KEY
   - Enable HTTPS
   - Configure proper CORS origins
   - Use environment variables for secrets

2. **Performance**
   - Consider upgrading from free tier
   - Implement caching strategies
   - Optimize Docker images

3. **Monitoring**
   - Set up health checks
   - Monitor application logs
   - Configure alerts

## Scaling

For production workloads, consider:
- Upgrading to paid Render plans
- Using managed database services
- Implementing load balancing
- Adding Redis for caching
- Setting up CI/CD pipelines

## Support

For issues with deployment:
1. Check application logs
2. Verify environment variables
3. Test health endpoints
4. Review Docker build logs
