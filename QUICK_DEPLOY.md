# Quick Deployment Checklist

## 🚀 Render.com (Easiest - Recommended)

### 5-Minute Deploy

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/hazard-reporting.git
git push -u origin main

# 2. Go to https://render.com
# 3. Sign up with GitHub
# 4. Click "New +" → "Web Service"
# 5. Select your repository
# 6. Fill in:
#    - Name: hazard-reporting
#    - Environment: Python 3
#    - Build Command: pip install -r requirements.txt
#    - Start Command: gunicorn -w 4 -b 0.0.0.0:$PORT app:app
#    - Plan: Free
# 7. Add Environment Variables:
#    - SECRET_KEY: (generate with: python -c "import secrets; print(secrets.token_hex(32))")
#    - FLASK_ENV: production
#    - FLASK_DEBUG: False
# 8. Click "Create Web Service"
# 9. Wait 2-3 minutes
# 10. Done! Visit your URL
```

---

## 🖥️ Local Development

### Option 1: Quick Script (30 seconds)
```bash
cd /path/to/project
chmod +x run.sh
./run.sh
```

### Option 2: Manual (5 minutes)
```bash
cd /path/to/project
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -c "from app import init_db; init_db()"
python app.py
```

**Access:** http://localhost:5001

---

## ⚙️ Heroku Deploy

```bash
# Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
heroku login
heroku create your-app-name

# Create Procfile
echo "web: gunicorn -w 4 -b 0.0.0.0:\$PORT app:app" > Procfile

# Set environment variables
heroku config:set SECRET_KEY="$(python -c 'import secrets; print(secrets.token_hex(32))')"
heroku config:set FLASK_ENV=production
heroku config:set FLASK_DEBUG=False

# Deploy
git add .
git commit -m "Deploy to Heroku"
git push heroku main
heroku open
```

---

## 🔒 Post-Deploy Security (CRITICAL)

1. **Visit:** `your-app.com/admin/login`
2. **Login:** `admin` / `admin123`
3. **Navigate to:** Admin Dashboard
4. **Change password immediately!**

---

## ✅ Test Your Deployment

- [ ] Open on mobile phone
- [ ] Test camera capture
- [ ] Allow location access
- [ ] Submit test report
- [ ] View in history
- [ ] Login as admin
- [ ] Upload after image
- [ ] Mark as resolved

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Camera not working | Enable HTTPS |
| Location not working | Enable HTTPS + GPS |
| Port in use | `lsof -ti:5001 \| xargs kill -9` |
| Database error | `python -c "from app import init_db; init_db()"` |

---

## 📞 Support

- **Full Guide:** See `DEPLOYMENT_GUIDE.md`
- **Project Info:** See `README.md`
- **Features:** See `PROJECT_SUMMARY.md`

---

**Deploy in 5 minutes, protect infrastructure forever! 🚧**