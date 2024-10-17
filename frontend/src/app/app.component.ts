import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet } from '@angular/router';
import Peer, { MediaConnection } from 'peerjs';
import { SocketService } from './socket.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  constructor(private socket: SocketService) {}

  ngOnInit(): void {}
}
// export class AppComponent implements OnInit {
//   peer!: Peer;
//   localPeerId: string = '';
//   remotePeerId: string = '';
//   localStream!: MediaStream;

//   constructor(private router: Router) {}

//   ngOnInit(): void {
//     this.initializePeerConnection();
//     this.requestMediaStream();
//   }

//   // Initialize peer connection
//   initializePeerConnection() {
//     this.peer = new Peer();
//     this.peer.on('open', (id) => {
//       this.localPeerId = id;
//       console.log(`My peer ID is: ${id}`);
//       this.router.navigateByUrl(`/?id=${id}`); // Update URL with peer ID
//     });

//     // Handle incoming calls
//     this.peer.on('call', (call) => this.handleIncomingCall(call));
//   }

//   // Request video/audio permission
//   requestMediaStream() {
//     navigator.mediaDevices
//       .getUserMedia({ video: true, audio: true })
//       .then((stream) => {
//         this.localStream = stream;
//         this.displayVideoStream(stream, true, this.localPeerId);
//       })
//       .catch((err) => console.error('Failed to get media stream:', err));
//   }

//   // Handle form submission to initiate a call
//   initiateCall() {
//     if (!this.remotePeerId) return;
//     console.log(`Calling peer: ${this.remotePeerId}`);
//     const call = this.peer.call(this.remotePeerId, this.localStream);
//     call.on('stream', (remoteStream) =>
//       this.displayVideoStream(remoteStream, false, this.remotePeerId)
//     );
//   }

//   // Handle incoming call
//   handleIncomingCall(call: MediaConnection) {
//     console.log('Incoming call from:', call.peer);
//     call.answer(this.localStream); // Answer with local stream
//     call.on('stream', (remoteStream: MediaStream) =>
//       this.displayVideoStream(remoteStream, false, call.peer)
//     );
//   }

//   // Display video stream (local or remote)
//   displayVideoStream(stream: MediaStream, isMuted: boolean, peerId: string) {
//     const doc = document.getElementById(`video-${peerId}`);
//     if (doc) {
//       return;
//     }
//     const videoElement = this.createVideoElement(stream, isMuted, peerId);
//     this.appendVideoToContainer(videoElement, peerId);
//   }

//   // Create and configure a video element
//   createVideoElement(
//     stream: MediaStream,
//     isMuted: boolean,
//     peerId: string
//   ): HTMLVideoElement {
//     const videoElement = document.createElement('video');
//     videoElement.srcObject = stream;
//     videoElement.muted = isMuted;
//     videoElement.autoplay = true;
//     videoElement.playsInline = true;
//     videoElement.addEventListener('loadedmetadata', () => videoElement.play());

//     videoElement.id = `video-${peerId}`;
//     return videoElement;
//   }

//   // Append video element to the container
//   appendVideoToContainer(videoElement: HTMLVideoElement, peerId: string) {
//     const container = document.getElementById('video-container');
//     if (container) {
//       // const videoWrapper = document.createElement('div');
//       // videoWrapper.innerHTML = `Peer ID: ${peerId}`;
//       // videoWrapper.appendChild(videoElement);
//       container.appendChild(videoElement);
//     }
//   }
// }
