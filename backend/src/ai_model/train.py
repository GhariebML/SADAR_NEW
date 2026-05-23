"""
train.py
--------
كود تدريب نموذج EfficientNet-B0 لتصنيف إشارات RF إلى Drone / Normal / Jamming.

ملاحظة: هذا الكود للتوثيق فقط. النموذج النهائي (best_model.keras) تم تدريبه مسبقًا.
يمكنك استخدام predict.py للتنبؤ بدلاً من إعادة التدريب.
"""

import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, Model, callbacks
from tensorflow.keras.applications import EfficientNetB0
from sklearn.model_selection import train_test_split
from sklearn.utils.class_weight import compute_class_weight
import os

# ============================================
# إعدادات عامة
# ============================================
BATCH_SIZE = 32
EPOCHS = 50
TARGET_SIZE = (224, 224)
RANDOM_SEED = 42

# ============================================
# 1. Data Loader (يقرأ المسارات ويحمل الصور)
# ============================================
class DataGenerator(tf.keras.utils.Sequence):
    def __init__(self, paths_file, batch_size=32, target_size=(224,224), shuffle=True):
        with open(paths_file, 'r') as f:
            self.data = [line.strip().split(',') for line in f.readlines()]
        self.batch_size = batch_size
        self.target_size = target_size
        self.shuffle = shuffle
        self.on_epoch_end()
    
    def __len__(self):
        return int(np.floor(len(self.data) / self.batch_size))
    
    def __getitem__(self, index):
        batch_data = self.data[index * self.batch_size:(index + 1) * self.batch_size]
        X = []
        y = []
        for path, label in batch_data:
            img = np.load(path).astype(np.float32)
            X.append(img)
            y.append(int(label))
        return np.array(X), np.array(y)
    
    def on_epoch_end(self):
        if self.shuffle:
            np.random.shuffle(self.data)

# ============================================
# 2. بناء النموذج (EfficientNet-B0)
# ============================================
def build_model(input_shape=(224,224,3), num_classes=3):
    """
    بناء نموذج EfficientNet-B0 مع Transfer Learning
    """
    base = EfficientNetB0(weights='imagenet', include_top=False, input_shape=input_shape)
    base.trainable = False  # تجميد الطبقات أولاً
    
    inputs = tf.keras.Input(shape=input_shape)
    x = base(inputs, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.3)(x)
    x = layers.Dense(128, activation='relu')(x)
    x = layers.Dropout(0.2)(x)
    outputs = layers.Dense(num_classes, activation='softmax')(x)
    
    model = Model(inputs, outputs)
    return model

# ============================================
# 3. تدريب النموذج
# ============================================
def train_model(train_path, val_path, test_path, save_path):
    """
    تدريب النموذج وحفظه
    
    Args:
        train_path (str): مسار ملف المسارات للتدريب
        val_path (str): مسار ملف المسارات للتحقق
        test_path (str): مسار ملف المسارات للاختبار
        save_path (str): مسار حفظ النموذج
    """
    # إعداد المولدات
    train_gen = DataGenerator(train_path, batch_size=BATCH_SIZE)
    val_gen = DataGenerator(val_path, batch_size=BATCH_SIZE)
    
    # حساب class weights
    with open(train_path, 'r') as f:
        y_train = [int(line.strip().split(',')[1]) for line in f.readlines()]
    class_weights = compute_class_weight('balanced', classes=np.array([0,1,2]), y=np.array(y_train))
    class_weight_dict = {0: class_weights[0], 1: class_weights[1], 2: class_weights[2]}
    
    # بناء النموذج
    model = build_model()
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    # Callbacks
    callbacks_list = [
        callbacks.EarlyStopping(monitor='val_accuracy', patience=10, restore_best_weights=True),
        callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5),
        callbacks.ModelCheckpoint(save_path, monitor='val_accuracy', save_best_only=True)
    ]
    
    # تدريب
    history = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=EPOCHS,
        class_weight=class_weight_dict,
        callbacks=callbacks_list,
        verbose=1
    )
    
    return model, history

# ============================================
# 4. Fine-Tuning (اختياري)
# ============================================
def fine_tune_model(model, train_path, val_path, save_path, unfreeze_layers=30):
    """
    فك تجميد الطبقات العلوية وإكمال التدريب
    """
    # فك تجميد آخر unfreeze_layers طبقة
    base_model = model.layers[1]
    base_model.trainable = True
    for layer in base_model.layers[:-unfreeze_layers]:
        layer.trainable = False
    
    # إعادة compile بمعدل تعلم أصغر
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    # إعداد المولدات
    train_gen = DataGenerator(train_path, batch_size=16)  # batch size أصغر
    val_gen = DataGenerator(val_path, batch_size=16)
    
    # Callbacks
    callbacks_list = [
        callbacks.EarlyStopping(monitor='val_accuracy', patience=8, restore_best_weights=True),
        callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=4),
        callbacks.ModelCheckpoint(save_path.replace('.keras', '_finetuned.keras'), 
                                  monitor='val_accuracy', save_best_only=True)
    ]
    
    # تدريب إضافي
    history = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=15,
        class_weight={0: 1.5, 1: 1.0, 2: 1.0},  # زيادة وزن الـ Drone
        callbacks=callbacks_list,
        verbose=1
    )
    
    return model, history

# ============================================
# 5. تقييم النموذج
# ============================================
def evaluate_model(model, test_path):
    """
    تقييم النموذج على بيانات الاختبار
    """
    from sklearn.metrics import classification_report, confusion_matrix
    
    y_true = []
    y_pred = []
    
    with open(test_path, 'r') as f:
        for line in f.readlines():
            path, label = line.strip().split(',')
            img = np.load(path).astype(np.float32)
            # تطبيع Min-Max
            img = img / 255.0
            pred = model.predict(np.expand_dims(img, axis=0), verbose=0)
            y_true.append(int(label))
            y_pred.append(np.argmax(pred))
    
    accuracy = np.sum(np.array(y_true) == np.array(y_pred)) / len(y_true)
    print(f"\n✅ Test Accuracy: {accuracy:.4f}")
    print("\n📋 Classification Report:")
    print(classification_report(y_true, y_pred, target_names=['Drone', 'Normal', 'Jamming']))
    
    return accuracy, y_true, y_pred

# ============================================
# مثال الاستخدام
# ============================================
if __name__ == "__main__":
    # المسارات (عدلها حسب مكان الملفات عندك)
    TRAIN_PATH = "splits/train/paths.txt"
    VAL_PATH = "splits/val/paths.txt"
    TEST_PATH = "splits/test/paths.txt"
    SAVE_PATH = "saved_models/best_model.keras"
    
    # تدريب
    model, history = train_model(TRAIN_PATH, VAL_PATH, TEST_PATH, SAVE_PATH)
    
    # تقييم
    evaluate_model(model, TEST_PATH)
