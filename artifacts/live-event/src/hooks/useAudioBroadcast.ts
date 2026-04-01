import { useRef, useState, useCallback } from "react";
import type { WsMessage } from "./useWebSocket";

interface UseAudioBroadcastOptions {
  send: (msg: WsMessage) => void;
}

export function useAudioBroadcast({ send }: UseAudioBroadcastOptions) {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const peerConns = useRef<Map<number, RTCPeerConnection>>(new Map());
  const speakerPcs = useRef<Map<number, RTCPeerConnection>>(new Map());
  const paAudioRef = useRef<HTMLAudioElement | null>(null);

  const startBroadcast = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      if (!paAudioRef.current) {
        paAudioRef.current = new Audio();
        paAudioRef.current.autoplay = true;
      }
      const paStream = new MediaStream(stream.getTracks());
      paAudioRef.current.srcObject = paStream;
      paAudioRef.current.play().catch(() => {});

      setIsBroadcasting(true);
      send({ type: "start-broadcast" });
    } catch (err) {
      console.error("Failed to start broadcast:", err);
    }
  }, [send]);

  const stopBroadcast = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    peerConns.current.forEach((pc) => pc.close());
    peerConns.current.clear();
    if (paAudioRef.current) {
      paAudioRef.current.srcObject = null;
    }
    setIsBroadcasting(false);
    send({ type: "stop-broadcast" });
  }, [send]);

  const createPeerForAttendee = useCallback(
    async (attendeeId: number) => {
      if (!streamRef.current) return;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      peerConns.current.set(attendeeId, pc);

      streamRef.current.getTracks().forEach((t) => {
        pc.addTrack(t, streamRef.current!);
      });

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          send({ type: "rtc-ice-to-attendee", targetId: attendeeId, candidate: e.candidate.toJSON() });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      send({ type: "rtc-offer-to-attendee", targetId: attendeeId, sdp: offer });
    },
    [send],
  );

  const handleRtcAnswer = useCallback(
    async (attendeeId: number, sdp: RTCSessionDescriptionInit) => {
      const pc = peerConns.current.get(attendeeId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    },
    [],
  );

  const handleRtcIce = useCallback(
    async (attendeeId: number, candidate: RTCIceCandidateInit) => {
      const pc = peerConns.current.get(attendeeId);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    },
    [],
  );

  const removePeer = useCallback((attendeeId: number) => {
    const pc = peerConns.current.get(attendeeId);
    if (pc) {
      pc.close();
      peerConns.current.delete(attendeeId);
    }
  }, []);

  /**
   * Handle speaker uplink: the selected attendee sent us their mic offer.
   * We create a receiver PC, answer the offer, then relay audio to all other attendees.
   */
  const handleSpeakerOffer = useCallback(
    async (speakerId: number, sdp: RTCSessionDescriptionInit) => {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      speakerPcs.current.set(speakerId, pc);

      pc.ontrack = (event) => {
        const [speakerStream] = event.streams;
        if (!speakerStream) return;
        // Relay to all attendee downlink peers by replacing tracks
        peerConns.current.forEach((downPc) => {
          const senders = downPc.getSenders();
          speakerStream.getTracks().forEach((track) => {
            const sender = senders.find((s) => s.track?.kind === track.kind);
            if (sender) {
              sender.replaceTrack(track).catch(() => {});
            }
          });
        });
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          send({ type: "speaker-ice-to-attendee", targetId: speakerId, candidate: e.candidate.toJSON() });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      send({ type: "speaker-answer-to-attendee", targetId: speakerId, sdp: answer });
    },
    [send],
  );

  const handleSpeakerIce = useCallback(
    async (speakerId: number, candidate: RTCIceCandidateInit) => {
      const pc = speakerPcs.current.get(speakerId);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    },
    [],
  );

  return {
    isBroadcasting,
    startBroadcast,
    stopBroadcast,
    createPeerForAttendee,
    handleRtcAnswer,
    handleRtcIce,
    removePeer,
    handleSpeakerOffer,
    handleSpeakerIce,
  };
}
