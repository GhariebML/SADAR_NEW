"""
Migration 001_initial — SADAR Database Schema Update
====================================================
يضيف أعمدة station, direction, strength لجدول signals
التاريخ: 2026-05-04
"""

import sqlite3
import os
from pathlib import Path

# نفس مسار الداتابيز المستخدم في crud.py
PROJECT_ROOT = Path(__file__).resolve().parents[3]  # migrations/versions/001_initial.py → project root
DB_PATH = Path(os.getenv("SADAR_DB_PATH", PROJECT_ROOT / "data" / "database" / "spectrum.db"))


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _column_exists(conn: sqlite3.Connection, table: str, column: str) -> bool:
    """يتأكد إن العمود موجود قبل ما يضيفه"""
    cursor = conn.execute(f"PRAGMA table_info({table})")
    columns = [row["name"] for row in cursor.fetchall()]
    return column in columns


def upgrade() -> None:
    """يضيف الأعمدة الجديدة للجدول"""
    with _connect() as conn:
        # قائمة الأعمدة الجديدة: (اسم العمود, نوع البيانات)
        new_columns = [
            ("station", "TEXT"),
            ("direction", "TEXT"),
            ("strength", "REAL"),
        ]
        
        added = []
        for col_name, col_type in new_columns:
            if not _column_exists(conn, "signals", col_name):
                conn.execute(f"ALTER TABLE signals ADD COLUMN {col_name} {col_type}")
                added.append(f"{col_name} {col_type}")
            else:
                print(f"⚠️ العمود '{col_name}' موجود بالفعل — تم تخطيه")
        
        conn.commit()
        
        if added:
            print(f"✅ تم إضافة الأعمدة بنجاح: {', '.join(added)}")
        else:
            print("ℹ️ جميع الأعمدة موجودة — لا يوجد شيء لإضافته")


def downgrade() -> None:
    """
    ⚠️ SQLite لا يدعم حذف الأعمدة مباشرة
    الحل الوحيد: إعادة إنشاء الجدول بدون الأعمدة الجديدة
    """
    print("⚠️ Downgrade غير مدعوم في SQLite — يجب إعادة إنشاء الجدول يدوياً")


if __name__ == "__main__":
    upgrade()