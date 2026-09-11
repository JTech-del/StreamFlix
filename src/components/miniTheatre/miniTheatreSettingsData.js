"use strict";

/*==================================================
    StreamFlix

    Mini Theatre Settings Data

    Responsibility

    ✓ Playback Speed Options
    ✓ Quality Options
    ✓ Static Configuration
    ✓ Immutable Data

==================================================*/

const playbackSpeedItems = [

    {
        value: 0.5,
        label: "0.5×"
    },

    {
        value: 0.75,
        label: "0.75×"
    },

    {
        value: 1,
        label: "Normal"
    },

    {
        value: 1.25,
        label: "1.25×"
    },

    {
        value: 1.5,
        label: "1.5×"
    },

    {
        value: 1.75,
        label: "1.75×"
    },

    {
        value: 2,
        label: "2×"
    }

];

export const MINI_THEATRE_PLAYBACK_SPEEDS =
    Object.freeze(
        playbackSpeedItems
    );