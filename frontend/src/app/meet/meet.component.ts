import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SocketService } from '../socket.service';

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
    this.initiateJoinRoom();

    this.service.socket.on('join-meet-success', async (data) => {
      console.log('Successfully joined the meet:', data);
      await this.addLocalVideo();
    });

    this.service.socket.on('user-joined', (data) => {
      console.log('New user joined:', data);
      // Handle new user joining (e.g., set up peer connection)
    });

    this.service.socket.on('join-meet-error', (error) => {
      console.error('Failed to join meet:', error);
      // Handle error (e.g., show error message to user)
    });
  }

  initiateJoinRoom() {
    this.service.socket.emit('join-meet', {
      meetCode: this.meetCode,
      userName: this.userName,
      localId: this.localId,
    });
  }

  async addLocalVideo() {
    try {
      const localVideo = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      this.addVideoToGrid(localVideo);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      // Handle error (e.g., show error message to user)
    }
  }

  addVideoToGrid(stream: MediaStream) {
    const videoGrid = document.getElementById('video-grid');
    if (!videoGrid) {
      console.error('Video grid element not found');
      return;
    }
    const videoElement = document.createElement('video');
    videoElement.srcObject = stream;
    videoElement.autoplay = true;
    videoElement.muted = true;
    videoElement.addEventListener('loadedmetadata', () => {
      videoGrid.append(videoElement);
    });
  }
}
