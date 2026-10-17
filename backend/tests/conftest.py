"""Pytest configuration.

IMPORTANT: Test runs must never touch the live database (syllabusiq_db).
Every pytest run used to register mock users and create classroom/quiz
fixtures directly in the production DB, which polluted the website with
test data. DATABASE_NAME is pointed at a dedicated test database here,
before any application module (which reads Settings at import time).
"""
import os

os.environ["DATABASE_NAME"] = "syllabusiq_test"
