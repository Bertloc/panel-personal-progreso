import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BottomNav } from './shared/components/bottom-nav/bottom-nav';
import { FloatingActionButton } from './shared/components/floating-action-button/floating-action-button';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BottomNav, FloatingActionButton],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
}
