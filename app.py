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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_id INTEGER,
            user_name TEXT,
            user_role TEXT,
            rfid_code TEXT
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
    
    # Create teacher_keys table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS teacher_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            pin TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'teacher',
            status TEXT NOT NULL DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create user_activity table for monitoring
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_activity (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            user_name TEXT NOT NULL,
            user_role TEXT NOT NULL,
            action TEXT NOT NULL,
            timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            ip_address TEXT,
            FOREIGN KEY (user_id) REFERENCES teacher_keys (id)
        )
    ''')
    
    # Create feedback table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            user_type TEXT,
            category TEXT,
            message TEXT NOT NULL,
            status TEXT DEFAULT 'New',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

def get_db_connection():
    """Get database connection with proper error handling"""
    conn = sqlite3.connect(app.config['DATABASE'], timeout=10.0)
    conn.row_factory = sqlite3.Row
    # Enable WAL mode for better concurrency
    conn.execute('PRAGMA journal_mode=WAL')
    return conn

def log_user_activity(user_id, user_name, user_role, action, ip_address=None):
    """Log user activity for monitoring"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO user_activity (user_id, user_name, user_role, action, ip_address)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, user_name, user_role, action, ip_address))
        conn.commit()
    except Exception as e:
        print(f"Error logging activity: {e}")
    finally:
        if conn:
            conn.close()

@app.route('/')
def index():
    # Check if user is already authenticated via RFID/PIN
    if 'user_logged_in' in session and 'user_id' in session:
        return render_template('index.html')
    # If admin is logged in, allow access to report page
    elif 'admin_logged_in' in session:
        return render_template('index.html')
    else:
        # Redirect to RFID login page
        return redirect(url_for('rfid_login'))

@app.route('/hazard')
def hazard_redirect():
    """Redirect /hazard to main index page"""
    return redirect(url_for('index'))

@app.route('/clear-session')
def clear_session():
    """Clear session for testing"""
    session.clear()
    return redirect(url_for('rfid_login'))

@app.route('/static/rfid/assets/<path:filename>')
def serve_rfid_assets(filename):
    return send_from_directory(os.path.join('static', 'rfid', 'assets'), filename)

@app.route('/rfid-login')
def rfid_login():
    # If already logged in, redirect to main dashboard
    if 'user_logged_in' in session and 'user_id' in session:
        return redirect(url_for('index'))
    
    # Read RFID.html and replace asset paths with Flask URLs
    with open(os.path.join('static', 'rfid', 'RFID.html'), 'r') as f:
        content = f.read()
    
    # Replace relative asset paths with Flask static URLs
    content = content.replace(
        './assets/index-BHz0ethL.js',
        url_for('static', filename='rfid/assets/index-BHz0ethL.js')
    ).replace(
        './assets/index-CSlSh7T3.css',
        url_for('static', filename='rfid/assets/index-CSlSh7T3.css')
    )
    
    return content

@app.route('/rfid-authenticate', methods=['POST'])
def rfid_authenticate():
    """Handle RFID/PIN authentication"""
    try:
        data = request.json
        pin = data.get('pin')
        rfid = data.get('rfid')  # Accept RFID data
        
        # Get client IP for logging
        client_ip = request.remote_addr
        user_info = None
        auth_method = None
        
        # Check for PIN authentication (teachers)
        if pin:
            conn = get_db_connection()
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM teacher_keys WHERE pin = ? AND status = 'active'", (pin,))
            teacher = cursor.fetchone()
            conn.close()
            
            if teacher:
                user_info = teacher
                auth_method = 'PIN'
        
        # Check for RFID authentication (any RFID card)
        elif rfid:
            # Accept any RFID format (XX:XX:XX:XX)
            if ':' in rfid and len(rfid.split(':')) == 4:
                user_info = {
                    'id': 0,  # Special ID for RFID users
                    'name': f'RFID User ({rfid})',
                    'role': 'RFID User',
                    'pin': rfid
                }
                auth_method = 'RFID'
        
        if user_info:
            # Set user session
            session['user_logged_in'] = True
            session['user_id'] = user_info['id']
            session['user_name'] = user_info['name']
            session['user_role'] = user_info['role']
            if auth_method == 'RFID':
                session['rfid_card'] = user_info['pin']
            
            # Log successful authentication
            log_user_activity(
                user_info['id'], 
                user_info['name'], 
                user_info['role'], 
                f'LOGIN_SUCCESS_{auth_method}',
                client_ip
            )
            
            return jsonify({
                'success': True,
                'teacher': {
                    'id': user_info['id'],
                    'name': user_info['name'],
                    'role': user_info['role']
                },
                'redirect': url_for('index')
            })
        else:
            # Log failed authentication attempt
            auth_data = rfid if rfid else f'PIN:{pin}'
            log_user_activity(
                0, 
                'Unknown', 
                'Unknown', 
                f'LOGIN_FAILED_{auth_method}:{auth_data}',
                client_ip
            )
            
            return jsonify({
                'success': False,
                'error': 'Invalid authentication'
            }), 401
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/user-logout')
def user_logout():
    """Handle user logout"""
    if 'user_logged_in' in session:
        # Log logout activity
        log_user_activity(
            session.get('user_id', 0),
            session.get('user_name', 'Unknown'),
            session.get('user_role', 'Unknown'),
            'LOGOUT',
            request.remote_addr
        )
    
    # Clear user session (keep admin session if exists)
    user_keys = ['user_logged_in', 'user_id', 'user_name', 'user_role']
    for key in user_keys:
        if key in session:
            session.pop(key, None)
    
    return redirect(url_for('rfid_login'))

@app.route('/api/user-activity')
def get_user_activity():
    """Get user activity logs for admin monitoring"""
    if 'admin_logged_in' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        conn = get_db_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM user_activity 
            ORDER BY timestamp DESC 
            LIMIT 100
        ''')
        activities = cursor.fetchall()
        conn.close()
        
        # Convert Row objects to dictionaries for JSON serialization
        activity_list = []
        for activity in activities:
            activity_dict = dict(activity)
            activity_list.append(activity_dict)
        
        return jsonify({
            'success': True,
            'activities': activity_list
        })
    except Exception as e:
        print(f"Error in get_user_activity: {str(e)}")  # Debug print
        return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route('/history')
def history():
    # Allow access if user is logged in (RFID/PIN) OR admin is logged in
    if ('user_logged_in' not in session or 'user_id' not in session) and 'admin_logged_in' not in session:
        return redirect(url_for('rfid_login'))
    
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM hazard_reports ORDER BY date_reported DESC")
    reports = cursor.fetchall()
    conn.close()
    
    # Log history page access
    log_user_activity(
        session.get('user_id', 0),
        session.get('user_name', 'Unknown'),
        session.get('user_role', 'Unknown'),
        'ACCESS_HISTORY',
        request.remote_addr
    )
    
    return render_template('history.html', reports=reports)

@app.route('/admin_login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        conn = get_db_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM admin WHERE username = ?", (username,))
        admin = cursor.fetchone()
        conn.close()
        
        if admin and check_password_hash(admin['password_hash'], password):
            session['admin_logged_in'] = True
            session['admin_username'] = username
            flash('Login successful!', 'success')
            return redirect(url_for('admin_dashboard'))
        else:
            flash('Invalid username or password', 'error')
            return render_template('admin_login.html')
    
    return render_template('admin_login.html')

@app.route('/admin/rfid-management')
def rfid_management():
    if 'admin_logged_in' not in session:
        return redirect(url_for('admin_login'))
    return render_template('rfid_management.html')

@app.route('/admin/logout')
def admin_logout():
    session.clear()
    flash('Logged out successfully', 'success')
    return redirect(url_for('admin_login'))

@app.route('/admin/dashboard')
def admin_dashboard():
    if 'admin_logged_in' not in session:
        return redirect(url_for('admin_login'))
    
    print(f"DEBUG: admin_dashboard accessed by user: {session.get('admin_username')}")  # Debug print
    
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM hazard_reports ORDER BY date_reported DESC")
    reports = cursor.fetchall()
    conn.close()
    
    return render_template('admin_dashboard.html', reports=reports)

@app.route('/admin/rfid')
def admin_rfid_protected():
    if 'admin_logged_in' not in session:
        return redirect(url_for('admin_login'))
    return render_template('admin_rfid_dashboard.html')

@app.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        subject = request.form.get('subject')
        message = request.form.get('message')
        
        # Here you would typically save to database or send email
        # For now, just show success message
        flash('Thank you for your message! We will get back to you soon.', 'success')
        return redirect(url_for('contact'))
    
    return render_template('contact.html')

@app.route('/feedback', methods=['GET', 'POST'])
def feedback():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        user_type = request.form.get('user_type')
        category = request.form.get('category')
        message = request.form.get('message')
        
        # Save feedback to database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO feedback (name, email, user_type, category, message)
            VALUES (?, ?, ?, ?, ?)
        ''', (name, email, user_type, category, message))
        conn.commit()
        conn.close()
        
        flash('Thank you for your feedback! We will review it and get back to you.', 'success')
        return redirect(url_for('feedback'))
    
    return render_template('feedback.html')

@app.route('/admin/feedback')
def admin_feedback():
    if 'admin_logged_in' not in session:
        return redirect(url_for('admin_login'))
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM feedback ORDER BY created_at DESC')
    feedbacks = cursor.fetchall()
    conn.close()
    
    return render_template('admin_feedback.html', feedbacks=feedbacks)

@app.route('/admin/feedback/<int:feedback_id>/update', methods=['POST'])
def update_feedback_status(feedback_id):
    if 'admin_logged_in' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.json
        new_status = data.get('status')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE feedback 
            SET is_read = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        ''', (new_status, feedback_id))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Feedback status updated successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/admin/feedback/<int:feedback_id>/delete', methods=['POST'])
def delete_feedback(feedback_id):
    if 'admin_logged_in' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM feedback WHERE id = ?', (feedback_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Feedback deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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

@app.route('/static/uploads/before/<path:filename>')
def uploaded_before_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER_BEFORE'], filename)

@app.route('/static/uploads/after/<path:filename>')
def uploaded_after_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER_AFTER'], filename)

@app.route('/static/map_screenshots/<path:filename>')
def serve_map_screenshot(filename):
    try:
        upload_dir = app.config['UPLOAD_FOLDER_MAP_SCREENSHOTS']
        return send_from_directory(upload_dir, filename)
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@app.route('/admin/resolve/<int:report_id>', methods=['POST'])
def resolve_hazard(report_id):
    if 'admin_logged_in' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.json
        after_image_data = data.get('after_image')
        
        if not after_image_data:
            return jsonify({'error': 'After image is required'}), 400
        
        # Save after image
        if after_image_data.startswith('data:image'):
            header, base64_data = after_image_data.split(',', 1)
            file_extension = header.split(';')[0].split('/')[1]
            after_filename = f"resolved_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{file_extension}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER_AFTER'], after_filename)
            
            # Ensure directory exists
            os.makedirs(app.config['UPLOAD_FOLDER_AFTER'], exist_ok=True)
            
            # Save file
            import base64
            with open(filepath, 'wb') as f:
                f.write(base64.b64decode(base64_data))
        else:
            return jsonify({'error': 'Invalid image format'}), 400
        
        # Update database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE hazard_reports 
            SET after_image = ?, status = 'Resolved', date_resolved = ?
            WHERE id = ?
        ''', (after_filename, datetime.now(), report_id))
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Hazard marked as resolved successfully!'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/rfid/teachers')
def get_teachers():
    if 'admin_logged_in' not in session:
        return jsonify({'error': 'Unauthorized - Admin login required'}), 401
    
    try:
        conn = get_db_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM teacher_keys ORDER BY name")
        teachers = cursor.fetchall()
        conn.close()
        
        # Convert Row objects to dictionaries for JSON serialization
        teachers_list = []
        for teacher in teachers:
            teacher_dict = dict(teacher)
            teachers_list.append(teacher_dict)
        
        return jsonify({
            'success': True,
            'teachers': teachers_list
        })
    except Exception as e:
        print(f"Error in get_teachers: {str(e)}")  # Debug print
        return jsonify({'error': f'Database error: {str(e)}'}), 500

@app.route('/api/rfid/teacher', methods=['POST', 'PUT'])
def manage_teacher():
    if 'admin_logged_in' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        if request.method == 'POST':
            # Add new teacher
            data = request.form
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO teacher_keys (name, pin, role, status, created_at)
                VALUES (?, ?, ?, ?, ?)
            ''', (data['name'], data['pin'], data['role'], data['status'], datetime.now()))
            conn.commit()
            conn.close()
            
            return jsonify({
                'success': True,
                'message': 'Teacher added successfully!'
            })
            
        elif request.method == 'PUT':
            # Update existing teacher
            data = request.form
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE teacher_keys 
                SET name = ?, pin = ?, role = ?, status = ?
                WHERE id = ?
            ''', (data['name'], data['pin'], data['role'], data['status'], data['id']))
            conn.commit()
            conn.close()
            
            return jsonify({
                'success': True,
                'message': 'Teacher updated successfully!'
            })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/rfid/teacher/<int:teacher_id>', methods=['DELETE'])
def delete_teacher(teacher_id):
    if 'admin_logged_in' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM teacher_keys WHERE id = ?", (teacher_id,))
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Teacher deleted successfully!'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/admin/delete/<int:report_id>', methods=['POST'])
def delete_report(report_id):
    if 'admin_logged_in' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        # Get report info for file cleanup
        conn = get_db_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM hazard_reports WHERE id = ?", (report_id,))
        report = cursor.fetchone()
        conn.close()
        
        if not report:
            return jsonify({'error': 'Report not found'}), 404
        
        # Delete associated files
        if report['before_image']:
            before_path = os.path.join(app.config['UPLOAD_FOLDER_BEFORE'], report['before_image'])
            if os.path.exists(before_path):
                os.remove(before_path)
        
        if report['after_image']:
            after_path = os.path.join(app.config['UPLOAD_FOLDER_AFTER'], report['after_image'])
            if os.path.exists(after_path):
                os.remove(after_path)
        
        if report['map_screenshot']:
            map_path = os.path.join(app.config['UPLOAD_FOLDER_MAP_SCREENSHOTS'], report['map_screenshot'])
            if os.path.exists(map_path):
                os.remove(map_path)
        
        # Delete from database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM hazard_reports WHERE id = ?", (report_id,))
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Report deleted successfully!'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/reports', methods=['GET'])
def get_reports():
    try:
        conn = get_db_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM hazard_reports ORDER BY date_reported DESC")
        reports = cursor.fetchall()
        conn.close()
        
        # Convert to list of dicts for JSON serialization
        reports_list = []
        for report in reports:
            report_dict = dict(report)
            reports_list.append(report_dict)
        
        return jsonify({
            'success': True,
            'reports': reports_list
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/report', methods=['POST'])
def report_hazard():
    # Require user authentication (RFID/PIN) OR admin authentication
    if ('user_logged_in' not in session or 'user_id' not in session) and 'admin_logged_in' not in session:
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['before_image', 'description', 'latitude', 'longitude']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Handle optional map screenshot
        map_screenshot_url = data.get('map_screenshot_url')
        map_screenshot_filename = None
        
        if map_screenshot_url:
            # Extract filename from URL
            if 'map_screenshots/' in map_screenshot_url:
                map_screenshot_filename = map_screenshot_url.split('map_screenshots/')[-1]
            elif 'map_screenshot_' in map_screenshot_url:
                map_screenshot_filename = map_screenshot_url.split('/')[-1]
        
        # Save before image
        before_image_data = data['before_image']
        before_filename = None
        
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
        
        # Insert into database with user information
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO hazard_reports 
            (before_image, description, latitude, longitude, status, date_reported, map_screenshot, user_id, user_name, user_role, rfid_code)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            before_filename,
            data['description'],
            data['latitude'],
            data['longitude'],
            'Pending',
            datetime.now(),
            map_screenshot_filename,
            session.get('user_id'),
            session.get('user_name'),
            session.get('user_role'),
            session.get('rfid_card')
        ))
        report_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # Log report submission
        log_user_activity(
            session.get('user_id', 0),
            session.get('user_name', 'Unknown'),
            session.get('user_role', 'Unknown'),
            f'SUBMIT_REPORT:{report_id}',
            request.remote_addr
        )
        
        return jsonify({
            'success': True,
            'report_id': report_id,
            'message': 'Report submitted successfully!'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/rfid/verify-pin', methods=['POST'])
def verify_rfid_pin():
    """Verify PIN/RFID for React app"""
    print(f"DEBUG: verify_rfid_pin called with data: {request.json}")  # Debug print
    try:
        data = request.json
        pin = data.get('pin')
        rfid = data.get('rfid')  # Also accept RFID data
        
        print(f"DEBUG: Received PIN: {pin}, RFID: {rfid}")  # Debug print
        
        if not pin and not rfid:
            print("DEBUG: No PIN or RFID provided")
            return jsonify({'valid': False, 'message': 'PIN or RFID is required'}), 400
        
        # Get client IP for logging
        client_ip = request.remote_addr
        user_info = None
        auth_method = None
        
        # Check for PIN authentication (teachers)
        if pin:
            print(f"DEBUG: Checking PIN {pin} in database")  # Debug print
            conn = get_db_connection()
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM teacher_keys WHERE pin = ? AND status = 'active'", (pin,))
            teacher = cursor.fetchone()
            conn.close()
            
            print(f"DEBUG: Database query result: {teacher}")  # Debug print
            
            if teacher:
                user_info = teacher
                auth_method = 'PIN'
                print(f"DEBUG: PIN authentication successful for {teacher['name']}")
        
        # Check for RFID authentication (any RFID card)
        elif rfid:
            # Accept any RFID format (XX:XX:XX:XX)
            if ':' in rfid and len(rfid.split(':')) == 4:
                user_info = {
                    'id': 0,  # Special ID for RFID users
                    'name': f'RFID User ({rfid})',
                    'role': 'RFID User',
                    'pin': rfid
                }
                auth_method = 'RFID'
                print(f"DEBUG: RFID authentication successful for {rfid}")
        
        if user_info:
            print(f"DEBUG: Setting user session for {user_info['name']}")
            # Set user session
            session['user_logged_in'] = True
            session['user_id'] = user_info['id']
            session['user_name'] = user_info['name']
            session['user_role'] = user_info['role']
            if auth_method == 'RFID':
                session['rfid_card'] = user_info['pin']
            
            # Log successful authentication
            log_user_activity(
                user_info['id'], 
                user_info['name'], 
                user_info['role'], 
                f'LOGIN_SUCCESS_{auth_method}',
                client_ip
            )
            
            response_data = {
                'valid': True,
                'teacher': {
                    'id': user_info['id'],
                    'name': user_info['name'],
                    'role': user_info['role']
                },
                'redirect': url_for('index')
            }
            print(f"DEBUG: Returning success response: {response_data}")
            return jsonify(response_data)
        else:
            print(f"DEBUG: Authentication failed for PIN: {pin}")
            # Log failed authentication attempt
            auth_data = rfid if rfid else f'PIN:{pin}'
            log_user_activity(
                0, 
                'Unknown', 
                'Unknown', 
                f'LOGIN_FAILED_{auth_method}:{auth_data}',
                client_ip
            )
            
            response_data = {
                'valid': False,
                'message': 'Invalid authentication'
            }
            print(f"DEBUG: Returning failure response: {response_data}")
            return jsonify(response_data)
            
    except Exception as e:
        print(f"Error in verify_rfid_pin: {str(e)}")  # Debug print
        return jsonify({'valid': False, 'message': f'Server error: {str(e)}'})

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5001)
