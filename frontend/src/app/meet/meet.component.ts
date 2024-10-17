import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SocketService } from '../socket.service';
import Peer, { MediaConnection } from 'peerjs';

@Component({
  selector: 'app-meet',
  standalone: true,
  providers: [SocketService],
  templateUrl: './meet.component.html',
  styleUrl: './meet.component.scss',
})
export class MeetComponent implements OnInit {
  localId!: string;
  meetCode!: string;
  password!: string;
  userName!: string;
  localStreamVideo!: MediaStream;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private service: SocketService
  ) {
    const navigation = this.router.getCurrentNavigation();

    if (navigation?.extras.state) {
      const { localId, userName, password } = navigation.extras.state;
      this.localId = localId;
      this.userName = userName;
      this.password = password;
    }
  }

  async ngOnInit() {
    this.meetCode = this.route.snapshot.params['id'];
    this.service.initializePeerConnection({
      meetCode: this.meetCode,
      userName: this.userName,
      localId: this.localId,
    });

    this.service.socket.on('join-meet-success', async (data) => {
      await this.addLocalVideo();
      this.service.addUserToCall(this.localStreamVideo);
    });

    this.service.socket.on('user-joined', (data) => {
      const call = this.service.peer.call(data.peerId, this.localStreamVideo);
      let count = 0;
      call.on('stream', (remoteStream) => {
        count++;
        if (count <= 1) {
          console.log('surya called');
          return this.service.addVideoToGrid(remoteStream, data.peerId);
        }
      });
      // Handle new user joining (e.g., set up peer connection)
    });

    this.service.socket.on('join-meet-error', (error) => {
      console.error('Failed to join meet:', error);
      // Handle error (e.g., show error message to user)
    });
  }

  async addLocalVideo() {
    try {
      const localVideo = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      this.localStreamVideo = localVideo;
      this.service.addVideoToGrid(localVideo, this.service.localPeerId);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      // Handle error (e.g., show error message to user)
    }
  }
}
