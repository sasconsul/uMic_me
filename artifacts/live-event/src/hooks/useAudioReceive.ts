import { useRef, useState, useCallback } from "react";
import type { WsMessage } from "./useWebSocket";

interface UseAudioReceiveOptions {
  eventId: number;
  attendeeId: number;
  send: (msg: WsMessage) => void;
}

export function useAudioReceive({ eventId: _eventId, attendeeId, send }: UseAudioReceiveOptions) {
  const [isReceiving, setIsReceiving] = useState(false);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const setupPeerConnection = useCallback(async () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;

    pc.ontrack = (event) => {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.autoplay = true;
      }
      const [stream] = event.streams;
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch(() => {});
      setIsReceiving(true);
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        send({
          type: "rtc-ice-to-host",
          fromId: attendeeId,
          candidate: e.candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setIsReceiving(false);
      }
    };
  }, [attendeeId, send]);

  const handleOffer = useCallback(
    async (sdp: RTCSessionDescriptionInit) => {
      await setupPeerConnection();
      const pc = pcRef.current!;
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      send({
        type: "rtc-answer-to-host",
        fromId: attendeeId,
        sdp: answer,
      });
    },
    [setupPeerConnection, attendeeId, send],
  );

  const handleIce = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (pcRef.current) {
      await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }, []);

  const disconnect = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
    setIsReceiving(false);
  }, []);

  return { isReceiving, handleOffer, handleIce, disconnect };
}
