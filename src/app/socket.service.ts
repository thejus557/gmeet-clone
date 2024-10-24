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

  public initializePeerConnection(data: any) {
    this.peer = new Peer({
      key: 'peerjs',
      host: 'gmeet-clone-pi.vercel.app',
      port: 443,
      path: '/',
      secure: true,
    });
    this.peer.on('open', (id) => {
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
      this.handleIncomingCall(call, localStream, data);
    });
  }

  private handleIncomingCall(
    call: MediaConnection,
    stream: MediaStream,
    data: any
  ) {
    let streamHandled = false;

    call.answer(stream);
    call.on('stream', (remoteStream: MediaStream) => {
      if (!streamHandled) {
        streamHandled = true;
        this.addVideoToGrid(remoteStream, call.peer);
      }
    });
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
    const existingVideo = document.getElementById(`video-${peerId}`);
    if (existingVideo) {
      return;
    }

    const videoGrid = document.getElementById('video-grid');
    if (!videoGrid) {
      console.error('Video grid element not found');
      return;
    }

    const videoElement = document.createElement('video');
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
