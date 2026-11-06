import { App } from './app.ts';
import { GameConnection } from './net/gameConnection.ts';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app root element.');

new App(root, new GameConnection()).start();
