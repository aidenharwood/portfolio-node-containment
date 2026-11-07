import { App } from './app.ts';
import { installTouchContextMenu } from './input/touchContextMenu.ts';
import { GameConnection } from './net/gameConnection.ts';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app root element.');

installTouchContextMenu();
new App(root, new GameConnection()).start();
