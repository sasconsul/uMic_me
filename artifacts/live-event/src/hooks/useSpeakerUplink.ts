import { useRef, useState, useCallback } from "react";
import type { WsMessage } from "./useWebSocket";

interface UseSpeakerUplinkOptions {
  attendeeId: number;
  send: (msg: WsMessage) => void;
}

export function useSpeakerUplink({ attendeeId, send }: UseSpeakerUplinkOptions) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startSpeaking = useCallback(async ({ startMuted = false }: { startMuted?: boolean } = {}) => {
    if (pcRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      stream.getTracks().forEach((track) => {
        track.enabled = !startMuted;
      });

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
      setIsMicMuted(startMuted);
    } catch (err) {
      console.error("Speaker uplink failed:", err);
    }
  }, [attendeeId, send]);

  const unmuteMic = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        t.enabled = true;
      });
      setIsMicMuted(false);
    }
  }, []);

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
    setIsMicMuted(false);
  }, []);

  return { isSpeaking, isMicMuted, startSpeaking, stopSpeaking, unmuteMic, handleSpeakerAnswer, handleSpeakerIce };
}
