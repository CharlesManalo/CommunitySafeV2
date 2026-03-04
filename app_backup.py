from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime
import os
import sqlite3
import json

from config import Config

app = Flask(__name__)
app.config.from_object(Config)

# Initialize database
def init_db():
    conn = sqlite3.connect(app.config['DATABASE'])
    cursor = conn.cursor()
    
    # Create hazard reports table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS hazard_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            before_image TEXT NOT NULL,
            after_image TEXT,
            description TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pending',
            date_reported DATETIME NOT NULL,
            date_resolved DATETIME,
            map_screenshot TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create admin table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

def get_db_connection():
    return sqlite3.connect(app.config['DATABASE'])

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/history')
def history():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM hazard_reports ORDER BY date_reported DESC")
    reports = cursor.fetchall()
    conn.close()
    
    return render_template('history.html', reports=reports)

@app.route('/admin_login')
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM admin WHERE username = ?", (username,))
        admin = cursor.fetchone()
        conn.close()
        
        if admin and check_password_hash(admin[2], password):
            session['admin_logged_in'] = True
            session['admin_username'] = username
            flash('Login successful!', 'success')
            return redirect(url_for('admin_dashboard'))
        else:
            flash('Invalid username or password', 'error')
            return render_template('admin_login.html')
    
    return render_template('admin_login.html')

@app.route('/admin/logout')
def admin_logout():
    session.clear()
    flash('Logged out successfully', 'success')
    return redirect(url_for('admin_login'))

@app.route('/admin/dashboard')
def admin_dashboard():
    if 'admin_logged_in' not in session:
        return redirect(url_for('admin_login'))
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM hazard_reports ORDER BY date_reported DESC")
    reports = cursor.fetchall()
    conn.close()
    
    return render_template('admin_dashboard.html', reports=reports)

@app.route('/feedback')
def feedback():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        user_type = request.form.get('user_type')
        category = request.form.get('category')
        message = request.form.get('message')
        
        # Here you would typically save to database or send email
        # For now, just show success message
        flash('Thank you for your feedback! We will review it and get back to you.', 'success')
        return redirect(url_for('feedback'))
    
    return render_template('feedback.html')

@app.route('/hazard_dashboard')
def hazard_dashboard():
    return render_template('index.html')

@app.route('/api/upload-map-screenshot', methods=['POST'])
def upload_map_screenshot():
    try:
        if 'map_screenshot' not in request.files:
            return jsonify({'error': 'No map screenshot provided'}), 400
        
        file = request.files['map_screenshot']
        
        # Validate file type
        if not file.content_type.startswith('image/'):
            return jsonify({'error': 'Invalid file type'}), 400
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'png'
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"map_screenshot_{timestamp}.{file_extension}"
        
        # Ensure upload directory exists
        upload_dir = app.config['UPLOAD_FOLDER_MAP_SCREENSHOTS']
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file
        filepath = os.path.join(upload_dir, filename)
        file.save(filepath)
        
        # Generate URL for accessing the file
        screenshot_url = url_for('static', filename=f'map_screenshots/{filename}')
        
        return jsonify({
            'success': True,
            'screenshot_url': screenshot_url,
            'filename': filename
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/static/map_screenshots/<path:filename>')
def serve_map_screenshot(filename):
    try:
        upload_dir = app.config['UPLOAD_FOLDER_MAP_SCREENSHOTS']
        return send_from_directory(os.path.join(upload_dir, filename), filename)
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@app.route('/api/report', methods=['POST'])
def report_hazard():
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['before_image', 'description', 'latitude', 'longitude']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Handle optional map screenshot
        map_screenshot = data.get('map_screenshot')
        
        # Save image
        before_image_data = data['before_image']
        before_filename = None
        map_screenshot_filename = None
        
        if before_image_data.startswith('data:image'):
            # Extract base64 data
            header, base64_data = before_image_data.split(',', 1)
            file_extension = header.split(';')[0].split('/')[1]
            before_filename = f"hazard_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{file_extension}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER_BEFORE'], before_filename)
            
            # Ensure directory exists
            os.makedirs(app.config['UPLOAD_FOLDER_BEFORE'], exist_ok=True)
            
            # Save file
            import base64
            with open(filepath, 'wb') as f:
                f.write(base64.b64decode(base64_data))
        else:
            return jsonify({'error': 'Invalid image format'}), 400
        
        # Save map screenshot if provided
        if map_screenshot and map_screenshot.startswith('data:image'):
            header, base64_data = map_screenshot.split(',', 1)
            file_extension = header.split(';')[0].split('/')[1]
            map_screenshot_filename = f"map_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{file_extension}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER_BEFORE'], map_screenshot_filename)
            
            with open(filepath, 'wb') as f:
                f.write(base64.b64decode(base64_data))
        
        # Insert into database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO hazard_reports 
            (before_image, description, latitude, longitude, status, date_reported, map_screenshot)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            before_filename,
            data['description'],
            data['latitude'],
            data['longitude'],
            'Pending',
            datetime.now(),
            map_screenshot_filename
        ))
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'report_id': cursor.lastrowid,
            'message': 'Report submitted successfully!'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5001)
