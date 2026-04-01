import { useRef, useState, useCallback } from "react";
import type { WsMessage } from "./useWebSocket";

interface UseSpeakerUplinkOptions {
  attendeeId: number;
  send: (msg: WsMessage) => void;
}

export function useSpeakerUplink({ attendeeId, send }: UseSpeakerUplinkOptions) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startSpeaking = useCallback(async () => {
    if (pcRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          send({ type: "speaker-ice-to-host", fromId: attendeeId, candidate: e.candidate.toJSON() });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      send({ type: "speaker-offer-to-host", fromId: attendeeId, sdp: offer });
      setIsSpeaking(true);
    } catch (err) {
      console.error("Speaker uplink failed:", err);
    }
  }, [attendeeId, send]);

  const handleSpeakerAnswer = useCallback(async (sdp: RTCSessionDescriptionInit) => {
    if (pcRef.current) {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
    }
  }, []);

  const handleSpeakerIce = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (pcRef.current) {
      await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsSpeaking(false);
  }, []);

  return { isSpeaking, startSpeaking, stopSpeaking, handleSpeakerAnswer, handleSpeakerIce };
}
