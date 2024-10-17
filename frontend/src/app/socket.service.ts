import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  socket!: Socket;
  constructor() {
    this.socket = io('http://localhost:3000');
    this.socket.on('connect', function () {
      console.log('Connected!');
    });
  }

  public sendMessage(message: string) {
    console.log('emit');
    setTimeout(() => {
      this.socket.emit('message', message);
    }, 5000);
  }

  public onMessage() {
    return new Observable((observer) => {
      this.socket.on('message', (message) => {
        observer.next(message);
      });
    });
  }
}
