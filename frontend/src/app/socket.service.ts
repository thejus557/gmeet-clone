import { Injectable } from '@angular/core';
import Peer, { MediaConnection } from 'peerjs';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  peer!: Peer;
  localPeerId!: string;
  socket!: Socket;
  constructor() {
    this.socket = io('http://localhost:3000');
    this.socket.on('connect', function () {
      console.log('Connected!');
    });
  }

  public onMessage() {
    return new Observable((observer) => {
      this.socket.on('message', (message) => {
        observer.next(message);
      });
    });
  }

  initiateJoinRoom({ meetCode, userName, localId, peerId }: any) {
    this.socket.emit('join-meet', {
      meetCode: meetCode,
      userName: userName,
      localId: localId,
      peerId: peerId,
    });
  }

  public initializePeerConnection(data: any) {
    this.peer = new Peer();
    this.peer.on('open', (id) => {
      this.localPeerId = id;
      this.initiateJoinRoom({ ...data, peerId: id });
    });
  }

  public addUserToCall(localStream: MediaStream) {
    this.peer.on('call', (call) => {
      this.handleIncomingCall(call, localStream);
    });
  }

  handleIncomingCall(call: MediaConnection, stream: MediaStream) {
    call.answer(stream); // Answer with local stream
    let count = 0;
    call.on('stream', (remoteStream: MediaStream) => {
      count++;
      if (count <= 1) {
        console.log('stream called ', call.peer);
        return this.addVideoToGrid(remoteStream, call.peer);
      }
    });
  }

  addVideoToGrid(stream: MediaStream, peerId: string) {
    const doc = document.getElementById(`video-${peerId}`);
    if (doc) {
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
    videoElement.muted = true;
    videoElement.id = `video-${peerId}`;
    videoElement.addEventListener('loadedmetadata', () => {
      videoGrid.append(videoElement);
    });
  }
}
