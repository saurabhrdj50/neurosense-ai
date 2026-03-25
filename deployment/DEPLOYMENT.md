# Production Deployment Guide

This guide covers deploying NeuroSense AI to production environments.

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL (optional, for production database)
- Redis (optional, for distributed rate limiting)
- Domain name with SSL certificates

## Environment Variables

Create a `.env` file in the project root:

```bash
# API Keys (REQUIRED)
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key

# Security (REQUIRED - generate with: python -c "import secrets; print(secrets.token_hex(32))")
FLASK_SECRET_KEY=your_secure_random_key
SECRET_KEY=your_secure_random_key

# CORS (comma-separated list of allowed origins)
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json

# Rate Limiting (use Redis for distributed deployment)
RATELIMIT_STORAGE=redis://redis:6379
```

## Deployment Options

### Option 1: Docker Compose (Recommended for Small-Medium Scale)

```bash
# Start with docker-compose.prod.yml for production settings
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
```

### Option 2: Kubernetes (For Large Scale)

See `k8s/` directory for Helm charts and deployment manifests.

### Option 3: Manual Deployment

```bash
# Backend
cd backend
pip install -r requirements.txt
gunicorn "app:create_app()" --bind 0.0.0.0:5000 --workers 4 --timeout 120

# Frontend
cd frontend
npm install
npm run build
serve -s build -l 3000
```

## Database Setup

### Option 1: SQLite (Development/Small Scale)

SQLite is used by default. Data is stored in `patient_data.db`.

### Option 2: PostgreSQL (Production)

1. Install PostgreSQL
2. Create database:
```sql
CREATE DATABASE neurosense;
CREATE USER neurosense_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE neurosense TO neurosense_user;
```

3. Set environment variable:
```bash
DATABASE_URL=postgresql://neurosense_user:your_password@localhost:5432/neurosense
```

## Redis Setup (For Distributed Rate Limiting)

```bash
# Start Redis
docker run -d --name neurosense-redis -p 6379:6379 redis:7-alpine

# Or use Docker Compose (already includes Redis)
```

## SSL/TLS Setup

### Option 1: Let's Encrypt (Recommended)

```bash
# Using Certbot
certbot certonly --standalone -d yourdomain.com

# Mount certificates in docker-compose
volumes:
  - ./ssl/fullchain.pem:/etc/nginx/ssl/fullchain.pem:ro
  - ./ssl/privkey.pem:/etc/nginx/ssl/privkey.pem:ro
```

### Option 2: Cloudflare (Easiest)

Use Cloudflare proxy and only expose necessary ports.

## Nginx Configuration

```nginx
upstream backend {
    server backend:5000;
}

upstream frontend {
    server frontend:3000;
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Request-ID $http_x_request_id;
        
        # Timeouts for ML operations
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

## Monitoring & Logging

### Health Check Endpoint

```bash
curl http://localhost:5000/api/health
```

### Metrics Endpoint

```bash
# JSON format
curl http://localhost:5000/api/metrics

# Prometheus format
curl http://localhost:5000/api/metrics?format=prometheus
```

### Structured Logging

Logs are output in JSON format when `LOG_FORMAT=json`:

```json
{
  "timestamp": "2026-03-25T12:00:00Z",
  "level": "INFO",
  "logger": "app",
  "message": "Request completed",
  "hostname": "backend-abc123",
  "process_id": 1,
  "request_id": "a1b2c3d4"
}
```

## Security Checklist

- [ ] Change default API keys
- [ ] Set secure FLASK_SECRET_KEY
- [ ] Configure CORS_ORIGINS for your domain
- [ ] Enable HTTPS
- [ ] Set up rate limiting (Redis recommended)
- [ ] Configure log aggregation
- [ ] Enable database backups
- [ ] Restrict file upload sizes
- [ ] Review and harden Nginx configuration

## Performance Tuning

### Backend Workers

```bash
# Gunicorn workers (recommend: 2-4 × CPU cores)
workers = 4

# Timeout for ML operations
timeout = 300

# Keep-alive connections
keepalive = 5
```

### Resource Limits

```yaml
deploy:
  resources:
    limits:
      cpus: '4'
      memory: 4G
    reservations:
      cpus: '1'
      memory: 1G
```

## Backup Strategy

### Database Backups

```bash
# SQLite
cp patient_data.db patient_data.db.backup

# PostgreSQL
pg_dump neurosense > backup_$(date +%Y%m%d).sql
```

### Automated Backups

```bash
# Add to crontab
0 2 * * * /path/to/backup.sh
```

## Troubleshooting

### High Memory Usage

- Reduce number of Gunicorn workers
- Enable model caching limits
- Use smaller batch sizes for analysis

### Slow Response Times

- Enable Redis for rate limiting
- Scale horizontally with more containers
- Optimize database queries
- Use CDN for static assets

### Container Restarts

```bash
# Check logs
docker-compose logs backend

# Common causes:
# - Out of memory -> increase memory limits
# - Model loading failure -> check model file exists
# - Port conflicts -> check port 5000 not in use
```

## Support

For issues, check:
1. Application logs: `docker-compose logs backend`
2. Health endpoint: `/api/health`
3. Metrics: `/api/metrics`
