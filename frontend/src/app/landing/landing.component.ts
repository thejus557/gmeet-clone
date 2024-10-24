import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet } from '@angular/router';
import Peer, { MediaConnection } from 'peerjs';
import { SocketService } from '../socket.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterOutlet, FormsModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent implements OnInit {
  meetCode = '123-456-789';
  userName = 'surya';

  constructor(private socket: SocketService, private router: Router) {}

  ngOnInit(): void {}

  onJoin() {
    sessionStorage.setItem('userName', this.userName);
    this.router.navigate(['/', this.meetCode]);
  }
}
