"use strict";

/*
 * categorical-capabilities.js
 * ---------------------------
 *
 * These are raw capability disclosures only. API presence does not prove that
 * corresponding physical hardware exists. Interpretation happens offline
 * against genuine reference distributions.
 */

import {
  ok,
  failed
} from "./common.js";

const FONT_CANDIDATES = Object.freeze([
  // Apple
  "SF Pro Text",
  "SF Pro Display",
  "Helvetica Neue",
  "Arial Unicode MS",
  "Menlo",
  "Monaco",

  // Windows
  "Segoe UI",
  "Calibri",
  "Cambria",
  "Consolas",

  // Android / ChromeOS
  "Roboto",
  "Noto Sans",

  // Linux
  "Ubuntu",
  "Liberation Sans",
  "DejaVu Sans"
]);

const MEDIA_RECORDER_TYPES = Object.freeze([
  "video/webm",
  'video/webm;codecs="vp8"',
  'video/webm;codecs="vp9"',
  'video/webm;codecs="vp8,opus"',
  'video/webm;codecs="vp9,opus"',
  'video/webm;codecs="av01,opus"',
  "video/mp4",
  'video/mp4;codecs="avc1.42E01E"',
  'video/mp4;codecs="avc1.640028"',
  'video/mp4;codecs="hvc1.1.6.L120.B0"',
  "audio/webm",
  'audio/webm;codecs="opus"',
  "audio/ogg",
  'audio/ogg;codecs="opus"',
  "audio/mp4"
]);

function constructorPresent(name) {
  return typeof globalThis[name] === "function";
}

function propertyPresent(object, property) {
  if (object == null) return false;

  try {
    return property in object;
  } catch {
    return false;
  }
}

function collectInputCapabilities() {
  return {
    maxTouchPoints:
      navigator.maxTouchPoints ?? null,

    touchEventConstructor:
      constructorPresent("TouchEvent"),

    touchConstructor:
      constructorPresent("Touch"),

    touchListConstructor:
      constructorPresent("TouchList"),

    ontouchstartWindow:
      propertyPresent(globalThis, "ontouchstart"),

    ontouchstartDocument:
      propertyPresent(
        globalThis.document,
        "ontouchstart"
      ),

    pointerEventConstructor:
      constructorPresent("PointerEvent"),

    mouseEventConstructor:
      constructorPresent("MouseEvent"),

    keyboardEventConstructor:
      constructorPresent("KeyboardEvent"),

    wheelEventConstructor:
      constructorPresent("WheelEvent"),

    gamepadApi:
      typeof navigator.getGamepads ===
      "function",

    virtualKeyboardApi:
      propertyPresent(
        navigator,
        "virtualKeyboard"
      ),

    keyboardApi:
      propertyPresent(
        navigator,
        "keyboard"
      )
  };
}

function collectSensorCapabilities() {
  const constructors = [
    "DeviceMotionEvent",
    "DeviceOrientationEvent",
    "DeviceOrientationEventAbsolute",
    "Accelerometer",
    "LinearAccelerationSensor",
    "GravitySensor",
    "Gyroscope",
    "Magnetometer",
    "AbsoluteOrientationSensor",
    "RelativeOrientationSensor",
    "AmbientLightSensor",
    "ProximitySensor",
    "GeolocationSensor"
  ];

  return {
    constructors: Object.fromEntries(
      constructors.map(name => [
        name,
        constructorPresent(name)
      ])
    ),

    deviceMotionPermissionMethod:
      typeof globalThis
        .DeviceMotionEvent
        ?.requestPermission ===
      "function",

    deviceOrientationPermissionMethod:
      typeof globalThis
        .DeviceOrientationEvent
        ?.requestPermission ===
      "function",

    geolocationApi:
      propertyPresent(
        navigator,
        "geolocation"
      )
  };
}

function collectPeripheralApiPresence() {
  return {
    bluetooth:
      propertyPresent(
        navigator,
        "bluetooth"
      ),

    hid:
      propertyPresent(
        navigator,
        "hid"
      ),

    serial:
      propertyPresent(
        navigator,
        "serial"
      ),

    usb:
      propertyPresent(
        navigator,
        "usb"
      ),

    midi:
      typeof navigator.requestMIDIAccess ===
      "function",

    mediaDevices:
      propertyPresent(
        navigator,
        "mediaDevices"
      ),

    enumerateDevices:
      typeof navigator
        .mediaDevices
        ?.enumerateDevices ===
      "function",

    getUserMedia:
      typeof navigator
        .mediaDevices
        ?.getUserMedia ===
      "function"
  };
}

function measureFontWidth(
  context,
  text,
  size,
  family
) {
  context.font =
    `${size}px ${family}`;

  return context
    .measureText(text)
    .width;
}

function collectFontPresence() {
  const canvas =
    document.createElement("canvas");

  const context =
    canvas.getContext("2d");

  if (!context) {
    return {
      available: false,
      reason:
        "canvas-2d-context-unavailable",
      candidates: {}
    };
  }

  /*
   * Candidate fonts are compared against multiple fallback families. This is
   * a presence test, not a canvas hash or font-metrics fingerprint.
   */
  const text =
    "mmmmmmmmmmlliWW00@#";

  const size = 72;

  const fallbackFamilies = [
    "monospace",
    "sans-serif",
    "serif"
  ];

  const fallbackWidths =
    Object.fromEntries(
      fallbackFamilies.map(family => [
        family,
        measureFontWidth(
          context,
          text,
          size,
          family
        )
      ])
    );

  const candidates =
    Object.fromEntries(
      FONT_CANDIDATES.map(font => {
        const measurements =
          Object.fromEntries(
            fallbackFamilies.map(
              fallback => {
                const family =
                  `"${font}",${fallback}`;

                const width =
                  measureFontWidth(
                    context,
                    text,
                    size,
                    family
                  );

                return [
                  fallback,
                  {
                    width,
                    fallbackWidth:
                      fallbackWidths[
                        fallback
                      ],
                    differs:
                      Math.abs(
                        width -
                          fallbackWidths[
                            fallback
                          ]
                      ) > 0.01
                  }
                ];
              }
            )
          );

        return [
          font,
          {
            present:
              Object.values(
                measurements
              ).some(
                result =>
                  result.differs
              ),
            measurements
          }
        ];
      })
    );

  return {
    available: true,
    method:
      "candidate-font-vs-generic-fallback-width",
    candidates
  };
}

function collectMediaRecorderCapabilities() {
  const available =
    typeof globalThis.MediaRecorder ===
    "function";

  if (!available) {
    return {
      available: false,
      mimeTypes: {}
    };
  }

  const supportsType =
    typeof MediaRecorder
      .isTypeSupported ===
    "function";

  return {
    available,
    isTypeSupportedAvailable:
      supportsType,

    mimeTypes:
      Object.fromEntries(
        MEDIA_RECORDER_TYPES.map(
          mimeType => {
            let supported = null;
            let error = null;

            if (supportsType) {
              try {
                supported =
                  MediaRecorder
                    .isTypeSupported(
                      mimeType
                    );
              } catch (caught) {
                error = String(
                  caught?.message ||
                    caught
                );
              }
            }

            return [
              mimeType,
              {
                supported,
                error
              }
            ];
          }
        )
      )
  };
}

function collectWebgpuLanguageCapabilities() {
  if (!navigator.gpu) {
    return {
      available: false,
      wgslLanguageFeatures: null
    };
  }

  let features = null;
  let error = null;

  try {
    const exposed =
      navigator.gpu
        .wgslLanguageFeatures;

    features =
      exposed == null
        ? null
        : [...exposed].sort();
  } catch (caught) {
    error = String(
      caught?.message ||
        caught
    );
  }

  return {
    available: true,
    wgslLanguageFeatures:
      features,
    error
  };
}

function collectMiscellaneousPlatformCapabilities() {
  return {
    cookieEnabled:
      navigator.cookieEnabled ??
      null,

    pdfViewerEnabled:
      navigator.pdfViewerEnabled ??
      null,

    standaloneDisplayMode:
      typeof matchMedia ===
        "function"
        ? matchMedia(
            "(display-mode: standalone)"
          ).matches
        : null,

    displayModeFullscreen:
      typeof matchMedia ===
        "function"
        ? matchMedia(
            "(display-mode: fullscreen)"
          ).matches
        : null,

    screenOrientationApi:
      propertyPresent(
        globalThis.screen,
        "orientation"
      ),

    screenIsExtended:
      globalThis.screen
        ?.isExtended ??
      null,

    wakeLockApi:
      propertyPresent(
        navigator,
        "wakeLock"
      ),

    devicePostureApi:
      propertyPresent(
        navigator,
        "devicePosture"
      ),

    xrApi:
      propertyPresent(
        navigator,
        "xr"
      ),

    presentationApi:
      propertyPresent(
        navigator,
        "presentation"
      ),

    webShareApi:
      typeof navigator.share ===
      "function",

    installedRelatedAppsApi:
      typeof navigator
        .getInstalledRelatedApps ===
      "function"
  };
}

async function collectBatteryCapability() {
  if (
    typeof navigator.getBattery !==
    "function"
  ) {
    return {
      available: false
    };
  }

  try {
    const battery =
      await navigator.getBattery();

    return {
      available: true,
      charging:
        battery.charging ??
        null,
      level:
        battery.level ??
        null,
      chargingTime:
        Number.isFinite(
          battery.chargingTime
        )
          ? battery.chargingTime
          : null,
      dischargingTime:
        Number.isFinite(
          battery.dischargingTime
        )
          ? battery.dischargingTime
          : null
    };
  } catch (error) {
    return {
      available: true,
      error: String(
        error?.message ||
          error
      )
    };
  }
}

export async function collectCategoricalCapabilities() {
  try {
    const battery =
      await collectBatteryCapability();

    return ok(
      {
        input:
          collectInputCapabilities(),

        sensors:
          collectSensorCapabilities(),

        peripheralApis:
          collectPeripheralApiPresence(),

        fonts:
          collectFontPresence(),

        mediaRecorder:
          collectMediaRecorderCapabilities(),

        webgpuLanguage:
          collectWebgpuLanguageCapabilities(),

        battery,

        platformApis:
          collectMiscellaneousPlatformCapabilities()
      },
      "Low-entropy categorical capability surface. API or font presence is " +
        "influenced by browser build, operating system, permissions, policy, " +
        "and spoofing. Presence does not prove corresponding physical hardware. " +
        "Compare complete vectors against genuine controls offline.",
      "low"
    );
  } catch (error) {
    return failed(error);
  }
}