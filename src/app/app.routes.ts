import { Routes } from '@angular/router';
import { LandingComponent } from './landing/landing.component';
import { MeetComponent } from './meet/meet.component';

export const routes: Routes = [
  {
    path: '',
    component: LandingComponent,
  },
  {
    path: ':id',
    component: MeetComponent,
  },
];
