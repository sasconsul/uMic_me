// @vitest-environment jsdom
import { vi, describe, it, expect, beforeAll } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAudioBroadcast } from "../../artifacts/live-event/src/hooks/useAudioBroadcast";

beforeAll(() => {
  const mockWebSocket = vi.fn(() => ({
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: 1,
  }));
  Object.defineProperty(globalThis, "WebSocket", {
    value: Object.assign(mockWebSocket, { OPEN: 1, CONNECTING: 0, CLOSING: 2, CLOSED: 3 }),
    writable: true,
    configurable: true,
  });

  const mockPeerConnection = () => ({
    getSenders: vi.fn(() => []),
    addTrack: vi.fn(),
    createOffer: vi.fn().mockResolvedValue({ type: "offer", sdp: "mock-sdp" }),
    createAnswer: vi.fn().mockResolvedValue({ type: "answer", sdp: "mock-sdp" }),
    setLocalDescription: vi.fn().mockResolvedValue(undefined),
    setRemoteDescription: vi.fn().mockResolvedValue(undefined),
    addIceCandidate: vi.fn().mockResolvedValue(undefined),
    close: vi.fn(),
    onicecandidate: null,
    ontrack: null,
  });

  Object.defineProperty(globalThis, "RTCPeerConnection", {
    value: vi.fn(mockPeerConnection),
    writable: true,
    configurable: true,
  });

  Object.defineProperty(globalThis, "RTCSessionDescription", {
    value: vi.fn((init: RTCSessionDescriptionInit) => init),
    writable: true,
    configurable: true,
  });

  Object.defineProperty(globalThis, "RTCIceCandidate", {
    value: vi.fn((init: RTCIceCandidateInit) => init),
    writable: true,
    configurable: true,
  });

  Object.defineProperty(globalThis, "Audio", {
    value: vi.fn(() => ({
      play: vi.fn().mockResolvedValue(undefined),
      srcObject: null,
      autoplay: false,
    })),
    writable: true,
    configurable: true,
  });

  Object.defineProperty(globalThis.navigator, "mediaDevices", {
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: vi.fn(() => []),
      }),
    },
    writable: true,
    configurable: true,
  });
});

describe("useAudioBroadcast — PA source handlers (added in Task #6)", () => {
  it("returns handlePaSourceOffer as a function", () => {
    const mockSend = vi.fn();
    const { result } = renderHook(() => useAudioBroadcast({ send: mockSend }));
    expect(typeof result.current.handlePaSourceOffer).toBe("function");
  });

  it("returns handlePaSourceIce as a function", () => {
    const mockSend = vi.fn();
    const { result } = renderHook(() => useAudioBroadcast({ send: mockSend }));
    expect(typeof result.current.handlePaSourceIce).toBe("function");
  });

  it("returns handlePaSourceDisconnected as a function", () => {
    const mockSend = vi.fn();
    const { result } = renderHook(() => useAudioBroadcast({ send: mockSend }));
    expect(typeof result.current.handlePaSourceDisconnected).toBe("function");
  });
});

describe("useAudioBroadcast — pre-existing handlers (regression baseline)", () => {
  it("returns all pre-existing handlers and state", () => {
    const mockSend = vi.fn();
    const { result } = renderHook(() => useAudioBroadcast({ send: mockSend }));

    expect(typeof result.current.isBroadcasting).toBe("boolean");
    expect(result.current.isBroadcasting).toBe(false);
    expect(typeof result.current.startBroadcast).toBe("function");
    expect(typeof result.current.stopBroadcast).toBe("function");
    expect(typeof result.current.createPeerForAttendee).toBe("function");
    expect(typeof result.current.handleRtcAnswer).toBe("function");
    expect(typeof result.current.handleRtcIce).toBe("function");
    expect(typeof result.current.removePeer).toBe("function");
    expect(typeof result.current.handleSpeakerOffer).toBe("function");
    expect(typeof result.current.handleSpeakerIce).toBe("function");
  });

  it("returns exactly the expected set of keys — no accidental removals", () => {
    const mockSend = vi.fn();
    const { result } = renderHook(() => useAudioBroadcast({ send: mockSend }));

    const keys = Object.keys(result.current).sort();
    expect(keys).toEqual([
      "createPeerForAttendee",
      "handlePaSourceDisconnected",
      "handlePaSourceIce",
      "handlePaSourceOffer",
      "handleRtcAnswer",
      "handleRtcIce",
      "handleSpeakerIce",
      "handleSpeakerOffer",
      "isBroadcasting",
      "removePeer",
      "startBroadcast",
      "stopBroadcast",
    ]);
  });
});
