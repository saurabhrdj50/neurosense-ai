# 🚀 Deployment Guide

This folder contains all deployment-related configurations for NeuroSense AI.

## 📁 Structure

```
deployment/
├── README.md                   # This file
├── .dockerignore
│
├── docker/                    # Docker configurations
│   ├── docker-compose.yml      # Development stack
│   ├── docker-compose.prod.yml # Production overrides
│   ├── backend/
│   │   └── Dockerfile         # Backend container
│   └── frontend/
│       └── Dockerfile         # Frontend container
│
├── k8s/                      # Kubernetes manifests
│   ├── config.yaml            # K8s ConfigMap
│   ├── secrets.yaml           # K8s Secrets (template)
│   ├── ingress.yaml          # K8s Ingress
│   ├── backend/
│   │   ├── deployment.yaml    # Backend deployment
│   │   └── celery.yaml       # Celery worker deployment
│   ├── frontend/
│   │   └── deployment.yaml   # Frontend deployment
│   ├── postgres/
│   │   └── deployment.yaml   # PostgreSQL deployment
│   └── redis/
│       └── deployment.yaml   # Redis deployment
│
├── DEPLOYMENT.md             # Detailed deployment guide
├── KUBERNETES.md             # Kubernetes guide
├── POSTGRESQL_MIGRATION.md   # Database migration guide
├── IMPLEMENTATION_SUMMARY.md # Implementation details
└── NEW_FEATURES_GUIDE.md    # Feature documentation
```

## 🐳 Docker Deployment

### Quick Start (Development)

```bash
cd deployment/docker
docker-compose up --build
```

**Services:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Redis: localhost:6379

### Production Deployment

```bash
cd deployment/docker

# Build and start
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d

# View logs
docker-compose logs -f

# Scale workers
docker-compose up -d --scale celery_worker=3
```

### Environment Setup

Create `.env` file in project root:

```bash
cp .env.example .env
# Edit .env with your API keys
```

Required variables:
```env
GEMINI_API_KEY=your-gemini-api-key
SECRET_KEY=your-secure-random-key
FLASK_ENV=production
LOG_LEVEL=INFO
```

## ☸️ Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (v1.25+)
- kubectl configured
- Helm 3.x (optional)

### Deploy

```bash
cd deployment/k8s

# Apply all resources
kubectl apply -f .

# Or use kustomize
kubectl apply -k .
```

### Namespaces

```bash
# Create namespace
kubectl create namespace neurosense

# Deploy to namespace
kubectl apply -f . -n neurosense
```

### Ingress

Update `ingress.yaml` with your domain:

```yaml
annotations:
  kubernetes.io/ingress.class: nginx
  cert-manager.io/cluster-issuer: letsencrypt-prod
```

### Secrets

Update `secrets.yaml` with real values (base64 encoded):

```bash
# Encode secret
echo -n "your-api-key" | base64
```

## 🔧 Configuration

### Backend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FLASK_ENV` | `production` | Flask environment |
| `SECRET_KEY` | - | Flask secret key (required) |
| `GEMINI_API_KEY` | - | Gemini API key (required) |
| `LOG_LEVEL` | `INFO` | Logging level |
| `MAX_CONTENT_LENGTH` | `16777216` | Max upload size (16MB) |

### Resource Limits

**Development:**
- Backend: 2 CPU, 2GB RAM
- Celery Worker: 2 CPU, 2GB RAM

**Production:**
- Backend: 4 CPU, 4GB RAM
- Celery Worker: 2 CPU, 2GB RAM (scalable)

## 📊 Health Checks

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Service health status |
| `GET /api/metrics` | Prometheus metrics |

## 🔒 Security

1. **Secrets Management:**
   - Never commit real secrets to git
   - Use Kubernetes Secrets or Vault
   - Rotate API keys regularly

2. **Network Policies:**
   - Restrict inter-service communication
   - Use TLS for all connections

3. **Container Security:**
   - Run as non-root user
   - Read-only root filesystem where possible
   - Regular vulnerability scanning

## 📈 Monitoring

### Prometheus Metrics

Access at `GET /api/metrics`:
- Request count by endpoint
- Request duration histograms
- Error rates
- Model inference times

### Logging

- JSON format for production
- Centralized logging (ELK/Graylog)
- Log levels: ERROR, WARN, INFO, DEBUG

## 🆘 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs backend

# Check config
docker-compose config
```

### Database Connection Issues

```bash
# Check Redis
docker-compose exec redis redis-cli ping

# Check backend connectivity
docker-compose exec backend curl localhost:5000/api/health
```

### Performance Issues

```bash
# Monitor resource usage
docker stats

# Check worker queue
docker-compose exec redis redis-cli LLEN celery
```
