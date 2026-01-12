#!/usr/bin/env python3
"""
ZKTeco Attendance Sync Service
Connects to ZKTeco device and pushes attendance logs to the cloud database.

Requirements:
    pip install pyzk requests python-dotenv schedule

Usage:
    python sync_attendance.py              # Run once
    python sync_attendance.py --daemon     # Run as daemon with scheduled sync
"""

import os
import sys
import argparse
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import json
import time

try:
    from zk import ZK
    import requests
    from dotenv import load_dotenv
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Install with: pip install pyzk requests python-dotenv schedule")
    sys.exit(1)

# Load environment variables
load_dotenv()

# Configuration
DEVICE_IP = os.getenv("ZKTECO_DEVICE_IP", "192.168.1.201")
DEVICE_PORT = int(os.getenv("ZKTECO_DEVICE_PORT", "4370"))
API_URL = os.getenv("SUPABASE_URL", "https://kabarbvtphzaicarelun.supabase.co")
API_KEY = os.getenv("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthYmFyYnZ0cGh6YWljYXJlbHVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NTAxNTUsImV4cCI6MjA4MzUyNjE1NX0.e9e8ekS0_OdYWfmmGoBJK5FM6cQ5wcfXcG05v-V23bs")
SYNC_INTERVAL_MINUTES = int(os.getenv("SYNC_INTERVAL_MINUTES", "15"))

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('sync_attendance.log')
    ]
)
logger = logging.getLogger(__name__)


class ZKTecoSync:
    """Handles connection and data fetching from ZKTeco device."""
    
    def __init__(self, ip: str, port: int):
        self.ip = ip
        self.port = port
        self.zk = None
        self.conn = None
    
    def connect(self) -> bool:
        """Establish connection to the device."""
        try:
            self.zk = ZK(self.ip, port=self.port, timeout=10)
            self.conn = self.zk.connect()
            logger.info(f"Connected to ZKTeco device at {self.ip}:{self.port}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to device: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from the device."""
        if self.conn:
            try:
                self.conn.disconnect()
                logger.info("Disconnected from device")
            except Exception as e:
                logger.error(f"Error disconnecting: {e}")
    
    def get_attendance_logs(self, from_date: Optional[datetime] = None) -> List[Dict]:
        """
        Fetch attendance logs from the device.
        
        Args:
            from_date: Optional date to fetch logs from. If None, fetches all logs.
        
        Returns:
            List of attendance log dictionaries.
        """
        if not self.conn:
            logger.error("Not connected to device")
            return []
        
        try:
            # Disable device while reading (prevents new punches during sync)
            self.conn.disable_device()
            
            # Get all attendance records
            attendance = self.conn.get_attendance()
            
            # Re-enable device
            self.conn.enable_device()
            
            if not attendance:
                logger.info("No attendance records found")
                return []
            
            logs = []
            for record in attendance:
                punch_time = record.timestamp
                
                # Filter by date if specified
                if from_date and punch_time < from_date:
                    continue
                
                logs.append({
                    "device_user_id": str(record.user_id),
                    "punch_time": punch_time.isoformat(),
                    "device_id": f"{self.ip}:{self.port}"
                })
            
            logger.info(f"Fetched {len(logs)} attendance records")
            return logs
            
        except Exception as e:
            logger.error(f"Error fetching attendance: {e}")
            # Try to re-enable device
            try:
                self.conn.enable_device()
            except:
                pass
            return []
    
    def get_users(self) -> List[Dict]:
        """Fetch all users from the device."""
        if not self.conn:
            logger.error("Not connected to device")
            return []
        
        try:
            users = self.conn.get_users()
            return [
                {
                    "device_user_id": str(user.user_id),
                    "name": user.name,
                    "privilege": user.privilege,
                    "card": user.card
                }
                for user in users
            ]
        except Exception as e:
            logger.error(f"Error fetching users: {e}")
            return []


class AttendanceAPI:
    """Handles API communication with the cloud backend."""
    
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.headers = {
            "apikey": api_key,
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def push_attendance_logs(self, device_ip: str, logs: List[Dict]) -> Dict:
        """
        Push attendance logs to the backend.
        
        Args:
            device_ip: IP address of the device
            logs: List of attendance log dictionaries
        
        Returns:
            Response from the API
        """
        url = f"{self.base_url}/functions/v1/sync-attendance"
        
        payload = {
            "device_id": f"{device_ip}:{DEVICE_PORT}",
            "device_ip": device_ip,
            "logs": logs
        }
        
        try:
            response = requests.post(url, json=payload, headers=self.headers, timeout=60)
            response.raise_for_status()
            result = response.json()
            logger.info(f"API Response: {result}")
            return result
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {e}")
            return {"error": str(e)}


def sync_once():
    """Perform a single sync operation."""
    logger.info("=" * 50)
    logger.info("Starting attendance sync...")
    
    # Connect to device
    zk_sync = ZKTecoSync(DEVICE_IP, DEVICE_PORT)
    if not zk_sync.connect():
        logger.error("Sync failed: Could not connect to device")
        return False
    
    try:
        # Fetch attendance logs (last 7 days to catch any missed syncs)
        from_date = datetime.now() - timedelta(days=7)
        logs = zk_sync.get_attendance_logs(from_date)
        
        if not logs:
            logger.info("No new attendance logs to sync")
            return True
        
        # Push to API
        api = AttendanceAPI(API_URL, API_KEY)
        result = api.push_attendance_logs(DEVICE_IP, logs)
        
        if "error" in result:
            logger.error(f"Sync completed with errors: {result['error']}")
            return False
        
        logger.info(f"Sync completed successfully!")
        logger.info(f"  Records fetched: {result.get('records_fetched', 0)}")
        logger.info(f"  Records added: {result.get('records_added', 0)}")
        
        if result.get('errors'):
            logger.warning(f"  Warnings: {result['errors']}")
        
        return True
        
    finally:
        zk_sync.disconnect()


def run_daemon():
    """Run the sync service as a daemon with scheduled execution."""
    try:
        import schedule
    except ImportError:
        print("Install schedule: pip install schedule")
        sys.exit(1)
    
    logger.info(f"Starting sync daemon (interval: {SYNC_INTERVAL_MINUTES} minutes)")
    
    # Run immediately on start
    sync_once()
    
    # Schedule periodic sync
    schedule.every(SYNC_INTERVAL_MINUTES).minutes.do(sync_once)
    
    while True:
        schedule.run_pending()
        time.sleep(60)


def list_device_users():
    """List all users on the device (for mapping purposes)."""
    zk_sync = ZKTecoSync(DEVICE_IP, DEVICE_PORT)
    if not zk_sync.connect():
        return
    
    try:
        users = zk_sync.get_users()
        print("\nDevice Users:")
        print("-" * 50)
        for user in users:
            print(f"  ID: {user['device_user_id']:>5}  Name: {user['name']}")
        print(f"\nTotal: {len(users)} users")
    finally:
        zk_sync.disconnect()


def main():
    parser = argparse.ArgumentParser(description="ZKTeco Attendance Sync Service")
    parser.add_argument("--daemon", action="store_true", help="Run as daemon with scheduled sync")
    parser.add_argument("--list-users", action="store_true", help="List users on the device")
    parser.add_argument("--device-ip", type=str, help="Override device IP address")
    parser.add_argument("--device-port", type=int, help="Override device port")
    
    args = parser.parse_args()
    
    global DEVICE_IP, DEVICE_PORT
    if args.device_ip:
        DEVICE_IP = args.device_ip
    if args.device_port:
        DEVICE_PORT = args.device_port
    
    logger.info(f"Device: {DEVICE_IP}:{DEVICE_PORT}")
    logger.info(f"API URL: {API_URL}")
    
    if args.list_users:
        list_device_users()
    elif args.daemon:
        run_daemon()
    else:
        success = sync_once()
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
