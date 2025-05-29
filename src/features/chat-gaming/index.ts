import { games } from './api/routes';
import { GameService } from './shared/services';
import GameModel, { IGame } from './shared/models';

// Exporter les éléments de la fonctionnalité chat-gaming
export {
  games,
  GameService,
  GameModel,
  IGame
}; 