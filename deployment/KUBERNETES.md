# Kubernetes Deployment Guide for NeuroSense AI

## Overview

This guide covers deploying NeuroSense AI to a Kubernetes cluster.

## Prerequisites

- Kubernetes 1.25+
- kubectl configured with cluster access
- Helm 3.12+ (optional, for Helm deployments)
- Persistent volumes provisioned

## Quick Start

### 1. Create Namespace

```bash
kubectl create namespace neurosense
kubectl config set-context --current --namespace=neurosense
```

### 2. Create Secrets

```bash
# Create a secrets file
cat > k8s/secrets.yaml << EOF
apiVersion: v1
kind: Secret
metadata:
  name: neurosense-secrets
type: Opaque
stringData:
  GEMINI_API_KEY: "your-api-key"
  FLASK_SECRET_KEY: "your-secret-key"
  SENTRY_DSN: "your-sentry-dsn"
  postgres-user: "neurosense"
  postgres-password: "secure-password"
EOF

kubectl apply -f k8s/secrets.yaml
```

### 3. Apply ConfigMap

```bash
kubectl apply -f k8s/config.yaml
```

### 4. Deploy Infrastructure

```bash
kubectl apply -f k8s/postgres/deployment.yaml
kubectl apply -f k8s/redis/deployment.yaml

# Wait for PostgreSQL to be ready
kubectl wait --for=condition=available deployment/neurosense-postgres --timeout=120s
```

### 5. Deploy Backend

```bash
kubectl apply -f k8s/backend/deployment.yaml
kubectl apply -f k8s/backend/celery.yaml

# Wait for backend to be ready
kubectl wait --for=condition=available deployment/neurosense-backend --timeout=120s
```

### 6. Deploy Frontend

```bash
kubectl apply -f k8s/frontend/deployment.yaml
```

### 7. Configure Ingress

```bash
kubectl apply -f k8s/ingress.yaml
```

## Helm Deployment (Alternative)

### 1. Create Helm Chart Structure

```bash
mkdir -p neurosense-chart/templates
```

### 2. Create Chart.yaml

```yaml
apiVersion: v2
name: neurosense
description: NeuroSense AI - Alzheimer's Detection System
version: 1.0.0
appVersion: "1.0.0"
```

### 3. Create values.yaml

```yaml
replicaCount: 2

image:
  backend: neurosense/backend:latest
  frontend: neurosense/frontend:latest
  pullPolicy: IfNotPresent

backend:
  replicaCount: 2
  resources:
    requests:
      memory: "512Mi"
      cpu: "250m"
    limits:
      memory: "2Gi"
      cpu: "1000m"

frontend:
  replicaCount: 2
  resources:
    requests:
      memory: "128Mi"
      cpu: "100m"
    limits:
      memory: "512Mi"
      cpu: "500m"

celery:
  workerReplicas: 2
  beatReplicas: 1

ingress:
  enabled: true
  className: nginx
  host: neurosense.example.com
  tls: true

persistence:
  models:
    size: 5Gi
    accessMode: ReadOnlyMany
  uploads:
    size: 10Gi
    accessMode: ReadWriteMany
```

### 4. Install Chart

```bash
helm install neurosense ./neurosense-chart \
  --values ./neurosense-chart/values.yaml \
  --namespace neurosense
```

## Monitoring & Debugging

### Check Pod Status

```bash
kubectl get pods -n neurosense
kubectl describe pod <pod-name> -n neurosense
```

### View Logs

```bash
# Backend logs
kubectl logs -f deployment/neurosense-backend -n neurosense

# Celery worker logs
kubectl logs -f deployment/neurosense-celery-worker -n neurosense

# Frontend logs
kubectl logs -f deployment/neurosense-frontend -n neurosense
```

### Port Forward for Local Development

```bash
# Backend API
kubectl port-forward svc/neurosense-backend 5000:5000 -n neurosense

# PostgreSQL
kubectl port-forward svc/neurosense-postgres 5432:5432 -n neurosense

# Redis
kubectl port-forward svc/neurosense-redis 6379:6379 -n neurosense
```

### Execute Commands in Pod

```bash
kubectl exec -it deployment/neurosense-backend -n neurosense -- /bin/sh
```

## Scaling

### Horizontal Pod Autoscaling

```bash
kubectl autoscale deployment neurosense-backend \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n neurosense

kubectl get hpa -n neurosense
```

### Manual Scaling

```bash
kubectl scale deployment neurosense-backend --replicas=4 -n neurosense
kubectl scale deployment neurosense-celery-worker --replicas=4 -n neurosense
```

## Upgrading

### Rolling Update

```bash
# Update image tag
kubectl set image deployment/neurosense-backend backend=neurosense/backend:v1.1.0 -n neurosense

# Monitor rollout
kubectl rollout status deployment/neurosense-backend -n neurosense
```

### Rollback

```bash
kubectl rollout undo deployment/neurosense-backend -n neurosense
```

## Backup & Restore

### PostgreSQL Backup

```bash
# Create backup
kubectl exec deployment/neurosense-postgres -n neurosense -- \
  pg_dump -U neurosense_user neurosense > backup.sql

# Restore from backup
kubectl exec -i deployment/neurosense-postgres -n neurosense -- \
  psql -U neurosense_user neurosense < backup.sql
```

## Troubleshooting

### Common Issues

1. **Pod not starting**: Check resource limits and node capacity
2. **ImagePullBackOff**: Verify image exists and registry credentials
3. **CrashLoopBackOff**: Check application logs for errors
4. **Pending PersistentVolumeClaims**: Ensure PV provisioner is available

### Resource Quotas

```bash
# Apply resource quotas
kubectl create quota neurosense-quota \
  --hard=cpu=8,memory=16Gi,pods=20,services=10 \
  -n neurosense
```

## Security

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: neurosense-network-policy
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 5000
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: neurosense
              component: postgres
      ports:
        - protocol: TCP
          port: 5432
    - to:
        - podSelector:
            matchLabels:
              app: neurosense
              component: redis
      ports:
        - protocol: TCP
          port: 6379
```

### Pod Security Context

Add to deployment specs:

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000
```
