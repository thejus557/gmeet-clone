import { Injectable } from '@angular/core';
import Peer, { MediaConnection } from 'peerjs';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  peer!: Peer;
  localPeerId!: string;
  socket!: Socket;
  participants: any[] = [];
  private muteRequestSubject = new Subject<string>();

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket() {
    this.socket = io('https://connect-meet-backend.onrender.com/');
    this.socket.on('connect', () => {
      console.log('Socket connected!');
    });

    this.socket.on('mute-user-request', (data) => {
      if (data.targetUserId === this.localPeerId) {
        this.muteRequestSubject.next(data.muterName);
      }
    });
  }

  public onMessage(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('message', (message) => {
        observer.next(message);
      });
    });
  }

  public async initializePeerConnection(data: any) {
    const response = await fetch(
      'https://surya-peer.metered.live/api/v1/turn/credentials?apiKey=155fcba4dcc4bdf916c19b928233ee6acbe0'
    );
    const iceServers = await response.json();
    console.log('ice servers', iceServers);
    // peerConfiguration.iceServers = iceServers;

    this.peer = new Peer(undefined as any, {
      debug: 3,
      config: iceServers,
      secure: false,
      referrerPolicy: 'origin-when-cross-origin',
    });
    this.peer.on('open', (id) => {
      console.log('peer id', id);
      this.localPeerId = id;
      localStorage.setItem('peerId', id);
      this.joinRoom({ ...data, peerId: id });
    });
  }

  public closePeerConnection(data: any) {
    // this.peer.disconnect();
    this.socket.emit('end-meet', data);
  }

  private joinRoom(data: any) {
    this.socket.emit('join-meet', data);
  }

  public addUserToCall(localStream: MediaStream, data: any) {
    this.peer.on('call', (call) => {
      console.log('handled incoming call');
      this.handleIncomingCall(call, localStream, data);
    });
  }

  private handleIncomingCall(
    call: MediaConnection,
    stream: MediaStream,
    data: any
  ) {
    call.answer(stream);
    call.on('stream', (remoteStream: MediaStream) => {
      console.log('answered the stream');
      this.addVideoToGrid(remoteStream, call.peer);
    });

    const peerConnection = call.peerConnection;

    peerConnection.oniceconnectionstatechange = () => {
      const state = peerConnection.iceConnectionState;
      console.log(`ICE connection state changed: ${state}`);

      if (state === 'disconnected' || state === 'failed') {
        console.warn('ICE connection lost, retrying...');
        this.retryConnection(call, stream, data); // Retry logic
      }
    };
  }

  public retryConnection(
    call: MediaConnection,
    stream: MediaStream,
    data: any
  ) {
    console.log('Attempting to retry the connection...');

    // Close the current call
    call.close();

    // Retry the call after a delay
    setTimeout(() => {
      const newCall = this.peer.call(call.peer, stream); // Re-initiate the call
      this.handleIncomingCall(newCall, stream, data); // Rebind the call event handlers
    }, 2000); // Wait 2 seconds before retrying
  }

  public removeVideoFromGrid(peerId: string) {
    const videoElement = document.getElementById(`video-${peerId}`);
    if (videoElement) {
      videoElement.remove(); // Remove the video element from the DOM
    } else {
      console.warn(`Video element with peerId ${peerId} not found`);
    }
  }

  public addVideoToGrid(stream: MediaStream, peerId: string) {
    console.log('added video to grid');
    // const existingVideo = document.getElementById(`video-${peerId}`);
    // if (existingVideo) {
    //   return;
    // }

    const videoGrid = document.getElementById('video-grid');
    if (!videoGrid) {
      console.error('Video grid element not found');
      return;
    }

    const videoElement = document.createElement('video');
    console.log('stream added', stream);
    videoElement.srcObject = stream;
    videoElement.autoplay = true;
    videoElement.muted = peerId === this.localPeerId;
    videoElement.id = `video-${peerId}`;

    videoElement.addEventListener('loadedmetadata', () => {
      videoGrid.append(videoElement);
    });
  }

  public toggleAudio(data: any) {
    this.socket.emit('toggle-audio', data);
  }

  public toggleVideo(data: any) {
    this.socket.emit('toggle-video', data);
  }

  public muteUser(data: any) {
    this.socket.emit('mute-user', data);
  }

  public onMuteRequest(): Observable<string> {
    return this.muteRequestSubject.asObservable();
  }
}
