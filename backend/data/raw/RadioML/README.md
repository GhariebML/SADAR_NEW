# Raw RadioML 2018.01A Dataset

This directory contains references to the raw RadioML 2018.01A dataset used as the **Normal** class source in the project.

## Source

- **Dataset Name:** RadioML 2018.01A
- **Provider:** DeepSig Inc.
- **License:** CC BY-NC-SA 4.0
- **Original Size:** 21.45 GB (2.5 million I/Q samples)
- **Modulation Types:** 24 (8 digital, 8 analog, 8 atmospheric)

## Download

The dataset was downloaded from Kaggle:  
[https://www.kaggle.com/datasets/pinxau1000/radioml2018](https://www.kaggle.com/datasets/pinxau1000/radioml2018)

```bash
kaggle datasets download -d pinxau1000/radioml2018
```

## Data Format

The raw data is stored in HDF5 format (`GOLD_XYZ_OSC.0001_1024.hdf5`) with the following structure:

| Key | Shape | Description |
|-----|-------|-------------|
| `X` | (2,555,904, 1024, 2) | I/Q samples |
| `Y` | (2,555,904, 24) | One-hot labels (24 modulations) |
| `Z` | (2,555,904, 1) | SNR information (fixed at -20 dB) |

## Processing Applied for This Project

The raw I/Q samples were converted to spectrograms using STFT with the following parameters:

| Parameter | Value |
|-----------|-------|
| STFT points (nfft) | 256 |
| Hop length | 128 |
| Target size | (224, 224) |
| Normalization | Min-Max (`x / 255.0`) |

A subset of 50,000 random samples was selected from the full dataset (2.5M) for initial processing, then balanced to 2,620 samples for final training.

## Usage Notes

- This directory contains only documentation, not the actual raw files (due to size constraints).
- The processed spectrograms are available in `../processed/spectrograms/` (reference only).
- The final model uses processed spectrograms, not raw I/Q directly.
- For training, we used the processed version, not the raw HDF5.

## References

1. O'Shea, T. J., & West, N. (2019). "Radio Machine Learning Dataset Generation with GNU Radio." *Proceedings of the GNU Radio Conference.*
2. RadioML 2018.01A: https://www.deepsig.ai/datasets
3. Kaggle Dataset: https://www.kaggle.com/datasets/pinxau1000/radioml2018
