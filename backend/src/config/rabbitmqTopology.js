"use strict";

const rabbitmqTopology = {
    exchanges: {
        videoProcessing: {
            name: "streamflix.video",
            type: "direct",
            options: {
                durable: true
            }
        }
    },

    queues: {
        videoProcessing: {
            name: "streamflix.video.processing",
            options: {
                durable: true
            }
        }
    },

    routingKeys: {
        videoProcessing: "video.processing"
    }
};

export default rabbitmqTopology;
