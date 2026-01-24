#!/usr/bin/env python3
"""
Script to run the generation worker.
Usage: python run_worker.py
"""

import os
import sys

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from app.services.worker import run_worker

if __name__ == "__main__":
    run_worker()
