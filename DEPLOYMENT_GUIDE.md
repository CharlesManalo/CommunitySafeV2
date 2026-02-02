# Complete Deployment Guide
## Infrastructure Hazard Reporting System

---

## Table of Contents
1. [Local Development Setup](#1-local-development-setup)
2. [Production Deployment Options](#2-production-deployment-options)
3. [Render.com Deployment (Recommended)](#3-rendercom-deployment-recommended)
4. [Heroku Deployment](#4-heroku-deployment)
5. [DigitalOcean Deployment](#5-digitalocean-deployment)
6. [Post-Deployment Checklist](#6-post-deployment-checklist)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Local Development Setup

### Option A: Quick Start Script (Easiest - 30 seconds)

```bash
# 1. Navigate to project folder
cd /path/to/hazard-monitoring-system

# 2. Make script executable
chmod +x run.sh

# 3. Run the setup script
./run.sh
```

The script will:
- Create virtual environment
- Install dependencies
- Initialize database
- Start the server

**Access:** http://localhost:5001

---

### Option B: Manual Setup (5 minutes)

#### Step 1: Install Python
Ensure Python 3.8+ is installed:
```bash
python3 --version
```
If not installed, download from: https://www.python.org/downloads/

#### Step 2: Create Virtual Environment
```bash
# Navigate to project folder
cd /path/to/hazard-monitoring-system

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

#### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

#### Step 4: Initialize Database
```bash
python -c "from app import init_db; init_db()"
```

#### Step 5: Start Application
```bash
python app.py
```

**Access:** http://localhost:5001

---

## 2. Production Deployment Options

| Platform | Difficulty | Cost | Best For |
|----------|------------|------|----------|
| **Render.com** | Easy | Free tier available | Quick deployment, beginners |
| **Heroku** | Easy | Free tier available | Simple apps, testing |
| **DigitalOcean** | Medium | $5/month | Full control, production |
| **AWS/GCP/Azure** | Hard | Variable | Enterprise, scale |

---

## 3. Render.com Deployment (Recommended)

Render.com offers a **free tier** and is perfect for this application.

### Prerequisites
- GitHub account
- Git installed locally

### Step 1: Create GitHub Repository

```bash
# Initialize Git repository
cd /path/to/hazard-monitoring-system
git init

# Add all files
git add .

# Commit files
git commit -m "Initial commit - Hazard Reporting System V2"

# Create GitHub repository (use GitHub website or CLI)
# Then push:
git remote add origin https://github.com/YOUR_USERNAME/hazard-reporting-V2.git
git branch -M main
git push -u origin main
```

### Step 2: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub
3. Verify your email

### Step 3: Create New Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Select **"hazard-reporting"** repository

### Step 4: Configure Service

Fill in the form:

| Field | Value |
|-------|-------|
| Name | `hazard-reporting` |
| Environment | `Python 3` |
| Region | Choose closest to users |
| Branch | `main` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `gunicorn -w 4 -b 0.0.0.0:$PORT app:app` |
| Plan | **Free** |

### Step 5: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

| Key | Value |
|-----|-------|
| `SECRET_KEY` | Generate random string (see below) |
| `FLASK_ENV` | `production` |
| `FLASK_DEBUG` | `False` |

**Generate SECRET_KEY:**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### Step 6: Deploy

1. Click **"Create Web Service"**
2. Wait for deployment (2-3 minutes)
3. Your app will be live at: `https://hazard-reporting.onrender.com`

### Step 7: Update Admin Credentials

1. Visit your deployed app
2. Go to `/admin/login`
3. Login with default: `admin` / `admin123`
4. **Immediately change password!**

---

## 4. Heroku Deployment

### Step 1: Install Heroku CLI

```bash
# macOS
brew tap heroku/brew && brew install heroku

# Windows
# Download from: https://devcenter.heroku.com/articles/heroku-cli

# Linux
sudo snap install --classic heroku
```

### Step 2: Login to Heroku

```bash
heroku login
```

### Step 3: Create Heroku App

```bash
# Navigate to project
cd /path/to/hazard-monitoring-system

# Create app
heroku create your-app-name

# Example:
heroku create hazard-reporting-system
```

### Step 4: Create Procfile

Create a file named `Procfile` (no extension):

```
web: gunicorn -w 4 -b 0.0.0.0:$PORT app:app
```

Add to repository:
```bash
git add Procfile
git commit -m "Add Procfile for Heroku"
```

### Step 5: Set Environment Variables

```bash
# Generate secret key
SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")

# Set config vars
heroku config:set SECRET_KEY="$SECRET_KEY"
heroku config:set FLASK_ENV=production
heroku config:set FLASK_DEBUG=False
```

### Step 6: Deploy

```bash
# Push to Heroku
git push heroku main

# Open app
heroku open
```

### Step 7: View Logs

```bash
heroku logs --tail
```

---

## 5. DigitalOcean Deployment

### Step 1: Create Droplet

1. Sign up at https://www.digitalocean.com
2. Click **"Create"** → **"Droplets"**
3. Choose:
   - **OS**: Ubuntu 22.04 (LTS)
   - **Plan**: Basic ($5/month)
   - **Datacenter**: Closest to users
   - **Authentication**: SSH Key (recommended)

### Step 2: Connect to Server

```bash
# SSH into your droplet
ssh root@YOUR_DROPLET_IP
```

### Step 3: Install Dependencies

```bash
# Update system
apt update && apt upgrade -y

# Install Python and pip
apt install python3-pip python3-venv nginx git -y

# Install supervisor for process management
apt install supervisor -y
```

### Step 4: Clone Repository

```bash
# Create app directory
mkdir -p /var/www/hazard-reporting
cd /var/www/hazard-reporting

# Clone your repository
git clone https://github.com/YOUR_USERNAME/hazard-reporting.git .

# Or upload files via SCP/SFTP
```

### Step 5: Setup Application

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Initialize database
python -c "from app import init_db; init_db()"
```

### Step 6: Create Environment File

```bash
# Create .env file
nano /var/www/hazard-reporting/.env
```

Add:
```
SECRET_KEY=your-generated-secret-key-here
FLASK_ENV=production
FLASK_DEBUG=False
```

### Step 7: Configure Gunicorn with Supervisor

```bash
# Create supervisor config
nano /etc/supervisor/conf.d/hazard-reporting.conf
```

Add:
```ini
[program:hazard-reporting]
directory=/var/www/hazard-reporting
command=/var/www/hazard-reporting/venv/bin/gunicorn -w 4 -b 127.0.0.1:5001 app:app
autostart=true
autorestart=true
stderr_logfile=/var/log/hazard-reporting.err.log
stdout_logfile=/var/log/hazard-reporting.out.log
user=www-data
environment=SECRET_KEY="your-secret-key",FLASK_ENV="production"
```

Start supervisor:
```bash
supervisorctl reread
supervisorctl update
supervisorctl start hazard-reporting
```

### Step 8: Configure Nginx

```bash
# Create nginx config
nano /etc/nginx/sites-available/hazard-reporting
```

Add:
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        alias /var/www/hazard-reporting/uploads/;
        expires 30d;
    }

    location /static/ {
        alias /var/www/hazard-reporting/static/;
        expires 30d;
    }
}
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/hazard-reporting /etc/nginx/sites-enabled
nginx -t
systemctl restart nginx
```

### Step 9: Setup SSL (HTTPS) - Optional but Recommended

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d your-domain.com

# Follow prompts
```

---

## 6. Post-Deployment Checklist

### Security Checklist
- [ ] Change default admin password (`admin123`)
- [ ] Generate unique SECRET_KEY
- [ ] Set FLASK_ENV to `production`
- [ ] Disable FLASK_DEBUG
- [ ] Enable HTTPS (SSL certificate)
- [ ] Configure firewall rules

### Functionality Checklist
- [ ] Test camera capture on mobile
- [ ] Test GPS location capture
- [ ] Submit test hazard report
- [ ] View report in history
- [ ] Login as admin
- [ ] Mark report as resolved
- [ ] Verify before/after images display

### Performance Checklist
- [ ] Enable gzip compression
- [ ] Configure static file caching
- [ ] Set up log rotation
- [ ] Monitor disk space for uploads

---

## 7. Troubleshooting

### Common Issues

#### Issue: Camera not working
**Solution:**
- Ensure HTTPS is enabled (camera requires secure context)
- Check browser permissions
- Verify mobile browser supports getUserMedia

#### Issue: Location not working
**Solution:**
- Grant location permission in browser
- Enable GPS on mobile device
- Check HTTPS is enabled

#### Issue: Database errors
**Solution:**
```bash
# Reinitialize database
python -c "from app import init_db; init_db()"
```

#### Issue: Port already in use
**Solution:**
```bash
# Find and kill process
lsof -ti:5001 | xargs kill -9

# Or change port in app.py
```

#### Issue: Permission denied on uploads
**Solution:**
```bash
# Fix permissions
chmod -R 755 uploads/
chown -R www-data:www-data uploads/
```

### Getting Help

1. Check application logs
2. Review browser console for JavaScript errors
3. Verify environment variables are set
4. Test locally before deploying

---

## Quick Reference Commands

```bash
# Local Development
python app.py                    # Start development server
./run.sh                         # Quick start script

# Heroku
heroku logs --tail               # View logs
heroku config                    # View config vars
heroku restart                   # Restart app

# DigitalOcean
supervisorctl status             # Check app status
supervisorctl restart hazard-reporting  # Restart app
nginx -t                         # Test nginx config
systemctl restart nginx          # Restart nginx

# Database
python -c "from app import init_db; init_db()"  # Reset database
```

---

## Next Steps After Deployment

1. **Test on real mobile devices**
2. **Share with team/community**
3. **Monitor usage and performance**
4. **Collect feedback for improvements**
5. **Consider adding features:**
   - Email notifications
   - Push notifications
   - User accounts
   - Analytics dashboard

---

**Your Infrastructure Hazard Reporting System is now live! 🚀**