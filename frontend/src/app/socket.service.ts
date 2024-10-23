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
    this.socket = io('http://localhost:3000');
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
    this.peer = new Peer();
    this.peer.on('open', (id) => {
      this.localPeerId = id;
      this.joinRoom({ ...data, peerId: id });
    });
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
    call.answer(stream);
    call.on('stream', (remoteStream: MediaStream) => {
      this.participants.push({
        peerId: data.peerId,
        userName: data.userName,
        isMuted: false,
        isVideoOn: true,
      });
      this.addVideoToGrid(remoteStream, call.peer);
    });
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
