"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var GuildSchema = new mongoose_1.Schema({
    guildId: { type: String, required: true, unique: true },
    name: String,
    registeredAt: Date,
    config: {
        prefix: String,
    },
    features: {
        logs: {
            enabled: Boolean,
            channel: String,
        },
        vocGaming: {
            enabled: Boolean,
            channelToJoin: String,
            channelsCreated: [String],
            nbChannelsCreated: Number,
        },
        chatGaming: {
            enabled: Boolean,
            channelId: String,
            channelsList: [String],
            reactionsList: [String],
            nbForumCreated: Number,
        },
        leveling: {
            enabled: { type: Boolean, default: true },
            taux: { type: Number, default: 1 }
        },
    },
});
var GuildModel = mongoose_1.default.model('Guild', GuildSchema);
exports.default = GuildModel;
