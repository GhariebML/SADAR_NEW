"""
data_preprocessing.py
--------------------
وظائف معالجة البيانات: تحميل الصور، التطبيع، التحويل إلى Spectrograms، إلخ.

ملاحظة: البيانات المستخدمة في التدريب تمت معالجتها مسبقًا قبل التدريب.
هذا الملف للتوثيق فقط، لشرح الخطوات التي تم اتباعها في معالجة البيانات الخام.
"""

import numpy as np
import cv2
import os
from scipy import signal

# ============================================
# إعدادات عامة
# ============================================
TARGET_SIZE = (224, 224)
NFFT = 256  # عدد نقاط STFT
HOP_LENGTH = 128  # طول الخطوة بين النوافذ

# ============================================
# 1. معالجة بيانات Drone (RFUAV)
# ============================================
def preprocess_drone_image(image_path, target_size=TARGET_SIZE):
    """
    معالجة صورة Drone من ملف نصي أو صورة
    
    Args:
        image_path (str): مسار الملف
        target_size (tuple): الأبعاد المستهدفة
    
    Returns:
        np.ndarray: الصورة المعالجة (224, 224, 3) بقيم 0-255
    """
    # قراءة الصورة
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Cannot read image: {image_path}")
    
    # تغيير الحجم
    img_resized = cv2.resize(img, target_size, interpolation=cv2.INTER_AREA)
    
    return img_resized

# ============================================
# 2. معالجة بيانات RadioML (I/Q إلى Spectrogram)
# ============================================
def iq_to_spectrogram(iq_samples, nfft=NFFT, hop_length=HOP_LENGTH):
    """
    تحويل إشارة I/Q إلى Spectrogram
    
    Args:
        iq_samples (np.ndarray): إشارة I/Q (n_samples, 2)
        nfft (int): عدد نقاط STFT
        hop_length (int): طول الخطوة بين النوافذ
    
    Returns:
        np.ndarray: الـ Spectrogram كصورة (224, 224, 3) بقيم 0-255
    """
    # تحويل I/Q إلى إشارة مركبة
    complex_signal = iq_samples[:, 0] + 1j * iq_samples[:, 1]
    
    # حساب STFT
    _, _, Zxx = signal.stft(complex_signal, fs=1.0, nperseg=nfft, noverlap=nfft - hop_length)
    spectrogram = np.abs(Zxx)
    
    # تطبيع
    if spectrogram.max() - spectrogram.min() > 0:
        spectrogram = (spectrogram - spectrogram.min()) / (spectrogram.max() - spectrogram.min())
    
    # تغيير الحجم
    spectrogram_resized = cv2.resize(spectrogram, TARGET_SIZE, interpolation=cv2.INTER_AREA)
    
    # تحويل إلى RGB (3 قنوات) وقيم 0-255
    spectrogram_rgb = np.stack([spectrogram_resized] * 3, axis=-1)
    spectrogram_rgb = (spectrogram_rgb * 255).astype(np.uint8)
    
    return spectrogram_rgb

# ============================================
# 3. معالجة بيانات Jamming (CSV إلى Spectrogram)
# ============================================
def csv_to_spectrogram(csv_path, columns_to_use=['max_magnitude', 'rssi', 'relpwr_db', 'avgpwr_db']):
    """
    تحويل ملف CSV إلى Spectrogram (لبيانات Jamming)
    
    Args:
        csv_path (str): مسار ملف CSV
        columns_to_use (list): الأعمدة المستخدمة
    
    Returns:
        np.ndarray: الصورة المعالجة (224, 224, 3) بقيم 0-255
    """
    import pandas as pd
    
    df = pd.read_csv(csv_path)
    data = df[columns_to_use].values.astype(np.float32)
    
    # تطبيع Min-Max لكل عمود
    for col in range(data.shape[1]):
        col_min, col_max = data[:, col].min(), data[:, col].max()
        if col_max - col_min > 1e-8:
            data[:, col] = (data[:, col] - col_min) / (col_max - col_min)
        else:
            data[:, col] = data[:, col] - col_min
    
    # تحويل إلى صورة
    data_flat = data.flatten()
    target_pixels = TARGET_SIZE[0] * TARGET_SIZE[1]
    
    if len(data_flat) >= target_pixels:
        img = data_flat[:target_pixels].reshape(TARGET_SIZE)
    else:
        img = np.pad(data_flat, (0, target_pixels - len(data_flat))).reshape(TARGET_SIZE)
    
    # تحويل إلى RGB وقيم 0-255
    img_rgb = np.stack([img, img, img], axis=-1)
    img_rgb = (img_rgb * 255).astype(np.uint8)
    
    return img_rgb

# ============================================
# 4. تطبيع الصورة (Min-Max)
# ============================================
def normalize_image(image, min_val=0.0, max_val=255.0):
    """
    تطبيع الصورة بقيم بين 0 و 1
    
    Args:
        image (np.ndarray): الصورة الخام بقيم 0-255
        min_val (float): الحد الأدنى المستهدف
        max_val (float): الحد الأقصى المستهدف
    
    Returns:
        np.ndarray: الصورة بعد التطبيع
    """
    image = image.astype(np.float32)
    normalized = (image - min_val) / (max_val - min_val + 1e-8)
    return normalized

# ============================================
# 5. توحيد الأبعاد
# ============================================
def resize_image(image, target_size=TARGET_SIZE):
    """
    تغيير حجم الصورة إلى الأبعاد المستهدفة
    
    Args:
        image (np.ndarray): الصورة الأصلية
        target_size (tuple): الأبعاد المستهدفة (width, height)
    
    Returns:
        np.ndarray: الصورة بعد تغيير الحجم
    """
    return cv2.resize(image, target_size, interpolation=cv2.INTER_AREA)

# ============================================
# 6. خطوة المعالجة الكاملة للصورة
# ============================================
def preprocess_complete(image, target_size=TARGET_SIZE, normalize=True):
    """
    خطوة معالجة كاملة: تغيير الحجم + تطبيع (اختياري)
    
    Args:
        image (np.ndarray): الصورة الخام
        target_size (tuple): الأبعاد المستهدفة
        normalize (bool): هل نطبع القيم إلى [0,1]؟ 
                         (True: القيم النهائية 0-1، False: 0-255)
    
    Returns:
        np.ndarray: الصورة المعالجة
    """
    # تغيير الحجم
    img_resized = resize_image(image, target_size)
    
    # تحويل إلى float32
    img_float = img_resized.astype(np.float32)
    
    # تطبيع
    if normalize:
        # القيم بين 0 و 1
        img_normalized = img_float / 255.0
        return img_normalized
    else:
        # القيم بين 0 و 255
        return img_float.astype(np.uint8)

# ============================================
# مثال الاستخدام
# ============================================
if __name__ == "__main__":
    print("=" * 60)
    print("📊 معالجة البيانات (للتوثيق)")
    print("=" * 60)
    
    # أمثلة
    print("\n1. معالجة صورة Drone:")
    print("   preprocess_drone_image('path/to/image.jpg')")
    
    print("\n2. تحويل I/Q إلى Spectrogram:")
    print("   iq_to_spectrogram(iq_samples)")
    
    print("\n3. تحويل CSV إلى Spectrogram:")
    print("   csv_to_spectrogram('path/to/file.csv')")
    
    print("\n4. تطبيع الصورة:")
    print("   normalize_image(image)")
    
    print("\n5. خطوة كاملة:")
    print("   preprocess_complete(image, normalize=True)")
    
    print("\n" + "=" * 60)
    print("✅ تم تحميل وحدات المعالجة")
    print("=" * 60)
