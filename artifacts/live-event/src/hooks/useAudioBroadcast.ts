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
  const paPcRef = useRef<RTCPeerConnection | null>(null);
  /**
   * Persists the live PA audio track so it can be applied to both existing
   * and future attendee downlink peers. When null, host mic is used.
   */
  const activeRelayTrackRef = useRef<MediaStreamTrack | null>(null);

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
    paPcRef.current?.close();
    paPcRef.current = null;
    activeRelayTrackRef.current = null;
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

      // If a PA track is already active, replace the host mic track immediately
      const paTrack = activeRelayTrackRef.current;
      if (paTrack) {
        const senders = pc.getSenders();
        const sender = senders.find((s) => s.track?.kind === paTrack.kind);
        if (sender) {
          sender.replaceTrack(paTrack).catch(() => {});
        }
      }
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
   * Relay a track to all existing attendee downlink peers.
   */
  const relayTrackToAllPeers = useCallback((track: MediaStreamTrack) => {
    peerConns.current.forEach((downPc) => {
      const senders = downPc.getSenders();
      const sender = senders.find((s) => s.track?.kind === track.kind);
      if (sender) {
        sender.replaceTrack(track).catch(() => {});
      }
    });
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
        speakerStream.getTracks().forEach((track) => {
          relayTrackToAllPeers(track);
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
    [send, relayTrackToAllPeers],
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

  /**
   * Handle PA source uplink: the PA source device sent its audio offer.
   * We create a receiver PC, answer it, persist the relay track, then:
   * - Immediately replace tracks on all existing attendee downlink peers
   * - Store the track so future createPeerForAttendee calls will also use it
   */
  const handlePaSourceOffer = useCallback(
    async (sdp: RTCSessionDescriptionInit) => {
      if (paPcRef.current) {
        paPcRef.current.close();
      }

      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      paPcRef.current = pc;

      pc.ontrack = (event) => {
        const [paStream] = event.streams;
        if (!paStream) return;
        paStream.getTracks().forEach((track) => {
          activeRelayTrackRef.current = track;
          relayTrackToAllPeers(track);
        });
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          send({ type: "pa-source-ice-to-source", candidate: e.candidate.toJSON() });
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      send({ type: "pa-source-answer-to-source", sdp: answer });
    },
    [send, relayTrackToAllPeers],
  );

  const handlePaSourceIce = useCallback(
    async (candidate: RTCIceCandidateInit) => {
      const pc = paPcRef.current;
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    },
    [],
  );

  /**
   * Called when PA source disconnects — fall back to host mic track on all peers.
   */
  const handlePaSourceDisconnected = useCallback(() => {
    paPcRef.current?.close();
    paPcRef.current = null;
    activeRelayTrackRef.current = null;

    if (!streamRef.current) return;
    streamRef.current.getTracks().forEach((track) => {
      relayTrackToAllPeers(track);
    });
  }, [relayTrackToAllPeers]);

  /**
   * Returns the current host audio MediaStream (mic or PA-relayed) so other
   * hooks (e.g. server-side transcription) can tap the same audio source.
   * Prefers the relayed PA track when present, otherwise the host mic stream.
   */
  const getBroadcastStream = useCallback((): MediaStream | null => {
    const paTrack = activeRelayTrackRef.current;
    if (paTrack && paTrack.readyState === "live") {
      return new MediaStream([paTrack]);
    }
    return streamRef.current;
  }, []);

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
    handlePaSourceOffer,
    handlePaSourceIce,
    handlePaSourceDisconnected,
    getBroadcastStream,
  };
}
