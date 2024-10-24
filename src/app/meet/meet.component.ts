import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SocketService } from '../socket.service';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';

interface Participant {
  peerId: string;
  userName: string;
  isMuted: boolean;
  isVideoOn: boolean;
  muterName: string;
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
  meetCode!: string;
  userName!: string | null;
  localStreamVideo!: MediaStream;
  isMuted: boolean = false;
  isVideoOn: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public socketService: SocketService,
    private toastr: ToastrService
  ) {
    this.userName = sessionStorage.getItem('userName') || null;
    if (!this.userName) {
      this.router.navigate(['/']);
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
      isMuted: this.isMuted,
      isVideoOn: this.isVideoOn,
      peerId: this.socketService.localPeerId,
      muterName: null,
      oldPeerId: localStorage.getItem('peerId') || null,
    });
  }

  private setupEventListeners() {
    this.socketService.socket.on('participant-update', async (data) => {
      this.socketService.participants = data;
    });

    this.socketService.socket.on('join-meet-success', async (data) => {
      await this.addLocalVideo();
      this.socketService.addUserToCall(this.localStreamVideo, data);
    });

    this.socketService.socket.on('user-joined', (data) => {
      this.toastr.info(`${data.userName} joined the meeting.`);
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

    this.socketService.socket.on('user-left-success', (data) => {
      this.socketService.removeVideoFromGrid(data.peerId);
      this.localStreamVideo.getTracks().forEach((track) => track.stop());
      this.router.navigate(['/']);
    });

    this.socketService.socket.on('user-left', (data) => {
      this.toastr.info(`${data.userName} left the meeting.`);
      this.socketService.removeVideoFromGrid(data.peerId);
    });

    this.socketService.onMuteRequest().subscribe((muterName) => {
      this.handleMuteRequest(muterName);
    });
  }

  private handleUserJoined(data: any) {
    console.log('calling thepeer');
    const call = this.socketService.peer.call(
      data.peerId,
      this.localStreamVideo
    );
    let rs!: MediaStream;
    call.on('stream', (remoteStream) => {
      rs = remoteStream;
      console.log('asnwer the stream');
      this.socketService.addVideoToGrid(remoteStream, data.peerId);
    });

    const peerConnection = call.peerConnection;

    peerConnection.oniceconnectionstatechange = () => {
      const state = peerConnection.iceConnectionState;
      console.log(`ICE connection state changed: ${state}`);

      if (state === 'disconnected' || state === 'failed') {
        console.warn('ICE connection lost, retrying...');
        this.socketService.retryConnection(call, rs, data); // Retry logic
      }
    };
  }

  private async addLocalVideo() {
    try {
      const localVideo = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: {
            ideal: 640,
          },
          height: {
            ideal: 480,
          },
        },
      });
      this.localStreamVideo = localVideo;
      this.socketService.addVideoToGrid(
        localVideo,
        this.socketService.localPeerId
      );
    } catch (error) {
      console.error('Error accessing media devices:', error);
      // Handle error (e.g., show error message to user)
    }
  }

  public endMeeting() {
    this.socketService.closePeerConnection({
      meetCode: this.meetCode,
      userName: this.userName,
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
      isMuted: this.isMuted,
      isVideoOn: this.isVideoOn,
      peerId: this.socketService.localPeerId,
      muterName: null,
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
      isMuted: this.isMuted,
      isVideoOn: this.isVideoOn,
      peerId: this.socketService.localPeerId,
      muterName: null,
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
        userName: this.userName,
        isMuted: this.isMuted,
        isVideoOn: this.isVideoOn,
        peerId: this.socketService.localPeerId,
        muterName: null,
        targetUserId: peerId,
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

  copyToClipboard() {
    const content = `
      Meeting Information
      Meeting Code: ${this.meetCode}
      Your Name: ${this.userName}
    `;

    navigator.clipboard
      .writeText(content)
      .then(() => {
        this.toastr.info('Meeting invite copied.');
        console.log('Text copied to clipboard');
      })
      .catch((err) => {
        console.error('Error copying text to clipboard', err);
      });
  }
}
