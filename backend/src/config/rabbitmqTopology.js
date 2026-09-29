"use strict";

const rabbitmqTopology = {
    exchanges: {
        videoProcessing: {
            name: "streamflix.video",
            type: "direct",
            options: {
                durable: true
            }
        },

        videoRetry: {
            name: "streamflix.video.retry",
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
        },

        videoRetry: {
            name: "streamflix.video.retry",
            options: {
                durable: true,
                arguments: {
                    "x-dead-letter-exchange":
                        "streamflix.video",
                    "x-dead-letter-routing-key":
                        "video.processing"
                }
            }
        }
    },

    routingKeys: {
        videoProcessing: "video.processing",

        videoRetry: "video.retry"
    }
};

export default rabbitmqTopology;