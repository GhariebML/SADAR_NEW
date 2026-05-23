"""
src/hardware/rtl_sdr_reader.py
------------------------------
RTL-SDR reader — يلتقط IQ samples ويحوّلها لـ Spectrogram
ثم يمررها لـ predict_single للتصنيف الفوري.
"""

from __future__ import annotations

import numpy as np
import logging
import time
from PIL import Image
from .hardware_config import SDRConfig

logger = logging.getLogger("spectrum.sdr")


# ─────────────────────────────────────────────────────────────────────────────
# EXCEPTIONS
# ─────────────────────────────────────────────────────────────────────────────

class RTLSDRUnavailable(RuntimeError):
    """Raised when RTL-SDR hardware/dependency is unavailable."""


# ─────────────────────────────────────────────────────────────────────────────
# SPECTROGRAM GENERATOR
# ─────────────────────────────────────────────────────────────────────────────

def iq_to_spectrogram(
    iq_samples: np.ndarray,
    nfft:       int = 256,
    img_size:   int = 224,
) -> Image.Image:
    """
    تحويل IQ samples لـ Spectrogram PIL Image (224×224 RGB)

    Args:
        iq_samples: Complex IQ array (np.complex64 أو float32 pairs)
        nfft:       FFT window size
        img_size:   حجم الصورة النهائية

    Returns:
        PIL Image RGB (img_size × img_size)
    """
    # تأكد إن الـ samples complex
    if iq_samples.dtype != np.complex64:
        if iq_samples.ndim == 2 and iq_samples.shape[1] == 2:
            iq_samples = iq_samples[:, 0] + 1j * iq_samples[:, 1]
        else:
            iq_samples = iq_samples.astype(np.complex64)

    # حساب الـ STFT
    n_samples = len(iq_samples)
    hop       = max(1, nfft // 2)
    n_frames  = (n_samples - nfft) // hop + 1

    if n_frames < 1:
        n_frames  = 1
        iq_samples = np.pad(iq_samples, (0, nfft - len(iq_samples)))

    spectrogram = np.zeros((nfft, n_frames), dtype=np.float32)
    window      = np.hanning(nfft)

    for i in range(n_frames):
        start = i * hop
        frame = iq_samples[start:start + nfft]
        if len(frame) < nfft:
            frame = np.pad(frame, (0, nfft - len(frame)))
        fft_result          = np.fft.fftshift(np.fft.fft(frame * window))
        spectrogram[:, i]   = np.abs(fft_result)

    # تحويل لـ dB
    spectrogram = 20 * np.log10(spectrogram + 1e-10)

    # Normalize لـ 0-255
    s_min = spectrogram.min()
    s_max = spectrogram.max()
    if s_max > s_min:
        spectrogram = (spectrogram - s_min) / (s_max - s_min) * 255
    else:
        spectrogram = np.zeros_like(spectrogram)

    spectrogram = spectrogram.astype(np.uint8)

    # تحويل لـ RGB Image
    img = Image.fromarray(spectrogram, mode='L').convert('RGB')
    img = img.resize((img_size, img_size), Image.LANCZOS)

    return img


# ─────────────────────────────────────────────────────────────────────────────
# RTL-SDR READER
# ─────────────────────────────────────────────────────────────────────────────

class RTLSDRReader:
    """
    RTL-SDR Hardware Reader

    يلتقط IQ samples من الجهاز ويحوّلها لـ Spectrogram
    جاهز للتصنيف بـ predict_single
    """

    def __init__(self, config: SDRConfig | None = None):
        self.config  = config or SDRConfig()
        self._sdr    = None
        self._active = False

        # محاولة تحميل pyrtlsdr
        try:
            from rtlsdr import RtlSdr
            self._RtlSdr = RtlSdr
            logger.info("✅ pyrtlsdr available")
        except ImportError:
            self._RtlSdr = None
            logger.warning("⚠️  pyrtlsdr not installed — using simulator mode")

    # ──────────────────────────────────────────────────────────────────────
    # CONNECTION
    # ──────────────────────────────────────────────────────────────────────

    def connect(self) -> bool:
        """الاتصال بالجهاز"""
        if self._RtlSdr is None:
            logger.warning("RTL-SDR unavailable — simulator mode active")
            return False

        try:
            self._sdr = self._RtlSdr()
            self._sdr.sample_rate     = self.config.sample_rate
            self._sdr.center_freq     = self.config.center_freq
            self._sdr.freq_correction = getattr(self.config, 'freq_correction', 0)
            self._sdr.gain            = getattr(self.config, 'gain', 'auto')
            self._active = True
            logger.info(
                f"✅ RTL-SDR connected | "
                f"freq={self.config.center_freq/1e6:.1f}MHz | "
                f"rate={self.config.sample_rate/1e6:.1f}MHz"
            )
            return True
        except Exception as e:
            logger.error(f"❌ RTL-SDR connect failed: {e}")
            return False

    def disconnect(self):
        """قطع الاتصال"""
        if self._sdr is not None:
            try:
                self._sdr.close()
            except Exception:
                pass
            self._sdr    = None
            self._active = False
            logger.info("RTL-SDR disconnected")

    # ──────────────────────────────────────────────────────────────────────
    # READING
    # ──────────────────────────────────────────────────────────────────────

    def read_samples(self, count: int = 1024) -> np.ndarray:
        """
        قراءة IQ samples من الجهاز

        Args:
            count: عدد الـ samples

        Returns:
            np.ndarray: complex64 IQ samples

        Raises:
            RTLSDRUnavailable: لو الجهاز مش متصل
        """
        if not self._active or self._sdr is None:
            raise RTLSDRUnavailable(
                "RTL-SDR is not connected. Call connect() first."
            )

        samples = self._sdr.read_samples(count)
        return samples.astype(np.complex64)

    def read_samples_simulate(self, count: int = 256 * 256) -> np.ndarray:
        """
        محاكاة IQ samples للاختبار بدون جهاز حقيقي
        بيولد إشارة عشوائية مع بعض التردد
        """
        t        = np.linspace(0, 1, count)
        freq     = getattr(self.config, 'center_freq', 2.4e9)
        noise    = (np.random.randn(count) + 1j * np.random.randn(count)) * 0.1
        signal   = np.exp(2j * np.pi * 0.1 * t) * 0.8
        return (signal + noise).astype(np.complex64)

    # ──────────────────────────────────────────────────────────────────────
    # SPECTROGRAM + CLASSIFY
    # ──────────────────────────────────────────────────────────────────────

    def capture_and_classify(
        self,
        sample_count: int = 256 * 256,
        nfft:         int = 256,
        simulate:     bool = False,
    ) -> dict:
        """
        التقاط إشارة وتصنيفها مباشرة

        Args:
            sample_count: عدد الـ IQ samples
            nfft:         حجم FFT window
            simulate:     استخدام المحاكاة بدل الجهاز الحقيقي

        Returns:
            dict: نتيجة predict_single مع الـ spectrogram image
        """
        # import هنا عشان نتجنب circular imports
        from ai_model.predict import predict_single

        start = time.perf_counter()

        # قراءة الـ samples
        if simulate or not self._active:
            iq = self.read_samples_simulate(sample_count)
            logger.debug("📡 Using simulated IQ samples")
        else:
            try:
                iq = self.read_samples(sample_count)
            except RTLSDRUnavailable:
                iq = self.read_samples_simulate(sample_count)
                logger.warning("⚠️  Falling back to simulated samples")

        # تحويل لـ Spectrogram
        spectrogram_img = iq_to_spectrogram(iq, nfft=nfft)

        # تصنيف
        result = predict_single(spectrogram_img, return_alert=True)

        elapsed = int((time.perf_counter() - start) * 1000)

        # أضف معلومات إضافية
        result["capture_time_ms"] = elapsed
        result["sample_count"]    = sample_count
        result["center_freq_mhz"] = getattr(self.config, 'center_freq', 0) / 1e6
        result["spectrogram_img"] = spectrogram_img  # PIL Image

        alert = result.get("alert", {})
        logger.info(
            f"📡 Captured & Classified: {result['class_name']} "
            f"| conf={result['confidence']:.1%} "
            f"| {alert.get('icon','')} {alert.get('level','')} "
            f"| {elapsed}ms"
        )

        return result

    # ──────────────────────────────────────────────────────────────────────
    # CONTINUOUS SCANNING
    # ──────────────────────────────────────────────────────────────────────

    def scan_loop(
        self,
        callback,
        interval_sec: float = 1.0,
        sample_count: int   = 256 * 256,
        simulate:     bool  = False,
    ):
        """
        حلقة مسح مستمرة

        Args:
            callback:     function(result: dict) تُستدعى بعد كل تصنيف
            interval_sec: الفترة بين كل قراءة
            sample_count: عدد الـ samples في كل قراءة
            simulate:     وضع المحاكاة

        Example:
            def on_result(r):
                print(r['class_name'], r['alert']['level'])

            reader.scan_loop(on_result, interval_sec=2.0)
        """
        logger.info(f"🔄 Starting scan loop | interval={interval_sec}s")

        while True:
            try:
                result = self.capture_and_classify(
                    sample_count = sample_count,
                    simulate     = simulate,
                )
                callback(result)
            except KeyboardInterrupt:
                logger.info("🛑 Scan loop stopped by user")
                break
            except Exception as e:
                logger.error(f"❌ Scan error: {e}")

            time.sleep(interval_sec)

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, *args):
        self.disconnect()


# ─────────────────────────────────────────────────────────────────────────────
# مثال الاستخدام
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    from hardware_config import SDRConfig

    config = SDRConfig()
    reader = RTLSDRReader(config)

    print("=" * 55)
    print("🛡️  SADAR — RTL-SDR Test (Simulate Mode)")
    print("=" * 55)

    # اختبار بالمحاكاة
    result = reader.capture_and_classify(simulate=True)

    alert = result.get("alert", {})
    print(f"\n  Class:      {result['class_name']}")
    print(f"  Confidence: {result['confidence']:.1%}")
    print(f"  Unknown:    {result['is_unknown']}")
    print(f"  Alert:      {alert.get('icon','')} {alert.get('level','')} — {alert.get('message','')}")
    print(f"  Time:       {result['capture_time_ms']}ms")
    print(f"  Probs:      { {k: f'{v:.2%}' for k,v in result['probabilities'].items()} }")