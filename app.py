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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create admin table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Insert default admin if not exists
    default_admin = cursor.execute('SELECT id FROM admin WHERE username = ?', ('admin',)).fetchone()
    if not default_admin:
        password_hash = generate_password_hash('admin123')
        cursor.execute('''
            INSERT INTO admin (username, password_hash)
            VALUES (?, ?)
        ''', ('admin', password_hash))
    
    # Create teacher_pins table for RFID system
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS teacher_pins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pin TEXT UNIQUE NOT NULL,
            teacher_name TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_by INTEGER,
            FOREIGN KEY (created_by) REFERENCES admin (id)
        )
    ''')
    
    # Insert default teacher pins if none exist
    existing_pins = cursor.execute('SELECT COUNT(*) FROM teacher_pins').fetchone()[0]
    if existing_pins == 0:
        default_pins = ['1234', '5678', '9012', '3456', '7890']
        for pin in default_pins:
            cursor.execute('''
                INSERT INTO teacher_pins (pin, teacher_name, is_active)
                VALUES (?, ?, ?)
            ''', (pin, f'Teacher {pin}', 1))
    
    # Create rfid_logs table for tracking scans
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS rfid_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_type TEXT NOT NULL,
            card_id TEXT NOT NULL,
            card_data TEXT,
            teacher_pin TEXT,
            ip_address TEXT,
            user_agent TEXT,
            scan_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_verified INTEGER DEFAULT 0
        )
    ''')
    
    conn.commit()
    conn.close()

# Database helper
def get_db_connection():
    conn = sqlite3.connect(app.config['DATABASE'])
    conn.row_factory = sqlite3.Row
    return conn

# Routes
@app.route('/')
def index():
    return send_from_directory('static/rfid', 'index.html')

@app.route('/hazard')
def hazard_dashboard():
    return render_template('index.html')

# Serve RFID static assets
@app.route('/assets/<path:filename>')
def serve_rfid_assets(filename):
    return send_from_directory('static/rfid/assets', filename)

@app.route('/admin/rfid')
def admin_rfid_protected():
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    
    conn = get_db_connection()
    
    # Get recent RFID logs
    logs = conn.execute('''
        SELECT * FROM rfid_logs 
        ORDER BY scan_timestamp DESC 
        LIMIT 100
    ''').fetchall()
    
    # Get all teacher pins
    pins = conn.execute('''
        SELECT * FROM teacher_pins 
        ORDER BY created_at DESC
    ''').fetchall()
    
    # Get statistics
    stats = {
        'total_scans': conn.execute('SELECT COUNT(*) FROM rfid_logs').fetchone()[0],
        'today_scans': conn.execute('SELECT COUNT(*) FROM rfid_logs WHERE DATE(scan_timestamp) = DATE("now")').fetchone()[0],
        'teacher_scans': conn.execute('SELECT COUNT(*) FROM rfid_logs WHERE user_type = "teacher"').fetchone()[0],
        'student_scans': conn.execute('SELECT COUNT(*) FROM rfid_logs WHERE user_type = "student"').fetchone()[0]
    }
    
    conn.close()
    
    return render_template('admin_rfid_dashboard.html', logs=logs, pins=pins, stats=stats)

@app.route('/history')
def history():
    conn = get_db_connection()
    reports = conn.execute('''
        SELECT * FROM hazard_reports 
        ORDER BY date_reported DESC
    ''').fetchall()
    conn.close()
    return render_template('history.html', reports=reports)

@app.route('/api/report', methods=['POST'])
def report_hazard():
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['before_image', 'description', 'latitude', 'longitude']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Save image
        before_image_data = data['before_image']
        if before_image_data.startswith('data:image'):
            # Extract base64 data
            header, base64_data = before_image_data.split(',', 1)
            file_extension = header.split(';')[0].split('/')[1]
            filename = f"hazard_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{file_extension}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER_BEFORE'], filename)
            
            # Ensure directory exists
            os.makedirs(app.config['UPLOAD_FOLDER_BEFORE'], exist_ok=True)
            
            # Save file
            import base64
            with open(filepath, 'wb') as f:
                f.write(base64.b64decode(base64_data))
        else:
            return jsonify({'error': 'Invalid image format'}), 400
        
        # Insert into database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO hazard_reports 
            (before_image, description, latitude, longitude, status, date_reported)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            filename,
            data['description'],
            data['latitude'],
            data['longitude'],
            'Pending',
            datetime.now()
        ))
        conn.commit()
        report_id = cursor.lastrowid
        conn.close()
        
        return jsonify({
            'success': True,
            'report_id': report_id,
            'message': 'Hazard reported successfully'
        })
        
    except Exception as e:
        app.logger.error(f'Error reporting hazard: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        conn = get_db_connection()
        admin = conn.execute('''
            SELECT * FROM admin WHERE username = ?
        ''', (username,)).fetchone()
        conn.close()
        
        if admin and check_password_hash(admin['password_hash'], password):
            session['admin_logged_in'] = True
            session['admin_username'] = admin['username']
            return redirect(url_for('admin_dashboard'))
        else:
            flash('Invalid credentials', 'error')
    
    return render_template('admin_login.html')

@app.route('/admin/logout')
def admin_logout():
    session.clear()
    return redirect(url_for('admin_login'))

@app.route('/admin/dashboard')
def admin_dashboard():
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    
    conn = get_db_connection()
    reports = conn.execute('''
        SELECT * FROM hazard_reports 
        ORDER BY date_reported DESC
    ''').fetchall()
    conn.close()
    
    return render_template('admin_dashboard.html', reports=reports)

@app.route('/admin/resolve/<int:report_id>', methods=['POST'])
def resolve_hazard(report_id):
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.json
        after_image_data = data.get('after_image')
        
        if not after_image_data or not after_image_data.startswith('data:image'):
            return jsonify({'error': 'Invalid after image'}), 400
        
        # Save after image
        header, base64_data = after_image_data.split(',', 1)
        file_extension = header.split(';')[0].split('/')[1]
        filename = f"resolved_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{file_extension}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER_AFTER'], filename)
        
        # Ensure directory exists
        os.makedirs(app.config['UPLOAD_FOLDER_AFTER'], exist_ok=True)
        
        # Save file
        import base64
        with open(filepath, 'wb') as f:
            f.write(base64.b64decode(base64_data))
        
        # Update database
        conn = get_db_connection()
        conn.execute('''
            UPDATE hazard_reports 
            SET after_image = ?, status = ?, date_resolved = ?
            WHERE id = ?
        ''', (filename, 'Resolved', datetime.now(), report_id))
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Hazard marked as resolved'
        })
        
    except Exception as e:
        app.logger.error(f'Error resolving hazard: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/uploads/before/<filename>')
def uploaded_before_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER_BEFORE'], filename)

@app.route('/uploads/after/<filename>')
def uploaded_after_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER_AFTER'], filename)

# ==================== RFID/NFC SYSTEM ROUTES ====================

@app.route('/rfid')
def rfid_landing():
    """Serve the RFID React app"""
    return send_from_directory('static/rfid', 'index.html')

# API Routes for RFID System

@app.route('/api/rfid/verify-pin', methods=['POST'])
def verify_teacher_pin():
    """Verify teacher PIN"""
    try:
        data = request.json
        pin = data.get('pin', '')
        
        if not pin or len(pin) != 4 or not pin.isdigit():
            return jsonify({'valid': False, 'message': 'Invalid PIN format'}), 400
        
        conn = get_db_connection()
        pin_record = conn.execute('''
            SELECT * FROM teacher_pins 
            WHERE pin = ? AND is_active = 1
        ''', (pin,)).fetchone()
        conn.close()
        
        if pin_record:
            # Log teacher PIN authentication to RFID logs
            try:
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO rfid_logs 
                    (user_type, card_id, card_data, teacher_pin, ip_address, user_agent, is_verified)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    'teacher',
                    'PIN_AUTH',
                    f'Teacher PIN authentication via {pin_record["teacher_name"]}',
                    pin,
                    request.remote_addr,
                    request.headers.get('User-Agent', ''),
                    True
                ))
                conn.commit()
                conn.close()
            except Exception as log_error:
                app.logger.error(f'Error logging teacher PIN: {str(log_error)}')
            
            return jsonify({
                'valid': True,
                'teacher_name': pin_record['teacher_name'],
                'pin_id': pin_record['id']
            })
        else:
            return jsonify({'valid': False, 'message': 'Invalid PIN'}), 401
            
    except Exception as e:
        app.logger.error(f'Error verifying PIN: {str(e)}')
        return jsonify({'valid': False, 'message': 'Server error'}), 500

@app.route('/api/rfid/log-scan', methods=['POST'])
def log_rfid_scan():
    """Log RFID scan to database"""
    try:
        data = request.json
        
        user_type = data.get('user_type', 'student')
        card_id = data.get('card_id', '')
        card_data = data.get('card_data', '')
        teacher_pin = data.get('teacher_pin', None)
        
        # Get client info
        ip_address = request.remote_addr
        user_agent = request.headers.get('User-Agent', '')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO rfid_logs 
            (user_type, card_id, card_data, teacher_pin, ip_address, user_agent, is_verified)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (user_type, card_id, card_data, teacher_pin, ip_address, user_agent, True))
        
        log_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'log_id': log_id,
            'message': 'Scan logged successfully'
        })
        
    except Exception as e:
        app.logger.error(f'Error logging scan: {str(e)}')
        return jsonify({'success': False, 'message': 'Server error'}), 500

# Admin RFID Management Routes

@app.route('/admin/rfid-dashboard')
def admin_rfid_dashboard():
    """Admin dashboard for RFID monitoring"""
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin_login'))
    
    conn = get_db_connection()
    
    # Get recent RFID logs
    logs = conn.execute('''
        SELECT * FROM rfid_logs 
        ORDER BY scan_timestamp DESC 
        LIMIT 100
    ''').fetchall()
    
    # Get all teacher pins
    pins = conn.execute('''
        SELECT * FROM teacher_pins 
        ORDER BY created_at DESC
    ''').fetchall()
    
    # Get statistics
    stats = conn.execute('''
        SELECT 
            COUNT(*) as total_scans,
            COUNT(CASE WHEN user_type = 'teacher' THEN 1 END) as teacher_scans,
            COUNT(CASE WHEN user_type = 'student' THEN 1 END) as student_scans,
            COUNT(CASE WHEN DATE(scan_timestamp) = DATE('now') THEN 1 END) as today_scans
        FROM rfid_logs
    ''').fetchone()
    
    conn.close()
    
    return render_template('admin_rfid_dashboard.html', logs=logs, pins=pins, stats=stats)

@app.route('/api/admin/pins', methods=['GET'])
def get_teacher_pins():
    """Get all teacher pins (admin only)"""
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        conn = get_db_connection()
        pins = conn.execute('''
            SELECT id, pin, teacher_name, is_active, created_at 
            FROM teacher_pins 
            ORDER BY created_at DESC
        ''').fetchall()
        conn.close()
        
        return jsonify({
            'success': True,
            'pins': [dict(pin) for pin in pins]
        })
        
    except Exception as e:
        app.logger.error(f'Error getting pins: {str(e)}')
        return jsonify({'error': 'Server error'}), 500

@app.route('/api/admin/pins', methods=['POST'])
def add_teacher_pin():
    """Add new teacher pin (admin only)"""
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        data = request.json
        pin = data.get('pin', '')
        teacher_name = data.get('teacher_name', '')
        
        # Validate PIN
        if not pin or len(pin) != 4 or not pin.isdigit():
            return jsonify({'error': 'PIN must be 4 digits'}), 400
        
        conn = get_db_connection()
        
        # Check if PIN already exists
        existing = conn.execute('SELECT id FROM teacher_pins WHERE pin = ?', (pin,)).fetchone()
        if existing:
            conn.close()
            return jsonify({'error': 'PIN already exists'}), 409
        
        # Insert new PIN
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO teacher_pins (pin, teacher_name, is_active, created_by)
            VALUES (?, ?, ?, ?)
        ''', (pin, teacher_name, 1, session.get('admin_id')))
        
        pin_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'pin_id': pin_id,
            'message': 'PIN added successfully'
        })
        
    except Exception as e:
        app.logger.error(f'Error adding PIN: {str(e)}')
        return jsonify({'error': 'Server error'}), 500

@app.route('/api/admin/pins/<int:pin_id>', methods=['DELETE'])
def delete_teacher_pin(pin_id):
    """Delete/disable teacher pin (admin only)"""
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        conn = get_db_connection()
        conn.execute('DELETE FROM teacher_pins WHERE id = ?', (pin_id,))
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'PIN deleted successfully'
        })
        
    except Exception as e:
        app.logger.error(f'Error deleting PIN: {str(e)}')
        return jsonify({'error': 'Server error'}), 500

@app.route('/api/admin/pins/<int:pin_id>/toggle', methods=['POST'])
def toggle_teacher_pin(pin_id):
    """Toggle pin active status (admin only)"""
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        conn = get_db_connection()
        
        # Get current status
        pin = conn.execute('SELECT is_active FROM teacher_pins WHERE id = ?', (pin_id,)).fetchone()
        if not pin:
            conn.close()
            return jsonify({'error': 'PIN not found'}), 404
        
        # Toggle status
        new_status = 0 if pin['is_active'] == 1 else 1
        conn.execute('UPDATE teacher_pins SET is_active = ? WHERE id = ?', (new_status, pin_id))
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'is_active': new_status == 1,
            'message': 'PIN status updated'
        })
        
    except Exception as e:
        app.logger.error(f'Error toggling PIN: {str(e)}')
        return jsonify({'error': 'Server error'}), 500

@app.route('/api/admin/rfid-logs', methods=['GET'])
def get_rfid_logs():
    """Get RFID scan logs (admin only)"""
    if not session.get('admin_logged_in'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        conn = get_db_connection()
        logs = conn.execute('''
            SELECT * FROM rfid_logs 
            ORDER BY scan_timestamp DESC 
            LIMIT ? OFFSET ?
        ''', (limit, offset)).fetchall()
        
        # Get total count
        total = conn.execute('SELECT COUNT(*) FROM rfid_logs').fetchone()[0]
        conn.close()
        
        return jsonify({
            'success': True,
            'logs': [dict(log) for log in logs],
            'total': total,
            'limit': limit,
            'offset': offset
        })
        
    except Exception as e:
        app.logger.error(f'Error getting logs: {str(e)}')
        return jsonify({'error': 'Server error'}), 500

# Serve React RFID app static files
@app.route('/rfid/<path:path>')
def serve_rfid_static(path):
    """Serve static files for RFID React app"""
    return send_from_directory('static/rfid', path)

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5001)