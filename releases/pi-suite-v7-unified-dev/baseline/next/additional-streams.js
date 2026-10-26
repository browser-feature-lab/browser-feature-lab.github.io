export const ADDITIONAL_STREAMS = [
  {
    "id": "h264-baseline-annexb",
    "config": {
      "codec": "avc1.42C00A",
      "codedWidth": 64,
      "codedHeight": 64,
      "hardwareAcceleration": "no-preference",
      "optimizeForLatency": false
    },
    "dataBase64": "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",
    "sha256": "aedbe07b4cbf866ec21e1c94ad877154dc48c5142d809d64f2fbfda52bbe2df6",
    "provenance": {
      "encoder": "ffmpeg version 7.1 Copyright (c) 2000-2024 the FFmpeg developers",
      "args": [
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=64x64:rate=4",
        "-frames:v",
        "1",
        "-pix_fmt",
        "yuv420p",
        "-c:v",
        "libx264",
        "-profile:v",
        "baseline",
        "-level:v",
        "1.0",
        "-x264-params",
        "keyint=1:threads=1",
        "-crf",
        "23",
        "-f",
        "h264",
        "-y",
        "work/h264-baseline-annexb.h264"
      ],
      "decodedBytes": 6144
    }
  },
  {
    "id": "h264-main-annexb",
    "config": {
      "codec": "avc1.4D400A",
      "codedWidth": 64,
      "codedHeight": 64,
      "hardwareAcceleration": "no-preference",
      "optimizeForLatency": false
    },
    "dataBase64": "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",
    "sha256": "f9f7154402305cd2da1d3e96bf643fdd1f91e8d076c1bfc72d6ada1335869294",
    "provenance": {
      "encoder": "ffmpeg version 7.1 Copyright (c) 2000-2024 the FFmpeg developers",
      "args": [
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=64x64:rate=4",
        "-frames:v",
        "1",
        "-pix_fmt",
        "yuv420p",
        "-c:v",
        "libx264",
        "-profile:v",
        "main",
        "-level:v",
        "1.0",
        "-x264-params",
        "keyint=1:threads=1:8x8dct=0:cabac=1",
        "-crf",
        "23",
        "-f",
        "h264",
        "-y",
        "work/h264-main-annexb.h264"
      ],
      "decodedBytes": 6144
    }
  },
  {
    "id": "vp8-lossy",
    "config": {
      "codec": "vp8",
      "codedWidth": 64,
      "codedHeight": 64,
      "hardwareAcceleration": "no-preference",
      "optimizeForLatency": false
    },
    "dataBase64": "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",
    "sha256": "c8f51287f73dc3e23af78d07bc7ccd125d78d536a5a6c1dd9827dc28a356f0cc",
    "provenance": {
      "encoder": "ffmpeg version 7.1 Copyright (c) 2000-2024 the FFmpeg developers",
      "args": [
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=64x64:rate=4",
        "-frames:v",
        "1",
        "-pix_fmt",
        "yuv420p",
        "-c:v",
        "libvpx",
        "-threads",
        "1",
        "-b:v",
        "100k",
        "-crf",
        "10",
        "-f",
        "ivf",
        "-y",
        "work/vp8-lossy.ivf"
      ],
      "decodedBytes": 6144
    }
  }
];
