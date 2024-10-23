import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SocketService } from '../socket.service';
import { CommonModule } from '@angular/common';

interface Participant {
  peerId: string;
  userName: string;
  isMuted: boolean;
  isVideoOn: boolean;
}

@Component({
  selector: 'app-meet',
  standalone: true,
  providers: [SocketService],
  imports: [CommonModule],
  templateUrl: './meet.component.html',
  styleUrl: './meet.component.scss',
})
export class MeetComponent implements OnInit, OnDestroy {
  localId!: string;
  meetCode!: string;
  password!: string;
  userName!: string;
  localStreamVideo!: MediaStream;
  isMuted: boolean = false;
  isVideoOn: boolean = true;
  participants: Participant[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public socketService: SocketService
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
    this.initializeMeeting();
    this.setupEventListeners();
  }

  ngOnDestroy(): void {
    this.endMeeting();
  }

  private initializeMeeting() {
    this.socketService.initializePeerConnection({
      meetCode: this.meetCode,
      userName: this.userName,
      localId: this.localId,
    });
  }

  private setupEventListeners() {
    this.socketService.socket.on('join-meet-success', async (data) => {
      await this.addLocalVideo();
      this.socketService.addUserToCall(this.localStreamVideo, data);
    });

    this.socketService.socket.on('user-joined', (data) => {
      this.handleUserJoined(data);
    });

    this.socketService.socket.on('join-meet-error', (error) => {
      console.error('Failed to join meet:', error);
      // Handle error (e.g., show error message to user)
    });

    this.socketService.socket.on('user-audio-toggle', (data) => {
      this.updateParticipantAudioState(data);
    });

    this.socketService.socket.on('user-video-toggle', (data) => {
      this.updateParticipantVideoState(data);
    });

    this.socketService.onMuteRequest().subscribe((muterName) => {
      this.handleMuteRequest(muterName);
    });
  }

  private handleUserJoined(data: any) {
    const call = this.socketService.peer.call(
      data.peerId,
      this.localStreamVideo
    );
    call.on('stream', (remoteStream) => {
      this.socketService.addVideoToGrid(remoteStream, data.peerId);
      this.socketService.participants.push({
        peerId: data.peerId,
        userName: data.userName,
        isMuted: false,
        isVideoOn: true,
      });
    });
  }

  private async addLocalVideo() {
    try {
      const localVideo = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      this.localStreamVideo = localVideo;
      this.socketService.addVideoToGrid(
        localVideo,
        this.socketService.localPeerId
      );
      this.socketService.participants.push({
        peerId: this.socketService.localPeerId,
        userName: this.userName,
        isMuted: this.isMuted,
        isVideoOn: this.isVideoOn,
      });
    } catch (error) {
      console.error('Error accessing media devices:', error);
      // Handle error (e.g., show error message to user)
    }
  }

  public endMeeting() {
    this.socketService.socket.emit('end-meet', {
      meetCode: this.meetCode,
      userName: this.userName,
      localId: this.localId,
      peerId: this.socketService.localPeerId,
    });
  }

  toggleAudio() {
    this.isMuted = !this.isMuted;
    this.localStreamVideo
      .getAudioTracks()
      .forEach((track) => (track.enabled = !this.isMuted));
    this.socketService.toggleAudio({
      meetCode: this.meetCode,
      userName: this.userName,
      localId: this.localId,
      isMuted: this.isMuted,
    });
    this.updateParticipantAudioState({
      peerId: this.socketService.localPeerId,
      isMuted: this.isMuted,
    });
  }

  toggleVideo() {
    this.isVideoOn = !this.isVideoOn;
    this.localStreamVideo
      .getVideoTracks()
      .forEach((track) => (track.enabled = this.isVideoOn));
    this.socketService.toggleVideo({
      meetCode: this.meetCode,
      userName: this.userName,
      localId: this.localId,
      isVideoOn: this.isVideoOn,
    });
    this.updateParticipantVideoState({
      peerId: this.socketService.localPeerId,
      isVideoOn: this.isVideoOn,
    });
  }

  muteUser(peerId: string) {
    const participant = this.socketService.participants.find(
      (p) => p.peerId === peerId
    );
    if (participant) {
      this.socketService.muteUser({
        meetCode: this.meetCode,
        targetUserId: peerId,
        muterName: this.userName,
      });
    }
  }

  private updateParticipantAudioState(data: {
    peerId: string;
    isMuted: boolean;
  }) {
    const participant = this.socketService.participants.find(
      (p) => p.peerId === data.peerId
    );
    if (participant) {
      participant.isMuted = data.isMuted;
    }
  }

  private updateParticipantVideoState(data: {
    peerId: string;
    isVideoOn: boolean;
  }) {
    const participant = this.socketService.participants.find(
      (p) => p.peerId === data.peerId
    );
    if (participant) {
      participant.isVideoOn = data.isVideoOn;
    }
  }

  private handleMuteRequest(muterName: string) {
    // In a real application, you might want to show a dialog to the user
    console.log(`${muterName} has requested to mute you`);
    // For this example, we'll automatically mute the user
    if (!this.isMuted) {
      this.toggleAudio();
    }
  }
}
