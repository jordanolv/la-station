"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var GuildSchema = new mongoose_1.Schema({
    guildId: { type: String },
    guildName: { type: String }
}, { _id: false });
var UserSchema = new mongoose_1.Schema({
    discordId: { type: String, required: true, unique: true },
    name: { type: String },
    guild: {
        type: GuildSchema,
        default: {}
    },
    profil: {
        type: {
            money: { type: Number, default: 500 },
            exp: { type: Number, default: 0 },
            lvl: { type: Number, default: 1 }
        },
        _id: false
    },
    bio: { type: String },
    stats: {
        type: {
            totalMsg: { type: Number, default: 0 }
        },
        _id: false
    },
    infos: {
        type: {
            registeredAt: { type: Date, default: Date.now },
            updatedAt: { type: Date, default: Date.now },
            birthDate: { type: Date }
        },
        _id: false
    }
});
UserSchema.pre('save', function (next) {
    if (!this.isModified())
        return next();
    this.infos.updatedAt = new Date();
    next();
});
UserSchema.pre('findOneAndUpdate', function (next) {
    this.set({ 'infos.updatedAt': new Date() });
    next();
});
var UserModel = mongoose_1.default.model('User', UserSchema);
exports.default = UserModel;
