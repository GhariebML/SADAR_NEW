# Processed Spectrograms

This directory contains the processed spectrograms used for training, validation, and testing the RF spectrum anomaly detection model.

## Data Sources

| Class | Source | Original Format | Processed Format |
|-------|--------|-----------------|------------------|
| **Drone** | RFUAV (Hugging Face) | I/Q samples (converted to spectrograms by authors) | (224, 224, 3) RGB, [0,1] normalized |
| **Normal** | RadioML 2018.01A (Kaggle) | I/Q samples (raw) | (224, 224, 3) RGB, [0,1] normalized |
| **Jamming** | UAVs Jamming Detection | Spectrograms (ready-to-use) | (224, 224, 3) RGB, [0,1] normalized |

## Processing Steps

1. **Resizing**: All images resized to (224, 224) using OpenCV's `INTER_AREA` interpolation.
2. **Normalization**: Min-Max normalization (pixel value / 255.0) to scale to [0, 1].
3. **RGB Conversion**: Grayscale spectrograms (from RadioML) were stacked to 3 channels.
4. **Class Balancing**: Exactly 2,620 samples per class (Drone, Normal, Jamming) for balanced training.
5. **Dataset Split**: Train (70%), Validation (15%), Test (15%) with stratification.

## Final Dataset Statistics

| Split | Drone | Normal | Jamming | Total |
|-------|-------|--------|---------|-------|
| Train | 1,834 | 1,834 | 1,834 | 5,502 |
| Validation | 393 | 393 | 393 | 1,179 |
| Test | 393 | 393 | 393 | 1,179 |

## File Format

All processed spectrograms are stored as `.npy` files (NumPy arrays) with shape `(224, 224, 3)` and dtype `float32` (values in [0, 1]).

## Usage Example

```python
import numpy as np

# Load a single spectrogram
spectrogram = np.load("drone_sample.npy")
print(spectrogram.shape)  # (224, 224, 3)
print(spectrogram.min(), spectrogram.max())  # 0.0, 1.0
