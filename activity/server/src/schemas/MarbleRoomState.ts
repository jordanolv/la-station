import { Schema, MapSchema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") id: string = "";
  @type("string") username: string = "";
  @type("string") avatarUrl: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("boolean") isReady: boolean = false;
  @type("boolean") finished: boolean = false;
  @type("number") finishPosition: number = 0;
  @type("boolean") isHost: boolean = false;
}

export class MarbleRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") phase: string = "lobby";
  @type("number") countdown: number = 3;
  @type("number") seed: number = 0;
  @type("number") finishedCount: number = 0;
}
